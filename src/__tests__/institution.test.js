import { describe, expect, it } from "vitest";
import { identifierCodes, identifierObject, languageCodes, languageObject } from "../lib/institutionShape";

// Shapes as /institution/profile/list returns them on UAT.
describe("institution edit prefill", () => {
  it("reads stored languages, default included", () => {
    expect(languageCodes({ default: "en", supported: ["en", "pt"] })).toEqual(["en", "pt"]);
    expect(languageCodes({ default: "fr", supported: ["en"] })).toEqual(["en", "fr"]);
    expect(languageCodes(["en", "ar"])).toEqual(["en", "ar"]);
    expect(languageCodes({})).toEqual([]);
  });

  it("reads stored login identifiers as the form's uppercase codes", () => {
    expect(identifierCodes({ email: true, mobile: true, username: true })).toEqual(["EMAIL", "MOBILE", "USERNAME"]);
    expect(identifierCodes({ username: true, email: false })).toEqual(["USERNAME"]);
    expect(identifierCodes(["MOBILE"])).toEqual(["MOBILE"]);
    expect(identifierCodes(null)).toEqual([]);
  });
});

describe("institution save shapes", () => {
  it("sends languages as { default, supported }", () => {
    expect(languageObject(["en", "pt"], "pt")).toEqual({ default: "pt", supported: ["en", "pt"] });
    expect(languageObject(["en", "pt"], "fr")).toEqual({ default: "en", supported: ["en", "pt"] });
    expect(languageObject([], "en")).toEqual({ default: "", supported: [] });
  });

  it("sends identifiers as lowercase flags", () => {
    expect(identifierObject(["USERNAME", "EMAIL"])).toEqual({ username: true, email: true });
  });
});
