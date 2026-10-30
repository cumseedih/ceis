import { ChevronLeft, Loader2, Settings } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "../api";
import { useT } from "../i18n";
import { isMainland, looksLikeForeignNumber } from "../region";
import { getThemeSetting, setThemeSetting, type ThemeSetting } from "../theme";
import { cx } from "../util";
import { BareMark } from "./BrandMark";
import { PRIVACY_URL } from "./DataControls";
import { markFirstSignIn } from "./FirstSignInSteps";
import { inputCls, primaryBtn } from "./Form";
import { useCloudConfig } from "./StarNudge";
import { dollars } from "../money";

/**
 * Signing in to wevvy Cloud: a code sent to an e-mail address (or a mainland phone number
 * by SMS), or, once one is set, the account password. The same form everywhere it is
 * needed (first run, the gate, the account screen); the key lands in the vault on the
 * machine running wevvy.
 *
 * A friend's invite code (``?invite=CODE`` on the page URL, remembered until used, or typed
 * into the optional field) travels with the code sign-in; it counts for a new account only.
 */
const INVITE_KEY = "nm.invite";

/** The invite code from the page URL (kept for later) or from an earlier visit. */
export function pendingInvite(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("invite");
    if (fromUrl) {
      const clean = normalizeInvite(fromUrl);
      if (clean) localStorage.setItem(INVITE_KEY, clean);
    }
    return localStorage.getItem(INVITE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function normalizeInvite(v: string): string {
  return v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}
/** The keyboard for the identifier box: digits for a number, the e-mail layout otherwise. */
export function identifierInputMode(value: string): "tel" | "email" {
  return /^\s*[+\d]/.test(value) ? "tel" : "email";
}

const errorBox =
  "rounded-2xl bg-error/12 px-3 py-2 text-[12.5px] text-error";

export function SignIn({
  onSignedIn,
  /** after signing in, make the relay the model provider as well */
  useAsModel = false,
  /** the button label for the final step */
  cta,
  autoFocus = true,
  /** when true, render the sign-in door frame: top bar, logo and headings */
  frame = false,
}: {
  onSignedIn: () => void | Promise<void>;
  useAsModel?: boolean;
  cta?: string;
  autoFocus?: boolean;
  frame?: boolean;
}) {
  const t = useT();
  const ids = useId();
  const cfg = useCloudConfig();
  const [mode, setMode] = useState<"code" | "password">("code");
  const [phase, setPhase] = useState<"id" | "code">("id");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"code" | "verify" | "login" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [gear, setGear] = useState(false);
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => {
    const code = pendingInvite();
    if (code) {
      setInvite(code);
      setInviteOpen(true);
    }
  }, []);

  const finish = async () => {
    if (useAsModel) {
      try {
        await api.cloudUseAsModel();
      } catch {
        /* the account is in; the model can be picked in Connections */
      }
    }
    await onSignedIn();
  };

  const sendCode = async () => {
    const id = identifier.trim();
    if (!id) return;
    setBusy("code");
    setError(null);
    try {
      await api.cloudCode(id);
      setPhase("code");
      setDigits(["", "", "", "", "", ""]);
      requestAnimationFrame(() => boxRefs.current[0]?.focus());
    } catch (e) {
      setError(t((e as Error).message));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    const id = identifier.trim();
    const code = digits.join("");
    if (!id || code.length < 6) return;
    setBusy("verify");
    setError(null);
    try {
      const r = await api.cloudVerify(id, code, invite.trim());
      // a brand-new account is owed two short steps (password, model source) — see FirstSignInSteps
      if (r.created) markFirstSignIn();
      setDigits(["", "", "", "", "", ""]);
      setPhase("id");
      try {
        localStorage.removeItem(INVITE_KEY);
      } catch {
        /* storage may be off */
      }
      await finish();
    } catch (e) {
      setError(t((e as Error).message));
    } finally {
      setBusy(null);
    }
  };

  const login = async () => {
    const id = identifier.trim();
    if (!id || !password) return;
    setBusy("login");
    setError(null);
    try {
      await api.cloudLogin(id, password);
      setPassword("");
      await finish();
    } catch (e) {
      setError(t((e as Error).message));
    } finally {
      setBusy(null);
    }
  };

  const goBack = () => {
    if (mode === "password") {
      setMode("code");
      return;
    }
    if (phase === "code") {
      setPhase("id");
      setDigits(["", "", "", "", "", ""]);
      return;
    }
    try {
      if (window.history.length > 1) window.history.back();
    } catch {
      /* nowhere to go back to */
    }
  };

  const setDigit = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) boxRefs.current[i + 1]?.focus();
  };

  const onBoxKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      boxRefs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") void verify();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!pasted.length) return;
    e.preventDefault();
    setDigits((prev) => prev.map((_, i) => pasted[i] ?? ""));
    boxRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const label = cta ?? t("Confirm");
  const hasIdentifier = identifier.trim().length > 0;
  // The mainland-China SMS note stays on the sign-in forms used after sign-in; the
  // login door itself keeps the strict six-element composition.
  const showSmsNote = !frame && mode === "code" && phase === "id" && (!isMainland() || looksLikeForeignNumber(identifier));
  // Continue: primary fill with white text once the field has content, the pale
  // primary (primary at low alpha) while it is empty.
  const continueCls = hasIdentifier
    ? cx(primaryBtn, "mt-4 w-full")
    : "mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-accent-soft px-8 text-sm font-medium text-accent-soft-fg transition disabled:opacity-40";

  return (
    <div className="flex w-full flex-col">
      {frame && (
        <div className="safe-top flex items-center justify-between pt-4">
          <button
            type="button"
            aria-label={t("Back")}
            onClick={goBack}
            className="grid size-11 place-items-center rounded-full border border-border bg-surface text-fg"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="relative">
            <button
              type="button"
              aria-label={t("Settings")}
              onClick={() => setGear((v) => !v)}
              className="grid size-11 place-items-center rounded-full border border-border bg-surface text-fg"
            >
              <Settings size={20} />
            </button>
            {gear && (
              <>
                <button type="button" aria-hidden tabIndex={-1} onClick={() => setGear(false)} className="fixed inset-0 z-10 cursor-default" />
                <div className="absolute right-0 top-13 z-20 w-52 rounded-2xl border border-border bg-surface p-1.5 shadow-md">
                  <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted">{t("Appearance")}</p>
                  {(["light", "dark", "system"] as ThemeSetting[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setThemeSetting(s);
                        setGear(false);
                      }}
                      className={cx(
                        "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[13.5px]",
                        getThemeSetting() === s ? "bg-surface-2 font-medium" : "hover:bg-surface-2/60"
                      )}
                    >
                      {t(s === "light" ? "Light" : s === "dark" ? "Dark" : "System")}
                      {getThemeSetting() === s && <span aria-hidden>✓</span>}
                    </button>
                  ))}
                  <a
                    href={PRIVACY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block rounded-xl px-2.5 py-2 text-[13.5px] hover:bg-surface-2/60"
                  >
                    {t("Privacy policy")}
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {frame && (
        <div className="mt-6 flex flex-col items-center">
          <BareMark size={64} />
          <h1
            className={
              phase === "code"
                ? "mt-5 text-center text-[26px] font-bold tracking-tight"
                : "mt-5 text-center text-headline-sm text-fg"
            }
          >
            {phase === "code" ? t("Enter your sign-up code") : t("Welcome to Wevvy")}
          </h1>
        </div>
      )}

      {mode === "password" ? (
        <form
          className="mt-6 w-full space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void login();
          }}
        >
          <input
            id={`${ids}-id`}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            inputMode={identifierInputMode(identifier)}
            autoComplete="username"
            autoFocus={autoFocus}
            placeholder={t("Mobile number or email")}
            className={inputCls}
          />
          <input
            id={`${ids}-password`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder={t("Password")}
            className={inputCls}
          />
          {error && <div role="alert" className={errorBox}>{error}</div>}
          <button type="submit" disabled={busy !== null || !identifier.trim() || !password} className={cx(primaryBtn, "w-full")}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null} {t("Sign in")}
          </button>
          <button
            type="button"
            onClick={() => setMode("code")}
            className="mx-auto block pt-1 text-[13px] text-muted underline-offset-2 hover:underline"
          >
            {t("Get a sign-in code instead")}
          </button>
        </form>
      ) : phase === "id" ? (
        <form
          className="mt-6 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <input
            id={`${ids}-id`}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            inputMode={identifierInputMode(identifier)}
            autoComplete="username"
            autoFocus={autoFocus}
            placeholder={t("Mobile number or email")}
            className={inputCls}
          />
          <p className="mt-2.5 px-1 text-center text-[12px] leading-relaxed text-muted">
            {t("By using your mobile number, you may receive SMS notifications from us.")}{" "}
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-link underline-offset-2 hover:underline">
              {t("Learn more")}
            </a>
          </p>
          {showSmsNote && (
            <p className="mt-1.5 px-1 text-center text-[12px] leading-relaxed text-muted">
              {t("Text codes reach mainland-China numbers only. Email is the reliable route.")}
            </p>
          )}
          {error && <div role="alert" className={cx(errorBox, "mt-2")}>{error}</div>}
          <button type="submit" disabled={busy !== null} className={continueCls}>
            {busy === "code" ? <Loader2 size={16} className="animate-spin" /> : null} {t("Continue")}
          </button>
          {!frame && (
            <button
              type="button"
              onClick={() => setMode("password")}
              className="mx-auto block pt-3 text-[13px] text-muted underline-offset-2 hover:underline"
            >
              {t("Sign in with a password instead")}
            </button>
          )}
        </form>
      ) : (
        <div className="mt-4 w-full">
          <p className="px-1 text-center text-[13.5px] leading-relaxed text-muted">
            {t("We sent a code to {id}.", { id: identifier.trim() })}{" "}
            {t("If it does not show up, check spam and your social folder.")}{" "}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void sendCode()}
              className="font-medium text-link underline-offset-2 hover:underline disabled:opacity-50"
            >
              {t("Resend code")}
            </button>
          </p>
          <div className="mt-5 flex justify-center gap-2" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxRefs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onBoxKeyDown(i, e)}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : undefined}
                aria-label={t("Digit {n}", { n: i + 1 })}
                className="h-16 w-14 rounded-2xl bg-input text-center text-[22px] font-semibold text-fg outline-none focus:ring-2 focus:ring-accent/50"
              />
            ))}
          </div>
          {inviteOpen ? (
            <div className="mt-4">
              <label htmlFor={`${ids}-invite`} className="text-[12px] text-muted">{t("Invite code (optional)")}</label>
              <input
                id={`${ids}-invite`}
                value={invite}
                onChange={(e) => setInvite(normalizeInvite(e.target.value))}
                autoComplete="off"
                placeholder="ABCD2345"
                className={cx(inputCls, "mt-1 tracking-[0.2em] uppercase")}
              />
              <p className="mt-1.5 text-[12px] text-muted">{t("A friend's code counts for a new account: you both get {invite} after your first request.", { invite: dollars(cfg.invite_bonus_cny ?? 5, undefined, cfg.usd_cny, 0) })}</p>
            </div>
          ) : (
            <button type="button" onClick={() => setInviteOpen(true)} className="mx-auto mt-4 block text-[12px] text-muted underline-offset-2 hover:underline">
              {t("Have an invite code?")}
            </button>
          )}
          {error && <div role="alert" className={cx(errorBox, "mt-3")}>{error}</div>}
          <button
            type="button"
            disabled={busy !== null || digits.join("").length < 6}
            onClick={() => void verify()}
            className={cx(primaryBtn, "mt-4 w-full")}
          >
            {busy === "verify" ? <Loader2 size={16} className="animate-spin" /> : null} {label}
          </button>
        </div>
      )}
    </div>
  );
}
