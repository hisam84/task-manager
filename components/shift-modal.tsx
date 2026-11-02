"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  Check,
  CalendarDays,
  Layers,
  CheckCircle2,
} from "lucide-react";

export interface ShiftItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  _count?: { users: number };
}

export interface ShiftScheduleDayItem {
  id?: string;
  dayOfWeek: number;
  isWeekend: boolean;
  shiftId?: string | null;
  shift?: ShiftItem | null;
}

export interface ShiftScheduleItem {
  id: string;
  name: string;
  days: ShiftScheduleDayItem[];
  _count?: { users: number };
}

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DAYS_OF_WEEK = [
  { dayOfWeek: 6, label: "Saturday", short: "Sat" },
  { dayOfWeek: 0, label: "Sunday", short: "Sun" },
  { dayOfWeek: 1, label: "Monday", short: "Mon" },
  { dayOfWeek: 2, label: "Tuesday", short: "Tue" },
  { dayOfWeek: 3, label: "Wednesday", short: "Wed" },
  { dayOfWeek: 4, label: "Thursday", short: "Thu" },
  { dayOfWeek: 5, label: "Friday", short: "Fri" },
];

export function ShiftModal({ isOpen, onClose, onSuccess }: ShiftModalProps) {
  const [activeTab, setActiveTab] = useState<"shifts" | "schedules">("shifts");

  // Shifts state
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [savingShift, setSavingShift] = useState(false);

  // Shift form states
  const [isEditingShift, setIsEditingShift] = useState<string | null>(null);
  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [showShiftForm, setShowShiftForm] = useState(false);

  // Weekly Schedules state
  const [schedules, setSchedules] = useState<ShiftScheduleItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Weekly Schedule form states
  const [isEditingSchedule, setIsEditingSchedule] = useState<string | null>(null);
  const [scheduleName, setScheduleName] = useState("");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<
    Array<{ dayOfWeek: number; isWeekend: boolean; shiftId: string }>
  >([]);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchShifts();
      fetchSchedules();
      resetShiftForm();
      resetScheduleForm();
    }
  }, [isOpen]);

  async function fetchShifts() {
    try {
      setLoadingShifts(true);
      setError(null);
      const res = await fetch("/api/shifts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setShifts(data);
      } else {
        setShifts([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load shifts.");
    } finally {
      setLoadingShifts(false);
    }
  }

  async function fetchSchedules() {
    try {
      setLoadingSchedules(true);
      setError(null);
      const res = await fetch("/api/shift-schedules");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSchedules(data);
      } else {
        setSchedules([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load shift schedules.");
    } finally {
      setLoadingSchedules(false);
    }
  }

  function resetShiftForm() {
    setIsEditingShift(null);
    setShiftName("");
    setStartTime("09:00");
    setEndTime("18:00");
    setGraceMinutes(15);
    setShowShiftForm(false);
    setError(null);
  }

  function initDefaultScheduleDays(defaultShiftId: string = "") {
    return DAYS_OF_WEEK.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      isWeekend: d.dayOfWeek === 5, // Friday default weekend
      shiftId: d.dayOfWeek === 5 ? "" : defaultShiftId,
    }));
  }

  function resetScheduleForm() {
    setIsEditingSchedule(null);
    setScheduleName("");
    const defaultShiftId = shifts[0]?.id || "";
    setScheduleDays(initDefaultScheduleDays(defaultShiftId));
    setShowScheduleForm(false);
    setError(null);
  }

  function startEditShift(s: ShiftItem) {
    setIsEditingShift(s.id);
    setShiftName(s.name);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setGraceMinutes(s.graceMinutes);
    setShowShiftForm(true);
    setError(null);
  }

  function startEditSchedule(sched: ShiftScheduleItem) {
    setIsEditingSchedule(sched.id);
    setScheduleName(sched.name);
    const dayMap = new Map<number, ShiftScheduleDayItem>();
    (sched.days || []).forEach((d) => dayMap.set(d.dayOfWeek, d));

    const defaultShiftId = shifts[0]?.id || "";
    const daysConfig = DAYS_OF_WEEK.map((d) => {
      const existing = dayMap.get(d.dayOfWeek);
      if (existing) {
        return {
          dayOfWeek: d.dayOfWeek,
          isWeekend: Boolean(existing.isWeekend),
          shiftId: existing.shiftId || (existing.isWeekend ? "" : defaultShiftId),
        };
      }
      return {
        dayOfWeek: d.dayOfWeek,
        isWeekend: d.dayOfWeek === 5,
        shiftId: d.dayOfWeek === 5 ? "" : defaultShiftId,
      };
    });

    setScheduleDays(daysConfig);
    setShowScheduleForm(true);
    setError(null);
  }

  async function handleSaveShift(e: React.FormEvent) {
    e.preventDefault();
    if (!shiftName.trim()) {
      setError("Shift name is required.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Start time and end time are required.");
      return;
    }

    try {
      setSavingShift(true);
      setError(null);

      const payload = {
        name: shiftName.trim(),
        startTime,
        endTime,
        graceMinutes: Number(graceMinutes) || 15,
      };

      const url = isEditingShift ? `/api/shifts/${isEditingShift}` : "/api/shifts";
      const method = isEditingShift ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save shift.");
      }

      setSuccessMsg(isEditingShift ? "Shift updated successfully." : "Shift created successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
      resetShiftForm();
      fetchShifts();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving shift.");
    } finally {
      setSavingShift(false);
    }
  }

  async function handleDeleteShift(id: string, sName: string) {
    if (!confirm(`Are you sure you want to delete the shift "${sName}"?`)) return;
    try {
      setLoadingShifts(true);
      const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete shift.");
      }
      fetchShifts();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting shift.");
    } finally {
      setLoadingShifts(false);
    }
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleName.trim()) {
      setError("Schedule name is required.");
      return;
    }

    try {
      setSavingSchedule(true);
      setError(null);

      const payload = {
        name: scheduleName.trim(),
        days: scheduleDays.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isWeekend: d.isWeekend,
          shiftId: d.isWeekend ? null : d.shiftId || null,
        })),
      };

      const url = isEditingSchedule
        ? `/api/shift-schedules/${isEditingSchedule}`
        : "/api/shift-schedules";
      const method = isEditingSchedule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save schedule.");
      }

      setSuccessMsg(
        isEditingSchedule
          ? "Weekly schedule updated successfully."
          : "Weekly schedule created successfully."
      );
      setTimeout(() => setSuccessMsg(null), 3000);
      resetScheduleForm();
      fetchSchedules();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving schedule.");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleDeleteSchedule(id: string, sName: string) {
    if (!confirm(`Are you sure you want to delete the schedule "${sName}"?`)) return;
    try {
      setLoadingSchedules(true);
      const res = await fetch(`/api/shift-schedules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete schedule.");
      }
      fetchSchedules();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting schedule.");
    } finally {
      setLoadingSchedules(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Work Shifts & Day-wise Schedules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure standalone shifts and 7-day weekly schedule templates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("shifts");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "shifts"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>1. Work Shifts ({shifts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("schedules");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "schedules"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>2. Weekly Schedules ({schedules.length})</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: WORK SHIFTS */}
        {activeTab === "shifts" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Individual Shifts
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Define working time blocks (e.g. Morning, Evening, Night)
                </p>
              </div>
              {!showShiftForm && (
                <button
                  type="button"
                  onClick={() => {
                    resetShiftForm();
                    setShowShiftForm(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Shift
                </button>
              )}
            </div>

            {/* Shift Form */}
            {showShiftForm && (
              <form
                onSubmit={handleSaveShift}
                className="mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {isEditingShift ? "Edit Work Shift" : "Create New Work Shift"}
                  </span>
                  <button
                    type="button"
                    onClick={() => resetShiftForm()}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Shift Name
                  </label>
                  <input
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    placeholder="e.g. Regular Day, Morning Shift, Night Shift"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Grace Period (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => resetShiftForm()}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingShift}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {savingShift && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isEditingShift ? "Update Shift" : "Save Shift"}
                  </button>
                </div>
              </form>
            )}

            {/* Shift List */}
            <div className="space-y-2.5">
              {loadingShifts && (
                <div className="py-8 flex items-center justify-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
                  <span className="text-xs">Loading shifts...</span>
                </div>
              )}

              {!loadingShifts && shifts.length === 0 && (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No shifts created yet. The default shift (09:00 AM - 06:00 PM) is currently active.
                </div>
              )}

              {!loadingShifts &&
                shifts.map((s) => {
                  const assignedCount = s._count?.users ?? 0;
                  return (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90 hover:border-indigo-300 dark:hover:border-slate-700 flex items-center justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {s.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                            {assignedCount} Assigned
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-600 dark:text-slate-300">
                          <span>
                            Hours:{" "}
                            <strong className="font-mono text-slate-900 dark:text-white">
                              {s.startTime} - {s.endTime}
                            </strong>
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Grace:{" "}
                            <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                              {s.graceMinutes}m
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => startEditShift(s)}
                          className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(s.id, s.name)}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 2: WEEKLY SCHEDULES */}
        {activeTab === "schedules" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Weekly Shift Schedules (Day-by-Day)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Configure 7-day patterns where each day has its own shift or is an Off Day
                </p>
              </div>
              {!showScheduleForm && (
                <button
                  type="button"
                  onClick={() => {
                    resetScheduleForm();
                    setShowScheduleForm(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Schedule Template
                </button>
              )}
            </div>

            {/* Schedule Form */}
            {showScheduleForm && (
              <form
                onSubmit={handleSaveSchedule}
                className="mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {isEditingSchedule ? "Edit Weekly Schedule" : "Create New Weekly Schedule"}
                  </span>
                  <button
                    type="button"
                    onClick={() => resetScheduleForm()}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Schedule Template Name
                  </label>
                  <input
                    type="text"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    placeholder="e.g. Support Team Schedule, Rotational Shift Group A"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* 7 Days Grid */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Weekly Routine (Saturday - Friday)
                  </label>
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-white dark:bg-slate-900">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayState = scheduleDays.find((d) => d.dayOfWeek === day.dayOfWeek) || {
                        dayOfWeek: day.dayOfWeek,
                        isWeekend: false,
                        shiftId: "",
                      };

                      return (
                        <div
                          key={day.dayOfWeek}
                          className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                            dayState.isWeekend
                              ? "bg-amber-500/5 border-amber-500/20"
                              : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-[130px]">
                            <span className="w-8 text-center px-1.5 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {day.short}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {day.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 flex-1 justify-end">
                            {/* Weekend Toggle */}
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs select-none">
                              <input
                                type="checkbox"
                                checked={dayState.isWeekend}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setScheduleDays((prev) =>
                                    prev.map((d) =>
                                      d.dayOfWeek === day.dayOfWeek
                                        ? { ...d, isWeekend: checked }
                                        : d
                                    )
                                  );
                                }}
                                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                              />
                              <span
                                className={`text-[11px] font-medium ${
                                  dayState.isWeekend
                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                Off Day / Weekend
                              </span>
                            </label>

                            {/* Shift Selector */}
                            {!dayState.isWeekend && (
                              <select
                                value={dayState.shiftId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScheduleDays((prev) =>
                                    prev.map((d) =>
                                      d.dayOfWeek === day.dayOfWeek
                                        ? { ...d, shiftId: val }
                                        : d
                                    )
                                  );
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">Select Shift...</option>
                                {shifts.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.startTime} - {s.endTime})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => resetScheduleForm()}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSchedule}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {savingSchedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isEditingSchedule ? "Update Schedule" : "Save Schedule"}
                  </button>
                </div>
              </form>
            )}

            {/* Schedule List */}
            <div className="space-y-3">
              {loadingSchedules && (
                <div className="py-8 flex items-center justify-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
                  <span className="text-xs">Loading schedules...</span>
                </div>
              )}

              {!loadingSchedules && schedules.length === 0 && (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No weekly schedules created yet. Create one to assign customized daily shifts and off-days to employees.
                </div>
              )}

              {!loadingSchedules &&
                schedules.map((sched) => {
                  const assignedCount = sched._count?.users ?? 0;
                  const dayMap = new Map<number, ShiftScheduleDayItem>();
                  (sched.days || []).forEach((d) => dayMap.set(d.dayOfWeek, d));

                  return (
                    <div
                      key={sched.id}
                      className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90 hover:border-indigo-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {sched.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                            {assignedCount} Assigned
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <button
                            type="button"
                            onClick={() => startEditSchedule(sched)}
                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
                            title="Edit schedule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(sched.id, sched.name)}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer"
                            title="Delete schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Day summary badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        {DAYS_OF_WEEK.map((d) => {
                          const dayConfig = dayMap.get(d.dayOfWeek);
                          const isOff = !dayConfig || dayConfig.isWeekend || !dayConfig.shift;
                          return (
                            <div
                              key={d.dayOfWeek}
                              className={`p-1.5 rounded-lg border text-center ${
                                isOff
                                  ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              <div className="text-[10px] font-bold font-mono">{d.short}</div>
                              <div className="text-[10px] truncate font-medium">
                                {isOff ? "Off Day" : dayConfig.shift?.name || "Shift"}
                              </div>
                              {!isOff && dayConfig.shift && (
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                                  {dayConfig.shift.startTime}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
