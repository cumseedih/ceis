import { afterEach, describe, expect, it } from "vitest";
import { getLocale, setLocaleSetting, t } from "./index";

afterEach(() => setLocaleSetting("en"));

describe("t", () => {
  it("returns the English key when there is no translation", () => {
    setLocaleSetting("en");
    expect(t("Nothing here")).toBe("Nothing here");
    expect(t("Hi, {name}", { name: "Sam" })).toBe("Hi, Sam");
  });

  it("leaves unknown placeholders alone rather than printing undefined", () => {
    setLocaleSetting("en");
    expect(t("Due in {n} days")).toBe("Due in {n} days");
  });

  it("always resolves to English: auto and explicit alike", () => {
    setLocaleSetting("auto");
    expect(getLocale()).toBe("en");
    expect(t("Feed")).toBe("Feed");
    setLocaleSetting("en");
    expect(getLocale()).toBe("en");
  });
});

describe("localLabel", () => {
  it("keeps the fixed part and the user's words", async () => {
    const { localLabel } = await import("./index");
    setLocaleSetting("en");
    expect(localLabel("Working on your goal: Run a 10k")).toBe("Working on your goal: Run a 10k");
    expect(localLabel("Reminder: call mum")).toBe("Reminder: call mum");
    expect(localLabel("Tidied memory")).toBe("Tidied memory");
    expect(localLabel("Something else")).toBe("Something else");
    expect(localLabel("Check-in: Japanese")).toBe("Check-in: Japanese");
  });
});

describe("localReason", () => {
  it("says why the Sentinel asked, keeping the tool and the target", async () => {
    const { localReason } = await import("./index");
    setLocaleSetting("en");
    expect(localReason("'shell' is in always_ask_tools")).toBe("shell is on your always-ask list");
    expect(localReason("risk level is 'sensitive' (mode=ask)")).toBe("an action rated sensitive, in ask mode");
    expect(localReason("auto mode: approval skipped")).toBe("auto mode: not asked");
    expect(localReason("covered by your 'always' permission for shell:ls")).toBe("covered by your always permission for shell:ls");
    expect(localReason("matched rule tool='shell' match=rm")).toBe("matched rule tool='shell' match=rm");
  });
});

describe("localDetail", () => {
  it("fills the number into the sentence", async () => {
    const { localDetail } = await import("./index");
    setLocaleSetting("en");
    expect(localDetail("the file is larger than 25 MB")).toBe("The file is larger than 25 MB.");
    expect(localDetail("empty file")).toBe("empty file");
  });
});
