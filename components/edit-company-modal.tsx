"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  ShieldAlert,
  User,
  KeyRound,
  CheckCircle2,
  Clock,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  enableLatePenalty?: boolean;
  subscriptionEndsAt?: string | null;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    username: string;
  }>;
}

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: Company | null;
}

export function EditCompanyModal({
  isOpen,
  onClose,
  onSuccess,
  company,
}: EditCompanyModalProps) {
  // Company fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Policy
  const [enableLatePenalty, setEnableLatePenalty] = useState(false);

  // Subscription
  const [subscriptionPreset, setSubscriptionPreset] = useState<string>("CURRENT");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Primary Admin
  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setSlug(company.slug || "");
      setIsActive(company.isActive ?? true);
      setEnableLatePenalty(company.enableLatePenalty ?? false);
      setSubscriptionPreset("CURRENT");

      if (company.subscriptionEndsAt) {
        setCustomEndDate(new Date(company.subscriptionEndsAt).toISOString().slice(0, 10));
      } else {
        setCustomEndDate("");
      }

      const primaryAdmin = company.users?.[0];
      if (primaryAdmin) {
        setAdminName(primaryAdmin.name || "");
        setAdminUsername(primaryAdmin.username || "");
        setAdminEmail(primaryAdmin.email || "");
      } else {
        setAdminName("");
        setAdminUsername("");
        setAdminEmail("");
      }
      setAdminPassword("");
    }
    setError(null);
    setSuccessMsg(null);
  }, [company, isOpen]);

  if (!isOpen || !company) return null;

  function calculateTargetDate(preset: string): string | null {
    if (preset === "CURRENT") {
      return company?.subscriptionEndsAt ? new Date(company.subscriptionEndsAt).toISOString() : null;
    }
    if (preset === "LIFETIME") return null;
    if (preset === "CUSTOM") return customEndDate ? new Date(customEndDate).toISOString() : null;

    const base = new Date();
    if (preset === "1_MONTH") base.setMonth(base.getMonth() + 1);
    else if (preset === "3_MONTHS") base.setMonth(base.getMonth() + 3);
    else if (preset === "6_MONTHS") base.setMonth(base.getMonth() + 6);
    else if (preset === "1_YEAR") base.setFullYear(base.getFullYear() + 1);
    return base.toISOString();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim() || !slug.trim()) {
      setError("Company name and slug are required.");
      return;
    }

    try {
      setLoading(true);

      const subscriptionEndsAt = calculateTargetDate(subscriptionPreset);

      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          isActive,
          enableLatePenalty,
          subscriptionEndsAt,
          adminName: adminName.trim() || undefined,
          adminEmail: adminEmail.trim() || undefined,
          adminUsername: adminUsername.trim() || undefined,
          adminPassword: adminPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update company.");
      }

      setSuccessMsg("Company information and policies updated successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const isExpired = company.subscriptionEndsAt && new Date(company.subscriptionEndsAt) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92dvh] overflow-y-auto bg-[#0a0a0a] border border-[#222222] rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Edit Company & Settings</h2>
              <p className="text-[11px] text-[#888888] font-mono">
                Update company profile, subscription, features & admin account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-[#777777] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 1. Company Profile */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[11px] font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>COMPANY WORKSPACE PROFILE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#888888] font-mono mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111111] border border-[#222222] text-white focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-[#888888] font-mono mb-1">Company Slug *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111111] border border-[#222222] text-purple-400 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="editIsActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded bg-[#111111] border-[#333333] text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="editIsActive" className="text-slate-300 font-medium cursor-pointer select-none">
                Active Company Account (Allow logins)
              </label>
            </div>
          </div>

          {/* 2. Subscription Period */}
          <div className="pt-3 border-t border-[#1f1f1f] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[11px] font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>SUBSCRIPTION PERIOD</span>
              </div>
              <div className="text-[11px] font-mono">
                {company.subscriptionEndsAt ? (
                  <span className={isExpired ? "text-rose-400 font-bold" : "text-emerald-400 font-semibold"}>
                    {isExpired
                      ? `Expired on ${new Date(company.subscriptionEndsAt).toLocaleDateString()}`
                      : `Expires: ${new Date(company.subscriptionEndsAt).toLocaleDateString()}`}
                  </span>
                ) : (
                  <span className="text-indigo-400 font-semibold">Lifetime Access</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { id: "CURRENT", label: "Keep Current" },
                { id: "1_MONTH", label: "+1 Month" },
                { id: "3_MONTHS", label: "+3 Months" },
                { id: "6_MONTHS", label: "+6 Months" },
                { id: "1_YEAR", label: "+1 Year" },
                { id: "LIFETIME", label: "Lifetime" },
                { id: "CUSTOM", label: "Pick Date" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSubscriptionPreset(p.id)}
                  className={`px-2 py-1.5 rounded-lg text-center font-mono text-[11px] transition-all border ${
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
                <label className="block text-[#888888] font-mono mb-1 text-[11px]">Set Custom Expiry Date *</label>
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

          {/* 3. Policy & Features: Late Penalty */}
          <div className="pt-3 border-t border-[#1f1f1f] space-y-2">
            <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[11px] font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SUPER ADMIN POLICY CONTROLS</span>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#111111] border border-[#222222]">
              <input
                type="checkbox"
                id="editLatePenalty"
                checked={enableLatePenalty}
                onChange={(e) => setEnableLatePenalty(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-[#0a0a0a] border-[#333333] text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="editLatePenalty" className="text-xs text-slate-200 cursor-pointer select-none">
                <span className="font-semibold block text-white">Enable Late Penalty</span>
                <span className="text-[11px] text-[#888888] block mt-0.5 leading-relaxed">
                  Turn ON to allow this company's Admin to view late penalties in attendance sheets. When turned OFF, late penalty options and columns will be hidden from this company.
                </span>
              </label>
            </div>
          </div>

          {/* 4. Primary Admin Account */}
          <div className="pt-3 border-t border-[#1f1f1f] space-y-3">
            <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[11px] font-semibold">
              <User className="w-3.5 h-3.5" />
              <span>PRIMARY COMPANY ADMIN DETAILS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#888888] font-mono mb-1">Admin Full Name</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Admin Name"
                  className="w-full px-3 py-2 rounded-lg bg-[#111111] border border-[#222222] text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[#888888] font-mono mb-1">Admin Username</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin_username"
                  className="w-full px-3 py-2 rounded-lg bg-[#111111] border border-[#222222] text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#888888] font-mono mb-1">Admin Email Address</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full px-3 py-2 rounded-lg bg-[#111111] border border-[#222222] text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#888888] font-mono mb-1">
                  Change Password <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-[#111111] border border-[#222222] text-white focus:outline-none focus:border-purple-500 font-mono"
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
          </div>

          <div className="pt-3 border-t border-[#1f1f1f] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#111111] hover:bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#222222] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-[0_0_15px_rgba(121,40,202,0.4)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save All Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
