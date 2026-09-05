"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, KeyRound, User } from "lucide-react";
import { Field, PrimaryButton, inputClass } from "@/components/ui";

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: usernameOrEmail.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid username/email or password");
      window.location.href = data.redirectTo || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-[#222222] bg-[#0a0a0a] p-6 space-y-4"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl border border-[#222222] bg-[#111111] flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 76 65" fill="currentColor">
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold">Task Manager</h1>
          <p className="text-xs text-[#888888]">Sign in to continue to your dashboard</p>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <Field label="Username or Email">
          <div className="relative">
            <User className="absolute left-3 top-2.5 w-4 h-4 text-[#666666]" />
            <input
              className={`${inputClass} pl-9`}
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
        </Field>
        <Field label="Password">
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-[#666666]" />
            <input
              type="password"
              className={`${inputClass} pl-9`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </Field>
        <PrimaryButton type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </PrimaryButton>
      </form>
    </div>
  );
}
