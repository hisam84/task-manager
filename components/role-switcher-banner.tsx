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
    SUPER_ADMIN: "bg-purple-950/60 text-purple-300 border-purple-800/60",
    ADMIN: "bg-blue-950/60 text-blue-300 border-blue-800/60",
    MANAGER: "bg-amber-950/60 text-amber-300 border-amber-800/60",
    EMPLOYEE: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
  };

  return (
    <div className="w-full bg-[#050505] border-b border-[#1f1f1f] px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-[#a1a1a1]">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono text-[#888888]">Demo Persona Mode:</span>
        <div className={`px-2 py-0.5 rounded-full border font-mono font-medium flex items-center gap-1.5 ${roleColors[currentUser.role] || "bg-zinc-800 text-zinc-300"}`}>
          <UserCheck className="w-3 h-3" />
          <span>{currentUser.name}</span>
          <span className="opacity-60">({currentUser.role})</span>
        </div>
        <span className="text-[#666666] hidden sm:inline">•</span>
        <span className="text-[#888888] hidden sm:inline">{currentUser.companyName || "Platform Wide"}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[#666666] hidden md:inline">Quick Switch Role:</span>
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
                    ? "bg-[#222222] text-white border border-[#444444] cursor-default shadow-sm"
                    : "bg-[#111111] text-[#888888] hover:text-white hover:bg-[#1a1a1a] border border-[#222222]"
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
