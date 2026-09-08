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
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("password123");
  const [department, setDepartment] = useState("Executive Leadership");

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
          adminUsername: adminUsername.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword: adminPassword.trim(),
          department: department.trim(),
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
    <div className="modal-overlay">
      <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-surface border border-border rounded-t-xl sm:rounded-xl pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Create Tenant Company</h3>
              <p className="text-[10px] font-mono text-muted">Setup a new company organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted hover:text-foreground transition-colors rounded hover:bg-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Company Details */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider">
              Organization Info
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-muted font-mono mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Tech Solutions"
                  className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-mono mb-1">Slug Identifier *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="acme-tech"
                  className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-1.5 font-mono text-foreground placeholder:text-muted outline-none"
                />
              </div>
            </div>
          </div>

          {/* Initial Admin */}
          <div className="space-y-2.5 pt-2 border-t border-border">
            <span className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider">
              Company Admin Account
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-muted font-mono mb-1">Admin Name *</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-mono mb-1">Admin Username *</label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin_acme"
                  className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-1.5 font-mono text-foreground placeholder:text-muted outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-muted font-mono mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-mono mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-1.5 font-mono text-foreground outline-none"
                  />
              </div>
            </div>

            <div>
              <label className="block text-muted font-mono mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Executive Leadership"
                className="w-full bg-input border border-border focus:border-primary rounded-lg px-3 py-1.5 text-foreground outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-input hover:bg-hover font-medium text-muted hover:text-foreground border border-border transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-primary hover:opacity-90 font-medium text-on-primary transition-all disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
