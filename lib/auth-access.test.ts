import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccessTask, canDeleteTask, canViewPenaltyAndOvertime, canAssignTaskToUser } from "./access";
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
  it("lets super admins access any task", () => {
    const ok = canAccessTask(user({ role: "SUPER_ADMIN", companyId: null }), {
      companyId: "other",
      assigneeId: "someone",
    });
    assert.equal(ok, true);
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

  it("allows employees to access task if listed in assignees array", () => {
    const ok = canAccessTask(user({ id: "emp3", role: "EMPLOYEE" }), {
      companyId: "c1",
      assigneeId: "emp1",
      assignees: [{ userId: "emp1" }, { userId: "emp3" }],
    });
    assert.equal(ok, true);
  });
});

describe("canDeleteTask", () => {
  it("allows super admins to delete tasks", () => {
    assert.equal(canDeleteTask("SUPER_ADMIN"), true);
  });

  it("allows admins to delete tasks", () => {
    assert.equal(canDeleteTask("ADMIN"), true);
  });

  it("allows managers to delete tasks", () => {
    assert.equal(canDeleteTask("MANAGER"), true);
  });

  it("strictly blocks regular employees from deleting tasks", () => {
    assert.equal(canDeleteTask("EMPLOYEE"), false);
  });

  it("blocks null or empty role from deleting tasks", () => {
    assert.equal(canDeleteTask(null), false);
    assert.equal(canDeleteTask(undefined), false);
    assert.equal(canDeleteTask(""), false);
  });
});

describe("canViewPenaltyAndOvertime", () => {
  it("allows super admins, admins, and managers", () => {
    assert.equal(canViewPenaltyAndOvertime("SUPER_ADMIN"), true);
    assert.equal(canViewPenaltyAndOvertime("ADMIN"), true);
    assert.equal(canViewPenaltyAndOvertime("MANAGER"), true);
  });

  it("strictly blocks regular employees from viewing penalty and overtime", () => {
    assert.equal(canViewPenaltyAndOvertime("EMPLOYEE"), false);
  });

  it("blocks null, undefined, or empty roles", () => {
    assert.equal(canViewPenaltyAndOvertime(null), false);
    assert.equal(canViewPenaltyAndOvertime(undefined), false);
    assert.equal(canViewPenaltyAndOvertime(""), false);
  });
});

describe("canAssignTaskToUser", () => {
  it("allows admins and managers to assign to any employee or peer", () => {
    const admin = { id: "a1", role: "ADMIN", order: 0 };
    const emp = { id: "e1", role: "EMPLOYEE", order: 5 };
    assert.equal(canAssignTaskToUser(admin, emp).allowed, true);

    const manager = { id: "m1", role: "MANAGER", order: 2 };
    assert.equal(canAssignTaskToUser(manager, admin).allowed, true);
  });

  it("allows employees to assign tasks to themselves", () => {
    const emp = { id: "e1", role: "EMPLOYEE", order: 3 };
    assert.equal(canAssignTaskToUser(emp, emp).allowed, true);
  });

  it("strictly blocks employees from assigning tasks to managers or admins", () => {
    const emp = { id: "e1", role: "EMPLOYEE", order: 0 };
    const manager = { id: "m1", role: "MANAGER", order: 5 };
    const res = canAssignTaskToUser(emp, manager);
    assert.equal(res.allowed, false);
    assert.match(res.reason || "", /managers or admins/);
  });

  it("allows senior employee (earlier order) to assign to junior employee (later order)", () => {
    const seniorEmp = { id: "e1", role: "EMPLOYEE", order: 0 };
    const juniorEmp = { id: "e2", role: "EMPLOYEE", order: 1 };
    const res = canAssignTaskToUser(seniorEmp, juniorEmp);
    assert.equal(res.allowed, true);
  });

  it("strictly blocks junior employee from assigning to senior employee", () => {
    const juniorEmp = { id: "e2", role: "EMPLOYEE", order: 3 };
    const seniorEmp = { id: "e1", role: "EMPLOYEE", order: 1 };
    const res = canAssignTaskToUser(juniorEmp, seniorEmp);
    assert.equal(res.allowed, false);
    assert.match(res.reason || "", /senior or equal/);
  });

  it("blocks employee from assigning to peer with the same order", () => {
    const empA = { id: "e1", role: "EMPLOYEE", order: 2 };
    const empB = { id: "e2", role: "EMPLOYEE", order: 2 };
    const res = canAssignTaskToUser(empA, empB);
    assert.equal(res.allowed, false);
    assert.match(res.reason || "", /senior or equal/);
  });
});

