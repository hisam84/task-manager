"use client";

import { useState } from "react";
import { LogIn, KeyRound, User, AlertCircle, CheckCircle2, Shield, Check } from "lucide-react";

interface AuthLoginScreenProps {
  onSuccess?: () => void;
}

export function AuthLoginScreen({ onSuccess }: AuthLoginScreenProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

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
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      setSuccessMsg(`Welcome back, ${data.user.name}!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        window.location.reload();
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-black text-white">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-[#222222] rounded-2xl shadow-[0_0_40px_rgba(0,112,243,0.15)] overflow-hidden animate-fadeIn">
        {/* Header Banner */}
        <div className="px-6 py-6 border-b border-[#1f1f1f] bg-gradient-to-b from-[#111111] to-[#0a0a0a] text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-[#222222] shadow-inner mx-auto mb-3 flex items-center justify-center text-[#0070f3]">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 76 65"
              fill="currentColor"
            >
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
          </div>
          <h1 className="text-base font-bold tracking-tight text-white">Task Manager Portal</h1>
          <p className="text-xs text-[#888888] font-mono mt-1">
            Sign in with Username & Password to access your company dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-[#888888] font-mono mb-1">Username or Email *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. admin_vercel or admin@vercel.com"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-[#555555] outline-none font-mono transition-all"
                />
                <User className="w-4 h-4 text-[#555555] absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-[#888888] font-mono mb-1">Password *</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-[#0070f3] rounded-lg pl-9 pr-3 py-2.5 font-mono text-white placeholder-[#555555] outline-none transition-all"
                />
                <KeyRound className="w-4 h-4 text-[#555555] absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#0070f3] hover:bg-[#0060df] font-medium text-white transition-all shadow-[0_0_20px_rgba(0,112,243,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? "Authenticating..." : "Sign In to Task Manager"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
