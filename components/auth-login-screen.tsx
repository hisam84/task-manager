"use client";

import { useState } from "react";
import { LogIn, KeyRound, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { ForgotPasswordModal } from "./forgot-password-modal";
import { ThemeToggle } from "./theme-toggle";
import { Footer } from "./footer";

interface AuthLoginScreenProps {
  onSuccess?: () => void;
}

export function AuthLoginScreen({ onSuccess }: AuthLoginScreenProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      setSuccessMsg(`Welcome back, ${data.user.name}!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        window.location.reload();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors">
      <div className="w-full max-w-md my-auto flex flex-col items-center">
        <div className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#222222] rounded-2xl shadow-xl dark:shadow-[0_0_40px_rgba(0,112,243,0.15)] overflow-hidden animate-fadeIn relative">
          {/* Header Banner */}
          <div className="px-6 py-6 border-b border-slate-100 dark:border-[#1f1f1f] bg-gradient-to-b from-slate-50 to-white dark:from-[#111111] dark:to-[#0a0a0a] text-center relative">
            <ThemeToggle className="absolute right-4 top-4" />
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md mx-auto mb-3 flex items-center justify-center p-2 overflow-hidden">
              <img src="/logo.png" alt="Task Manager" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Task Manager Portal</h1>
            <p className="text-xs text-slate-500 dark:text-[#888888] font-mono mt-1">
              Sign in with Username & Password to access your company dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-300 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-300 flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-600 dark:text-[#888888] font-mono mb-1">Username or Email *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full min-h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-[#0070f3] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555555] outline-none font-mono transition-all"
                  />
                  <User className="w-4 h-4 text-slate-400 dark:text-[#555555] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-[#888888] font-mono mb-1">Password *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-[#0070f3] rounded-lg pl-9 pr-3 py-2.5 font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555555] outline-none transition-all"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 dark:text-[#555555] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-3 text-center">
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-11 py-2.5 rounded-lg bg-[#0070f3] hover:bg-[#0060df] font-medium text-white transition-all shadow-md shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? "Authenticating..." : "Sign In to Task Manager"}</span>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-slate-500 dark:text-[#888888] hover:text-[#0070f3] transition-colors font-mono hover:underline inline-block py-1 cursor-pointer"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          </form>
        </div>

        <Footer variant="auth" className="mt-6" />
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onBackToLogin={() => setShowForgotPassword(false)}
      />
    </div>
  );
}

