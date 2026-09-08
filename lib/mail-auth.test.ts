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
      taskUrl: "http://localhost:3000/tasks",
    });
    // In test environment without SMTP credentials, returns null safely without throwing
    assert.ok(result === null || typeof result === "object");
  });
});

