import { describe, expect, it } from "vitest";
import { describeStatus, statusCode, EDIT_WAITING } from "../lib/statusCodes";

// Codes and kinds from the backend's round 4 answer.
describe("describeStatus", () => {
  it("colours by the code's kind and prefers the server's own name", () => {
    expect(describeStatus(1, "Active")).toEqual({ label: "Active", tone: "active" });
    expect(describeStatus(9, "Draft")).toEqual({ label: "Draft", tone: "draft" });
    expect(describeStatus(13)).toEqual({ label: "Inactive", tone: "inactive" });
    expect(describeStatus(3).tone).toBe("pending");
    expect(describeStatus(6).tone).toBe("rejected");
    expect(describeStatus(8).tone).toBe("inactive");
  });

  it("returns null for an unknown code, so callers fall back to the text", () => {
    expect(describeStatus(10)).toBeNull();
    expect(describeStatus("x")).toBeNull();
    expect(describeStatus(undefined)).toBeNull();
  });
});

describe("statusCode", () => {
  it("reads numeric strings, and knows the edit-waiting code", () => {
    expect(statusCode("3")).toBe(EDIT_WAITING);
    expect(statusCode(99)).toBeNull();
  });
});
