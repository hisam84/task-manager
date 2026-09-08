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
                <ShieldCheck className="w-6 h-6 text-primary" />
                Super Admin Management Console
              </h1>
              <p className="page-desc">
                Manage system-wide multi-tenant companies, global access, and security credentials
              </p>
            </div>

            <button
              onClick={() => setCreateCompanyOpen(true)}
              className="btn-primary w-full sm:w-auto"
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
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Company Workspace Directory
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companies.map((comp) => (
                <div
                  key={comp.id}
                  className="p-5 rounded-xl bg-surface border border-border hover:bg-hover transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-foreground text-base truncate">{comp.name}</h3>
                        <span className="text-xs text-primary font-medium">
                          /{comp.slug}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleCompanyStatus(comp.id, comp.isActive)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                          comp.isActive
                            ? "bg-accent/10 text-accent border-accent/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {comp.isActive ? "ACTIVE" : "SUSPENDED"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-3 border-t border-b border-border text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <Users className="w-4 h-4 text-primary" />
                        <span>{comp._count?.users || 0} Users</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <FileCheck2 className="w-4 h-4 text-accent" />
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
                      className="btn-secondary text-xs"
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
                      className="icon-btn bg-hover"
                      title="Edit Company"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCompany(comp.id, comp.name)}
                      className="icon-btn text-destructive bg-destructive/10 hover:bg-destructive/20"
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
