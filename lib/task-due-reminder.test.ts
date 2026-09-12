import { describe, it } from "node:test";
import assert from "node:assert";
import { shouldSendDueReminder, TWO_HOURS_MS } from "./task-due-reminder";

describe("2-Hour Pre-Overdue Task Reminder Logic", () => {
  const baseNow = new Date("2026-09-12T14:00:00.000Z");

  it("sends reminder when status is TODO, total time >= 2h, and exactly within 2-hour window", () => {
    const createdAt = new Date(baseNow.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago (total duration: 5.5 hours)
    const dueDate = new Date(baseNow.getTime() + 1.5 * 60 * 60 * 1000); // 1.5 hours in the future (within 2-hour window)

    const shouldSend = shouldSendDueReminder({
      status: "TODO",
      dueDate,
      createdAt,
      dueReminderNotifiedAt: null,
      now: baseNow,
    });

    assert.strictEqual(shouldSend, true);
  });

  it("does NOT send reminder if task status is IN_PROGRESS", () => {
    const createdAt = new Date(baseNow.getTime() - 4 * 60 * 60 * 1000);
    const dueDate = new Date(baseNow.getTime() + 1 * 60 * 60 * 1000);

    const shouldSend = shouldSendDueReminder({
      status: "IN_PROGRESS",
      dueDate,
      createdAt,
      dueReminderNotifiedAt: null,
      now: baseNow,
    });

    assert.strictEqual(shouldSend, false);
  });

  it("does NOT send reminder if task status is DONE or CANCELLED", () => {
    const createdAt = new Date(baseNow.getTime() - 4 * 60 * 60 * 1000);
    const dueDate = new Date(baseNow.getTime() + 1 * 60 * 60 * 1000);

    assert.strictEqual(
      shouldSendDueReminder({
        status: "DONE",
        dueDate,
        createdAt,
        dueReminderNotifiedAt: null,
        now: baseNow,
      }),
      false
    );

    assert.strictEqual(
      shouldSendDueReminder({
        status: "CANCELLED",
        dueDate,
        createdAt,
        dueReminderNotifiedAt: null,
        now: baseNow,
      }),
      false
    );
  });

  it("does NOT send reminder if total task duration is less than 2 hours ('টাস্কের টাইম ২ ঘন্টা না থাকলে মেইল যাবে না')", () => {
    // Created 30 minutes ago with deadline in 30 minutes (total allotted duration: 1 hour)
    const createdAt = new Date(baseNow.getTime() - 30 * 60 * 1000);
    const dueDate = new Date(baseNow.getTime() + 30 * 60 * 1000);

    const shouldSend = shouldSendDueReminder({
      status: "TODO",
      dueDate,
      createdAt,
      dueReminderNotifiedAt: null,
      now: baseNow,
    });

    assert.strictEqual(shouldSend, false);
  });

  it("does NOT send reminder if deadline is more than 2 hours away", () => {
    const createdAt = new Date(baseNow.getTime() - 1 * 60 * 60 * 1000);
    const dueDate = new Date(baseNow.getTime() + 3 * 60 * 60 * 1000); // 3 hours away

    const shouldSend = shouldSendDueReminder({
      status: "TODO",
      dueDate,
      createdAt,
      dueReminderNotifiedAt: null,
      now: baseNow,
    });

    assert.strictEqual(shouldSend, false);
  });

  it("does NOT send reminder if task is already overdue (now >= dueDate)", () => {
    const createdAt = new Date(baseNow.getTime() - 5 * 60 * 60 * 1000);
    const dueDate = new Date(baseNow.getTime() - 10 * 60 * 1000); // 10 minutes past due

    const shouldSend = shouldSendDueReminder({
      status: "TODO",
      dueDate,
      createdAt,
      dueReminderNotifiedAt: null,
      now: baseNow,
    });

    assert.strictEqual(shouldSend, false);
  });

  it("does NOT send duplicate reminder if already notified (dueReminderNotifiedAt is set)", () => {
    const createdAt = new Date(baseNow.getTime() - 4 * 60 * 60 * 1000);
    const dueDate = new Date(baseNow.getTime() + 1 * 60 * 60 * 1000);

    const shouldSend = shouldSendDueReminder({
      status: "TODO",
      dueDate,
      createdAt,
      dueReminderNotifiedAt: new Date(baseNow.getTime() - 30 * 60 * 1000),
      now: baseNow,
    });

    assert.strictEqual(shouldSend, false);
  });
});
