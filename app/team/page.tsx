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
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={user}
        onUserUpdated={(u) => setUser(u)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <Users className="w-6 h-6 text-emerald-400" />
                Employee Team Directory
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage employees, assign roles, reset passwords, and assign departments
              </p>
            </div>

            <button
              onClick={() => {
                setEditingEmployee(null);
                setEmployeeModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/25 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-11 bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-base md:text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Employees Table */}
          <div className="table-scroll rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-medium">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Assigned Tasks</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-3">
                          {emp.avatar ? (
                            <img
                              src={emp.avatar}
                              alt={emp.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white">{emp.name}</div>
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            emp.role === "ADMIN"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : emp.role === "MANAGER"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px]">
                          {emp.departmentName || "General"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-white">{emp.taskStats?.total || 0}</span> Tasks ({emp.taskStats?.done || 0} Done)
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setResetTargetUser(emp);
                              setResetModalOpen(true);
                            }}
                            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Reset Employee Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmployee(emp);
                              setEmployeeModalOpen(true);
                            }}
                            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
