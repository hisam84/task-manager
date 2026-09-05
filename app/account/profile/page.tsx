"use client";

import { FormEvent, useEffect, useState } from "react";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import { useToast } from "@/components/toast";
import type { SessionUser } from "@/lib/types";

export default function ProfilePage() {
  const toast = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setName(data.user?.name ?? "");
        setPhone(data.user?.phone ?? "");
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      toast.push("Profile updated", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <form onSubmit={onSubmit} className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5 space-y-4">
        <Field label="Full Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input className={inputClass} value={user?.email ?? ""} disabled />
        </Field>
        <Field label="Phone">
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </PrimaryButton>
      </form>
    </div>
  );
}
