"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, X, Loader2, AlertCircle } from "lucide-react";

interface Employee {
  id?: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string | null;
  department?: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: Employee | null;
  departments: Department[];
}

export function EmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit,
  departments,
}: EmployeeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setName(employeeToEdit.name);
      setEmail(employeeToEdit.email);
      setRole(employeeToEdit.role);
      setDepartmentId(employeeToEdit.departmentId || "");
      setPassword("");
    } else {
      setName("");
      setEmail("");
      setPassword("EmpPass2026!");
      setRole("EMPLOYEE");
      setDepartmentId(departments[0]?.id || "");
    }
    setError(null);
  }, [employeeToEdit, isOpen, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (!employeeToEdit && (!password || password.length < 6)) {
      setError("Initial password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const isEdit = !!employeeToEdit?.id;
      const url = isEdit ? `/api/users/${employeeToEdit.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        role,
        departmentId: departmentId || null,
      };

      if (!isEdit) {
        payload.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save employee.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-surface border border-border rounded-t-xl sm:rounded-xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {employeeToEdit ? "Edit Employee Account" : "Create Employee Account"}
              </h2>
              <p className="text-xs text-muted">Add or manage employee team members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
              required
            />
          </div>

          {!employeeToEdit && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Initial Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-accent font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground text-xs focus:outline-none focus:border-primary"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Company Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground text-xs focus:outline-none focus:border-primary"
              >
                <option value="">General</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-muted hover:text-foreground bg-hover hover:bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-on-primary bg-primary hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {employeeToEdit ? "Save Changes" : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
