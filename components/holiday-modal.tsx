"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, X, Loader2, AlertCircle, Check } from "lucide-react";

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
}

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: string | null;
}

export function HolidayModal({ isOpen, onClose, onSuccess, initialDate }: HolidayModalProps) {
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
      setName("");
      if (initialDate) {
        setDate(initialDate);
        setShowAddForm(true);
      } else {
        setDate(new Date().toISOString().slice(0, 10));
        setShowAddForm(false);
      }
      setError(null);
    }
  }, [isOpen, initialDate]);

  async function fetchHolidays() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/holidays");
      const data = await res.json();
      if (Array.isArray(data)) {
        setHolidays(data);
      } else {
        setHolidays([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load holidays.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Holiday name is required.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), date }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add holiday.");
      }

      setSuccessMsg("Holiday added successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
      setName("");
      setShowAddForm(false);
      fetchHolidays();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, holidayName: string) {
    if (!confirm(`Are you sure you want to remove the holiday "${holidayName}"?`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete holiday.");
      }
      fetchHolidays();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Company Holidays</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure official company holidays and observances</p>
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

        {/* Action Bar */}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Scheduled Holidays</h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {holidays.length}
            </span>
          </div>
          {!showAddForm && (
            <button
              type="button"
              onClick={() => {
                setName("");
                setDate(new Date().toISOString().slice(0, 10));
                setShowAddForm(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Holiday
            </button>
          )}
        </div>

        {/* Add Holiday Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddHoliday}
            className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Create New Holiday
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Holiday Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Holiday Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day, Eid-ul-Fitr"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/80 dark:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Holiday
              </button>
            </div>
          </form>
        )}

        {/* Holiday List */}
        <div className="mt-3.5 space-y-2.5">
          {loading && (
            <div className="py-8 flex items-center justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-2" />
              <span className="text-xs">Loading holidays...</span>
            </div>
          )}

          {!loading && holidays.length === 0 && (
            <div className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No scheduled holidays</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;+ Add Holiday&quot; to register official company holidays.</p>
            </div>
          )}

          {!loading &&
            holidays.map((h) => {
              const d = new Date(h.date);
              const formattedDate = d.toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              });
              const monthStr = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
              const dayStr = d.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" });

              return (
                <div
                  key={h.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90 hover:border-amber-300 dark:hover:border-slate-700 hover:shadow-sm flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold tracking-wider leading-none">{monthStr}</span>
                      <span className="text-sm font-extrabold leading-none mt-0.5 font-mono">{dayStr}</span>
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block tracking-tight">
                        {h.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formattedDate}</span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/30">
                          Official Holiday
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(h.id, h.name)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/15 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
                    title="Delete holiday"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
