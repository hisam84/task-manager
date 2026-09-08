"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { ShiftModal } from "@/components/shift-modal";
import { HolidayModal } from "@/components/holiday-modal";
import { AttendancePrintModal } from "@/components/attendance-print-modal";
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

  // Clock in/out button state
  const [clocking, setClocking] = useState(false);

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

  // Fetch attendance data
  const fetchAttendance = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/attendance?userId=${selectedUserId}&year=${currentYear}&month=${currentMonth}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load attendance sheet.");
      }
      setMonthlyData(data);

      // Initialize row edits from returned data
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
    } catch (err: any) {
      setError(err.message || "Failed to load attendance records.");
    } finally {
      setLoading(false);
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

  const handleRowTimeChange = (date: string, field: "inTime" | "outTime", val: string) => {
    setRowEdits((prev) => {
      const existing = prev[date] || { inTime: "", outTime: "", status: "PRESENT" };
      return {
        ...prev,
        [date]: {
          ...existing,
          [field]: val,
        },
      };
    });
  };

  const handleToggleHoliday = async (record: AttendanceRecord) => {
    const date = record.date;
    const currentStatus = rowEdits[date]?.status || record.status;
    const newStatus = currentStatus === "HOLIDAY" ? "PRESENT" : "HOLIDAY";

    setRowEdits((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        status: newStatus,
      },
    }));

    await saveAttendanceRow(date, {
      ...rowEdits[date],
      status: newStatus,
    });
  };

  const saveAttendanceRow = async (
    date: string,
    overrideData?: { inTime: string; outTime: string; status: string }
  ) => {
    const dataToSave = overrideData || rowEdits[date];
    if (!dataToSave) return;

    try {
      setSavingDate(date);
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

      setSuccessToast(`Saved record for ${date}`);
      setTimeout(() => setSuccessToast(null), 2500);
      fetchAttendance();
    } catch (err: any) {
      alert(err.message || "Failed to save attendance.");
    } finally {
      setSavingDate(null);
    }
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
  const currentEmployee = monthlyData?.employee;
  const shift = currentEmployee?.shift;
  const shiftStartTime = shift?.startTime || "09:00";
  const shiftEndTime = shift?.endTime || "18:00";
  const shiftName = shift?.name || "Standard Work Shift";

  const todayStr = now.toISOString().slice(0, 10);
  const todayRow = monthlyData?.records?.find((r) => r.date === todayStr);
  const enableLatePenalty = monthlyData?.enableLatePenalty ?? false;

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={user}
        onUserUpdated={(u) => setUser(u)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                    Track daily shifts, in/out timings{enableLatePenalty ? ", late penalties," : ""} and overtime hours
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

              {/* Print Penalty Report Button */}
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                disabled={loading || !monthlyData}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50"
                title="Open and print penalty report"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
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
                    title="কোম্পানির ছুটি ও সরকারি ছুটির দিন নির্ধারণ করুন"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    + ছুটি এড / Holidays
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
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-semibold text-sm text-slate-100 min-w-[130px] text-center">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCurrentMonth}
                className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
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
                    {enableLatePenalty ? (
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">(No penalty)</span>
                    ) : (
                      ""
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Late Penalty Rule Explanation Pill */}
            {enableLatePenalty && (
              <div className="text-[11px] bg-white dark:bg-slate-950/70 py-2 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-300 shrink-0">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Penalty Formula:
                </span>
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  16-20m = <strong className="text-rose-600 dark:text-rose-400 font-semibold font-mono">৳20</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  21-30m = <strong className="text-rose-600 dark:text-rose-400 font-semibold font-mono">৳30</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  31m+ = <strong className="text-rose-600 dark:text-rose-400 font-semibold font-mono">30+(t×2)</strong>
                </span>
              </div>
            )}
          </div>

          {/* Summary Metric Cards */}
          {monthlyData?.summary && (
            <div className={`grid gap-3 ${enableLatePenalty ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Days in Month</span>
                <span className="text-xl font-bold text-slate-100 mt-1 block">
                  {monthlyData.summary.totalDays}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {monthlyData.summary.weekendCount} Weekends
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-emerald-400 block font-medium">Present Days</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">
                  {monthlyData.summary.presentCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {monthlyData.summary.absentCount} Absent
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-rose-400 block font-medium">Late Days</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">
                  {monthlyData.summary.lateCount}
                </span>
                <span className="text-[11px] text-rose-400/80 mt-0.5 block font-mono">
                  {monthlyData.summary.totalLateMinutes} min total
                </span>
              </div>

              {enableLatePenalty && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-lg shadow-rose-950/20">
                  <span className="text-xs text-rose-300 block font-medium">Total Late Fine</span>
                  <span className="text-xl font-bold text-rose-400 mt-1 block">
                    ৳ {monthlyData.summary.totalLatePenalty}
                  </span>
                  <span className="text-[10px] text-rose-300/70 mt-0.5 block">
                    Calculated penalty
                  </span>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-xs text-indigo-300 block font-medium">Overtime</span>
                <span className="text-xl font-bold text-indigo-400 mt-1 block">
                  {formatMinutes(monthlyData.summary.totalOvertimeMinutes)}
                </span>
                <span className="text-[10px] text-indigo-300/70 mt-0.5 block">
                  Approved extra time
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Holidays & Leaves</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-amber-400">
                    {monthlyData.summary.holidayCount}
                  </span>
                  <span className="text-xs text-slate-400">Holidays</span>
                  {(monthlyData.summary.leaveCount || 0) > 0 && (
                    <>
                      <span className="text-slate-600">/</span>
                      <span className="text-xl font-bold text-blue-400">
                        {monthlyData.summary.leaveCount}
                      </span>
                      <span className="text-xs text-slate-400">Leaves</span>
                    </>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">কোম্পানি ছুটি ও লিভ</span>
              </div>
            </div>
          )}

          {/* Attendance Sheet Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-white">Daily Attendance & Timings</h3>
                <p className="text-xs text-slate-400">
                  Input in-time and out-time. Fines and overtime will calculate automatically.
                </p>
              </div>
              <div className="text-xs text-slate-400">
                Employee: <strong className="text-slate-200">{currentEmployee?.name}</strong>
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
                      {enableLatePenalty && (
                        <th className="py-3 px-3 text-center">Penalty</th>
                      )}
                      <th className="py-3 px-3 text-center">Overtime</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {monthlyData?.records?.map((record) => {
                      const date = record.date;
                      const dayName = DAY_NAMES[record.dayOfWeek];
                      const rowState = rowEdits[date] || {
                        inTime: record.inTime || "",
                        outTime: record.outTime || "",
                        status: record.status,
                      };

                      const isToday = date === todayStr;
                      const isWeekend = record.isWeekend;
                      const isHoliday = rowState.status === "HOLIDAY" || record.isHoliday;
                      const isLeave = rowState.status === "LEAVE" || record.isLeave;
                      const isSaving = savingDate === date;

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
                          ? calculateOvertimeMinutes(rowState.outTime, shiftEndTime)
                          : record.overtimeMinutes;

                      const currentWorkMin =
                        rowState.inTime && rowState.outTime
                          ? calculateWorkingMinutes(rowState.inTime, rowState.outTime)
                          : record.workingMinutes;

                      return (
                        <tr
                          key={date}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isToday
                              ? "bg-indigo-950/20 ring-1 ring-inset ring-indigo-500/30"
                              : isHoliday
                              ? "bg-amber-950/10"
                              : isLeave
                              ? "bg-blue-950/10"
                              : isWeekend
                              ? "bg-slate-950/40"
                              : ""
                          }`}
                        >
                          {/* Date & Day */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-100 font-mono text-sm">
                                {String(record.day).padStart(2, "0")}
                              </span>
                              <div>
                                <span className="font-medium text-slate-300 block">{dayName}</span>
                                {record.holidayName && (
                                  <span className="text-[10px] text-amber-400 block">
                                    {record.holidayName}
                                  </span>
                                )}
                              </div>
                              {isToday && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Badge / Selector */}
                          <td className="py-2.5 px-3 text-center">
                            {isCompanyAdminOrManager ? (
                              <select
                                value={rowState.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  setRowEdits((prev) => ({
                                    ...prev,
                                    [date]: {
                                      ...(prev[date] || { inTime: record.inTime || "", outTime: record.outTime || "" }),
                                      status: newStatus,
                                    },
                                  }));
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border focus:outline-none transition-colors ${
                                  rowState.status === "PRESENT"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : rowState.status === "LATE" || currentLateMin > 15
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                    : rowState.status === "HOLIDAY"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                    : rowState.status === "LEAVE"
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                    : rowState.status === "WEEKEND"
                                    ? "bg-slate-800 text-slate-400 border-slate-700"
                                    : "bg-slate-900 text-slate-400 border-slate-800"
                                }`}
                              >
                                <option value="PRESENT" className="bg-slate-900 text-white">Present (উপস্থিত)</option>
                                <option value="LATE" className="bg-slate-900 text-white">Late (দেরি)</option>
                                <option value="ABSENT" className="bg-slate-900 text-white">Absent (অনুপস্থিত)</option>
                                <option value="LEAVE" className="bg-slate-900 text-white">Leave (ছুটি)</option>
                                <option value="HOLIDAY" className="bg-slate-900 text-white">Holiday (সরকারি ছুটি)</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  rowState.status === "PRESENT"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : rowState.status === "LATE" || currentLateMin > 15
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : rowState.status === "HOLIDAY"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : rowState.status === "LEAVE"
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : rowState.status === "WEEKEND"
                                    ? "bg-slate-800 text-slate-400 border-slate-700"
                                    : "bg-slate-900 text-slate-500 border-slate-800"
                                }`}
                              >
                                {rowState.status === "HOLIDAY" || record.isHoliday
                                  ? "Holiday"
                                  : rowState.status === "LEAVE"
                                  ? "Leave (ছুটি)"
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
                              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                            />
                          </td>

                          {/* Out Time Input */}
                          <td className="py-2.5 px-3">
                            <input
                              type="time"
                              value={rowState.outTime}
                              disabled={isHoliday || isLeave}
                              onChange={(e) => handleRowTimeChange(date, "outTime", e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                            />
                          </td>

                          {/* Work Duration */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {currentWorkMin > 0 ? formatMinutes(currentWorkMin) : "-"}
                          </td>

                          {/* Late Minutes */}
                          <td className="py-2.5 px-3 text-center">
                            {currentLateMin > 0 ? (
                              <span
                                className={`font-semibold font-mono ${
                                  currentLateMin > 15 ? "text-rose-400" : "text-slate-400"
                                }`}
                              >
                                +{currentLateMin}m
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>

                          {/* Penalty Amount */}
                          {enableLatePenalty && (
                            <td className="py-2.5 px-3 text-center font-bold">
                              {currentPenalty > 0 ? (
                                <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                                  ৳ {currentPenalty}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-normal">-</span>
                              )}
                            </td>
                          )}

                          {/* Overtime */}
                          <td className="py-2.5 px-3 text-center font-mono">
                            {currentOvertime > 0 ? (
                              <span className="text-indigo-400 font-semibold">
                                +{formatMinutes(currentOvertime)}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>

                          {/* Row Actions */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isCompanyAdminOrManager && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedHolidayDate(date);
                                    setHolidayModalOpen(true);
                                  }}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                                    isHoliday
                                      ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                                      : "bg-slate-800 text-slate-300 hover:text-amber-300 hover:bg-slate-700 border border-slate-700"
                                  }`}
                                  title={isHoliday ? "কোম্পানি ছুটি পরিবর্তন বা মুছুন" : "এই তারিখে কোম্পানি ছুটি এড করুন"}
                                >
                                  <Calendar className="w-3 h-3 text-amber-400" />
                                  {isHoliday ? "ছুটি ম্যানেজ" : "+ ছুটি এড"}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => saveAttendanceRow(date)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                title="Save changes for this day"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                                Save
                              </button>
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
        data={monthlyData}
        enableLatePenalty={enableLatePenalty}
      />
    </div>
  );
}
