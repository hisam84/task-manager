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

  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
      setName("");
      if (initialDate) {
        setDate(initialDate);
      } else {
        setDate(new Date().toISOString().slice(0, 10));
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage official and company scheduled holidays</p>
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

        {/* Add Holiday Form */}
        <form onSubmit={handleAddHoliday} className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">+ Add Holiday</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Holiday Title</label>
              <input
                type="text"
                placeholder="e.g. Independence Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-2xs"
                required
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-all disabled:opacity-50 shadow-md shadow-amber-600/20 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save Holiday
            </button>
          </div>
        </form>

        {/* Holiday List */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Scheduled Holidays</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {holidays.length}
            </span>
          </div>

          {loading && (
            <div className="py-6 flex items-center justify-center text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500 mr-2" />
              <span className="text-xs">Loading holidays...</span>
            </div>
          )}

          {!loading && holidays.length === 0 && (
            <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/40">
              No holidays added yet.
            </div>
          )}

          {!loading &&
            holidays.map((h) => {
              const formattedDate = new Date(h.date).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              });
              return (
                <div
                  key={h.id}
                  className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-slate-700 flex items-center justify-between transition-all"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block tracking-tight">{h.name}</span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 block">{formattedDate}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(h.id, h.name)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/15 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-2xs"
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
