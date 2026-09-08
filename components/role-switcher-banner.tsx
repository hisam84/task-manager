"use client";

import { useState, useEffect } from "react";
import { UserCheck, ShieldAlert, Sparkles, RefreshCw, ChevronDown } from "lucide-react";

interface Persona {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  companyName: string;
}

export function RoleSwitcherBanner() {
  return null;
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function fetchSession() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) setCurrentUser(data.user);
      if (data.personas) setPersonas(data.personas);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchSession();
  }, []);

  async function switchPersona(userId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!currentUser) return null;

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "bg-primary/10 text-primary border-primary/20",
    ADMIN: "bg-primary/10 text-primary border-primary/20",
    MANAGER: "bg-hover text-foreground border-border",
    EMPLOYEE: "bg-accent/10 text-accent border-accent/20",
  };

  return (
    <div className="w-full bg-surface border-b border-border px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-muted">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-accent" />
        <span className="text-muted">Demo Persona Mode:</span>
        <div className={`px-2 py-0.5 rounded-full border font-medium flex items-center gap-1.5 ${roleColors[currentUser.role] || "bg-hover text-muted"}`}>
          <UserCheck className="w-3 h-3" />
          <span>{currentUser.name}</span>
          <span className="opacity-60">({currentUser.role})</span>
        </div>
        <span className="text-muted hidden sm:inline">•</span>
        <span className="text-muted hidden sm:inline">{currentUser.companyName || "Platform Wide"}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted hidden md:inline">Quick Switch Role:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {personas.map((p) => {
            const isSelected = p.id === currentUser.id;
            return (
              <button
                key={p.id}
                onClick={() => switchPersona(p.id)}
                disabled={loading || isSelected}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                  isSelected
                    ? "bg-hover text-foreground border border-border cursor-default shadow-sm"
                    : "bg-input text-muted hover:text-foreground hover:bg-hover border border-border"
                }`}
              >
                <span>{p.name.split(" ")[0]}</span>
                <span className="text-[10px] opacity-60">({p.role.replace("_ADMIN", " ADM")})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
