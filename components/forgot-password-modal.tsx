"use client";

import { useState, useEffect } from "react";
import { X, Mail, ArrowLeft, AlertCircle, CheckCircle2, Send, Loader2, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

type Step = "REQUEST_OTP" | "VERIFY_AND_RESET" | "SUCCESS";

export function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("REQUEST_OTP");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state on modal close
      setStep("REQUEST_OTP");
      setUsernameOrEmail("");
      setEmailMasked("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setError(null);
      setInfoMsg(null);
      setResendCooldown(0);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!usernameOrEmail.trim()) return;

    setLoading(true);
    setError(null);
    setInfoMsg(null);

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
        throw new Error(data.error || "Failed to send verification code");
      }

      setEmailMasked(data.emailMasked || "your registered email");
      setStep("VERIFY_AND_RESET");
      setResendCooldown(30); // 30 second cooldown
      setInfoMsg(data.message || `OTP sent to ${data.emailMasked || "your email"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || resending || !usernameOrEmail.trim()) return;

    setResending(true);
    setError(null);
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
        throw new Error(data.error || "Failed to resend code");
      }

      setResendCooldown(45);
      setInfoMsg("A fresh 6-digit OTP has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const otpClean = otp.trim().replace(/\D/g, "");
    if (otpClean.length !== 6) {
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          otp: otpClean,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setStep("SUCCESS");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
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
              {step === "VERIFY_AND_RESET" ? <KeyRound className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {step === "REQUEST_OTP" && "Reset Password via OTP"}
                {step === "VERIFY_AND_RESET" && "Verify OTP & Set Password"}
                {step === "SUCCESS" && "Password Reset Successful"}
              </h3>
              <p className="text-[10px] font-mono text-[#888888]">
                {step === "REQUEST_OTP" && "Step 1 of 2: Get 6-Digit Code"}
                {step === "VERIFY_AND_RESET" && "Step 2 of 2: Enter OTP & New Password"}
                {step === "SUCCESS" && "Account recovered"}
              </p>
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
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 flex items-start gap-2 font-mono text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && step === "VERIFY_AND_RESET" && (
            <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/50 text-blue-300 flex items-start gap-2 font-mono text-xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: REQUEST OTP */}
          {step === "REQUEST_OTP" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-slate-400 text-xs leading-relaxed">
                Enter your registered username or email. We will send a secure <strong className="text-white">6-digit OTP code</strong> to your email.
              </p>

              <div>
                <label className="block text-[#888888] font-mono mb-1.5">Username or Email *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="e.g. hisam_admin or user@company.com"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-blue-500 rounded-lg pl-8 pr-3 py-2 text-white placeholder-[#555555] outline-none font-mono"
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-[#555555] absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-transparent hover:bg-[#151515] text-[#888888] hover:text-white transition-all text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Log In
                </button>

                <button
                  type="submit"
                  disabled={loading || !usernameOrEmail.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0070f3] hover:bg-[#0060df] font-medium text-white transition-all shadow-[0_0_15px_rgba(0,112,243,0.4)] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send OTP Code
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY OTP & RESET PASSWORD */}
          {step === "VERIFY_AND_RESET" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center justify-between bg-[#111111] border border-[#222222] p-2.5 rounded-lg">
                <div className="truncate">
                  <span className="text-[10px] uppercase font-mono text-[#888888] block">Sent OTP to</span>
                  <span className="text-white font-mono font-medium truncate block">{emailMasked || usernameOrEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("REQUEST_OTP")}
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-mono shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              {/* 6-Digit OTP Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#888888] font-mono">6-Digit OTP Code *</label>
                  <span className="text-[11px] text-amber-400/90 font-mono">Valid for 10 mins</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-blue-500 rounded-lg px-3 py-2.5 text-center text-xl font-bold tracking-[0.35em] text-white font-mono placeholder-[#444444] outline-none"
                  autoFocus
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[#888888] font-mono mb-1.5">New Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-blue-500 rounded-lg pl-3 pr-10 py-2 text-white placeholder-[#555555] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-[#666666] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[#888888] font-mono mb-1.5">Confirm Password *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full bg-[#111111] border rounded-lg px-3 py-2 text-white placeholder-[#555555] outline-none font-mono ${
                    confirmPassword && confirmPassword !== newPassword
                      ? "border-red-500/70"
                      : confirmPassword && confirmPassword === newPassword
                      ? "border-emerald-500/70"
                      : "border-[#222222] focus:border-blue-500"
                  }`}
                />
              </div>

              {/* Resend OTP Bar */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#777777]">Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resending}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:text-blue-300 disabled:text-[#555555] transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => setStep("REQUEST_OTP")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-transparent hover:bg-[#151515] text-[#888888] hover:text-white transition-all text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-medium text-white transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      Reset Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === "SUCCESS" && (
            <div className="py-3 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Password Reset Complete!</h4>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                  Your password has been successfully updated. You can now log into your account using your new password.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold transition-all shadow-lg shadow-blue-600/25 text-xs"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
