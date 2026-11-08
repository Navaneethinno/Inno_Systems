import { describe, expect, it } from "vitest";
import { formatIst, formatIstClock, formatIstTick, istIfDateTime, istInText } from "../lib/istTime";

const VALUE = "2026-11-08T13:40:00.000000Z";

describe("IST times", () => {
  it("shows an API date-time in IST, labelled", () => {
    expect(formatIst(VALUE)).toBe("8 Nov 2026, 19:10:00 IST");
    expect(formatIstClock(VALUE)).toBe("19:10:00 IST");
    expect(formatIstTick(VALUE)).toBe("19:10");
  });
  it("crosses midnight in IST", () => {
    expect(formatIst("2026-11-08T20:00:00.000000Z")).toBe("9 Nov 2026, 01:30:00 IST");
  });
  it("leaves date-only values as sent", () => {
    expect(formatIst("2026-11-08")).toBe("2026-11-08");
    expect(formatIstTick("2026-11-08")).toBe("2026-11-08");
  });
  it("handles empty and unreadable values", () => {
    expect(formatIst(null)).toBe("—");
    expect(formatIst("soon")).toBe("soon");
    expect(formatIstTick("")).toBe("");
  });
  it("changes only date-times in records and text", () => {
    expect(istIfDateTime("redis 7.2")).toBe("redis 7.2");
    expect(istIfDateTime(4)).toBe(4);
    expect(istIfDateTime(VALUE)).toBe("8 Nov 2026, 19:10:00 IST");
    expect(istInText("seen " + VALUE + " once")).toBe("seen 8 Nov 2026, 19:10:00 IST once");
  });
});
