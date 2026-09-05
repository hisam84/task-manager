"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState, Field, GhostButton, Modal, PrimaryButton, inputClass } from "@/components/ui";
import { useToast } from "@/components/toast";

interface Employee {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  employeeCode?: string | null;
  designation?: string | null;
  isActive: boolean;
  joiningDate?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  taskStats?: { total: number; completed: number; overdue: number };
}

interface Department {
  id: string;
  name: string;
}

const empty = {
  name: "",
  email: "",
  username: "",
  phone: "",
  employeeCode: "",
  designation: "",
  departmentId: "",
  password: "",
  joiningDate: "",
};

export default function EmployeesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [q, setQ] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<"create" | "edit" | "reset" | "delete" | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm] = useState(empty);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (departmentId) params.set("departmentId", departmentId);
    if (status) params.set("status", status);
    const [empRes, deptRes] = await Promise.all([
      fetch(`/api/users?${params.toString()}`),
      fetch("/api/departments"),
    ]);
    const empData = await empRes.json();
    const deptData = await deptRes.json();
    setRows(Array.isArray(empData) ? empData : []);
    setDepartments(Array.isArray(deptData) ? deptData : []);
  }

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [q, departmentId, status]);

  function startCreate() {
    setSelected(null);
    setForm(empty);
    setOpen("create");
  }

  function startEdit(row: Employee) {
    setSelected(row);
    setForm({
      name: row.name,
      email: row.email,
      username: row.username ?? "",
      phone: row.phone ?? "",
      employeeCode: row.employeeCode ?? "",
      designation: row.designation ?? "",
      departmentId: row.departmentId ?? row.department?.id ?? "",
      password: "",
      joiningDate: row.joiningDate ? row.joiningDate.slice(0, 10) : "",
    });
    setOpen("edit");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        departmentId: form.departmentId || null,
        joiningDate: form.joiningDate || null,
      };
      const url = open === "edit" && selected ? `/api/users/${selected.id}` : "/api/users";
      const res = await fetch(url, {
        method: open === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save employee");
      toast.push(open === "edit" ? "Employee updated" : "Employee created", "success");
      setOpen(null);
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to save employee", "error");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${selected.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      toast.push(data.message || "Password reset", "success");
      setNewPassword("");
      setOpen(null);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to reset password", "error");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${selected.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete employee");
      toast.push("Employee deleted", "success");
      setOpen(null);
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to delete employee", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="text-sm text-[#888888]">Create, edit, and search company employees</p>
        </div>
        <PrimaryButton onClick={startCreate}>Create Employee</PrimaryButton>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input className={inputClass} placeholder="Search name, email, or ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No employees found" description="Create an employee or adjust your filters." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#222222]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0a0a0a] text-left text-[11px] uppercase text-[#888888]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#1f1f1f]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-[11px] text-[#666666]">{row.email} {row.employeeCode ? `· ${row.employeeCode}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">{row.department?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-xs text-[#888888]">
                    {row.taskStats?.total ?? 0} total / {row.taskStats?.completed ?? 0} done
                  </td>
                  <td className="px-4 py-3">{row.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <GhostButton onClick={() => startEdit(row)}>Edit</GhostButton>
                      <GhostButton onClick={() => { setSelected(row); setOpen("reset"); }}>Reset Password</GhostButton>
                      <GhostButton onClick={() => { setSelected(row); setOpen("delete"); }}>Delete</GhostButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(open === "create" || open === "edit") && (
        <Modal title={open === "edit" ? "Edit Employee" : "Create Employee"} onClose={() => setOpen(null)}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Full Name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
            <Field label="Username"><input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label="Employee ID"><input className={inputClass} value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Designation"><input className={inputClass} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
            <Field label="Department">
              <select className={inputClass} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Unassigned</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Joining Date"><input type="date" className={inputClass} value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></Field>
            {open === "create" ? (
              <Field label="Password">
                <input type="password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
              </Field>
            ) : null}
            <div className="sm:col-span-2"><PrimaryButton type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</PrimaryButton></div>
          </form>
        </Modal>
      )}

      {open === "reset" && selected ? (
        <Modal title="Reset Employee Password" description={`Set a new password for ${selected.name}.`} onClose={() => setOpen(null)}>
          <form onSubmit={resetPassword} className="space-y-3">
            <Field label="New Password">
              <input type="password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            </Field>
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Saving..." : "Reset Password"}</PrimaryButton>
          </form>
        </Modal>
      ) : null}

      {open === "delete" && selected ? (
        <Modal title="Delete Employee" description="Assigned tasks belonging to this employee will also be removed." onClose={() => setOpen(null)}>
          <div className="flex gap-2">
            <PrimaryButton onClick={remove} disabled={loading}>{loading ? "Deleting..." : "Delete"}</PrimaryButton>
            <GhostButton onClick={() => setOpen(null)}>Cancel</GhostButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
