"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { DepartmentModal } from "@/components/department-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { Layers, Plus, Edit2, Trash2, Loader2, Users, FileCheck2 } from "lucide-react";
import type { SessionUser } from "@/lib/types";

export default function DepartmentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    fetchSessionAndDepartments();
  }, []);

  async function fetchSessionAndDepartments() {
    try {
      setLoading(true);
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (meData?.user) {
        setUser(meData.user);
      }

      const deptRes = await fetch("/api/departments");
      const deptData = await deptRes.json();
      if (Array.isArray(deptData)) {
        setDepartments(deptData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSessionAndDepartments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

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
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <Layers className="w-6 h-6 text-blue-400" />
                Department Management
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage company departments and organize teams efficiently
              </p>
            </div>

            <button
              onClick={() => {
                setEditingDepartment(null);
                setModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/25 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          </div>

          {/* Department Cards Grid */}
          {departments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No Departments Created Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Create departments (e.g., Engineering, Sales, HR) to organize employees and task assignments.
              </p>
              <button
                onClick={() => {
                  setEditingDepartment(null);
                  setModalOpen(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all"
              >
                Create First Department
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white text-base truncate">{dept.name}</h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingDepartment(dept);
                            setModalOpen(true);
                          }}
                          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>{dept._count?.users || 0} Members</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <FileCheck2 className="w-4 h-4 text-blue-400" />
                        <span>{dept._count?.tasks || 0} Tasks</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <DepartmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchSessionAndDepartments}
        departmentToEdit={editingDepartment}
      />

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
