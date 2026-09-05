"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusSquare,
  Shield,
  Users,
  ClipboardList,
  BarChart3,
  UserCircle,
  X,
} from "lucide-react";
import { homePathForRole, isCompanyAdmin, isSuperAdmin, roleLabel } from "@/lib/domain";
import type { SessionUser } from "@/lib/types";
import { ToastProvider } from "@/components/toast";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

function navForRole(role: string): NavItem[] {
  if (isSuperAdmin(role)) {
    return [
      { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/super-admin/companies", label: "Companies", icon: Building2 },
      { href: "/account/password", label: "Change Password", icon: KeyRound },
      { href: "/account/profile", label: "Profile", icon: UserCircle },
    ];
  }
  if (isCompanyAdmin(role)) {
    return [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/departments", label: "Departments", icon: Building2 },
      { href: "/admin/employees", label: "Employees", icon: Users },
      { href: "/admin/tasks", label: "Tasks", icon: ClipboardList },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/account/password", label: "Change Password", icon: KeyRound },
      { href: "/account/profile", label: "Profile", icon: UserCircle },
    ];
  }
  return [
    { href: "/employee", label: "Dashboard", icon: LayoutDashboard },
    { href: "/employee/tasks", label: "My Tasks", icon: ClipboardList },
    { href: "/employee/tasks/new", label: "Create Self Task", icon: PlusSquare },
    { href: "/employee/reports", label: "My Reports", icon: BarChart3 },
    { href: "/account/password", label: "Change Password", icon: KeyRound },
    { href: "/account/profile", label: "Profile", icon: UserCircle },
  ];
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navForRole(user.role);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
              active
                ? "bg-[#1f1f1f] text-white border border-[#333333]"
                : "text-[#888888] hover:text-white hover:bg-[#111111]"
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={logout}
        className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#888888] hover:text-white hover:bg-[#111111] cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </nav>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#020617] text-white">
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-[#1f1f1f] bg-black/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-2 hover:bg-[#111111] cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold">Task Manager</span>
          <Shield className="w-4 h-4 text-[#0070f3]" />
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/70 cursor-pointer"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <aside className="relative h-full w-72 bg-[#050505] border-r border-[#1f1f1f]">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#1f1f1f]">
                <span className="text-sm font-semibold">Menu</span>
                <button type="button" onClick={() => setOpen(false)} className="cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {nav}
            </aside>
          </div>
        ) : null}

        <div className="lg:grid lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:flex min-h-screen flex-col border-r border-[#1f1f1f] bg-[#050505]">
            <div className="px-4 py-5 border-b border-[#1f1f1f]">
              <Link href={homePathForRole(user.role)} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-[#111111] border border-[#222222] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 76 65" fill="currentColor">
                    <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">Task Manager</p>
                  <p className="text-[11px] text-[#888888]">{roleLabel(user.role)}</p>
                </div>
              </Link>
            </div>
            {nav}
            <div className="mt-auto px-4 py-4 border-t border-[#1f1f1f] text-xs text-[#888888]">
              <p className="text-white">{user.name}</p>
              <p>{user.companyName || "Platform"}</p>
            </div>
          </aside>
          <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
