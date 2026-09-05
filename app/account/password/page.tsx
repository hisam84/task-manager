"use client";

import { FormEvent, useState } from "react";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function ChangePasswordPage() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      toast.push("Password updated", "success");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to change password", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Change Password</h1>
      <form onSubmit={onSubmit} className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5 space-y-4">
        <Field label="Current Password">
          <input
            type="password"
            className={inputClass}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="New Password">
          <input
            type="password"
            className={inputClass}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Saving..." : "Update Password"}
        </PrimaryButton>
      </form>
    </div>
  );
}
