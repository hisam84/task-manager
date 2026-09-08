"use client";

import { useState } from "react";
import { X, LogIn, KeyRound, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { ForgotPasswordModal } from "./forgot-password-modal";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  if (showForgotPassword) {
    return (
      <ForgotPasswordModal
        isOpen={true}
        onClose={onClose}
        onBackToLogin={() => setShowForgotPassword(false)}
      />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log in");

      setSuccessMsg(`Welcome back, ${data.user.name}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess();
        onClose();
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto bg-[#0a0a0a] border border-[#222222] rounded-t-xl sm:rounded-xl shadow-vercel-card pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f1f] bg-[#050505]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Admin & User Login</h3>
              <p className="text-[10px] font-mono text-[#888888]">Log in with your Username and Password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#777777] hover:text-white transition-colors rounded hover:bg-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[#888888] font-mono mb-1">Username or Email *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. admin_vercel or admin@vercel.com"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-blue-500 rounded-lg pl-8 pr-3 py-2 text-white placeholder-[#555555] outline-none font-mono"
                />
                <User className="w-4 h-4 text-[#555555] absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#888888] font-mono">Password *</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-mono hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-blue-500 rounded-lg pl-8 pr-3 py-2 font-mono text-white placeholder-[#555555] outline-none"
                />
                <KeyRound className="w-4 h-4 text-[#555555] absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1f1f1f]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#111111] hover:bg-[#1a1a1a] font-medium text-[#888888] hover:text-white border border-[#222222] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-[#0070f3] hover:bg-[#0060df] font-medium text-white transition-all shadow-[0_0_15px_rgba(0,112,243,0.4)] disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
