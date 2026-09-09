"use client";

import { useState } from "react";
import { X, Building2, Plus, AlertCircle, CheckCircle2, Calendar, Clock, ShieldAlert, Eye, EyeOff } from "lucide-react";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCompanyModal({ isOpen, onClose, onSuccess }: CreateCompanyModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [department, setDepartment] = useState("Executive Leadership");
  const [enableLatePenalty, setEnableLatePenalty] = useState(false);
  const [subscriptionPreset, setSubscriptionPreset] = useState<string>("1_YEAR");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleNameChange(val: string) {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setSlug(generatedSlug);
    if (!adminUsername && generatedSlug) {
      setAdminUsername(`admin_${generatedSlug.replace(/-/g, "_")}`);
    }
  }

  function getComputedSubscriptionDate(preset: string, customDate: string): string | null {
    if (preset === "LIFETIME") return null;
    if (preset === "CUSTOM") return customDate ? new Date(customDate).toISOString() : null;
    const d = new Date();
    if (preset === "1_MONTH") d.setMonth(d.getMonth() + 1);
    else if (preset === "3_MONTHS") d.setMonth(d.getMonth() + 3);
    else if (preset === "6_MONTHS") d.setMonth(d.getMonth() + 6);
    else if (preset === "1_YEAR") d.setFullYear(d.getFullYear() + 1);
    return d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const subscriptionEndsAt = getComputedSubscriptionDate(subscriptionPreset, customEndDate);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          adminName: adminName.trim(),
          adminUsername: adminUsername.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword: adminPassword.trim(),
          department: department.trim(),
          enableLatePenalty,
          subscriptionEndsAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create company");

      setSuccessMsg(`Company '${data.name}' and Admin '${adminName}' (@${adminUsername}) created successfully!`);
      setTimeout(() => {
        setName("");
        setSlug("");
        setAdminName("");
        setAdminUsername("");
        setAdminEmail("");
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#0a0a0a] border border-[#222222] rounded-t-xl sm:rounded-xl shadow-vercel-card pb-[env(safe-area-inset-bottom)]">
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
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-[#777777] hover:text-white transition-colors rounded hover:bg-[#1a1a1a]"
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
                <label className="block text-[#888888] font-mono mb-1">Admin Username *</label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin_acme"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-1.5 font-mono text-white placeholder-[#555555] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div>
                <label className="block text-[#888888] font-mono mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg pl-3 pr-10 py-1.5 font-mono text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
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

          {/* Subscription Period Section */}
          <div className="pt-2 border-t border-[#1f1f1f] space-y-2.5">
            <div className="flex items-center gap-2 text-purple-400 font-mono text-[11px] font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>SUBSCRIPTION PERIOD</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: "1_MONTH", label: "1 Month" },
                { id: "3_MONTHS", label: "3 Months" },
                { id: "6_MONTHS", label: "6 Months" },
                { id: "1_YEAR", label: "1 Year" },
                { id: "LIFETIME", label: "Lifetime" },
                { id: "CUSTOM", label: "Custom" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSubscriptionPreset(p.id)}
                  className={`px-2 py-1.5 rounded-lg text-center text-xs font-mono transition-all border ${
                    subscriptionPreset === p.id
                      ? "bg-purple-600/30 border-purple-500 text-purple-200 font-bold"
                      : "bg-[#111111] border-[#222222] text-[#888888] hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {subscriptionPreset === "CUSTOM" && (
              <div className="pt-1">
                <label className="block text-[#888888] font-mono mb-1 text-[11px]">Custom Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] focus:border-purple-500 rounded-lg px-3 py-1.5 text-white outline-none font-mono text-xs"
                />
              </div>
            )}
          </div>

          {/* Policy / Features Section */}
          <div className="pt-2 border-t border-[#1f1f1f] space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-mono text-[11px] font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>POLICIES & FEATURE TOGGLES</span>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#111111] border border-[#222222]">
              <input
                type="checkbox"
                id="createLatePenalty"
                checked={enableLatePenalty}
                onChange={(e) => setEnableLatePenalty(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-[#0a0a0a] border-[#333333] text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="createLatePenalty" className="text-xs text-slate-200 cursor-pointer select-none">
                <span className="font-semibold block text-white">Enable Late Penalty</span>
                <span className="text-[11px] text-[#888888] block mt-0.5 leading-relaxed">
                  Turn ON to allow this company's Admin to calculate and view late penalties in attendance sheets.
                </span>
              </label>
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
