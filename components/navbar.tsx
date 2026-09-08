"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, LayoutDashboard, Users, Shield, Building2, LogIn, LogOut } from "lucide-react";
import { LoginModal } from "@/components/login-modal";
import type { SessionUser } from "@/lib/types";

interface NavbarProps {
  user: SessionUser | null;
  onOpenCreateTask?: () => void;
  onOpenCreateCompany?: () => void;
}

export function Navbar({ user, onOpenCreateTask, onOpenCreateCompany }: NavbarProps) {
  const pathname = usePathname();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canCreateTask = ["ADMIN", "MANAGER"].includes(user?.role ?? "");

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingOut(false);
    }
  }

  const navLinks = isSuperAdmin
    ? [{ label: "Companies", href: "/super-admin", icon: Building2 }]
    : [
        { label: "Dashboard", href: "/", icon: LayoutDashboard },
        { label: "Team", href: "/team", icon: Users },
      ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#000000]/90 backdrop-blur-md border-b border-[#1f1f1f]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-md bg-[#111111] border border-[#222222] group-hover:border-[#0070f3] flex items-center justify-center transition-all shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 76 65" fill="currentColor">
                  <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                </svg>
              </div>
              <span className="font-semibold text-xs tracking-tight text-white">Task Manager</span>
            </Link>

            <span className="text-[#333333] hidden sm:inline">/</span>

            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#111111] border border-[#222222] text-[11px] font-mono text-[#eaeaea]">
              <span className={`w-1.5 h-1.5 rounded-full ${user ? "bg-emerald-400" : "bg-zinc-600"}`} />
              <span>{user ? user.companyName || "Super Admin Portal" : "Guest Mode (Logged Out)"}</span>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#1f1f1f] text-white shadow-sm border border-[#333333]"
                      : "text-[#888888] hover:text-white hover:bg-[#111111]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-70" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {!user ? (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="px-3 py-1 rounded-md bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-mono transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,112,243,0.3)]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            ) : (
              <>
                {isSuperAdmin && onOpenCreateCompany && (
                  <button
                    onClick={onOpenCreateCompany}
                    className="px-2.5 py-1 rounded-md bg-[#7928ca]/20 text-purple-300 hover:bg-[#7928ca]/30 border border-[#7928ca]/40 text-xs font-medium transition-all flex items-center gap-1"
                    title="Create a new Tenant Company"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Create Company</span>
                  </button>
                )}

                {canCreateTask && onOpenCreateTask && (
                  <button
                    onClick={onOpenCreateTask}
                    className="px-3 py-1 rounded-md bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Task</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-2.5 py-1 rounded-md bg-[#161616] hover:bg-[#222222] text-[#888888] hover:text-red-400 border border-[#2b2b2b] text-xs font-mono transition-all flex items-center gap-1"
                  title="Log out of session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isLoggingOut ? "..." : "Log Out"}</span>
                </button>

                <div
                  className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-mono font-bold text-[10px] text-white ml-1 cursor-pointer"
                  title={`Logged in as ${user?.name} (@${user?.username || user?.email})`}
                >
                  {user?.name?.[0] || "U"}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => setIsLoginOpen(false)}
      />
    </header>
  );
}
