export interface ShiftTimes {
  startTime: string; // "HH:mm" (24-hour format)
  endTime: string;   // "HH:mm"
  graceMinutes?: number;
}

/**
 * Converts "HH:mm" string into minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [hStr, mStr] = timeStr.trim().split(":");
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Converts total minutes into readable format e.g. "1h 30m" or "45m".
 */
export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Formats "HH:mm" 24-hour string to 12-hour AM/PM string, e.g. "09:00" -> "09:00 AM".
 */
export function formatTime12Hour(timeStr: string | null | undefined): string {
  if (!timeStr || !timeStr.includes(":")) return "--:--";
  const [hStr, mStr] = timeStr.trim().split(":");
  let hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Calculates late minutes based on shift start time and actual in-time.
 */
export function calculateLateMinutes(inTime: string, shiftStartTime: string): number {
  if (!inTime || !shiftStartTime) return 0;
  const inMin = timeStringToMinutes(inTime);
  const startMin = timeStringToMinutes(shiftStartTime);
  const diff = inMin - startMin;
  return diff > 0 ? diff : 0;
}

/**
 * Calculates late penalty strictly according to company rule:
 * - 0 to 15 minutes late: Exempted (0 penalty)
 * - 16 to 20 minutes late: 20
 * - 21 to 30 minutes late: 30
 * - 31+ minutes late: 30 + (t * 2) where t = lateMinutes - 30
 *
 * Example:
 * 31 mins = 30 + (1 * 2) = 32
 * 32 mins = 30 + (2 * 2) = 34
 */
export function calculateLatePenalty(lateMinutes: number): number {
  if (lateMinutes <= 15) {
    return 0;
  }
  if (lateMinutes <= 20) {
    return 20;
  }
  if (lateMinutes <= 30) {
    return 30;
  }
  const t = lateMinutes - 30;
  return 30 + (t * 2);
}

/**
 * Calculates overtime minutes when out-time exceeds shift end time.
 */
export function calculateOvertimeMinutes(outTime: string, shiftEndTime: string): number {
  if (!outTime || !shiftEndTime) return 0;
  const outMin = timeStringToMinutes(outTime);
  const endMin = timeStringToMinutes(shiftEndTime);

  // Normal daytime shift
  if (endMin >= 0) {
    const diff = outMin - endMin;
    return diff > 0 ? diff : 0;
  }
  return 0;
}

/**
 * Calculates total working duration in minutes between in-time and out-time.
 */
export function calculateWorkingMinutes(inTime: string, outTime: string): number {
  if (!inTime || !outTime) return 0;
  const inMin = timeStringToMinutes(inTime);
  const outMin = timeStringToMinutes(outTime);
  if (outMin >= inMin) {
    return outMin - inMin;
  }
  // Overnight span:
  return (1440 - inMin) + outMin;
}

/**
 * Compute full attendance day metrics against a shift.
 */
export function computeDailyAttendanceMetrics(params: {
  inTime?: string | null;
  outTime?: string | null;
  isHoliday?: boolean;
  isWeekend?: boolean;
  isLeave?: boolean;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
}) {
  const { inTime, outTime, isHoliday, isWeekend, isLeave, shiftStartTime, shiftEndTime } = params;

  if (isHoliday) {
    return {
      status: "HOLIDAY",
      lateMinutes: 0,
      latePenalty: 0,
      overtimeMinutes: 0,
      workingMinutes: inTime && outTime ? calculateWorkingMinutes(inTime, outTime) : 0,
    };
  }

  if (isLeave) {
    return {
      status: "LEAVE",
      lateMinutes: 0,
      latePenalty: 0,
      overtimeMinutes: 0,
      workingMinutes: inTime && outTime ? calculateWorkingMinutes(inTime, outTime) : 0,
    };
  }

  if (isWeekend) {
    return {
      status: "WEEKEND",
      lateMinutes: 0,
      latePenalty: 0,
      overtimeMinutes: 0,
      workingMinutes: inTime && outTime ? calculateWorkingMinutes(inTime, outTime) : 0,
    };
  }

  if (!inTime && !outTime) {
    return {
      status: "ABSENT",
      lateMinutes: 0,
      latePenalty: 0,
      overtimeMinutes: 0,
      workingMinutes: 0,
    };
  }

  const defaultStart = shiftStartTime || "09:00";
  const defaultEnd = shiftEndTime || "18:00";

  let lateMin = 0;
  let penalty = 0;
  if (inTime) {
    lateMin = calculateLateMinutes(inTime, defaultStart);
    penalty = calculateLatePenalty(lateMin);
  }

  let overtimeMin = 0;
  if (outTime) {
    overtimeMin = calculateOvertimeMinutes(outTime, defaultEnd);
  }

  let workingMin = 0;
  if (inTime && outTime) {
    workingMin = calculateWorkingMinutes(inTime, outTime);
  }

  const status = lateMin > 15 ? "LATE" : "PRESENT";

  return {
    status,
    lateMinutes: lateMin,
    latePenalty: penalty,
    overtimeMinutes: overtimeMin,
    workingMinutes: workingMin,
  };
}
