"""Tests for the `files` tool's edit, grep and symbols actions.

Step 1 of the agent upgrade: precise, cheap code-change tools. All tests run
against a temporary workspace with no network and no model.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from wevvy.schema import RiskLevel
from wevvy.tools import Files
from wevvy.tools import files as files_module


async def _setup(files: Files, path: str, content: str) -> Path:
    result = await files.execute(action="write", path=path, content=content)
    assert result.ok, result.error
    return files.workspace / path


# ------------------------------------------------------------------ edit
async def test_edit_replaces_one_exact_match_and_reports_lines(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    target = await _setup(files, "a.py", "one\ntwo\nthree\n")
    result = await files.execute(action="edit", path="a.py", old_text="two", new_text="TWO")
    assert result.ok, result.error
    assert target.read_text() == "one\nTWO\nthree\n"
    assert "replaced lines 2-2" in result.output
    assert "occurrence 1 of 1" in result.output
    assert "now 3 lines" in result.output
    assert "sha256:" in result.output


async def test_edit_reports_multiline_span(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    await _setup(files, "a.py", "alpha\nbeta\ngamma\ndelta\n")
    result = await files.execute(
        action="edit", path="a.py", old_text="beta\ngamma", new_text="BETA"
    )
    assert result.ok, result.error
    assert "replaced lines 2-3" in result.output


async def test_edit_not_found_is_an_error_not_a_write(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    target = await _setup(files, "a.py", "one\ntwo\n")
    result = await files.execute(action="edit", path="a.py", old_text="zzz", new_text="Z")
    assert result.error and "not found" in result.error
    assert target.read_text() == "one\ntwo\n"


async def test_edit_ambiguous_without_occurrence_is_an_error(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    target = await _setup(files, "a.py", "x = 1\nx = 2\nx = 3\n")
    result = await files.execute(action="edit", path="a.py", old_text="x = ", new_text="y = ")
    assert result.error and "matches 3 times" in result.error
    assert "occurrence" in result.error
    assert target.read_text() == "x = 1\nx = 2\nx = 3\n"


async def test_edit_occurrence_selects_which_match(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    target = await _setup(files, "a.py", "x = 1\nx = 2\nx = 3\n")
    result = await files.execute(
        action="edit", path="a.py", old_text="x = ", new_text="y = ", occurrence=2
    )
    assert result.ok, result.error
    assert target.read_text() == "x = 1\ny = 2\nx = 3\n"
    assert "occurrence 2 of 3" in result.output
    assert "replaced lines 2-2" in result.output


async def test_edit_occurrence_out_of_range_is_an_error(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    await _setup(files, "a.py", "x = 1\n")
    result = await files.execute(
        action="edit", path="a.py", old_text="x = ", new_text="y = ", occurrence=5
    )
    assert result.error and "out of range" in result.error


async def test_edit_assessment_matches_write(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    assert (
        files.assess({"action": "edit", "path": "x", "new_text": "hi"}).risk == RiskLevel.MODERATE
    )
    outside = Files(workspace=tmp_path, extra_roots=[])
    assert outside.assess({"action": "edit", "path": "/etc/x"}).risk == RiskLevel.SENSITIVE


# ------------------------------------------------------------------ grep
async def _grep_workspace(tmp_path: Path) -> Files:
    files = Files(workspace=tmp_path)
    await _setup(files, "a.py", "def hello():\n    return 'hello world'\n")
    await _setup(files, "b.py", "hello again\nnothing here\n")
    await _setup(files, "sub/c.txt", "say hello\n")
    return files


async def test_grep_match_format(tmp_path: Path) -> None:
    files = await _grep_workspace(tmp_path)
    result = await files.execute(action="grep", pattern="hello")
    assert result.ok, result.error
    assert "a.py:2: return 'hello world'" in result.output
    assert "b.py:1: hello again" in result.output
    assert "sub/c.txt:1: say hello" in result.output


async def test_grep_no_matches(tmp_path: Path) -> None:
    files = await _grep_workspace(tmp_path)
    result = await files.execute(action="grep", pattern="definitely-not-there")
    assert result.ok
    assert result.output == "(no matches)"


async def test_grep_cap_is_respected(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    await _setup(files, "many.txt", "".join(f"needle {i}\n" for i in range(150)))
    result = await files.execute(action="grep", pattern="needle", max_results=10)
    assert result.ok, result.error
    lines = [line for line in result.output.splitlines() if line.startswith("many.txt:")]
    assert len(lines) == 10
    assert "showing the first 10 matches" in result.output


async def test_grep_invalid_regex_is_an_error(tmp_path: Path) -> None:
    files = await _grep_workspace(tmp_path)
    result = await files.execute(action="grep", pattern="([")
    assert result.error and "invalid regex" in result.error


async def test_grep_python_fallback_matches_rg(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    files = await _grep_workspace(tmp_path)
    monkeypatch.setattr(files_module, "_rg_available", lambda: False)
    result = await files.execute(action="grep", pattern="hello")
    assert result.ok, result.error
    assert "a.py:2: return 'hello world'" in result.output
    assert "b.py:1: hello again" in result.output


async def test_grep_respects_path_root(tmp_path: Path) -> None:
    files = await _grep_workspace(tmp_path)
    result = await files.execute(action="grep", path="sub", pattern="hello")
    assert result.ok, result.error
    assert "sub/c.txt:1: say hello" in result.output
    assert "a.py" not in result.output


async def test_grep_glob_limits_files(tmp_path: Path) -> None:
    files = await _grep_workspace(tmp_path)
    result = await files.execute(action="grep", pattern="hello", glob="*.txt")
    assert result.ok, result.error
    assert "sub/c.txt:1: say hello" in result.output
    assert "a.py" not in result.output


# ------------------------------------------------------------------ symbols
async def test_symbols_python_defs_classes_methods(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    await _setup(
        files,
        "mod.py",
        "class Widget:\n    def render(self):\n        return 1\n\ndef top():\n    pass\n",
    )
    result = await files.execute(action="symbols", name="render")
    assert result.ok, result.error
    assert "mod.py:2 method render in Widget" in result.output
    result = await files.execute(action="symbols", name="Widget")
    assert "mod.py:1 class Widget" in result.output
    result = await files.execute(action="symbols", name="top")
    assert "mod.py:5 function top" in result.output


async def test_symbols_typescript_function_class_interface(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    await _setup(
        files,
        "ui.ts",
        "export interface Props {\n"
        "  title: string;\n"
        "}\n"
        "export class Panel {\n"
        "  open() {\n"
        "    return true;\n"
        "  }\n"
        "}\n"
        "export function build(): number {\n"
        "  return 1;\n"
        "}\n",
    )
    result = await files.execute(action="symbols")
    assert result.ok, result.error
    assert "ui.ts:1 type Props" in result.output
    assert "ui.ts:4 class Panel" in result.output
    assert "ui.ts:5 method open in Panel" in result.output
    assert "ui.ts:9 function build" in result.output


async def test_symbols_name_filter_and_cap(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    await _setup(files, "mod.py", "".join(f"def f{i}():\n    pass\n" for i in range(50)))
    result = await files.execute(action="symbols", max_results=5)
    assert result.ok, result.error
    entries = [line for line in result.output.splitlines() if line.startswith("mod.py:")]
    assert len(entries) == 5
    assert "showing the first 5 symbols" in result.output
    result = await files.execute(action="symbols", name="missing")
    assert result.output == "(no symbols found)"


async def test_symbols_skips_vendor_dirs(tmp_path: Path) -> None:
    files = Files(workspace=tmp_path)
    await _setup(files, "node_modules/pkg/index.js", "function hidden() {}\n")
    await _setup(files, "real.js", "function visible() {}\n")
    result = await files.execute(action="symbols")
    assert result.ok, result.error
    assert "real.js" in result.output
    assert "node_modules" not in result.output
