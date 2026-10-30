import { SignIn } from "../components/SignIn";
import { useT } from "../i18n";
import { useStore } from "../store";

/**
 * The door: this runtime insists on a ceis Cloud account (cloud.required, the default),
 * so before anything else the person signs in with a code sent to their e-mail address.
 * The composition is strict: back and settings discs, the bare mark, the heading, one
 * pill input, the SMS notice, Continue. Nothing else.
 */
export function SignInGate() {
  const { refreshSettings, refreshHub, toast } = useStore();
  const t = useT();
  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[520px] flex-col overflow-y-auto bg-bg px-6 pb-8">
      <SignIn
        frame
        onSignedIn={async () => {
          toast(t("Signed in to ceis."));
          await Promise.all([refreshSettings(), refreshHub()]);
        }}
      />
    </div>
  );
}
