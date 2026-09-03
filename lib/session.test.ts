import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  checkLoginRateLimit,
  createSessionValue,
  parseSessionValue,
} from "./session";

describe("session signing", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-value-for-hmac";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
  });

  it("round-trips a signed user id", () => {
    const value = createSessionValue("user_123", 1_000_000);
    assert.equal(parseSessionValue(value, 1_000_000), "user_123");
  });

  it("rejects tampered signatures", () => {
    const value = createSessionValue("user_123", 1_000_000);
    const tampered = value.slice(0, -2) + "aa";
    assert.equal(parseSessionValue(tampered, 1_000_000), null);
  });

  it("rejects expired sessions", () => {
    const value = createSessionValue("user_123", 1_000_000);
    assert.equal(parseSessionValue(value, 1_000_000 + 8 * 24 * 60 * 60 * 1000), null);
  });

  it("rejects unsigned cookies when a secret is configured", () => {
    assert.equal(parseSessionValue("clxyzunsignedid", 1_000_000), null);
  });
});

describe("login rate limit", () => {
  it("allows bursts under the cap and blocks after", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 10; i += 1) {
      assert.equal(checkLoginRateLimit(key, 50), true);
    }
    assert.equal(checkLoginRateLimit(key, 50), false);
  });
});
