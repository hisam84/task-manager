"use client";

import { FormEvent, useEffect, useState } from "react";
import { Field, GhostButton, Modal, PrimaryButton, inputClass, EmptyState } from "@/components/ui";
import { useToast } from "@/components/toast";

interface Company {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt: string;
  users: { id: string; name: string; email: string }[];
  _count: { users: number; tasks: number; departments: number };
}

const emptyForm = {
  name: "",
  slug: "",
  adminName: "",
  adminUsername: "",
  adminEmail: "",
  adminPassword: "",
  contactEmail: "",
  contactPhone: "",
};

export default function CompaniesPage() {
  const toast = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState<"create" | "edit" | "reset" | "delete" | null>(null);
  const [selected, setSelected] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/companies");
    const data = await res.json();
    setCompanies(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setSelected(null);
    setOpen("create");
  }

  function openEdit(company: Company) {
    setSelected(company);
    setForm({
      ...emptyForm,
      name: company.name,
      slug: company.slug,
      contactEmail: company.contactEmail ?? "",
      contactPhone: company.contactPhone ?? "",
      adminName: company.users[0]?.name ?? "",
      adminEmail: company.users[0]?.email ?? "",
    });
    setOpen("edit");
  }

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create company");
      toast.push("Company created", "success");
      setOpen(null);
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to create company", "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveCompany(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactEmail: form.contactEmail || null,
          contactPhone: form.contactPhone || null,
          adminName: form.adminName || undefined,
          adminEmail: form.adminEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update company");
      toast.push("Company updated", "success");
      setOpen(null);
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to update company", "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(company: Company) {
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !company.isActive }),
    });
    if (!res.ok) {
      toast.push("Failed to update status", "error");
      return;
    }
    await load();
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${selected.id}/reset-admin-password`, {
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

  async function deleteCompany() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${selected.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete company");
      toast.push(data.message || "Company deleted", "success");
      setOpen(null);
      await load();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to delete company", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Companies</h1>
          <p className="text-sm text-[#888888]">Create, edit, and remove tenant companies</p>
        </div>
        <PrimaryButton onClick={openCreate}>Create Company</PrimaryButton>
      </div>

      {companies.length === 0 ? (
        <EmptyState title="No companies yet" description="Create the first company to get started." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#222222]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0a0a0a] text-left text-[11px] uppercase text-[#888888]">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">People</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-t border-[#1f1f1f]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{company.name}</div>
                    <div className="text-[11px] text-[#666666]">{company.contactEmail || "No contact email"}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{company.slug}</td>
                  <td className="px-4 py-3">{company.users[0]?.name ?? "—"}</td>
                  <td className="px-4 py-3">{company._count.users}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(company)}
                      className="text-xs underline cursor-pointer"
                    >
                      {company.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <GhostButton onClick={() => openEdit(company)}>Edit</GhostButton>
                      <GhostButton
                        onClick={() => {
                          setSelected(company);
                          setOpen("reset");
                        }}
                      >
                        Reset Password
                      </GhostButton>
                      <GhostButton
                        onClick={() => {
                          setSelected(company);
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

      {open === "create" ? (
        <Modal title="Create Company" description="Creates a company and its first admin account." onClose={() => setOpen(null)}>
          <form onSubmit={createCompany} className="space-y-3">
            <Field label="Company Name">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Company Code / Slug">
              <input className={inputClass} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </Field>
            <Field label="Admin Name">
              <input className={inputClass} value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />
            </Field>
            <Field label="Admin Username">
              <input className={inputClass} value={form.adminUsername} onChange={(e) => setForm({ ...form, adminUsername: e.target.value })} required />
            </Field>
            <Field label="Admin Email">
              <input type="email" className={inputClass} value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
            </Field>
            <Field label="Admin Password">
              <input type="password" className={inputClass} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} minLength={8} required />
            </Field>
            <Field label="Contact Email">
              <input type="email" className={inputClass} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </Field>
            <Field label="Contact Phone">
              <input className={inputClass} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Saving..." : "Create"}</PrimaryButton>
          </form>
        </Modal>
      ) : null}

      {open === "edit" && selected ? (
        <Modal title="Edit Company" onClose={() => setOpen(null)}>
          <form onSubmit={saveCompany} className="space-y-3">
            <Field label="Company Name">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Admin Name">
              <input className={inputClass} value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
            </Field>
            <Field label="Admin Email">
              <input type="email" className={inputClass} value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
            </Field>
            <Field label="Contact Email">
              <input type="email" className={inputClass} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </Field>
            <Field label="Contact Phone">
              <input className={inputClass} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </Field>
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</PrimaryButton>
          </form>
        </Modal>
      ) : null}

      {open === "reset" && selected ? (
        <Modal title="Reset Company Admin Password" description={`Set a new password for ${selected.users[0]?.name ?? "the company admin"}.`} onClose={() => setOpen(null)}>
          <form onSubmit={resetPassword} className="space-y-3">
            <Field label="New Password">
              <input type="password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            </Field>
            <PrimaryButton type="submit" disabled={loading}>{loading ? "Saving..." : "Reset Password"}</PrimaryButton>
          </form>
        </Modal>
      ) : null}

      {open === "delete" && selected ? (
        <Modal
          title="Delete Company"
          description="This permanently deletes the company, departments, employees, and tasks. This cannot be undone."
          onClose={() => setOpen(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-[#cccccc]">
              Confirm deletion of <span className="text-white">{selected.name}</span>.
            </p>
            <div className="flex gap-2">
              <PrimaryButton onClick={deleteCompany} disabled={loading}>{loading ? "Deleting..." : "Delete Company"}</PrimaryButton>
              <GhostButton onClick={() => setOpen(null)}>Cancel</GhostButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
