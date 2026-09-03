"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { CreateCompanyModal } from "@/components/create-company-modal";
import { CreateTaskModal } from "@/components/create-task-modal";
import { Building2, Plus, Shield } from "lucide-react";
import type { SessionUser } from "@/lib/types";

interface CompanyCard {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count?: { users: number; tasks: number };
}

export default function SuperAdminPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [companies, setCompanies] = useState<CompanyCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  async function fetchSuperAdminData() {
    setLoading(true);
    try {
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();
      setCurrentUser(authData.user);

      const compRes = await fetch("/api/companies");
      const compData = await compRes.json();
      if (Array.isArray(compData)) {
        setCompanies(compData);
      }
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
      if (res.ok) {
        fetchSuperAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  async function handleSuperAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    setLoginSuccess(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: loginIdentifier.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Super Admin authentication failed");

      if (data.user.role !== "SUPER_ADMIN") {
        throw new Error("This account is not a Super Admin account");
      }

      setLoginSuccess(`Authenticated as ${data.user.name}`);
      setTimeout(() => {
        fetchSuperAdminData();
        window.location.reload();
      }, 800);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Super Admin authentication failed");
    } finally {
      setLoginLoading(false);
    }
  }

  if (currentUser && currentUser.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Navbar user={currentUser} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-[#222222] rounded-2xl shadow-[0_0_30px_rgba(121,40,202,0.15)] overflow-hidden animate-fadeIn">
            {/* Panel Header */}
            <div className="px-6 py-5 border-b border-[#1f1f1f] bg-gradient-to-r from-purple-950/40 to-black flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-700/50 flex items-center justify-center text-purple-300 shadow-md">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Super Admin Portal</h2>
                <p className="text-[11px] font-mono text-purple-300/80">Platform Management Console</p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSuperAdminLogin} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-900/30 text-purple-200/90 text-[11px] font-mono leading-relaxed">
                Access to company tenant management requires Super Admin credentials.
              </div>

              {loginError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 font-mono">
                  {loginError}
                </div>
              )}

              {loginSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-mono">
                  {loginSuccess}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[#888888] font-mono mb-1">Username or Email *</label>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="superadmin"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-2 font-mono text-white placeholder-[#555555] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#888888] font-mono mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-2 font-mono text-white placeholder-[#555555] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 rounded-lg bg-[#7928ca] hover:bg-[#6820b3] font-medium text-white transition-all shadow-[0_0_20px_rgba(121,40,202,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>{loginLoading ? "Authenticating..." : "Login to Super Admin"}</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar
        user={currentUser}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onOpenCreateCompany={() => setIsCreateCompanyOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <span>Company Tenants</span>
            </h1>
            <p className="text-xs text-[#888888] font-mono mt-0.5">
              Manage platform organizations and access
            </p>
          </div>

          <button
            onClick={() => setIsCreateCompanyOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#7928ca] hover:bg-[#6820b3] text-xs font-medium text-white transition-all shadow-[0_0_15px_rgba(121,40,202,0.4)] flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Company</span>
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs font-mono text-[#888888]">Loading companies...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((comp) => (
              <div
                key={comp.id}
                className="vercel-card rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white">{comp.name}</h3>
                      <span className="text-[11px] font-mono text-purple-300">
                        /{comp.slug}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleCompanyStatus(comp.id, comp.isActive)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                      comp.isActive
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                        : "bg-red-950/60 text-red-300 border-red-800/60"
                    }`}
                  >
                    {comp.isActive ? "ACTIVE" : "INACTIVE"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a1a1a] text-xs font-mono">
                  <div className="bg-[#111111] p-2 rounded border border-[#222222]">
                    <span className="text-[#666666] text-[10px] block">USERS</span>
                    <span className="text-white font-semibold text-xs mt-0.5 block">
                      {comp._count?.users || 0}
                    </span>
                  </div>
                  <div className="bg-[#111111] p-2 rounded border border-[#222222]">
                    <span className="text-[#666666] text-[10px] block">TASKS</span>
                    <span className="text-cyan-400 font-semibold text-xs mt-0.5 block">
                      {comp._count?.tasks || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onSuccess={fetchSuperAdminData}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={fetchSuperAdminData}
      />
    </div>
  );
}
