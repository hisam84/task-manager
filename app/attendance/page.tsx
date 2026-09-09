"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { ShiftModal } from "@/components/shift-modal";
import { HolidayModal } from "@/components/holiday-modal";
import { AttendancePrintModal } from "@/components/attendance-print-modal";
import { ApplyLeaveModal } from "@/components/apply-leave-modal";
import { LeaveRequestsModal } from "@/components/leave-requests-modal";
import { Footer } from "@/components/footer";
import { canViewPenaltyAndOvertime } from "@/lib/access";
import {
  CalendarCheck2,
  Calendar,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Sun,
  Coffee,
  Check,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";
import {
  formatMinutes,
  formatTime12Hour,
  calculateLateMinutes,
  calculateLatePenalty,
  calculateOvertimeMinutes,
  calculateWorkingMinutes,
} from "@/lib/attendance";

interface AttendanceRecord {
  id: string | null;
  date: string;
  day: number;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  isLeave?: boolean;
  holidayName: string | null;
  status: string;
  inTime: string | null;
  outTime: string | null;
  lateMinutes: number;
  latePenalty: number;
  overtimeMinutes: number;
  workingMinutes: number;
  notes: string | null;
}

interface MonthlyData {
  employee: any;
  year: number;
  month: number;
  daysInMonth: number;
  enableLatePenalty?: boolean;
  summary: {
    totalDays: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    holidayCount: number;
    leaveCount?: number;
    weekendCount: number;
    totalLateMinutes: number;
    totalLatePenalty: number;
    totalOvertimeMinutes: number;
    totalWorkingMinutes: number;
  };
  records: AttendanceRecord[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);

  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Row edit state: map of date -> { inTime, outTime, status }
  const [rowEdits, setRowEdits] = useState<Record<string, { inTime: string; outTime: string; status: string }>>({});

  // Modals
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [applyLeaveModalOpen, setApplyLeaveModalOpen] = useState(false);
  const [leaveRequestsModalOpen, setLeaveRequestsModalOpen] = useState(false);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

  // Auto-save states
  const autoSaveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [savingDates, setSavingDates] = useState<Record<string, boolean>>({});
  const [savedDates, setSavedDates] = useState<Record<string, boolean>>({});

  // Clock in/out button state
  const [clocking, setClocking] = useState(false);

  useEffect(() => {
    return () => {
      Object.values(autoSaveTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Fetch initial session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setSelectedUserId(data.user.id);
          if (data.user.role !== "EMPLOYEE") {
            fetchEmployees();
          }
        }
      })
      .catch(console.error);
  }, []);

  async function fetchEmployees() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const fetchPendingLeaves = useCallback(async () => {
    try {
      const res = await fetch("/api/leaves?status=PENDING");
      if (res.ok) {
        const data = await res.json();
        setPendingLeaveCount(data.leaves?.length || 0);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPendingLeaves();
  }, [fetchPendingLeaves]);

  // Fetch attendance data
  const fetchAttendance = useCallback(async (silent = false) => {
    if (!selectedUserId) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/attendance?userId=${selectedUserId}&year=${currentYear}&month=${currentMonth}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load attendance sheet.");
      }
      setMonthlyData(data);

      // Only initialize row edits if not silent to prevent overwriting active typing
      if (!silent) {
        const edits: Record<string, { inTime: string; outTime: string; status: string }> = {};
        if (data.records) {
          data.records.forEach((r: AttendanceRecord) => {
            edits[r.date] = {
              inTime: r.inTime || "",
              outTime: r.outTime || "",
              status: r.status,
            };
          });
        }
        setRowEdits(edits);
      }
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load attendance records.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedUserId, currentYear, currentMonth]);

  useEffect(() => {
    if (selectedUserId) {
      fetchAttendance();
    }
  }, [selectedUserId, currentYear, currentMonth, fetchAttendance]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Auto-save function
  const triggerAutoSave = useCallback(
    async (date: string, dataToSave: { inTime: string; outTime: string; status: string }) => {
      if (!selectedUserId) return;
      try {
        setSavingDates((prev) => ({ ...prev, [date]: true }));
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            date,
            inTime: dataToSave.inTime || null,
            outTime: dataToSave.outTime || null,
            status: dataToSave.status,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update record.");
        }

        setSavedDates((prev) => ({ ...prev, [date]: true }));
        setTimeout(() => {
          setSavedDates((prev) => {
            const copy = { ...prev };
            delete copy[date];
            return copy;
          });
        }, 2000);

        fetchAttendance(true);
      } catch (err: any) {
        console.error("Auto-save failed:", err);
      } finally {
        setSavingDates((prev) => {
          const copy = { ...prev };
          delete copy[date];
          return copy;
        });
      }
    },
    [selectedUserId, fetchAttendance]
  );

  const handleRowTimeChange = (date: string, field: "inTime" | "outTime", val: string) => {
    const currentRecord = monthlyData?.records?.find((r) => r.date === date);
    const existing = rowEdits[date] || {
      inTime: currentRecord?.inTime || "",
      outTime: currentRecord?.outTime || "",
      status: currentRecord?.status || "ABSENT",
    };

    const newInTime = field === "inTime" ? val : existing.inTime;
    const newOutTime = field === "outTime" ? val : existing.outTime;

    // Automatic status determination:
    let newStatus = existing.status;
    if (newStatus !== "LEAVE") {
      if (newInTime) {
        const lateMin = calculateLateMinutes(newInTime, shiftStartTime);
        newStatus = lateMin > 15 ? "LATE" : "PRESENT";
      } else {
        if (currentRecord?.isHoliday) {
          newStatus = "HOLIDAY";
        } else if (currentRecord?.isWeekend) {
          newStatus = "WEEKEND";
        } else {
          newStatus = "ABSENT";
        }
      }
    }

    const updated = {
      inTime: newInTime,
      outTime: newOutTime,
      status: newStatus,
    };

    setRowEdits((prev) => ({
      ...prev,
      [date]: updated,
    }));

    // Debounced Auto-Save (600ms)
    if (autoSaveTimersRef.current[date]) {
      clearTimeout(autoSaveTimersRef.current[date]);
    }
    autoSaveTimersRef.current[date] = setTimeout(() => {
      triggerAutoSave(date, updated);
      delete autoSaveTimersRef.current[date];
    }, 600);
  };

  const handleTimeBlur = (date: string) => {
    if (autoSaveTimersRef.current[date]) {
      clearTimeout(autoSaveTimersRef.current[date]);
      delete autoSaveTimersRef.current[date];
      if (rowEdits[date]) {
        triggerAutoSave(date, rowEdits[date]);
      }
    }
  };

  const handleStatusChange = (date: string, newStatus: string) => {
    const currentRecord = monthlyData?.records?.find((r) => r.date === date);
    const existing = rowEdits[date] || {
      inTime: currentRecord?.inTime || "",
      outTime: currentRecord?.outTime || "",
      status: currentRecord?.status || "ABSENT",
    };

    const updated = {
      ...existing,
      status: newStatus,
    };

    setRowEdits((prev) => ({
      ...prev,
      [date]: updated,
    }));

    if (autoSaveTimersRef.current[date]) {
      clearTimeout(autoSaveTimersRef.current[date]);
      delete autoSaveTimersRef.current[date];
    }
    triggerAutoSave(date, updated);
  };

  const handleToggleHoliday = async (record: AttendanceRecord) => {
    const date = record.date;
    const currentStatus = rowEdits[date]?.status || record.status;
    const newStatus = currentStatus === "HOLIDAY" ? "PRESENT" : "HOLIDAY";

    handleStatusChange(date, newStatus);
  };

  const saveAttendanceRow = async (
    date: string,
    overrideData?: { inTime: string; outTime: string; status: string }
  ) => {
    const dataToSave = overrideData || rowEdits[date];
    if (!dataToSave) return;
    triggerAutoSave(date, dataToSave);
  };

  const handleClockAction = async (action: "in" | "out") => {
    try {
      setClocking(true);
      const res = await fetch("/api/attendance/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clock action failed.");

      setSuccessToast(`Successfully clocked ${action.toUpperCase()} at ${data.time}`);
      setTimeout(() => setSuccessToast(null), 3000);
      fetchAttendance();
    } catch (err: any) {
      alert(err.message || "Clock action failed.");
    } finally {
      setClocking(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const canViewFines = canViewPenaltyAndOvertime(user?.role);
  const currentEmployee = monthlyData?.employee;
  const shift = currentEmployee?.shift;
  const shiftStartTime = shift?.startTime || "09:00";
  const shiftEndTime = shift?.endTime || "18:00";
  const shiftName = shift?.name || "Standard Work Shift";

  const todayStr = now.toISOString().slice(0, 10);
  const todayRow = monthlyData?.records?.find((r) => r.date === todayStr);
  const enableLatePenalty = monthlyData?.enableLatePenalty ?? false;

  const liveSummary = useMemo(() => {
    if (!monthlyData?.records) return monthlyData?.summary || null;

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let holidayCount = 0;
    let leaveCount = 0;
    let weekendCount = 0;
    let totalLateMinutes = 0;
    let totalLatePenalty = 0;
    let totalOvertimeMinutes = 0;
    let totalWorkingMinutes = 0;

    monthlyData.records.forEach((record) => {
      const rowState = rowEdits[record.date] || {
        inTime: record.inTime || "",
        outTime: record.outTime || "",
        status: record.status,
      };

      const isHoliday = record.isHoliday || rowState.status === "HOLIDAY";
      const isLeave = record.isLeave || rowState.status === "LEAVE";
      const isWeekend = record.isWeekend;

      let effectiveStatus = rowState.status;
      if (effectiveStatus !== "LEAVE") {
        if (rowState.inTime) {
          const lateMin = calculateLateMinutes(rowState.inTime, shiftStartTime);
          effectiveStatus = lateMin > 15 ? "LATE" : "PRESENT";
        } else {
          if (isHoliday) effectiveStatus = "HOLIDAY";
          else if (isWeekend) effectiveStatus = "WEEKEND";
          else effectiveStatus = rowState.status || "ABSENT";
        }
      }

      const currentLateMin = rowState.inTime
        ? calculateLateMinutes(rowState.inTime, shiftStartTime)
        : record.lateMinutes;

      const currentPenalty =
        !enableLatePenalty || isHoliday || isLeave || isWeekend
          ? 0
          : rowState.inTime
          ? calculateLatePenalty(currentLateMin)
          : record.latePenalty;

      const currentOvertime =
        rowState.outTime
          ? calculateOvertimeMinutes(
              rowState.outTime,
              shiftEndTime,
              rowState.inTime,
              shiftStartTime,
              isHoliday || isWeekend
            )
          : record.overtimeMinutes;

      const currentWorkMin =
        rowState.inTime && rowState.outTime
          ? calculateWorkingMinutes(rowState.inTime, rowState.outTime)
          : record.workingMinutes;

      if (effectiveStatus === "PRESENT") presentCount++;
      else if (effectiveStatus === "LATE") {
        lateCount++;
        presentCount++;
      } else if (effectiveStatus === "HOLIDAY") holidayCount++;
      else if (effectiveStatus === "LEAVE") leaveCount++;
      else if (effectiveStatus === "WEEKEND") weekendCount++;
      else if (effectiveStatus === "ABSENT") absentCount++;

      totalLateMinutes += currentLateMin;
      totalLatePenalty += currentPenalty;
      totalOvertimeMinutes += currentOvertime;
      totalWorkingMinutes += currentWorkMin;
    });

    return {
      totalDays: monthlyData.daysInMonth || monthlyData.records.length,
      presentCount,
      lateCount,
      absentCount,
      holidayCount,
      leaveCount,
      weekendCount,
      totalLateMinutes,
      totalLatePenalty: canViewFines && enableLatePenalty ? totalLatePenalty : 0,
      totalOvertimeMinutes: canViewFines ? totalOvertimeMinutes : 0,
      totalWorkingMinutes,
    };
  }, [monthlyData, rowEdits, shiftStartTime, shiftEndTime, enableLatePenalty, canViewFines]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (user.role === "SUPER_ADMIN") {
    router.replace("/super-admin");
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const isCompanyAdminOrManager = user.role === "ADMIN" || user.role === "MANAGER";

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={user}
        onUserUpdated={(u) => setUser(u)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between">
        <div className="p-4 sm:p-6 md:p-8 flex-1">
          <div className="max-w-7xl mx-auto space-y-6">
          {/* Header & Page Navigation */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
                  <CalendarCheck2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Employee Attendance Sheet
                  </h1>
                  <p className="text-xs text-slate-400">
                    Track daily shifts and in/out timings
                    {canViewFines
                      ? enableLatePenalty
                        ? ", late penalties, and overtime hours"
                        : " and overtime hours"
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Quick Clock-In / Clock-Out for Today */}
              {user.id === selectedUserId && (
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => handleClockAction("in")}
                    disabled={clocking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Clock In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClockAction("out")}
                    disabled={clocking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all disabled:opacity-50"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    Clock Out
                  </button>
                </div>
              )}

              {/* Apply Leave Button */}
              <button
                type="button"
                onClick={() => setApplyLeaveModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all shadow-sm"
                title="Apply for a new leave request"
              >
                <Coffee className="w-4 h-4 text-emerald-400" />
                Apply Leave
              </button>

              {/* Leave Requests / History */}
              <button
                type="button"
                onClick={() => setLeaveRequestsModalOpen(true)}
                className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all shadow-sm"
                title={isCompanyAdminOrManager ? "Review and manage employee leave applications" : "View your submitted leave requests"}
              >
                <Calendar className="w-4 h-4 text-sky-400" />
                {isCompanyAdminOrManager ? "Leave Requests" : "My Leaves"}
                {pendingLeaveCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full shadow-sm animate-pulse">
                    {pendingLeaveCount}
                  </span>
                )}
              </button>

              {/* Print Penalty Report Button */}
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                disabled={loading || !monthlyData}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
                title={canViewFines ? "Open and print penalty report" : "Open and print attendance report"}
              >
                <Printer className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Print Report
              </button>

              {/* Admin Shift & Holiday Actions */}
              {isCompanyAdminOrManager && (
                <>
                  <button
                    type="button"
                    onClick={() => setShiftModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <Clock className="w-4 h-4" />
                    Manage Shifts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHolidayDate(null);
                      setHolidayModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all shadow-sm"
                    title="Configure company and official holidays"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    + Holidays
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Toast Notification */}
          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selection & Period Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            {/* Employee Selector (Admins/Managers can switch) */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">Employee:</span>
              {isCompanyAdminOrManager && employees.length > 0 ? (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation || "Employee"}) - {emp.email}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  {currentEmployee?.name || user.name}
                </div>
              )}
            </div>

            {/* Month & Year Navigation */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 min-w-[130px] text-center">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCurrentMonth}
                className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {/* Assigned Shift Information Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-500/20 shadow-sm dark:shadow-none gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/30 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                    {shiftName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    Assigned Shift
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    Working Hours:{" "}
                    <strong className="font-semibold text-slate-900 dark:text-white font-mono">
                      {shiftStartTime}
                    </strong>{" "}
                    to{" "}
                    <strong className="font-semibold text-slate-900 dark:text-white font-mono">
                      {shiftEndTime}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Grace Period:{" "}
                    <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                      15 min
                    </strong>
                    {enableLatePenalty && canViewFines ? (
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">(No penalty)</span>
                    ) : (
                      ""
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Late Penalty Rule Explanation Pill */}
            {enableLatePenalty && canViewFines && (
              <div className="text-[11px] bg-white dark:bg-slate-950/70 py-2 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-300 shrink-0">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Penalty Formula:
                </span>
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  16-20m = <strong className="text-rose-600 dark:text-rose-400 font-semibold font-mono">BDT 20</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  21-30m = <strong className="text-rose-600 dark:text-rose-400 font-semibold font-mono">BDT 30</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  31m+ = <strong className="text-rose-600 dark:text-rose-400 font-semibold font-mono">30+(t×2)</strong>
                </span>
              </div>
            )}
          </div>

          {/* Summary Metric Cards */}
          {/* Summary Cards */}
          {liveSummary && (
            <div
              className={`grid gap-3 ${
                enableLatePenalty && canViewFines
                  ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
                  : canViewFines
                  ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
              }`}
            >
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Days in Month</span>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                  {liveSummary.totalDays}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  {liveSummary.weekendCount} Weekends
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">Present Days</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {liveSummary.presentCount}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  {liveSummary.absentCount} Absent
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-rose-600 dark:text-rose-400 block font-medium">Late Days</span>
                <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                  {liveSummary.lateCount}
                </span>
                <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 block font-mono">
                  {liveSummary.totalLateMinutes} min total
                </span>
              </div>

              {enableLatePenalty && canViewFines && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 shadow-xs">
                  <span className="text-xs text-rose-700 dark:text-rose-300 block font-medium">Total Late Fine</span>
                  <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                    BDT {liveSummary.totalLatePenalty}
                  </span>
                  <span className="text-[10px] text-rose-600/70 dark:text-rose-300/70 mt-0.5 block">
                    Calculated penalty
                  </span>
                </div>
              )}

              {canViewFines && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 shadow-xs">
                  <span className="text-xs text-indigo-700 dark:text-indigo-300 block font-medium">Overtime</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {formatMinutes(liveSummary.totalOvertimeMinutes)}
                  </span>
                  <span className="text-[10px] text-indigo-600/70 dark:text-indigo-300/70 mt-0.5 block">
                    Approved extra time
                  </span>
                </div>
              )}

              {/* SEPARATE HOLIDAYS CARD */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-amber-600 dark:text-amber-400 block font-medium">Holidays</span>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                  {liveSummary.holidayCount}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  Company & Public Holidays
                </span>
              </div>

              {/* SEPARATE LEAVES CARD */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-blue-600 dark:text-blue-400 block font-medium">Leaves</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                  {liveSummary.leaveCount || 0}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                  Approved Employee Leaves
                </span>
              </div>
            </div>
          )}

          {/* Attendance Sheet Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Daily Attendance & Timings</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {canViewFines
                    ? "Input in-time and out-time. Fines and overtime will calculate automatically."
                    : "Input in-time and out-time. Working hours will calculate automatically."}
                </p>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Employee: <strong className="text-slate-800 dark:text-slate-200">{currentEmployee?.name}</strong>
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                <span className="text-xs">Loading attendance sheet...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-slate-700 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Date & Day</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">In Time</th>
                      <th className="py-3 px-3">Out Time</th>
                      <th className="py-3 px-3 text-center">Work Time</th>
                      <th className="py-3 px-3 text-center">Late</th>
                      {enableLatePenalty && canViewFines && (
                        <th className="py-3 px-3 text-center">Penalty</th>
                      )}
                      {canViewFines && (
                        <th className="py-3 px-3 text-center">Overtime</th>
                      )}
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                    {monthlyData?.records?.map((record) => {
                      const date = record.date;
                      const dayName = DAY_NAMES[record.dayOfWeek];
                      const rowState = rowEdits[date] || {
                        inTime: record.inTime || "",
                        outTime: record.outTime || "",
                        status: record.status,
                      };

                      // Automatic status determination if not manually set to LEAVE:
                      let effectiveStatus = rowState.status;
                      if (effectiveStatus !== "LEAVE") {
                        if (rowState.inTime) {
                          const lateMin = calculateLateMinutes(rowState.inTime, shiftStartTime);
                          effectiveStatus = lateMin > 15 ? "LATE" : "PRESENT";
                        } else {
                          if (record.isHoliday) effectiveStatus = "HOLIDAY";
                          else if (record.isWeekend) effectiveStatus = "WEEKEND";
                          else effectiveStatus = "ABSENT";
                        }
                      }

                      const isToday = date === todayStr;
                      const isWeekend = record.isWeekend;
                      const isHoliday = effectiveStatus === "HOLIDAY" || record.isHoliday;
                      const isLeave = effectiveStatus === "LEAVE" || record.isLeave;
                      const isSaving = savingDates[date];
                      const isSaved = savedDates[date];

                      // Live calculation on row
                      const currentLateMin = rowState.inTime
                        ? calculateLateMinutes(rowState.inTime, shiftStartTime)
                        : record.lateMinutes;

                      const currentPenalty =
                        !enableLatePenalty || isHoliday || isLeave || isWeekend
                          ? 0
                          : rowState.inTime
                          ? calculateLatePenalty(currentLateMin)
                          : record.latePenalty;

                      const currentOvertime =
                        rowState.outTime
                          ? calculateOvertimeMinutes(
                              rowState.outTime,
                              shiftEndTime,
                              rowState.inTime,
                              shiftStartTime,
                              isHoliday || isWeekend
                            )
                          : record.overtimeMinutes;

                      const currentWorkMin =
                        rowState.inTime && rowState.outTime
                          ? calculateWorkingMinutes(rowState.inTime, rowState.outTime)
                          : record.workingMinutes;

                      return (
                        <tr
                          key={date}
                          className={`hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors ${
                            isToday
                              ? "bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-inset ring-indigo-500/30"
                              : isHoliday
                              ? "bg-amber-50/50 dark:bg-amber-950/20"
                              : isLeave
                              ? "bg-blue-50/50 dark:bg-blue-950/20"
                              : isWeekend
                              ? "bg-slate-100/50 dark:bg-slate-950/40"
                              : ""
                          }`}
                        >
                          {/* Date & Day */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-100 font-mono text-sm">
                                {String(record.day).padStart(2, "0")}
                              </span>
                              <div>
                                <span className="font-medium text-slate-700 dark:text-slate-300 block">{dayName}</span>
                                {record.holidayName && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                                    {record.holidayName}
                                  </span>
                                )}
                                {!record.holidayName && isLeave && (
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">
                                    Approved Leave
                                  </span>
                                )}
                              </div>
                              {isToday && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Badge / Selector */}
                          <td className="py-2.5 px-3 text-center">
                            {isCompanyAdminOrManager ? (
                              <select
                                value={effectiveStatus}
                                onChange={(e) => handleStatusChange(date, e.target.value)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border focus:outline-none transition-colors cursor-pointer shadow-sm ${
                                  effectiveStatus === "PRESENT"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500/40"
                                    : effectiveStatus === "LATE" || currentLateMin > 15
                                    ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-500/40"
                                    : effectiveStatus === "HOLIDAY"
                                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-500/40"
                                    : effectiveStatus === "LEAVE"
                                    ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500/40"
                                    : effectiveStatus === "WEEKEND"
                                    ? "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                                }`}
                              >
                                <option value="PRESENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Present</option>
                                <option value="LATE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Late</option>
                                <option value="ABSENT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Absent</option>
                                <option value="LEAVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Leave</option>
                                <option value="HOLIDAY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Holiday</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border shadow-sm ${
                                  effectiveStatus === "PRESENT"
                                    ? "bg-emerald-100/90 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30"
                                    : effectiveStatus === "LATE" || currentLateMin > 15
                                    ? "bg-rose-100/90 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30"
                                    : effectiveStatus === "HOLIDAY"
                                    ? "bg-amber-100/90 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30"
                                    : effectiveStatus === "LEAVE"
                                    ? "bg-blue-100/90 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30"
                                    : effectiveStatus === "WEEKEND"
                                    ? "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                    : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                                }`}
                              >
                                {effectiveStatus === "HOLIDAY" || record.isHoliday
                                  ? "Holiday"
                                  : effectiveStatus === "LEAVE"
                                  ? "Leave"
                                  : isWeekend
                                  ? "Weekend"
                                  : currentLateMin > 15
                                  ? "Late"
                                  : rowState.inTime
                                  ? "Present"
                                  : "Absent"}
                              </span>
                            )}
                          </td>

                          {/* In Time Input */}
                          <td className="py-2.5 px-3">
                            <input
                              type="time"
                              value={rowState.inTime}
                              disabled={isHoliday || isLeave}
                              onChange={(e) => handleRowTimeChange(date, "inTime", e.target.value)}
                              onBlur={() => handleTimeBlur(date)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                            />
                          </td>

                          {/* Out Time Input */}
                          <td className="py-2.5 px-3">
                            <input
                              type="time"
                              value={rowState.outTime}
                              disabled={isHoliday || isLeave}
                              onChange={(e) => handleRowTimeChange(date, "outTime", e.target.value)}
                              onBlur={() => handleTimeBlur(date)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                            />
                          </td>

                          {/* Work Duration */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                            {currentWorkMin > 0 ? formatMinutes(currentWorkMin) : "-"}
                          </td>

                          {/* Late Minutes */}
                          <td className="py-2.5 px-3 text-center">
                            {currentLateMin > 0 ? (
                              <span
                                className={`font-semibold font-mono ${
                                  currentLateMin > 15 ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                +{currentLateMin}m
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">-</span>
                            )}
                          </td>

                          {/* Penalty Amount */}
                          {enableLatePenalty && canViewFines && (
                            <td className="py-2.5 px-3 text-center font-bold">
                              {currentPenalty > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                                  BDT {currentPenalty}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 font-normal">-</span>
                              )}
                            </td>
                          )}

                          {/* Overtime */}
                          {canViewFines && (
                            <td className="py-2.5 px-3 text-center font-mono">
                              {currentOvertime > 0 ? (
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                  +{formatMinutes(currentOvertime)}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600">-</span>
                              )}
                            </td>
                          )}

                          {/* Row Actions & Auto-Save Indicator */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Auto-Save Live Feedback */}
                              {isSaving ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-indigo-500 dark:text-indigo-400 font-medium animate-pulse">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Saving...
                                </span>
                              ) : isSaved ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-fadeIn">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  Saved
                                </span>
                              ) : null}

                              {isCompanyAdminOrManager && (
                                <div className="flex items-center gap-1.5">
                                  {/* Dedicated Leave Toggle Action */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatusChange(
                                        date,
                                        isLeave ? (rowState.inTime ? "PRESENT" : "ABSENT") : "LEAVE"
                                      )
                                    }
                                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                      isLeave
                                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-500/30 border border-blue-300 dark:border-blue-500/30"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
                                    }`}
                                    title={isLeave ? "Remove leave status" : "Mark employee on leave"}
                                  >
                                    <Coffee className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                    <span>{isLeave ? "Leave" : "+ Leave"}</span>
                                  </button>

                                  {/* Dedicated Holiday Action */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedHolidayDate(date);
                                      setHolidayModalOpen(true);
                                    }}
                                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                      isHoliday
                                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/30"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"
                                    }`}
                                    title={isHoliday ? "Manage company holiday" : "Add company holiday on this date"}
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                                    <span>{isHoliday ? "Holiday" : "+ Holiday"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

      <ShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        onSuccess={() => fetchAttendance()}
      />

      <HolidayModal
        isOpen={holidayModalOpen}
        initialDate={selectedHolidayDate}
        onClose={() => {
          setHolidayModalOpen(false);
          setSelectedHolidayDate(null);
        }}
        onSuccess={() => fetchAttendance()}
      />

      <AttendancePrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        data={
          monthlyData && liveSummary
            ? {
                ...monthlyData,
                summary: liveSummary,
              }
            : monthlyData
        }
        enableLatePenalty={enableLatePenalty && canViewFines}
        isManagerOrAdmin={canViewFines}
      />

      {/* Leave Modals */}
      <ApplyLeaveModal
        isOpen={applyLeaveModalOpen}
        onClose={() => setApplyLeaveModalOpen(false)}
        onLeaveApplied={() => {
          fetchAttendance(true);
          fetchPendingLeaves();
        }}
      />

      <LeaveRequestsModal
        isOpen={leaveRequestsModalOpen}
        onClose={() => setLeaveRequestsModalOpen(false)}
        currentUser={user}
        onOpenApplyLeave={() => {
          setLeaveRequestsModalOpen(false);
          setApplyLeaveModalOpen(true);
        }}
        onLeaveDecided={() => {
          fetchAttendance(true);
          fetchPendingLeaves();
        }}
      />
    </div>
  );
}
