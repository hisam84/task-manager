"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Building2,
  BarChart3,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Layers,
  Menu,
  X,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  user: SessionUser;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

export function Sidebar({ user, onOpenChangePassword, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isCompanyAdmin = user.role === "ADMIN" || user.role === "MANAGER";

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: "Kanban Board",
      href: "/kanban",
      icon: KanbanSquare,
      show: true,
    },
    {
      label: "Task Reports",
      href: "/reports",
      icon: BarChart3,
      show: true,
    },
    {
      label: "Departments",
      href: "/departments",
      icon: Layers,
      show: isCompanyAdmin || isSuperAdmin,
    },
    {
      label: "Employee Team",
      href: "/team",
      icon: Users,
      show: isCompanyAdmin || isSuperAdmin,
    },
    {
      label: "Super Admin Panel",
      href: "/super-admin",
      icon: ShieldCheck,
      show: isSuperAdmin,
    },
  ].filter((item) => item.show);

  const getRoleBadge = () => {
    if (isSuperAdmin)
      return { label: "Super Admin", bg: "bg-primary/10 text-primary border-primary/20" };
    if (isCompanyAdmin)
      return { label: "Company Admin", bg: "bg-primary/10 text-primary border-primary/20" };
    return { label: "Employee", bg: "bg-accent/10 text-accent border-accent/20" };
  };

  const roleBadge = getRoleBadge();
  const showLabels = mobileOpen || !collapsed;

  const asideInner = (
    <>
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary shrink-0">
            <Building2 className="w-5 h-5 text-on-primary" />
          </div>
          {showLabels && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm text-foreground tracking-wide truncate">
                {user.companyName || "Task Manager"}
              </span>
              <span className="text-xs text-muted truncate">Workspace</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:inline-flex icon-btn"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {showLabels && (
        <div className="px-4 py-3 border-b border-border">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadge.bg}`}>
            <Briefcase className="w-3.5 h-3.5" />
            {roleBadge.label}
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 min-h-11 py-2.5 rounded-lg font-medium text-sm transition-colors duration-150 cursor-pointer ${
                isActive
                  ? "bg-primary text-on-primary"
                  : "text-muted hover:text-foreground hover:bg-hover"
              } ${showLabels ? "" : "justify-center px-0"}`}
              title={showLabels ? undefined : item.label}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {showLabels && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className={`flex items-center ${showLabels ? "gap-3" : "flex-col gap-2"}`}>
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-hover text-primary font-bold text-sm border border-border shrink-0">
            {user.name?.slice(0, 2).toUpperCase() || "U"}
          </div>

          {showLabels && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{user.name}</span>
              <span className="text-xs text-muted truncate">{user.email}</span>
            </div>
          )}
        </div>

        <div className={`mt-3 pt-2 border-t border-border flex items-center ${showLabels ? "gap-2" : "flex-col gap-2"}`}>
          <ThemeToggle showLabel={showLabels} />
          {onOpenChangePassword && (
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 min-h-11 rounded-lg text-xs font-medium text-muted hover:text-foreground bg-hover cursor-pointer transition-colors"
              title="Change Password"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {showLabels && <span>Password</span>}
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 cursor-pointer transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="icon-btn"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold truncate">{user.companyName || "Task Manager"}</span>
        <ThemeToggle />
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0"
            style={{ background: "var(--color-overlay)" }}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative flex h-full w-[min(18rem,88vw)] flex-col bg-surface border-r border-border text-foreground pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-y-auto">
            <div className="flex items-center justify-end px-3 py-2">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="icon-btn"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {asideInner}
          </aside>
        </div>
      ) : null}

      <aside
        className={`relative hidden lg:flex flex-col h-dvh bg-surface border-r border-border text-foreground transition-all duration-200 z-30 select-none ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {asideInner}
      </aside>
    </>
  );
}
