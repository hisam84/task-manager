"use client";

import { useState } from "react";
import { X, Building2, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCompanyModal({ isOpen, onClose, onSuccess }: CreateCompanyModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("password123");
  const [department, setDepartment] = useState("Executive Leadership");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleNameChange(val: string) {
    setName(val);
    // Auto generate clean slug
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword: adminPassword.trim(),
          department: department.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create company");

      setSuccessMsg(`Company '${data.name}' and Admin '${adminName}' created successfully!`);
      setTimeout(() => {
        setName("");
        setSlug("");
        setAdminName("");
        setAdminEmail("");
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-[#222222] rounded-xl shadow-vercel-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f1f] bg-[#050505]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Create Tenant Company</h3>
              <p className="text-[10px] font-mono text-[#888888]">Setup a new company organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#777777] hover:text-white transition-colors p-1 rounded hover:bg-[#1a1a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Company Details */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-mono text-purple-400 font-semibold uppercase tracking-wider">
              Organization Info
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#888888] font-mono mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Tech Solutions"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-1.5 text-white placeholder-[#555555] outline-none"
                />
              </div>
              <div>
                <label className="block text-[#888888] font-mono mb-1">Slug Identifier *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="acme-tech"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-1.5 font-mono text-white placeholder-[#555555] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Initial Admin */}
          <div className="space-y-2.5 pt-2 border-t border-[#1f1f1f]">
            <span className="text-[10px] font-mono text-purple-400 font-semibold uppercase tracking-wider">
              Company Admin Account
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#888888] font-mono mb-1">Admin Name *</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-1.5 text-white placeholder-[#555555] outline-none"
                />
              </div>
              <div>
                <label className="block text-[#888888] font-mono mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-1.5 text-white placeholder-[#555555] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#888888] font-mono mb-1">Password *</label>
                <input
                  type="text"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-1.5 font-mono text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[#888888] font-mono mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Executive Leadership"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-1.5 text-white outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1f1f1f]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#111111] hover:bg-[#1a1a1a] font-medium text-[#888888] hover:text-white border border-[#222222] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-[#7928ca] hover:bg-[#6820b3] font-medium text-white transition-all shadow-[0_0_15px_rgba(121,40,202,0.4)] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
