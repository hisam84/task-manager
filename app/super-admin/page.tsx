"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { CreateCompanyModal } from "@/components/create-company-modal";
import { EditCompanyModal } from "@/components/edit-company-modal";
import { ResetPasswordModal } from "@/components/reset-password-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { ProgressCard, DonutChart } from "@/components/charts";
import { ShieldCheck, Building2, Plus, Edit2, Trash2, KeyRound, Loader2, Users, FileCheck2, Power } from "lucide-react";
import type { SessionUser } from "@/lib/types";

export default function SuperAdminPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Modals
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<any | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  async function fetchSuperAdminData() {
    try {
      setLoading(true);
      const [meRes, compRes, repRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/companies"),
        fetch("/api/reports"),
      ]);

      const meData = await meRes.json();
      if (meData?.user) setUser(meData.user);

      const compData = await compRes.json();
      if (Array.isArray(compData)) setCompanies(compData);

      const repData = await repRes.json();
      if (repData?.metrics) setMetrics(repData.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleCompanyStatus(id: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) fetchSuperAdminData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteCompany(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This will permanently remove all associated users, departments, and tasks.`))
      return;

    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (res.ok) fetchSuperAdminData();
    } catch (e) {
      console.error(e);
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  if (loading || !user) {
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
                <ShieldCheck className="w-6 h-6 text-purple-400" />
                Super Admin Management Console
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage system-wide multi-tenant companies, global access, and security credentials
              </p>
            </div>

            <button
              onClick={() => setCreateCompanyOpen(true)}
              className="flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/25 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Create New Company
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ProgressCard
              title="Total Registered Companies"
              value={metrics.totalCompanies || companies.length}
              subtitle="Tenant Workspaces"
              color="purple"
            />
            <ProgressCard
              title="Active Tenants"
              value={metrics.activeCompanies || 0}
              subtitle="Active Accounts"
              color="emerald"
            />
            <ProgressCard
              title="System Total Users"
              value={metrics.totalUsers || 0}
              subtitle="Registered Accounts"
              color="blue"
            />
            <ProgressCard
              title="Total System Tasks"
              value={metrics.totalTasks || 0}
              subtitle="Across All Companies"
              color="amber"
            />
          </div>

          {/* Companies Grid */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              Company Workspace Directory
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companies.map((comp) => (
                <div
                  key={comp.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-white text-base truncate">{comp.name}</h3>
                        <span className="text-xs text-purple-400 font-mono font-medium">
                          /{comp.slug}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleCompanyStatus(comp.id, comp.isActive)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                          comp.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {comp.isActive ? "ACTIVE" : "SUSPENDED"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-3 border-t border-b border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span>{comp._count?.users || 0} Users</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <FileCheck2 className="w-4 h-4 text-emerald-400" />
                        <span>{comp._count?.tasks || 0} Tasks</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
                    <button
                      onClick={() => {
                        setResetTargetUser({
                          id: comp.id,
                          name: `${comp.name} Admin`,
                          email: `Company Workspace: /${comp.slug}`,
                        });
                        setResetModalOpen(true);
                      }}
                      className="min-h-11 px-3 rounded-xl text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Reset Admin Password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Reset Password</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingCompany(comp);
                        setEditCompanyOpen(true);
                      }}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors"
                      title="Edit Company"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCompany(comp.id, comp.name)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                      title="Delete Company"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <CreateCompanyModal
        isOpen={createCompanyOpen}
        onClose={() => setCreateCompanyOpen(false)}
        onSuccess={fetchSuperAdminData}
      />

      <EditCompanyModal
        isOpen={editCompanyOpen}
        onClose={() => setEditCompanyOpen(false)}
        onSuccess={fetchSuperAdminData}
        company={editingCompany}
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
