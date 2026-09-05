"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { EmptyState, Field, GhostButton, Modal, PriorityBadge, PrimaryButton, StatusBadge, inputClass } from "@/components/ui";
import { useParams } from "next/navigation";
import { useToast } from "@/components/toast";
import { fetchTaskList } from "@/lib/api";

export interface TaskRow {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  effectiveStatus?: string;
  priority: string;
  progress: number;
  dueDate?: string | null;
  isSelfTask?: boolean;
  isOverdue?: boolean;
  assignee?: { id: string; name: string };
  department?: { id: string; name: string } | null;
}

interface Option {
  id: string;
  name: string;
}

export function TaskTable({
  basePath,
  canAssign,
  defaultSelf,
}: {
  basePath: string;
  canAssign: boolean;
  defaultSelf?: boolean;
}) {
  const toast = useToast();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [employees, setEmployees] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    departmentId: "",
    priority: "MEDIUM",
    dueDate: "",
    adminComment: "",
  });

  async function load() {
    const data = await fetchTaskList({
      q: q || undefined,
      status: status || undefined,
      priority: priority || undefined,
      assigneeId: canAssign ? assigneeId || undefined : undefined,
      take: "50",
    });
    setTasks(data.tasks as TaskRow[]);
  }

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [q, status, priority, assigneeId, canAssign]);

  useEffect(() => {
    if (!canAssign) return;
    Promise.all([fetch("/api/users"), fetch("/api/departments")])
      .then(async ([u, d]) => [await u.json(), await d.json()])
      .then(([users, depts]) => {
        setEmployees(Array.isArray(users) ? users : []);
        setDepartments(Array.isArray(depts) ? depts : []);
      });
  }, [canAssign]);

  async function createTask(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          isSelfTask: !canAssign || defaultSelf,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");
      toast.push(canAssign ? "Task assigned" : "Self task created", "success");
      setOpen(false);
      setForm({ title: "", description: "", assigneeId: "", departmentId: "", priority: "MEDIUM", dueDate: "", adminComment: "" });
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to create task", "error");
    } finally {
      setLoading(false);
    }
  }

  const title = canAssign ? "Tasks" : "My Tasks";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-[#888888]">{canAssign ? "Assign, filter, and monitor company tasks" : "Track and update your own work"}</p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)}>{canAssign ? "Assign Task" : "Create Self Task"}</PrimaryButton>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <input className={inputClass} placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        {canAssign ? (
          <select className={inputClass} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        ) : (
          <div />
        )}
      </div>
      {tasks.length === 0 ? (
        <EmptyState title="No tasks found" description="Create a task or change the current filters." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#222222]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0a0a0a] text-left text-[11px] uppercase text-[#888888]">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-t border-[#1f1f1f]">
                  <td className="px-4 py-3">
                    <Link href={`${basePath}/${task.id}`} className="font-medium hover:underline">
                      {task.title}
                    </Link>
                    {task.isSelfTask ? <span className="ml-2 text-[10px] uppercase text-[#50e3c2]">Self Task</span> : null}
                  </td>
                  <td className="px-4 py-3">{task.assignee?.name ?? "—"}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-3"><StatusBadge status={task.effectiveStatus || task.status} /></td>
                  <td className="px-4 py-3">{task.progress}%</td>
                  <td className="px-4 py-3 text-xs text-[#888888]">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <Modal title={canAssign ? "Assign Task" : "Create Self Task"} onClose={() => setOpen(false)}>
          <form onSubmit={createTask} className="space-y-3">
            <Field label="Task Title">
              <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Description">
              <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            {canAssign ? (
              <Field label="Assigned Employee">
                <select className={inputClass} value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} required>
                  <option value="">Select employee</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </Field>
            ) : null}
            {canAssign ? (
              <Field label="Department">
                <select className={inputClass} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Use employee department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="Priority">
              <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </Field>
            <Field label="Deadline">
              <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            {canAssign ? (
              <Field label="Admin Comment">
                <textarea className={inputClass} rows={2} value={form.adminComment} onChange={(e) => setForm({ ...form, adminComment: e.target.value })} />
              </Field>
            ) : null}
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</PrimaryButton>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

interface TaskDetailData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  effectiveStatus?: string;
  priority: string;
  progress: number;
  dueDate?: string | null;
  isSelfTask?: boolean;
  adminComment?: string | null;
  assignee?: { id: string; name: string };
  comments?: { id: string; body: string; author?: { name: string } }[];
  activities?: { id: string; action: string; detail?: string | null; actor?: { name: string } }[];
}

export function TaskDetail({ canAssign }: { canAssign: boolean }) {
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const id = params.id;

  async function load() {
    if (!id) return;
    const res = await fetch(`/api/tasks/${id}`);
    const data = await res.json();
    if (!res.ok) {
      toast.push(data.error || "Unable to load task", "error");
      return;
    }
    setTask(data);
    setProgress(data.progress ?? 0);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function saveProgress() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update progress");
      toast.push("Progress updated", "success");
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to update progress", "error");
    } finally {
      setLoading(false);
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/tasks/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.push(data.error || "Failed to add comment", "error");
      return;
    }
    setComment("");
    await load();
  }

  if (!task) return <p className="text-sm text-[#888888]">Loading task...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[#888888]">{task.isSelfTask ? "Self Task" : "Assigned Task"}</p>
          <h1 className="text-xl font-semibold">{task.title}</h1>
          <p className="mt-2 text-sm text-[#aaaaaa]">{task.description || "No description"}</p>
        </div>
        <StatusBadge status={task.effectiveStatus || task.status} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#222222] p-4"><p className="text-[11px] text-[#888888]">Priority</p><div className="mt-2"><PriorityBadge priority={task.priority} /></div></div>
        <div className="rounded-xl border border-[#222222] p-4"><p className="text-[11px] text-[#888888]">Assignee</p><p className="mt-2 text-sm">{task.assignee?.name}</p></div>
        <div className="rounded-xl border border-[#222222] p-4"><p className="text-[11px] text-[#888888]">Deadline</p><p className="mt-2 text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "None"}</p></div>
        <div className="rounded-xl border border-[#222222] p-4"><p className="text-[11px] text-[#888888]">Progress</p><p className="mt-2 text-sm">{task.progress}%</p></div>
      </div>
      <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5 space-y-3">
        <h2 className="text-sm font-medium">Update progress</h2>
        <div className="flex flex-wrap gap-2">
          {[0, 25, 50, 75, 100].map((value) => (
            <GhostButton key={value} onClick={() => setProgress(value)}>{value}%</GhostButton>
          ))}
        </div>
        <PrimaryButton onClick={saveProgress} disabled={loading}>{loading ? "Saving..." : "Save Progress"}</PrimaryButton>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
          <h2 className="mb-3 text-sm font-medium">Comments</h2>
          <div className="space-y-2 mb-3">
            {(task.comments ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border border-[#1f1f1f] p-3 text-xs">
                <p className="text-[#888888]">{c.author?.name}</p>
                <p className="mt-1 text-white">{c.body}</p>
              </div>
            ))}
          </div>
          <form onSubmit={addComment} className="space-y-2">
            <textarea className={inputClass} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" />
            <PrimaryButton type="submit">Add Comment</PrimaryButton>
          </form>
        </div>
        <div className="rounded-xl border border-[#222222] bg-[#0a0a0a] p-5">
          <h2 className="mb-3 text-sm font-medium">Activity</h2>
          <div className="space-y-2">
            {(task.activities ?? []).map((a) => (
              <div key={a.id} className="text-xs text-[#aaaaaa]">
                <span className="text-white">{a.actor?.name}</span> {a.detail || a.action}
              </div>
            ))}
            {(task.activities ?? []).length === 0 ? <p className="text-xs text-[#666666]">No activity yet</p> : null}
          </div>
          {canAssign && task.adminComment ? (
            <p className="mt-4 text-xs text-[#888888]">Admin comment: {task.adminComment}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
