"use client";

import { useState } from "react";
import { X, UserPlus, AlertCircle } from "lucide-react";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "EMPLOYEE">("EMPLOYEE");
  const [department, setDepartment] = useState("Frontend Core");
  const [password, setPassword] = useState("password123");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          department: department.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite user");

      setName("");
      setEmail("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-[#222222] rounded-xl shadow-vercel-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-[#050505]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Invite Team Member</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#777777] hover:text-white transition-colors p-1 rounded-md hover:bg-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-[#888888] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. David Miller"
              className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs text-white placeholder-[#555555] outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#888888] mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="david@company.com"
              className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs text-white placeholder-[#555555] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-[#888888] mb-1">Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "MANAGER" | "EMPLOYEE")}
                className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs font-mono text-white outline-none cursor-pointer"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Company Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#888888] mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Frontend Core"
                className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#888888] mb-1">Default Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1f1f1f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#111111] hover:bg-[#1a1a1a] text-xs font-medium text-[#888888] hover:text-white border border-[#222222] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Team Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
