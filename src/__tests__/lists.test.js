import { describe, expect, it, vi, beforeEach } from "vitest";

const post = vi.fn();
vi.mock("../api/httpClient", () => ({ httpClient: { post: (...args) => post(...args) } }));

const { systemService } = await import("../features/system/services/systemService");
const { systemForms } = await import("../features/system/config/systemForms");
const { resolveApiPath } = await import("../api/endpoints");
const { isActiveRow } = await import("../hooks/useAuthStatusFilter");

describe("systemService.pageList", () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { data: [{ id: 1 }], pagination: { totalRecords: 1 } } });
  });

  it("sends page, limit, filter and search, and returns rows with pagination", async () => {
    const result = await systemService.pageList("/user/list", { page: 2, limit: 10, filter: "active", search: "astra" });
    expect(post).toHaveBeenCalledWith("/user/list", { page: 2, limit: 10, filter: "active", search: "astra" });
    expect(result).toEqual({ rows: [{ id: 1 }], pagination: { totalRecords: 1 } });
  });

  it("leaves out filter for the All tab and an empty search", async () => {
    await systemService.pageList("/user/list", { filter: "all", search: "" });
    expect(post).toHaveBeenCalledWith("/user/list", { page: 1, limit: 10 });
  });

  it("adds fixed params, e.g. one institution's modules", async () => {
    await systemService.pageList("/institution/module/list", { params: { inst_profile_id: 5 } });
    expect(post).toHaveBeenCalledWith("/institution/module/list", { inst_profile_id: 5, page: 1, limit: 10 });
  });
});

// The live bug: /user/list rows carry an unrelated `id` (12 on most of
// page 1), and the user's own is `user_id`.
describe("Users use user_id, never id", () => {
  const user = systemForms.user;
  const row = { id: 12, user_id: 30, username: "JamesPerry" };

  it("shows user_id in the ID column", () => {
    expect(user.columns.find((c) => c.label === "ID").render(row)).toBe(30);
  });

  it("deletes by user_id", () => {
    expect(user.buildDeletePayload(row)).toEqual({ userId: 30 });
  });

  it("edits by user_id", () => {
    expect(user.idField).toBe("user_id");
  });
});

describe("resolveApiPath", () => {
  it("adds /config except for /master and /aml", () => {
    expect(resolveApiPath("/user/list")).toBe("/config/user/list");
    expect(resolveApiPath("/master/country")).toBe("/master/country");
    expect(resolveApiPath("/aml/system/job/list")).toBe("/aml/system/job/list");
  });

  it("doesn't prefix a retried path twice", () => {
    expect(resolveApiPath("/config/user/list")).toBe("/config/user/list");
  });
});

// Per the backend, a record is live by its status; the last change being
// rejected (INNOVITEGRA: Active, EDIT_DEAUTH) doesn't make it inactive.
describe("isActiveRow", () => {
  it("goes by status_name, not the latest change", () => {
    expect(isActiveRow({ status_name: "Active", auth_status: "EDIT_DEAUTH" })).toBe(true);
    expect(isActiveRow({ status_name: "Draft", auth_status: "DRAFT" })).toBe(false);
  });

  it("falls back to auth_status when a row has no status_name", () => {
    expect(isActiveRow({ auth_status: "AUTHORIZED" })).toBe(true);
    expect(isActiveRow({ auth_status: "AUTH WAIT" })).toBe(false);
  });
});
