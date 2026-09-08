"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  KanbanSquare,
  Users,
  Building2,
  BarChart3,
  CalendarCheck2,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Layers,
  Menu,
  X,
  User,
  Edit3,
} from "lucide-react";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionUser } from "@/lib/types";

interface SidebarProps {
  user: SessionUser;
  onOpenChangePassword?: () => void;
  onOpenEditProfile?: () => void;
  onUserUpdated?: (updatedUser: SessionUser) => void;
  onLogout?: () => void;
}

export function Sidebar({
  user,
  onOpenChangePassword,
  onOpenEditProfile,
  onUserUpdated,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [internalEditProfileOpen, setInternalEditProfileOpen] = useState(false);

  const handleOpenEditProfile = () => {
    if (onOpenEditProfile) {
      onOpenEditProfile();
    } else {
      setInternalEditProfileOpen(true);
    }
  };

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isCompanyAdmin = user.role === "ADMIN" || user.role === "MANAGER";
  const isEmployee = user.role === "EMPLOYEE";

  const navItems = isSuperAdmin
    ? [
        {
          label: "Company Management",
          href: "/super-admin",
          icon: Building2,
          show: true,
        },
      ]
    : [
        {
          label: "Dashboard",
          href: "/",
          icon: LayoutDashboard,
          show: true,
        },
        {
          label: "Attendance Sheet",
          href: "/attendance",
          icon: CalendarCheck2,
          show: true,
        },
        {
          label: "Task List",
          href: "/tasks",
          icon: ListTodo,
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
          show: isCompanyAdmin,
        },
        {
          label: "Employee Team",
          href: "/team",
          icon: Users,
          show: isCompanyAdmin,
        },
      ].filter((item) => item.show);

  const getRoleBadge = () => {
    if (isSuperAdmin)
      return { label: "Super Admin", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    if (isCompanyAdmin)
      return { label: "Company Admin", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    return { label: "Employee", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  };

  const roleBadge = getRoleBadge();
  const showLabels = mobileOpen || !collapsed;

  const asideInner = (
    <>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {showLabels && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm text-white tracking-wide truncate">
                {isSuperAdmin ? "Platform Portal" : user.companyName || "Task Manager"}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {isSuperAdmin ? "Super Admin" : "Workspace"}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Role Badge */}
      {showLabels && (
        <div className="px-4 py-3 border-b border-slate-800/50">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadge.bg}`}>
            <Briefcase className="w-3.5 h-3.5" />
            {roleBadge.label}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 min-h-11 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              } ${showLabels ? "" : "justify-center px-0"}`}
              title={showLabels ? undefined : item.label}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              {showLabels && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <button
          type="button"
          onClick={handleOpenEditProfile}
          className={`w-full flex items-center text-left p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer ${
            showLabels ? "gap-3" : "flex-col gap-2"
          }`}
          title="Click to edit profile & photo"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover border border-indigo-500/50 shrink-0 group-hover:ring-2 group-hover:ring-indigo-500/50 transition-all"
            />
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 text-indigo-400 font-bold text-sm border border-slate-700 shrink-0 group-hover:border-indigo-500/60 transition-colors">
              {user.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
          )}

          {showLabels && (
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                  {user.name}
                </span>
                <Edit3 className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-[11px] text-slate-400 truncate">{user.email}</span>
            </div>
          )}
        </button>

        {/* Quick Action Buttons */}
        <div
          className={`mt-3 pt-2 border-t border-slate-800/60 flex items-center ${
            showLabels ? "gap-2" : "flex-col gap-2"
          }`}
        >
          <button
            type="button"
            onClick={handleOpenEditProfile}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 min-h-11 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Edit Profile"
          >
            <User className="w-3.5 h-3.5 text-indigo-400" />
            {showLabels && <span>Profile</span>}
          </button>

          {/* Theme Toggle */}
          <ThemeToggle
            showLabel={showLabels}
            className="flex-1"
          />

          {onOpenChangePassword && (
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 min-h-11 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Change Password"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              {showLabels && <span>Password</span>}
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
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
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold truncate">{user.companyName || "Task Manager"}</span>
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="min-w-9 min-h-9 h-9 w-9 p-0" />
          <button
            type="button"
            onClick={handleOpenEditProfile}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
            title="Edit Profile"
          >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover border border-indigo-500/50"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 text-indigo-400 text-xs font-bold flex items-center justify-center border border-slate-700">
              {user.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
          )}
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative flex h-full w-[min(18rem,88vw)] flex-col bg-slate-900 border-r border-slate-800 text-slate-200 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-y-auto">
            <div className="flex items-center justify-end px-3 py-2">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800"
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
        className={`relative hidden lg:flex flex-col h-dvh bg-slate-900/95 border-r border-slate-800 text-slate-200 transition-all duration-300 z-30 select-none ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {asideInner}
      </aside>

      <EditProfileModal
        isOpen={internalEditProfileOpen}
        onClose={() => setInternalEditProfileOpen(false)}
        user={user}
        onUserUpdated={(updated) => {
          if (onUserUpdated) {
            onUserUpdated(updated);
          }
        }}
      />
    </>
  );
}
