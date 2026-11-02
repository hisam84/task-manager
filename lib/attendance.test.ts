import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateLateMinutes,
  calculateLatePenalty,
  calculateOvertimeMinutes,
  calculateWorkingMinutes,
  computeDailyAttendanceMetrics,
  getEffectiveShiftForDate,
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

test("calculateOvertimeMinutes - calculates early arrival and late departure based on shift", () => {
  // Shift 14:00 to 18:00 (4 hours = 240 mins). In: 09:00, Out: 18:00 -> 5 hours early (300 mins overtime)
  assert.equal(calculateOvertimeMinutes("18:00", "18:00", "09:00", "14:00"), 300);

  // Shift 14:00 to 18:00. In: 10:20, Out: 19:00 -> 3h 40m early + 1h late = 4h 40m (280 mins overtime)
  assert.equal(calculateOvertimeMinutes("19:00", "18:00", "10:20", "14:00"), 280);

  // Shift 09:00 to 18:00. In: 08:30, Out: 19:30 -> 30m early + 1h 30m late = 2h (120 mins overtime)
  assert.equal(calculateOvertimeMinutes("19:30", "18:00", "08:30", "09:00"), 120);

  // Weekend or Holiday work: 09:00 to 14:00 -> 300 mins overtime
  assert.equal(calculateOvertimeMinutes("14:00", "18:00", "09:00", "09:00", true), 300);

  // Overnight shift 20:00 to 04:00. In: 19:00, Out: 05:00 -> 1h early + 1h late = 2h (120 mins overtime)
  assert.equal(calculateOvertimeMinutes("05:00", "04:00", "19:00", "20:00"), 120);
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

test("computeDailyAttendanceMetrics - lateInformed waives late penalty to 0 while keeping LATE status", () => {
  // Late by 30 mins: standard penalty is 30
  const regularLate = computeDailyAttendanceMetrics({
    inTime: "09:30",
    outTime: "18:00",
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    lateInformed: false,
  });
  assert.equal(regularLate.status, "LATE");
  assert.equal(regularLate.lateMinutes, 30);
  assert.equal(regularLate.latePenalty, 30);

  // When lateInformed is true, penalty must be 0
  const informedLate = computeDailyAttendanceMetrics({
    inTime: "09:30",
    outTime: "18:00",
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    lateInformed: true,
  });
  assert.equal(informedLate.status, "LATE");
  assert.equal(informedLate.lateMinutes, 30);
  assert.equal(informedLate.latePenalty, 0);
});

test("getEffectiveShiftForDate - falls back to single shift and Friday weekend when no schedule", () => {
  const userConfig = {
    shift: {
      name: "Day Shift",
      startTime: "10:00",
      endTime: "19:00",
      graceMinutes: 20,
    },
  };

  // 2026-11-06 is a Friday (dayOfWeek = 5)
  const fridayDate = new Date("2026-11-06T00:00:00.000Z");
  const friResult = getEffectiveShiftForDate(userConfig, fridayDate);
  assert.equal(friResult.isWeekend, true);
  assert.equal(friResult.shiftStartTime, "10:00");

  // 2026-11-02 is a Monday (dayOfWeek = 1)
  const mondayDate = new Date("2026-11-02T00:00:00.000Z");
  const monResult = getEffectiveShiftForDate(userConfig, mondayDate);
  assert.equal(monResult.isWeekend, false);
  assert.equal(monResult.shiftStartTime, "10:00");
  assert.equal(monResult.shiftEndTime, "19:00");
  assert.equal(monResult.graceMinutes, 20);
});

test("getEffectiveShiftForDate - uses weekly schedule day configuration", () => {
  const userConfig = {
    shift: {
      name: "Fallback Shift",
      startTime: "09:00",
      endTime: "18:00",
    },
    shiftSchedule: {
      id: "sched_1",
      name: "Custom Support Schedule",
      days: [
        {
          dayOfWeek: 0, // Sunday: Morning Shift
          isWeekend: false,
          shift: { name: "Morning", startTime: "07:00", endTime: "15:00", graceMinutes: 10 },
        },
        {
          dayOfWeek: 1, // Monday: Evening Shift
          isWeekend: false,
          shift: { name: "Evening", startTime: "15:00", endTime: "23:00", graceMinutes: 15 },
        },
        {
          dayOfWeek: 5, // Friday: Working Shift (not weekend in this custom schedule!)
          isWeekend: false,
          shift: { name: "Friday Special", startTime: "08:00", endTime: "12:00", graceMinutes: 10 },
        },
        {
          dayOfWeek: 6, // Saturday: Off Day
          isWeekend: true,
          shift: null,
        },
      ],
    },
  };

  // Sunday (2026-11-01) -> Morning Shift
  const sunDate = new Date("2026-11-01T00:00:00.000Z");
  const sunRes = getEffectiveShiftForDate(userConfig, sunDate);
  assert.equal(sunRes.isWeekend, false);
  assert.equal(sunRes.shiftStartTime, "07:00");
  assert.equal(sunRes.shiftEndTime, "15:00");

  // Monday (2026-11-02) -> Evening Shift
  const monDate = new Date("2026-11-02T00:00:00.000Z");
  const monRes = getEffectiveShiftForDate(userConfig, monDate);
  assert.equal(monRes.isWeekend, false);
  assert.equal(monRes.shiftStartTime, "15:00");
  assert.equal(monRes.shiftEndTime, "23:00");

  // Friday (2026-11-06) -> Working Day according to template
  const friDate = new Date("2026-11-06T00:00:00.000Z");
  const friRes = getEffectiveShiftForDate(userConfig, friDate);
  assert.equal(friRes.isWeekend, false);
  assert.equal(friRes.shiftStartTime, "08:00");
  assert.equal(friRes.shiftEndTime, "12:00");

  // Saturday (2026-11-07) -> Weekend / Off Day
  const satDate = new Date("2026-11-07T00:00:00.000Z");
  const satRes = getEffectiveShiftForDate(userConfig, satDate);
  assert.equal(satRes.isWeekend, true);
});
