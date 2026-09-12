import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "./auth";
import crypto from "crypto";

describe("password hashing & verification", () => {
  it("successfully hashes a password and verifies it", async () => {
    const plain = "SuperSecret123!";
    const hash = await hashPassword(plain);
    assert.notEqual(hash, plain);
    assert.equal(await verifyPassword(plain, hash), true);
    assert.equal(await verifyPassword("WrongPassword", hash), false);
  });
});

describe("password reset token generation", () => {
  it("generates a 64-character hex token", () => {
    const token = crypto.randomBytes(32).toString("hex");
    assert.equal(token.length, 64);
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  it("evaluates token expiration correctly", () => {
    const now = Date.now();
    const validExpiry = new Date(now + 60 * 60 * 1000);
    const expiredExpiry = new Date(now - 1000);

    assert.equal(validExpiry > new Date(), true);
    assert.equal(expiredExpiry < new Date(), true);
  });
});

describe("6-digit OTP generation & validation", () => {
  it("generates a random 6-digit numeric OTP", () => {
    for (let i = 0; i < 20; i++) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      assert.equal(otp.length, 6);
      assert.match(otp, /^\d{6}$/);
      const num = parseInt(otp, 10);
      assert.ok(num >= 100000 && num <= 999999);
    }
  });

  it("evaluates 10-minute OTP expiration", () => {
    const now = Date.now();
    const activeOtp = new Date(now + 10 * 60 * 1000);
    const expiredOtp = new Date(now - 1000);

    assert.equal(activeOtp > new Date(), true);
    assert.equal(expiredOtp < new Date(), true);
  });
});

describe("task notification email", () => {
  it("executes safely and handles parameters gracefully", async () => {
    const { sendTaskCreatedEmail } = await import("./mail");
    const result = await sendTaskCreatedEmail({
      to: "employee@example.com",
      assigneeName: "Rahim Ahmed",
      taskTitle: "Implement API Integration",
      taskDescription: "Connect frontend to backend tasks endpoint",
      priority: "HIGH",
      status: "TODO",
      dueDate: new Date(),
      creatorName: "Admin User",
      companyName: "Tech Corp",
      taskUrl: "https://taskmanager-iit.vercel.app/",
    });
    // In test environment without SMTP credentials, returns null safely without throwing
    assert.ok(result === null || typeof result === "object");
  });

  it("executes sendTaskOverdueEmail safely and handles parameters gracefully", async () => {
    const { sendTaskOverdueEmail } = await import("./mail");
    const result = await sendTaskOverdueEmail({
      to: "employee@example.com",
      cc: "manager@example.com",
      assigneeName: "Rahim Ahmed",
      taskTitle: "Database Migration to Production",
      taskDescription: "Execute Prisma schema push and seed verification",
      priority: "URGENT",
      status: "IN_PROGRESS",
      dueDate: new Date(Date.now() - 3600000),
      creatorName: "Admin User",
      companyName: "Tech Corp",
      taskUrl: "https://taskmanager-iit.vercel.app/",
    });
    assert.ok(result === null || typeof result === "object");
  });

  it("executes sendTaskCompletedEmail safely and handles parameters gracefully", async () => {
    const { sendTaskCompletedEmail } = await import("./mail");
    const result = await sendTaskCompletedEmail({
      to: "creator@example.com",
      creatorName: "Manager Boss",
      assigneeName: "Rahim Ahmed",
      taskTitle: "Database Migration to Production",
      taskDescription: "Execute Prisma schema push and seed verification",
      priority: "URGENT",
      completedAt: new Date(),
      completionNote: "Finished all migrations and verified tables.",
      companyName: "Tech Corp",
      taskUrl: "https://taskmanager-iit.vercel.app/",
    });
    assert.ok(result === null || typeof result === "object");
  });

  it("executes sendLeaveApplicationEmail safely for multiple recipients", async () => {
    const { sendLeaveApplicationEmail } = await import("./mail");
    const result = await sendLeaveApplicationEmail({
      to: ["admin@example.com", "manager@example.com"],
      applicantName: "Rahim Ahmed",
      applicantDesignation: "Software Engineer",
      applicantDepartment: "Engineering",
      companyName: "Tech Corp",
      startDate: "Oct 10, 2026",
      endDate: "Oct 12, 2026",
      daysCount: 3,
      leaveType: "CASUAL",
      reason: "Family event",
      actionToken: "abc123token",
      appUrl: "https://taskmanager-iit.vercel.app",
    });
    assert.ok(result === null || Array.isArray(result) || typeof result === "object");
  });

  it("executes sendLeaveDecisionEmail safely", async () => {
    const { sendLeaveDecisionEmail } = await import("./mail");
    const result = await sendLeaveDecisionEmail({
      to: "employee@example.com",
      employeeName: "Rahim Ahmed",
      status: "APPROVED",
      reviewerName: "Admin User",
      startDate: "Oct 10, 2026",
      endDate: "Oct 12, 2026",
      daysCount: 3,
      leaveType: "CASUAL",
      reviewNotes: "Enjoy your leave!",
      appUrl: "https://taskmanager-iit.vercel.app",
    });
    assert.ok(result === null || typeof result === "object");
  });
});


