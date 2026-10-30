import { HeartHandshake } from "lucide-react";
import { useT } from "../i18n";
import { cx } from "../util";

/**
 * The notice about the free allowance, said plainly: free to use, what the allowance
 * is and who pays, what is kept, and that the account can be deleted any time.
 */
export function CommunityNotice({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useT();
  return (
    <section className={cx("rounded-[22px] border border-accent/25 bg-accent/[0.06] p-4 dark:bg-accent/[0.10]", className)}>
      <div className="flex items-start gap-2 text-[13.5px] font-semibold">
        <HeartHandshake size={16} className="mt-0.5 shrink-0 text-accent" />
        <span className="min-w-0 flex-1 leading-snug">{t("Free to use")}</span>
      </div>
      <p className={cx("mt-1.5 leading-relaxed text-fg/85", compact ? "text-[12.5px]" : "text-[13px]")}>
        {t(
          "wevvy is free to use. Sign in with a phone number or an e-mail and the model comes with a free allowance; when it is gone, use your own key (Alibaba Cloud Bailian in mainland China, OpenRouter elsewhere). Nothing is sold; what the relay keeps is in the privacy policy, and Settings → Data controls is yours. Delete the account whenever you like.",
        )}
      </p>
    </section>
  );
}
