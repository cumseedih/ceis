from __future__ import annotations

from pathlib import Path

import pytest

from ceis.config import Settings, load_settings


def test_env_expansion_and_overrides(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    cfg = tmp_path / "config.toml"
    cfg.write_text(
        """
[llm]
model = "deepseek-flash"
api_key = "${TEST_KEY}"
base_url = "${TEST_URL:-https://api.deepseek.com/}"
extra_headers = { "X-User" = "${TEST_USER:-anon}" }

[sentinel]
mode = "strict"

[[sentinel.rules]]
tool = "shell"
match = { command = "*rm*" }
action = "deny"
""",
        "utf-8",
    )
    monkeypatch.setenv("TEST_KEY", "sk-test")
    monkeypatch.delenv("TEST_URL", raising=False)
    monkeypatch.delenv("CEIS_LLM_MODEL", raising=False)
    s = load_settings(cfg)
    assert s.llm.api_key == "sk-test"
    assert s.llm.base_url == "https://api.deepseek.com"  # trailing slash stripped
    assert s.llm.extra_headers == {"X-User": "anon"}
    assert s.sentinel.mode == "strict"
    assert s.sentinel.rules[0].action == "deny"

    monkeypatch.setenv("CEIS_LLM_MODEL", "other-model")
    monkeypatch.setenv("CEIS_LLM_IMAGE_MODEL", "qwen-image-3.0")
    monkeypatch.setenv("CEIS_LLM_VIDEO_BASE_URL", "http://gateway:8000/llm/abc/main")
    monkeypatch.setenv("CEIS_SENTINEL_MODE", "auto")
    s = load_settings(cfg)
    assert s.llm.model == "other-model"
    assert s.llm.image_model == "qwen-image-3.0"
    assert s.llm.video_base_url == "http://gateway:8000/llm/abc/main"
    assert s.sentinel.mode == "auto"

    # container-style overrides win over values set in the file
    monkeypatch.setenv("CEIS_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("CEIS_WORKSPACE", str(tmp_path / "ws"))
    s = load_settings(cfg)
    assert s.data_dir == tmp_path / "data"
    assert s.agent.workspace == tmp_path / "ws"


def test_missing_explicit_config_raises(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        load_settings(tmp_path / "nope.toml")


def test_defaults_without_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("CEIS_CONFIG", raising=False)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-from-env")
    monkeypatch.setenv("HOME", str(tmp_path))
    s = load_settings()
    assert s.llm.api_key == "sk-from-env"
    assert s.source == "defaults+env"


def test_provider_key_fallback_follows_the_host(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """A missing api_key is filled from the provider's own variable, never another's."""
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-deepseek")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai")
    monkeypatch.delenv("CEIS_LLM_API_KEY", raising=False)
    cfg = tmp_path / "config.toml"

    def key_for(base_url: str | None) -> str | None:
        line = f'base_url = "{base_url}"\n' if base_url else ""
        cfg.write_text(f'data_dir = "{(tmp_path / "data").as_posix()}"\n[llm]\n{line}')
        return load_settings(cfg).llm.api_key

    assert key_for(None) == "sk-deepseek"  # the default endpoint is DeepSeek's
    assert key_for("https://api.deepseek.com") == "sk-deepseek"
    assert key_for("https://api.openai.com/v1") == "sk-openai"
    assert key_for("https://openrouter.ai/api/v1") == "sk-openai"  # the shared convention
    monkeypatch.delenv("OPENAI_API_KEY")
    assert not key_for("https://api.openai.com/v1")  # DeepSeek's key does not stand in
    assert key_for("https://api.deepseek.com") == "sk-deepseek"
    # a catalogue id with no base_url resolves to that provider's endpoint first: Moonshot's
    # host is not DeepSeek's, so the generic variable applies, not DEEPSEEK_API_KEY
    monkeypatch.setenv("OPENAI_API_KEY", "sk-openai")
    cfg.write_text(f'data_dir = "{(tmp_path / "data").as_posix()}"\n[llm]\nprovider = "moonshot"\n')
    assert load_settings(cfg).llm.api_key == "sk-openai"
    cfg.write_text(f'data_dir = "{(tmp_path / "data").as_posix()}"\n[llm]\nprovider = "deepseek"\n')
    assert load_settings(cfg).llm.api_key == "sk-deepseek"


def test_bad_server_port_in_the_environment_is_ignored(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("CEIS_SERVER_PORT", "eight")
    cfg = tmp_path / "config.toml"
    cfg.write_text(f'data_dir = "{(tmp_path / "data").as_posix()}"\n')
    assert load_settings(cfg).server.port == Settings().server.port
    monkeypatch.setenv("CEIS_SERVER_PORT", "8123")
    assert load_settings(cfg).server.port == 8123


def test_workspace_defaults_under_the_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """No ``agent.workspace``: ``./workspace`` only when the current directory has one (the
    terminal user's convention); otherwise inside the data directory, wherever the process was
    started — a launcher's cwd may be Program Files or System32 (the 0.1.21 Windows failure)."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("CEIS_WORKSPACE", raising=False)
    monkeypatch.setenv("CEIS_DATA_DIR", str(tmp_path / "data"))
    assert load_settings().agent.workspace == tmp_path / "data" / "workspace"

    (tmp_path / "workspace").mkdir()
    assert load_settings().agent.workspace == Path("./workspace")

    monkeypatch.setenv("CEIS_WORKSPACE", str(tmp_path / "elsewhere"))
    assert load_settings().agent.workspace == tmp_path / "elsewhere"
    monkeypatch.delenv("CEIS_WORKSPACE")
    cfg = tmp_path / "config.toml"
    cfg.write_text(
        f'data_dir = "{(tmp_path / "data").as_posix()}"\n[agent]\nworkspace = "./mine"\n'
    )
    assert load_settings(cfg).agent.workspace == Path("./mine")


def test_unknown_keys_are_named_and_the_rest_still_loads(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    """Pydantic drops a key it has no field for without a word; a misspelt key would read as
    "not set". The loader names each one, with its path, and the free-form tables and the
    tables other modules read (``[channels.<name>]``) are not mistaken for typos."""
    from ceis.config import unknown_keys

    cfg = tmp_path / "config.toml"
    cfg.write_text(
        f'''
data_dir = "{(tmp_path / "data").as_posix()}"
dat_dir = "typo"
[llm]
modle = "x"
model = "deepseek-chat"
[llm.extra_headers]
X-Anything = "goes"
[[sentinel.rules]]
tool = "shell"
matc = {{}}
[[mcp.servers]]
name = "s"
urll = "http://localhost:1"
[mcp.servers.env]
ANY = "1"
[mcp.servers.tools.read]
risk = "safe"
rsk = "x"
[channels.telegram]
enabled = true
anything = 1
'''
    )
    with cfg.open("rb") as fh:
        import tomllib

        assert unknown_keys(tomllib.load(fh)) == [
            "dat_dir",
            "llm.modle",
            "sentinel.rules[0].matc",
            "mcp.servers[0].urll",
            "mcp.servers[0].tools.read.rsk",
        ]

    warnings: list[str] = []
    from ceis.logger import logger

    sink = logger.add(lambda m: warnings.append(m.record["message"]), level="WARNING")
    try:
        settings = load_settings(cfg)
    finally:
        logger.remove(sink)
    assert settings.llm.model == "deepseek-chat"  # the known keys are read as before
    assert [w for w in warnings if "llm.modle" in w and "ignored" in w]
    assert not [w for w in warnings if "channels" in w]


def test_ceis_data_dir_beats_the_legacy_name(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """CEIS_DATA_DIR wins; CEIS_DATA_DIR still works as a silent fallback."""
    cfg = tmp_path / "config.toml"
    cfg.write_text("[llm]\n")
    monkeypatch.setenv("CEIS_DATA_DIR", str(tmp_path / "new"))
    monkeypatch.setenv("CEIS_DATA_DIR", str(tmp_path / "old"))
    assert load_settings(cfg).data_dir == tmp_path / "new"
    monkeypatch.delenv("CEIS_DATA_DIR")
    assert load_settings(cfg).data_dir == tmp_path / "old"


def test_legacy_data_dir_is_moved_once(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """The shipped defaults move ~/.ceis to ~/.ceis exactly once."""
    import ceis.config as config_module

    monkeypatch.setattr("os.path.expanduser", lambda p: str(tmp_path) if p == "~" else p)
    home = Path.home()
    old, new = home / ".ceis", home / ".ceis"
    old.mkdir(parents=True)
    (old / "keep.txt").write_text("mine", encoding="utf-8")
    monkeypatch.setattr(config_module, "DEFAULT_DATA_DIR", new)
    monkeypatch.setattr(config_module, "LEGACY_DATA_DIR", old)
    assert config_module.default_data_dir() == new
    assert not old.exists()
    assert (new / "keep.txt").read_text(encoding="utf-8") == "mine"


def test_failed_move_falls_back_to_the_old_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """When the rename fails, the old directory keeps being used."""
    import ceis.config as config_module

    home = Path("/nonexistent-home-xyz")
    old, new = home / ".ceis", home / ".ceis"
    monkeypatch.setattr(config_module, "DEFAULT_DATA_DIR", new)
    monkeypatch.setattr(config_module, "LEGACY_DATA_DIR", old)
    monkeypatch.setattr(Path, "is_dir", lambda self: self == old)
    monkeypatch.setattr(Path, "exists", lambda self: False)
    def boom(self, target):
        raise OSError("read-only filesystem")
    monkeypatch.setattr(Path, "rename", boom)
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: home))
    assert config_module.default_data_dir() == old


def test_both_data_dirs_exist_nothing_moves_and_the_new_one_wins(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    """Both ~/.ceis and ~/.ceis exist: nothing is moved or deleted, the new one wins."""
    import ceis.config as config_module

    monkeypatch.setattr("os.path.expanduser", lambda p: str(tmp_path) if p == "~" else p)
    home = Path.home()
    old, new = home / ".ceis", home / ".ceis"
    old.mkdir(parents=True)
    new.mkdir(parents=True)
    (old / "old.txt").write_text("old", encoding="utf-8")
    (new / "new.txt").write_text("new", encoding="utf-8")
    monkeypatch.setattr(config_module, "DEFAULT_DATA_DIR", new)
    monkeypatch.setattr(config_module, "LEGACY_DATA_DIR", old)
    assert config_module.default_data_dir() == new
    assert (old / "old.txt").read_text(encoding="utf-8") == "old"
    assert (new / "new.txt").read_text(encoding="utf-8") == "new"
