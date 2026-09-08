"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { DepartmentModal } from "@/components/department-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { Layers, Plus, Edit2, Trash2, Loader2, Users, FileCheck2 } from "lucide-react";
import type { SessionUser } from "@/lib/types";

export default function DepartmentsPage() {
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
                <Layers className="w-6 h-6 text-primary" />
                Department Management
              </h1>
              <p className="page-desc">
                Manage company departments and organize teams efficiently
              </p>
            </div>

            <button
              onClick={() => {
                setEditingDepartment(null);
                setModalOpen(true);
              }}
              className="btn-primary w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          </div>

          {/* Department Cards Grid */}
          {departments.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-surface border border-border">
              <Layers className="w-12 h-12 text-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No Departments Created Yet</h3>
              <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
                Create departments (e.g., Engineering, Sales, HR) to organize employees and task assignments.
              </p>
              <button
                onClick={() => {
                  setEditingDepartment(null);
                  setModalOpen(true);
                }}
                className="mt-4 btn-primary"
              >
                Create First Department
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-5 rounded-xl bg-surface border border-border hover:bg-hover transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-foreground text-base truncate">{dept.name}</h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingDepartment(dept);
                            setModalOpen(true);
                          }}
                          className="icon-btn"
                          title="Edit Department"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="icon-btn hover:text-destructive hover:bg-destructive/10"
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <Users className="w-4 h-4 text-accent" />
                        <span>{dept._count?.users || 0} Members</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <FileCheck2 className="w-4 h-4 text-primary" />
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
