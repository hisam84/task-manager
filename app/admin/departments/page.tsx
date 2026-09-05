"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState, Field, GhostButton, Modal, PrimaryButton, inputClass } from "@/components/ui";
import { useToast } from "@/components/toast";

interface Department {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; tasks: number };
}

export default function DepartmentsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Department[]>([]);
  const [open, setOpen] = useState<"create" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/departments");
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setSelected(null);
    setName("");
    setDescription("");
    setOpen("create");
  }

  function startEdit(row: Department) {
    setSelected(row);
    setName(row.name);
    setDescription(row.description ?? "");
    setOpen("edit");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = open === "edit" && selected ? `/api/departments/${selected.id}` : "/api/departments";
      const res = await fetch(url, {
        method: open === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save department");
      toast.push(open === "edit" ? "Department updated" : "Department created", "success");
      setOpen(null);
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to save department", "error");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/departments/${selected.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete department");
      toast.push("Department deleted", "success");
      setOpen(null);
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to delete department", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Departments</h1>
          <p className="text-sm text-[#888888]">Organize employees and tasks by department</p>
        </div>
        <PrimaryButton onClick={startCreate}>Create Department</PrimaryButton>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No departments" description="Create a department before inviting employees." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#222222]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0a0a0a] text-left text-[11px] uppercase text-[#888888]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#1f1f1f]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-[11px] text-[#666666]">{row.description || "No description"}</div>
                  </td>
                  <td className="px-4 py-3">{row._count.users}</td>
                  <td className="px-4 py-3">{row._count.tasks}</td>
                  <td className="px-4 py-3">{row.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3 text-xs text-[#888888]">{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <GhostButton onClick={() => startEdit(row)}>Edit</GhostButton>
                      <GhostButton
                        onClick={() => {
                          setSelected(row);
                          setOpen("delete");
                        }}
                      >
                        Delete
                      </GhostButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(open === "create" || open === "edit") && (
        <Modal title={open === "edit" ? "Edit Department" : "Create Department"} onClose={() => setOpen(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Department Name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Description">
              <textarea className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </Field>
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</PrimaryButton>
          </form>
        </Modal>
      )}

      {open === "delete" && selected ? (
        <Modal
          title="Delete Department"
          description="Departments with employees or tasks cannot be deleted until those records are reassigned."
          onClose={() => setOpen(null)}
        >
          <div className="flex gap-2">
            <PrimaryButton onClick={remove} disabled={loading}>{loading ? "Deleting..." : "Delete"}</PrimaryButton>
            <GhostButton onClick={() => setOpen(null)}>Cancel</GhostButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
