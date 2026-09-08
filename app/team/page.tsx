"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { EmployeeModal } from "@/components/employee-modal";
import { ResetPasswordModal } from "@/components/reset-password-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  Loader2,
  Search,
  CalendarCheck2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Phone,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

type SortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "role"
  | "dept-asc"
  | "tasks-desc"
  | "tasks-asc";

export default function TeamPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

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

  const filteredAndSortedEmployees = useMemo(() => {
    const query = search.toLowerCase().trim();
    const result = employees.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        (e.phone && e.phone.toLowerCase().includes(query)) ||
        (e.designation && e.designation.toLowerCase().includes(query)) ||
        (e.departmentName && e.departmentName.toLowerCase().includes(query)) ||
        (e.department && e.department.toLowerCase().includes(query)) ||
        (e.role && e.role.toLowerCase().includes(query))
    );

    const roleWeight: Record<string, number> = {
      SUPER_ADMIN: 1,
      ADMIN: 2,
      MANAGER: 3,
      EMPLOYEE: 4,
    };

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "role") {
        const diff = (roleWeight[a.role] || 99) - (roleWeight[b.role] || 99);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      if (sortBy === "dept-asc") {
        const deptA = a.departmentName || a.department || "General";
        const deptB = b.departmentName || b.department || "General";
        return deptA.localeCompare(deptB);
      }
      if (sortBy === "tasks-desc") {
        return (b.taskStats?.total || 0) - (a.taskStats?.total || 0);
      }
      if (sortBy === "tasks-asc") {
        return (a.taskStats?.total || 0) - (b.taskStats?.total || 0);
      }
      return 0;
    });

    return result;
  }, [employees, search, sortBy]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (user.role === "SUPER_ADMIN") {
    router.replace("/super-admin");
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, phone, designation, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-11 bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-base md:text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Order / Sort Selector */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-400 font-medium whitespace-nowrap">Order by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent border-none text-xs font-semibold text-slate-200 outline-none cursor-pointer focus:ring-0 [&>option]:bg-slate-900 [&>option]:text-slate-200"
                >
                  <option value="newest">Newest Added First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                  <option value="role">Role (Admin → Staff)</option>
                  <option value="dept-asc">Department (A → Z)</option>
                  <option value="tasks-desc">Most Tasks Assigned</option>
                  <option value="tasks-asc">Least Tasks Assigned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="table-scroll rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/50 text-slate-700 dark:text-slate-400 font-semibold select-none">
                  <th className="p-4 w-14 text-center">
                    <button
                      type="button"
                      onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                      className="inline-flex items-center justify-center gap-1 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors font-semibold"
                      title="Sort by Registration Order"
                    >
                      <span>#</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => setSortBy(sortBy === "name-asc" ? "name-desc" : "name-asc")}
                      className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors font-semibold"
                    >
                      <span>Employee</span>
                      {sortBy === "name-asc" ? (
                        <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : sortBy === "name-desc" ? (
                        <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => setSortBy(sortBy === "role" ? "newest" : "role")}
                      className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors font-semibold"
                    >
                      <span>Role</span>
                      {sortBy === "role" ? (
                        <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => setSortBy(sortBy === "dept-asc" ? "newest" : "dept-asc")}
                      className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors font-semibold"
                    >
                      <span>Department</span>
                      {sortBy === "dept-asc" ? (
                        <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Work Shift</th>
                  <th className="p-4">
                    <button
                      type="button"
                      onClick={() => setSortBy(sortBy === "tasks-desc" ? "tasks-asc" : "tasks-desc")}
                      className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors font-semibold"
                    >
                      <span>Assigned Tasks</span>
                      {sortBy === "tasks-desc" ? (
                        <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : sortBy === "tasks-asc" ? (
                        <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredAndSortedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedEmployees.map((emp, index) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-semibold">
                          {index + 1}
                        </span>
                      </td>
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
                            {emp.designation && (
                              <div className="text-[11px] text-indigo-400 font-medium truncate">
                                {emp.designation}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                            {emp.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                                <a
                                  href={`tel:${emp.phone}`}
                                  className="hover:text-emerald-400 transition-colors hover:underline"
                                  title="Call employee"
                                >
                                  {emp.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            emp.role === "ADMIN"
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                              : emp.role === "MANAGER"
                              ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                          {emp.departmentName || "General"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-mono font-medium">
                          {emp.shift ? `${emp.shift.name} (${emp.shift.startTime}-${emp.shift.endTime})` : "Default (09:00-18:00)"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-900 dark:text-white">{emp.taskStats?.total || 0}</span> Tasks ({emp.taskStats?.done || 0} Done)
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/attendance`}
                            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="View Attendance Sheet"
                          >
                            <CalendarCheck2 className="w-4 h-4" />
                          </Link>
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
