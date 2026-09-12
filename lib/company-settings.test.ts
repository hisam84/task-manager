import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

const updateCompanySettingsSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  overdueAlertRecipient: z.enum(["BOTH", "ASSIGNEE_ONLY"]).optional(),
  notifyAssignerOnTaskComplete: z.boolean().optional(),
  taskCompletionNotifyMode: z.enum(["AUTOMATIC", "MANUAL"]).optional(),
  enableTaskCreatedEmail: z.boolean().optional(),
  allowEmployeeTaskAssignment: z.boolean().optional(),
  defaultGraceMinutes: z.number().int().min(0).max(120).optional(),
  notifyAdminsOnLeaveRequest: z.boolean().optional(),
  companyId: z.string().optional(),
});

describe("Company Settings Schema Validation", () => {
  it("validates valid overdueAlertRecipient values", () => {
    const valid1 = updateCompanySettingsSchema.safeParse({ overdueAlertRecipient: "BOTH" });
    assert.equal(valid1.success, true);

    const valid2 = updateCompanySettingsSchema.safeParse({ overdueAlertRecipient: "ASSIGNEE_ONLY" });
    assert.equal(valid2.success, true);

    const invalid = updateCompanySettingsSchema.safeParse({ overdueAlertRecipient: "ALL_USERS" });
    assert.equal(invalid.success, false);
  });

  it("validates valid taskCompletionNotifyMode values", () => {
    const valid1 = updateCompanySettingsSchema.safeParse({ taskCompletionNotifyMode: "AUTOMATIC" });
    assert.equal(valid1.success, true);

    const valid2 = updateCompanySettingsSchema.safeParse({ taskCompletionNotifyMode: "MANUAL" });
    assert.equal(valid2.success, true);

    const invalid = updateCompanySettingsSchema.safeParse({ taskCompletionNotifyMode: "INSTANT" });
    assert.equal(invalid.success, false);
  });

  it("validates defaultGraceMinutes boundaries", () => {
    const validGrace = updateCompanySettingsSchema.safeParse({ defaultGraceMinutes: 15 });
    assert.equal(validGrace.success, true);

    const negativeGrace = updateCompanySettingsSchema.safeParse({ defaultGraceMinutes: -5 });
    assert.equal(negativeGrace.success, false);

    const excessiveGrace = updateCompanySettingsSchema.safeParse({ defaultGraceMinutes: 150 });
    assert.equal(excessiveGrace.success, false);
  });

  it("validates boolean flags correctly", () => {
    const valid = updateCompanySettingsSchema.safeParse({
      notifyAssignerOnTaskComplete: true,
      enableTaskCreatedEmail: false,
      allowEmployeeTaskAssignment: true,
      notifyAdminsOnLeaveRequest: false,
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.notifyAssignerOnTaskComplete, true);
      assert.equal(valid.data.enableTaskCreatedEmail, false);
      assert.equal(valid.data.allowEmployeeTaskAssignment, true);
      assert.equal(valid.data.notifyAdminsOnLeaveRequest, false);
    }
  });
});

describe("Overdue Alert Recipient logic", () => {
  it("includes CC when overdueAlertRecipient is BOTH", () => {
    const company = { overdueAlertRecipient: "BOTH" };
    const creatorEmail: string = "manager@company.com";
    const recipientEmail: string = "employee@company.com";

    const notifyAssigner = company.overdueAlertRecipient !== "ASSIGNEE_ONLY";
    let ccEmail: string | undefined = undefined;
    if (notifyAssigner && creatorEmail && creatorEmail.includes("@") && recipientEmail !== creatorEmail) {
      ccEmail = creatorEmail;
    }

    assert.equal(ccEmail, "manager@company.com");
  });

  it("omits CC when overdueAlertRecipient is ASSIGNEE_ONLY", () => {
    const company = { overdueAlertRecipient: "ASSIGNEE_ONLY" };
    const creatorEmail: string = "manager@company.com";
    const recipientEmail: string = "employee@company.com";

    const notifyAssigner = company.overdueAlertRecipient !== "ASSIGNEE_ONLY";
    let ccEmail: string | undefined = undefined;
    if (notifyAssigner && creatorEmail && creatorEmail.includes("@") && recipientEmail !== creatorEmail) {
      ccEmail = creatorEmail;
    }

    assert.equal(ccEmail, undefined);
  });
});
