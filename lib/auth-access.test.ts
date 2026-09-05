import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccessTask } from "./access";
import type { SessionUser } from "./types";

function user(partial: Partial<SessionUser>): SessionUser {
  return {
    id: "u1",
    name: "Test",
    email: "t@example.com",
    role: "EMPLOYEE",
    companyId: "c1",
    ...partial,
  };
}

describe("canAccessTask", () => {
  it("does not let super admins access company tasks", () => {
    const ok = canAccessTask(user({ role: "SUPER_ADMIN", companyId: null }), {
      companyId: "other",
      assigneeId: "someone",
    });
    assert.equal(ok, false);
  });

  it("blocks employees from another user's task in the same company", () => {
    const ok = canAccessTask(user({ id: "emp1", role: "EMPLOYEE" }), {
      companyId: "c1",
      assigneeId: "emp2",
    });
    assert.equal(ok, false);
  });

  it("allows employees to access their assigned task", () => {
    const ok = canAccessTask(user({ id: "emp1", role: "EMPLOYEE" }), {
      companyId: "c1",
      assigneeId: "emp1",
    });
    assert.equal(ok, true);
  });

  it("blocks cross-tenant access even for admins", () => {
    const ok = canAccessTask(user({ role: "ADMIN", companyId: "c1" }), {
      companyId: "c2",
      assigneeId: "emp1",
    });
    assert.equal(ok, false);
  });

  it("allows company admins to access tasks in their company", () => {
    const ok = canAccessTask(user({ role: "ADMIN", companyId: "c1" }), {
      companyId: "c1",
      assigneeId: "emp1",
    });
    assert.equal(ok, true);
  });
});
