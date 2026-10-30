import { describe, expect, it } from "vitest";
import { dollars } from "./money";

describe("dollars", () => {
  it("prefers the relay's own USD figure", () => {
    expect(dollars(50, 6.9, 7.2)).toBe("$6.90");
  });
  it("converts with the relay's rate when no USD figure came", () => {
    expect(dollars(14.4, undefined, 7.2)).toBe("$2.00");
  });
  it("falls back to yuan only when neither came (older relay)", () => {
    expect(dollars(14.4, undefined, 0)).toBe("¥14.40");
    expect(dollars(14.4, null, null)).toBe("¥14.40");
  });
  it("honours the digit count", () => {
    expect(dollars(50, 6.9, 7.2, 0)).toBe("$7");
  });
});
