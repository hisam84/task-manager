"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="p-6 rounded-xl bg-[#111111] border border-[#222222] text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-950/50 border border-red-800/60 flex items-center justify-center text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">Invalid Reset Link</h2>
          <p className="text-xs text-[#888888]">
            The password reset link is missing a valid security token. Please request a new link.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-[#222222] hover:bg-[#2a2a2a] border border-[#333333] rounded-lg transition-all"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="p-8 rounded-xl bg-[#111111] border border-[#222222] text-center space-y-5 shadow-2xl animate-fadeIn">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">Password Updated!</h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            Your password has been reset successfully. You can now log in using your new password.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0070f3] hover:bg-[#0060df] rounded-lg transition-all shadow-[0_0_20px_rgba(0,112,243,0.35)]"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 rounded-xl bg-[#111111] border border-[#222222] shadow-2xl space-y-6">
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start text-blue-400 text-xs font-mono mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>SECURE RECOVERY</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Set New Password</h1>
        <p className="text-xs text-[#888888]">
          Choose a secure password with at least 6 characters.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 flex items-start gap-2.5 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-[#888888] font-mono mb-1.5">New Password *</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-[#0a0a0a] border border-[#222222] focus:border-blue-500 rounded-lg pl-8 pr-10 py-2.5 text-white placeholder-[#555555] outline-none font-mono"
            />
            <KeyRound className="w-4 h-4 text-[#555555] absolute left-2.5 top-3" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-2.5 p-1 text-[#666666] hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[#888888] font-mono mb-1.5">Confirm New Password *</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-[#0a0a0a] border border-[#222222] focus:border-blue-500 rounded-lg pl-8 pr-3 py-2.5 text-white placeholder-[#555555] outline-none font-mono"
            />
            <KeyRound className="w-4 h-4 text-[#555555] absolute left-2.5 top-3" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white font-medium transition-all shadow-[0_0_15px_rgba(0,112,243,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <span>Update Password</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#070707] text-[#ededed] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* App Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 font-bold text-lg text-white">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-mono text-sm shadow-md">
              TM
            </div>
            <span>Task Manager</span>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="p-8 rounded-xl bg-[#111111] border border-[#222222] flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs text-[#888888] font-mono">Loading recovery session...</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-[11px] text-[#555555] font-mono">
          &copy; {new Date().getFullYear()} Task Manager System. All rights reserved.
        </p>
      </div>
    </main>
  );
}
