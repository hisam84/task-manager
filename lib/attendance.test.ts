import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateLateMinutes,
  calculateLatePenalty,
  calculateOvertimeMinutes,
  calculateWorkingMinutes,
  computeDailyAttendanceMetrics,
} from "./attendance";

test("calculateLatePenalty - within 15 minutes grace period should be 0", () => {
  assert.equal(calculateLatePenalty(0), 0);
  assert.equal(calculateLatePenalty(5), 0);
  assert.equal(calculateLatePenalty(14), 0);
  assert.equal(calculateLatePenalty(15), 0);
});

test("calculateLatePenalty - 16 to 20 minutes should be flat 20", () => {
  assert.equal(calculateLatePenalty(16), 20);
  assert.equal(calculateLatePenalty(18), 20);
  assert.equal(calculateLatePenalty(20), 20);
});

test("calculateLatePenalty - 21 to 30 minutes should be flat 30", () => {
  assert.equal(calculateLatePenalty(21), 30);
  assert.equal(calculateLatePenalty(25), 30);
  assert.equal(calculateLatePenalty(30), 30);
});

test("calculateLatePenalty - 31+ minutes follows formula: 30 + (t * 2)", () => {
  // 31 minutes: t = 1 -> 30 + (1 * 2) = 32
  assert.equal(calculateLatePenalty(31), 32);
  // 32 minutes: t = 2 -> 30 + (2 * 2) = 34
  assert.equal(calculateLatePenalty(32), 34);
  // 40 minutes: t = 10 -> 30 + (10 * 2) = 50
  assert.equal(calculateLatePenalty(40), 50);
  // 60 minutes: t = 30 -> 30 + (30 * 2) = 90
  assert.equal(calculateLatePenalty(60), 90);
  // 90 minutes: t = 60 -> 30 + (60 * 2) = 150
  assert.equal(calculateLatePenalty(90), 150);
});

test("calculateLateMinutes - compares in-time to shift start time", () => {
  assert.equal(calculateLateMinutes("09:00", "09:00"), 0);
  assert.equal(calculateLateMinutes("08:50", "09:00"), 0);
  assert.equal(calculateLateMinutes("09:15", "09:00"), 15);
  assert.equal(calculateLateMinutes("09:22", "09:00"), 22);
  assert.equal(calculateLateMinutes("10:00", "09:00"), 60);
});

test("calculateOvertimeMinutes - compares out-time to shift end time", () => {
  assert.equal(calculateOvertimeMinutes("18:00", "18:00"), 0);
  assert.equal(calculateOvertimeMinutes("17:45", "18:00"), 0);
  assert.equal(calculateOvertimeMinutes("19:15", "18:00"), 75);
  assert.equal(calculateOvertimeMinutes("20:00", "18:00"), 120);
});

test("calculateWorkingMinutes - computes total duration", () => {
  assert.equal(calculateWorkingMinutes("09:00", "18:00"), 540); // 9 hours
  assert.equal(calculateWorkingMinutes("09:30", "18:15"), 525); // 8h 45m
});

test("computeDailyAttendanceMetrics - holiday has 0 penalty and status HOLIDAY", () => {
  const result = computeDailyAttendanceMetrics({
    inTime: "09:40",
    outTime: "18:00",
    isHoliday: true,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
  });
  assert.equal(result.status, "HOLIDAY");
  assert.equal(result.latePenalty, 0);
  assert.equal(result.lateMinutes, 0);
});

test("computeDailyAttendanceMetrics - leave has 0 penalty and status LEAVE", () => {
  const result = computeDailyAttendanceMetrics({
    inTime: null,
    outTime: null,
    isLeave: true,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
  });
  assert.equal(result.status, "LEAVE");
  assert.equal(result.latePenalty, 0);
  assert.equal(result.lateMinutes, 0);
});
