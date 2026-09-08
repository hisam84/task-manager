"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { EmployeeModal } from "@/components/employee-modal";
import { ResetPasswordModal } from "@/components/reset-password-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { Users, Plus, Edit2, Trash2, KeyRound, Loader2, Search } from "lucide-react";
import type { SessionUser } from "@/lib/types";

export default function TeamPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<any | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    fetchSessionAndTeamData();
  }, []);

  async function fetchSessionAndTeamData() {
    try {
      setLoading(true);
      const [meRes, empRes, deptRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/users"),
        fetch("/api/departments"),
      ]);

      const meData = await meRes.json();
      if (meData?.user) setUser(meData.user);

      const empData = await empRes.json();
      if (Array.isArray(empData)) setEmployees(empData);

      const deptData = await deptRes.json();
      if (Array.isArray(deptData)) setDepartments(deptData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}'s account?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSessionAndTeamData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.departmentName && e.departmentName.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="app-main">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="page-header">
            <div>
              <h1 className="page-title">
                <Users className="w-6 h-6 text-accent" />
                Employee Team Directory
              </h1>
              <p className="page-desc">
                Manage employees, assign roles, reset passwords, and assign departments
              </p>
            </div>

            <button
              onClick={() => {
                setEditingEmployee(null);
                setEmployeeModalOpen(true);
              }}
              className="btn-primary w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field pl-10"
              />
            </div>
          </div>

          {/* Employees Table */}
          <div className="table-wrap">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-hover text-muted font-medium">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Assigned Tasks</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-hover transition-colors">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-hover text-accent font-bold flex items-center justify-center text-xs">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{emp.name}</div>
                            <div className="text-xs text-muted">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            emp.role === "ADMIN"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : emp.role === "MANAGER"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-hover text-muted border-border"
                          }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-input border border-border text-foreground text-xs">
                          {emp.departmentName || "General"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-foreground">{emp.taskStats?.total || 0}</span> Tasks ({emp.taskStats?.done || 0} Done)
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setResetTargetUser(emp);
                              setResetModalOpen(true);
                            }}
                            className="icon-btn"
                            title="Reset Employee Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmployee(emp);
                              setEmployeeModalOpen(true);
                            }}
                            className="icon-btn"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="icon-btn hover:text-destructive hover:bg-destructive/10"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <EmployeeModal
        isOpen={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        onSuccess={fetchSessionAndTeamData}
        employeeToEdit={editingEmployee}
        departments={departments}
      />

      <ResetPasswordModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        targetUser={resetTargetUser}
      />

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
