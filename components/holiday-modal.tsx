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
}

export function HolidayModal({ isOpen, onClose, onSuccess }: HolidayModalProps) {
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
      setError(null);
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Company Holidays</h2>
              <p className="text-xs text-slate-400">Configure official company non-working days</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Add Holiday Form */}
        <form onSubmit={handleAddHoliday} className="mt-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <span className="text-xs font-semibold text-slate-200 block">Add Official Holiday</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Holiday Title</label>
              <input
                type="text"
                placeholder="e.g. Independence Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save Holiday
            </button>
          </div>
        </form>

        {/* Holiday List */}
        <div className="mt-5 space-y-2">
          <h3 className="text-xs font-semibold text-slate-300">Scheduled Holidays</h3>
          {loading && (
            <div className="py-6 flex items-center justify-center text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500 mr-2" />
              <span className="text-xs">Loading holidays...</span>
            </div>
          )}

          {!loading && holidays.length === 0 && (
            <div className="py-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
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
                  className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-xs text-slate-100 block">{h.name}</span>
                    <span className="text-[11px] text-slate-400">{formattedDate}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(h.id, h.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete holiday"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
