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
