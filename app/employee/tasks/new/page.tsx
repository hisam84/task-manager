"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PrimaryButton, inputClass } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function CreateSelfTaskPage() {
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isSelfTask: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create self task");
      toast.push("Self task created", "success");
      router.push(`/employee/tasks/${data.id}`);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to create self task", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Create Self Task</h1>
      <form onSubmit={onSubmit} className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5 space-y-3">
        <Field label="Task Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
        <Field label="Description"><textarea className={inputClass} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Priority">
          <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </Field>
        <Field label="Deadline"><input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
        <PrimaryButton type="submit" disabled={loading}>{loading ? "Saving..." : "Create Self Task"}</PrimaryButton>
      </form>
    </div>
  );
}
