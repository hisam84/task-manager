"use client";

import { useState } from "react";
import { X, Mail, ArrowLeft, AlertCircle, CheckCircle2, Send, Loader2 } from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }: ForgotPasswordModalProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSuccessMsg(data.message || "Password reset link sent to your email!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
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
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Forgot Password</h3>
              <p className="text-[10px] font-mono text-[#888888]">Reset your account credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#777777] hover:text-white transition-colors rounded hover:bg-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 flex items-start gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-medium text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <span>Email Sent Successfully!</span>
                </div>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  {successMsg}
                </p>
                <p className="text-[11px] text-emerald-300/70 pt-1 font-mono">
                  💡 Check your spam/promotions folder if you don't see it in your inbox within a minute.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg(null);
                    setUsernameOrEmail("");
                  }}
                  className="text-[#888888] hover:text-white transition-colors underline text-[11px]"
                >
                  Send to another email
                </button>
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white font-medium transition-all shadow-[0_0_15px_rgba(0,112,243,0.3)]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Log In
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-slate-400 text-xs leading-relaxed">
                Enter your username or email address and we will send a secure password reset link to your verified email.
              </p>

              <div>
                <label className="block text-[#888888] font-mono mb-1.5">Username or Email *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="e.g. your_username or user@example.com"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-blue-500 rounded-lg pl-8 pr-3 py-2 text-white placeholder-[#555555] outline-none font-mono"
                  />
                  <Mail className="w-4 h-4 text-[#555555] absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent hover:bg-[#151515] text-[#888888] hover:text-white transition-all text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Log In
                </button>

                <button
                  type="submit"
                  disabled={loading || !usernameOrEmail.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0070f3] hover:bg-[#0060df] font-medium text-white transition-all shadow-[0_0_15px_rgba(0,112,243,0.4)] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Reset Link
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
