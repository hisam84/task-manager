"use client";

import React, { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Edit2, X, Loader2, AlertCircle, Check } from "lucide-react";

export interface ShiftItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  _count?: { users: number };
}

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ShiftModal({ isOpen, onClose, onSuccess }: ShiftModalProps) {
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShifts();
      resetForm();
    }
  }, [isOpen]);

  async function fetchShifts() {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }

  function resetForm() {
    setIsEditing(null);
    setName("");
    setStartTime("09:00");
    setEndTime("18:00");
    setGraceMinutes(15);
    setShowAddForm(false);
    setError(null);
  }

  function startEdit(s: ShiftItem) {
    setIsEditing(s.id);
    setName(s.name);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setGraceMinutes(s.graceMinutes);
    setShowAddForm(true);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Shift name is required.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Start time and end time are required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: name.trim(),
        startTime,
        endTime,
        graceMinutes: Number(graceMinutes) || 15,
      };

      const url = isEditing ? `/api/shifts/${isEditing}` : "/api/shifts";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save shift.");
      }

      setSuccessMsg(isEditing ? "Shift updated successfully." : "Shift created successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
      resetForm();
      fetchShifts();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving shift.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, shiftName: string) {
    if (!confirm(`Are you sure you want to delete the shift "${shiftName}"?`)) return;
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Work Shifts Management</h2>
              <p className="text-xs text-slate-400">Configure shifts and late grace rules</p>
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

        {/* Notifications */}
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

        {/* Action Bar */}
        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Company Shifts</h3>
          {!showAddForm && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Shift
            </button>
          )}
        </div>

        {/* Form to Add / Edit */}
        {showAddForm && (
          <form
            onSubmit={handleSave}
            className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-xs font-semibold text-indigo-400">
                {isEditing ? "Edit Work Shift" : "Create New Work Shift"}
              </span>
              <button
                type="button"
                onClick={() => resetForm()}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Shift Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Regular Shift, Morning Shift, Night Shift"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={graceMinutes}
                onChange={(e) => setGraceMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Standard company grace period is 15 minutes before late penalties begin.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => resetForm()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEditing ? "Update Shift" : "Save Shift"}
              </button>
            </div>
          </form>
        )}

        {/* Shift List */}
        <div className="mt-4 space-y-2">
          {loading && (
            <div className="py-6 flex items-center justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
              <span className="text-xs">Loading shifts...</span>
            </div>
          )}

          {!loading && shifts.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              No shifts created yet. The default shift (09:00 AM - 06:00 PM) is currently active.
            </div>
          )}

          {!loading &&
            shifts.map((shift) => (
              <div
                key={shift.id}
                className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-100">{shift.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {shift._count?.users ?? 0} Employees Assigned
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <span>
                      Hours: <strong className="text-slate-200">{shift.startTime}</strong> to{" "}
                      <strong className="text-slate-200">{shift.endTime}</strong>
                    </span>
                    <span>
                      Grace: <strong className="text-slate-200">{shift.graceMinutes}m</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(shift)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Edit shift"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(shift.id, shift.name)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
