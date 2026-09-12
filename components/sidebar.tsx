"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
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
  ChevronDown,
  ShieldCheck,
  Briefcase,
  Layers,
  Menu,
  X,
  User,
  Edit3,
  Sun,
  Moon,
  Coffee,
  Clock,
  Calendar,
  History,
} from "lucide-react";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
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
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
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

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAction = searchParams?.get("action") ?? null;
  const isAttendanceActive = pathname === "/attendance";
  const [attendanceOpen, setAttendanceOpen] = useState(isAttendanceActive);

  React.useEffect(() => {
    if (pathname === "/attendance") {
      setAttendanceOpen(true);
    }
  }, [pathname]);

  // Automatically close mobile menu on page route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open for a smooth app-like feel
  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close smoothly on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const handleAttendanceToggle = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setAttendanceOpen((prev) => !prev);
  };

  const attendanceSubItems = [
    {
      label: "Attendance Sheet",
      href: "/attendance",
      icon: CalendarCheck2,
      show: true,
      action: null,
    },
    {
      label: "Apply Leave",
      href: "/attendance?action=apply-leave",
      icon: Coffee,
      show: true,
      action: "apply-leave",
    },
    {
      label: isCompanyAdmin ? "Leave Requests" : "My Leaves",
      href: "/attendance?action=leave-requests",
      icon: Calendar,
      show: true,
      action: "leave-requests",
    },
    {
      label: "Manage Shifts",
      href: "/attendance?action=shifts",
      icon: Clock,
      show: isCompanyAdmin,
      action: "shifts",
    },
    {
      label: "Holidays",
      href: "/attendance?action=holidays",
      icon: Calendar,
      show: isCompanyAdmin,
      action: "holidays",
    },
  ].filter((item) => item.show);

  const navItems = isSuperAdmin
    ? [
        {
          label: "Company Management",
          href: "/super-admin",
          icon: Building2,
          show: true,
        },
        {
          label: "Activity Logs",
          href: "/activity-logs",
          icon: History,
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
          label: "Attendance",
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
        {
          label: "Activity Logs",
          href: "/activity-logs",
          icon: History,
          show: isCompanyAdmin,
        },
      ].filter((item) => item.show);

  const getRoleBadge = () => {
    if (isSuperAdmin)
      return { label: "Super Admin", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20" };
    if (isCompanyAdmin)
      return { label: "Company Admin", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" };
    return { label: "Employee", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" };
  };

  const roleBadge = getRoleBadge();
  const showLabels = mobileOpen || !collapsed;

  const asideInner = (
    <>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-1 shrink-0 overflow-hidden">
            <img src="/logo.png" alt="Task Manager" className="w-full h-full object-contain" />
          </div>
          {showLabels && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm text-slate-900 dark:text-white tracking-wide truncate">
                {isSuperAdmin ? "Platform Portal" : user.companyName || "Task Manager"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isSuperAdmin ? "Super Admin" : "Workspace"}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Badge & Theme Toggle */}
      {showLabels ? (
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between gap-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadge.bg}`}>
            <Briefcase className="w-3.5 h-3.5" />
            <span className="truncate">{roleBadge.label}</span>
          </div>

          <ThemeToggle variant="switch" />
        </div>
      ) : (
        <div className="py-2 border-b border-slate-200 dark:border-slate-800/50 flex justify-center">
          <ThemeToggle className="min-w-9 min-h-9 h-9 w-9 p-0" />
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.href === "/attendance") {
            if (!showLabels) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    setCollapsed(false);
                    setAttendanceOpen(true);
                  }}
                  className={`flex items-center justify-center min-h-11 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isAttendanceActive
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                  title="Attendance (Click to expand)"
                >
                  <CalendarCheck2 className={`w-5 h-5 shrink-0 ${isAttendanceActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"}`} />
                </button>
              );
            }

            return (
              <div key="attendance-dropdown" className="space-y-1">
                <button
                  type="button"
                  onClick={handleAttendanceToggle}
                  className={`w-full flex items-center justify-between px-3 min-h-11 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 select-none cursor-pointer group ${
                    isAttendanceActive
                      ? "bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/70 dark:border-indigo-800/50 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                  title={attendanceOpen ? "Collapse Attendance menu" : "Expand Attendance menu"}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CalendarCheck2
                      className={`w-5 h-5 shrink-0 ${
                        isAttendanceActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                      }`}
                    />
                    <span className="truncate">Attendance</span>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isAttendanceActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    } ${attendanceOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Submenu Items */}
                {attendanceOpen && (
                  <div className="ml-3.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800/60 space-y-1 py-1">
                    {attendanceSubItems.map((sub) => {
                      const isSubActive =
                        isAttendanceActive &&
                        ((!sub.action && !currentAction) || currentAction === sub.action);
                      const SubIcon = sub.icon;

                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                            isSubActive
                              ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-xs shadow-indigo-600/20"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium"
                          }`}
                        >
                          <SubIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSubActive
                                ? "text-white"
                                : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

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
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              } ${showLabels ? "" : "justify-center px-0"}`}
              title={showLabels ? undefined : item.label}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive
                    ? "text-white"
                    : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                }`}
              />
              {showLabels && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Account & Preferences Menu Section */}
        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800/60 space-y-1.5">
          {showLabels && (
            <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              Account & Settings
            </div>
          )}

          {/* Profile Menu Item */}
          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className={`w-full flex items-center gap-3 px-3 min-h-11 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
              pathname === "/profile" && searchParams?.get("tab") !== "company"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            } ${showLabels ? "" : "justify-center px-0"}`}
            title={showLabels ? undefined : "Profile Settings"}
          >
            <User className={`w-5 h-5 shrink-0 ${pathname === "/profile" && searchParams?.get("tab") !== "company" ? "text-white" : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"}`} />
            {showLabels && <span>Profile</span>}
          </Link>

          {/* Company Settings Menu Item */}
          {(isCompanyAdmin || isSuperAdmin) && (
            <Link
              href="/profile?tab=company"
              onClick={() => setMobileOpen(false)}
              className={`w-full flex items-center gap-3 px-3 min-h-11 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                pathname === "/profile" && searchParams?.get("tab") === "company"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              } ${showLabels ? "" : "justify-center px-0"}`}
              title={showLabels ? undefined : "Company Settings"}
            >
              <Building2 className={`w-5 h-5 shrink-0 ${pathname === "/profile" && searchParams?.get("tab") === "company" ? "text-white" : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"}`} />
              {showLabels && <span>Company Settings</span>}
            </Link>
          )}

          {/* Password Menu Item */}
          {onOpenChangePassword && (
            <button
              type="button"
              onClick={() => {
                onOpenChangePassword();
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 min-h-11 py-2.5 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-150 text-left group cursor-pointer ${
                showLabels ? "" : "justify-center px-0"
              }`}
              title={showLabels ? undefined : "Change Password"}
            >
              <KeyRound className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              {showLabels && <span>Password</span>}
            </button>
          )}
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40">
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className={`w-full flex items-center text-left p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${
            showLabels ? "gap-3" : "flex-col gap-2 justify-center"
          }`}
          title="Click to view & edit profile"
        >
          {user.avatar || (user.role === "SUPER_ADMIN" ? "/logo.png" : null) ? (
            <img
              src={user.avatar || "/logo.png"}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover border border-indigo-500/40 shrink-0 group-hover:ring-2 group-hover:ring-indigo-500/50 transition-all bg-white dark:bg-slate-900 shadow-xs"
            />
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-sm border border-indigo-200 dark:border-slate-700 shrink-0 group-hover:border-indigo-500/60 transition-colors shadow-xs">
              {user.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
          )}

          {showLabels && (
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  {user.name}
                </span>
                <Edit3 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</span>
            </div>
          )}
        </Link>

        {onLogout && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800/60">
            <button
              type="button"
              onClick={onLogout}
              className={`flex items-center justify-center gap-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200/80 dark:border-rose-500/20 transition-all shadow-xs active:scale-[0.98] cursor-pointer ${
                showLabels ? "w-full h-10 px-3" : "w-10 h-10 mx-auto"
              }`}
              title="Log Out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {showLabels && <span className="truncate">Log Out</span>}
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-white px-3 py-2 backdrop-blur pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 transition-transform duration-200" />
        </button>
        <span className="text-sm font-semibold truncate">{user.companyName || "Task Manager"}</span>
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="min-w-9 min-h-9 h-9 w-9 p-0" />
          <Link
            href="/profile"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Profile"
          >
          {user.avatar || (user.role === "SUPER_ADMIN" ? "/logo.png" : null) ? (
            <img
              src={user.avatar || "/logo.png"}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover border border-indigo-500/50 bg-white dark:bg-slate-900"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 text-indigo-400 text-xs font-bold flex items-center justify-center border border-slate-700">
              {user.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
          )}
          </Link>
        </div>
      </header>

      {/* Mobile Drawer with smooth slide-in/out and backdrop fade animation */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop overlay */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu backdrop"
        />

        {/* Sliding Drawer Container */}
        <aside
          className={`relative flex h-full w-[min(19rem,86vw)] flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out will-change-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {asideInner}
        </aside>
      </div>

      <aside
        className={`relative hidden lg:flex flex-col h-dvh bg-white dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 transition-all duration-300 z-30 select-none ${
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
