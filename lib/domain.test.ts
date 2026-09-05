import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAssignCompanyTasks,
  canCreateSelfTask,
  canDeleteDepartment,
  canEmployeeEditSelfTask,
  canEmployeeUpdateProgress,
  canManageCompanies,
  canManageDepartments,
  canManageEmployees,
  completionRate,
  effectiveTaskStatus,
  homePathForRole,
  isCompanyAdmin,
  isOverdue,
  isSuperAdmin,
  normalizeProgress,
  statusFromProgress,
} from "./domain";

describe("roles", () => {
  it("treats ADMIN and MANAGER as company admins", () => {
    assert.equal(isCompanyAdmin("ADMIN"), true);
    assert.equal(isCompanyAdmin("MANAGER"), true);
    assert.equal(isCompanyAdmin("EMPLOYEE"), false);
    assert.equal(isCompanyAdmin("SUPER_ADMIN"), false);
  });

  it("identifies super admin", () => {
    assert.equal(isSuperAdmin("SUPER_ADMIN"), true);
    assert.equal(isSuperAdmin("ADMIN"), false);
  });

  it("routes each role to the correct home path", () => {
    assert.equal(homePathForRole("SUPER_ADMIN"), "/super-admin");
    assert.equal(homePathForRole("ADMIN"), "/admin");
    assert.equal(homePathForRole("MANAGER"), "/admin");
    assert.equal(homePathForRole("EMPLOYEE"), "/employee");
  });

  it("limits company CRUD to super admin", () => {
    assert.equal(canManageCompanies("SUPER_ADMIN"), true);
    assert.equal(canManageCompanies("ADMIN"), false);
    assert.equal(canManageCompanies("EMPLOYEE"), false);
  });

  it("lets company admins manage departments and employees", () => {
    assert.equal(canManageDepartments("ADMIN"), true);
    assert.equal(canManageEmployees("ADMIN"), true);
    assert.equal(canManageDepartments("EMPLOYEE"), false);
    assert.equal(canManageEmployees("EMPLOYEE"), false);
    assert.equal(canManageDepartments("SUPER_ADMIN"), false);
    assert.equal(canManageEmployees("SUPER_ADMIN"), false);
  });

  it("lets company admins assign company tasks; employees cannot", () => {
    assert.equal(canAssignCompanyTasks("ADMIN"), true);
    assert.equal(canAssignCompanyTasks("MANAGER"), true);
    assert.equal(canAssignCompanyTasks("EMPLOYEE"), false);
    assert.equal(canAssignCompanyTasks("SUPER_ADMIN"), false);
  });

  it("lets only employees create self tasks", () => {
    assert.equal(canCreateSelfTask("EMPLOYEE"), true);
    assert.equal(canCreateSelfTask("ADMIN"), false);
    assert.equal(canCreateSelfTask("SUPER_ADMIN"), false);
  });
});

describe("task status and progress", () => {
  it("marks incomplete past-deadline tasks as overdue", () => {
    const due = new Date(Date.now() - 60_000);
    assert.equal(isOverdue({ status: "PENDING", dueDate: due }), true);
    assert.equal(isOverdue({ status: "IN_PROGRESS", dueDate: due }), true);
    assert.equal(isOverdue({ status: "COMPLETED", dueDate: due }), false);
    assert.equal(isOverdue({ status: "CANCELLED", dueDate: due }), false);
    assert.equal(isOverdue({ status: "PENDING", dueDate: null }), false);
    assert.equal(isOverdue({ status: "DONE", dueDate: due }), false);
  });

  it("exposes OVERDUE as an effective status without storing it", () => {
    const past = new Date(Date.now() - 86_400_000);
    assert.equal(effectiveTaskStatus({ status: "PENDING", dueDate: past }), "OVERDUE");
    assert.equal(effectiveTaskStatus({ status: "COMPLETED", dueDate: past }), "COMPLETED");
    assert.equal(effectiveTaskStatus({ status: "TODO", dueDate: past }), "OVERDUE");
    assert.equal(effectiveTaskStatus({ status: "DONE", dueDate: past }), "COMPLETED");
  });

  it("maps progress to status and completes at 100%", () => {
    assert.equal(statusFromProgress(0, "PENDING"), "PENDING");
    assert.equal(statusFromProgress(25, "PENDING"), "IN_PROGRESS");
    assert.equal(statusFromProgress(100, "IN_PROGRESS"), "COMPLETED");
    assert.equal(statusFromProgress(50, "CANCELLED"), "CANCELLED");
  });

  it("clamps progress between 0 and 100", () => {
    assert.equal(normalizeProgress(-10), 0);
    assert.equal(normalizeProgress(137), 100);
    assert.equal(normalizeProgress(50), 50);
  });

  it("computes completion rate to one decimal", () => {
    assert.equal(completionRate(0, 0), 0);
    assert.equal(completionRate(1, 2), 50);
    assert.equal(completionRate(2, 3), 66.7);
  });
});

describe("self-task and department rules", () => {
  it("lets an employee update progress only on their own tasks", () => {
    assert.equal(
      canEmployeeUpdateProgress("emp1", { assigneeId: "emp1" }),
      true
    );
    assert.equal(
      canEmployeeUpdateProgress("emp1", { assigneeId: "emp2" }),
      false
    );
  });

  it("lets an employee fully edit only self tasks they own", () => {
    assert.equal(
      canEmployeeEditSelfTask("emp1", { assigneeId: "emp1", isSelfTask: true }),
      true
    );
    assert.equal(
      canEmployeeEditSelfTask("emp1", { assigneeId: "emp1", isSelfTask: false }),
      false
    );
  });

  it("blocks department delete when employees or tasks remain", () => {
    assert.equal(canDeleteDepartment(0, 0), true);
    assert.equal(canDeleteDepartment(1, 0), false);
    assert.equal(canDeleteDepartment(0, 2), false);
  });
});
