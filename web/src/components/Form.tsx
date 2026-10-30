import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../util";

/** One settings card: an icon, a title with a status pill, a one-line summary, a body that folds out. */
export function Card({
  icon,
  title,
  summary,
  status,
  open,
  onToggle,
  trailing,
  children,
}: {
  icon: ReactNode;
  title: string;
  summary: string;
  status: { text: string; tone: string };
  open: boolean;
  onToggle?: () => void;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  const head = (
    <>
      <span className="text-accent mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-semibold">{title}</span>
          <span
            className={cx(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              status.tone === "ok" &&
                "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
              status.tone === "warn" &&
                "bg-amber-500/15 text-amber-700 dark:text-amber-300",
              status.tone === "off" && "bg-surface-2 text-muted",
            )}
          >
            {status.text}
          </span>
        </span>
        <span className="block text-[12.5px] text-muted truncate">
          {summary}
        </span>
      </span>
      {trailing ??
        (onToggle ? (
          open ? (
            <ChevronUp size={18} className="text-muted" />
          ) : (
            <ChevronDown size={18} className="text-muted" />
          )
        ) : null)}
    </>
  );
  return (
    <section className="rounded-lg border border-border bg-surface">
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start gap-3 px-4 py-4 text-left"
        >
          {head}
        </button>
      ) : (
        <div className="flex w-full items-start gap-3 px-4 py-4">{head}</div>
      )}
      {(open || (!onToggle && children)) && children ? (
        <div className="px-4 pb-4 space-y-3">{children}</div>
      ) : null}
    </section>
  );
}

export const inputCls =
  "w-full rounded-full bg-input px-4 py-4 text-base text-fg outline-none transition placeholder:text-muted focus:ring-1 focus:ring-fg/15";
/** The multiline sibling of inputCls: the same input fill and text, 16px radius. */
export const textareaCls =
  "w-full rounded-2xl bg-input px-4 py-3 text-base text-fg outline-none transition placeholder:text-muted focus:ring-1 focus:ring-fg/15";
export const primaryBtn =
  "flex h-12 items-center justify-center gap-1.5 rounded-full bg-accent px-8 text-sm font-medium text-accent-fg transition disabled:opacity-40";
export const secondaryBtn =
  "flex h-12 items-center justify-center gap-1.5 rounded-full border border-border px-8 text-sm font-medium text-fg transition disabled:opacity-40";

/** A labelled switch with an optional hint under the label. */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="flex-1">
        <div className="text-[14px]">{label}</div>
        {hint && <div className="text-[12.5px] text-muted leading-snug">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50",
          checked ? "bg-accent" : "bg-surface-2 border border-border",
        )}
      >
        <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}
