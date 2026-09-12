"use client";

import { useState, useEffect } from "react";
import { X, Mail, ArrowLeft, AlertCircle, CheckCircle2, Send, Loader2, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  initialEmail?: string;
  backButtonLabel?: string;
  successButtonLabel?: string;
}

type Step = "REQUEST_OTP" | "VERIFY_AND_RESET" | "SUCCESS";

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onBackToLogin,
  initialEmail = "",
  backButtonLabel = "Sign In",
  successButtonLabel = "Sign In Now",
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("REQUEST_OTP");
  const [usernameOrEmail, setUsernameOrEmail] = useState(initialEmail);
  const [emailMasked, setEmailMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialEmail) {
        setUsernameOrEmail(initialEmail);
      }
    } else {
      setStep("REQUEST_OTP");
      setUsernameOrEmail("");
      setEmailMasked("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setError(null);
      setResendCooldown(0);
    }
  }, [isOpen, initialEmail]);

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
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("VERIFY_AND_RESET");
      setResendCooldown(30);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setResending(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-[400px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
        {/* =========================================================
            STEP 1: REQUEST OTP
           ========================================================= */}
        {step === "REQUEST_OTP" && (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">Forgot Password</h3>
                  <p className="text-xs text-slate-400">Enter your username or email to get code</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors -mr-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div className="relative">
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Username or email address"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-500 outline-none transition-all text-xs"
                  autoFocus
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {backButtonLabel}
                </button>

                <button
                  type="submit"
                  disabled={loading || !usernameOrEmail.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Code
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================
            STEP 2: VERIFY OTP & SET PASSWORD (OPTIMIZED)
           ========================================================= */}
        {step === "VERIFY_AND_RESET" && (
          <div>
            {/* 1. Header: Small icon + Verify OTP */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">Verify OTP</h3>
                  {/* 2. Very short subtitle with subtle Change action */}
                  <p className="text-xs text-slate-400">
                    Sent to <span className="text-slate-200 font-medium">{emailMasked || usernameOrEmail}</span>
                    <button
                      type="button"
                      onClick={() => setStep("REQUEST_OTP")}
                      className="ml-1.5 text-blue-400 hover:text-blue-300 underline text-[11px]"
                    >
                      Change
                    </button>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800/40 transition-colors -mr-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs" autoComplete="off">
              {/* Chrome / Edge password manager autofill trap */}
              <input type="text" name="fakeusernameremembered" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
              <input type="password" name="fakepasswordremembered" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />

              {/* 3. Compact prominent 6-Digit OTP input */}
              <div>
                <input
                  type="text"
                  id="reset-otp-input"
                  name="otp-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 px-3 text-center text-2xl font-bold tracking-[0.45em] text-slate-900 dark:text-white font-mono placeholder:tracking-widest placeholder:text-slate-400 outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* 4. New Password & 5. Confirm Password */}
              <div className="space-y-2.5">
                <div className="relative">
                  <input
                    id="new-password-input"
                    name="new-password"
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 characters)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-900 dark:text-white placeholder-slate-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="confirm-password-input"
                    name="confirm-new-password"
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 outline-none transition-all ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-rose-500/80 focus:ring-rose-500"
                        : confirmPassword && confirmPassword === newPassword
                        ? "border-emerald-500/80 focus:ring-emerald-500"
                        : "border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                </div>
              </div>

              {/* 6. Compact Resend Timer */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Didn't get the code?</span>
                {resendCooldown > 0 ? (
                  <span className="font-mono text-slate-500">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                    Resend code
                  </button>
                )}
              </div>

              {/* 7. Bottom Actions: Back + Dominant Reset Password CTA */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#222328]">
                <button
                  type="button"
                  onClick={() => setStep("REQUEST_OTP")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================
            STEP 3: SUCCESS
           ========================================================= */}
        {step === "SUCCESS" && (
          <div className="py-2 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Password Updated</h4>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Your password has been reset. You can now log into your account.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all shadow-md shadow-blue-600/20 text-xs"
              >
                {successButtonLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
