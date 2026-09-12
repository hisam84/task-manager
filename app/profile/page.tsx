"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import { ChangePasswordModal } from "@/components/change-password-modal";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Layers,
  Calendar,
  Shield,
  KeyRound,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ListTodo,
  Clock,
  Sparkles,
  ArrowRight,
  Hash,
  Sliders,
  Bell,
  Users,
  Check,
  Lock,
  Send,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

interface DetailedProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  username?: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";
  avatar?: string | null;
  designation?: string | null;
  department?: string | null;
  createdAt?: string;
  companyId?: string | null;
  company?: { id: string; name: string; slug: string } | null;
  departmentRel?: { id: string; name: string } | null;
  _count?: {
    assignedTasks?: number;
    createdTasks?: number;
    attendances?: number;
  };
}

interface CompanySettingsData {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  enableLatePenalty: boolean;
  subscriptionEndsAt?: string | null;
  overdueAlertRecipient: "BOTH" | "ASSIGNEE_ONLY";
  notifyAssignerOnTaskComplete: boolean;
  enableTaskCreatedEmail: boolean;
  allowEmployeeTaskAssignment: boolean;
  defaultGraceMinutes: number;
  notifyAdminsOnLeaveRequest: boolean;
  createdAt?: string;
  _count?: {
    users?: number;
    tasks?: number;
    departments?: number;
  };
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "company" ? "company" : "profile";

  const [activeTab, setActiveTab] = useState<"profile" | "company">(initialTab);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [profileData, setProfileData] = useState<DetailedProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form states
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Company Settings states
  const [companySettings, setCompanySettings] = useState<CompanySettingsData | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState<string | null>(null);

  // Company form fields
  const [companyName, setCompanyName] = useState("");
  const [overdueAlertRecipient, setOverdueAlertRecipient] = useState<"BOTH" | "ASSIGNEE_ONLY">("BOTH");
  const [notifyAssignerOnTaskComplete, setNotifyAssignerOnTaskComplete] = useState(true);
  const [enableTaskCreatedEmail, setEnableTaskCreatedEmail] = useState(true);
  const [allowEmployeeTaskAssignment, setAllowEmployeeTaskAssignment] = useState(true);
  const [defaultGraceMinutes, setDefaultGraceMinutes] = useState(15);
  const [notifyAdminsOnLeaveRequest, setNotifyAdminsOnLeaveRequest] = useState(true);

  // Modals
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageCompany = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [authRes, profileRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/users/profile"),
      ]);

      const authData = await authRes.json();
      if (!authData.user) {
        window.location.href = "/";
        return;
      }
      setCurrentUser(authData.user);

      if (profileRes.ok) {
        const pData: DetailedProfile = await profileRes.json();
        setProfileData(pData);
        setName(pData.name || "");
        setDesignation(pData.designation || "");
        setPhone(pData.phone || "");
        setAvatarPreview(pData.avatar || (pData.role === "SUPER_ADMIN" ? "/logo.png" : null));
        setAvatarDirty(false);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompanySettings = useCallback(async () => {
    try {
      setCompanyLoading(true);
      setCompanyError(null);
      const res = await fetch("/api/companies/settings");
      if (res.ok) {
        const data: CompanySettingsData = await res.json();
        setCompanySettings(data);
        setCompanyName(data.name || "");
        setOverdueAlertRecipient(data.overdueAlertRecipient || "BOTH");
        setNotifyAssignerOnTaskComplete(data.notifyAssignerOnTaskComplete ?? true);
        setEnableTaskCreatedEmail(data.enableTaskCreatedEmail ?? true);
        setAllowEmployeeTaskAssignment(data.allowEmployeeTaskAssignment ?? true);
        setDefaultGraceMinutes(data.defaultGraceMinutes ?? 15);
        setNotifyAdminsOnLeaveRequest(data.notifyAdminsOnLeaveRequest ?? true);
      } else {
        const err = await res.json();
        setCompanyError(err.error || "Failed to load company settings.");
      }
    } catch (err) {
      console.error("Failed to load company settings:", err);
      setCompanyError("An unexpected error occurred while loading company settings.");
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (canManageCompany && (activeTab === "company" || searchParams?.get("tab") === "company")) {
      fetchCompanySettings();
    }
  }, [canManageCompany, activeTab, searchParams, fetchCompanySettings]);

  // Sync tab with URL search parameter if changed externally
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "company" && canManageCompany) {
      setActiveTab("company");
    } else if (tabParam === "profile") {
      setActiveTab("profile");
    }
  }, [searchParams, canManageCompany]);

  const handleTabSwitch = (tab: "profile" | "company") => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  // Compress & crop image to standard square via Canvas
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPEG, WebP, etc.).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 360;
        const width = img.width;
        const height = img.height;

        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Failed to process image.");
          return;
        }

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxDim, maxDim);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setAvatarPreview(dataUrl);
        setAvatarDirty(true);
        setError(null);
      };
      img.onerror = () => {
        setError("Failed to load image file.");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarDirty(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: any = {
        name: name.trim(),
        designation: designation.trim() || null,
        phone: phone.trim() || null,
      };

      if (avatarDirty) {
        payload.avatar = avatarPreview;
      }

      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile.");
      } else {
        setSuccess("Profile details updated successfully.");
        setAvatarDirty(false);
        setProfileData((prev) => (prev ? { ...prev, ...data } : data));
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            name: data.name,
            avatar: data.avatar,
            designation: data.designation,
            phone: data.phone,
          });
        }
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setCompanyError("Company name cannot be empty.");
      return;
    }

    try {
      setCompanySaving(true);
      setCompanyError(null);
      setCompanySuccess(null);

      const payload = {
        name: companyName.trim(),
        overdueAlertRecipient,
        notifyAssignerOnTaskComplete,
        enableTaskCreatedEmail,
        allowEmployeeTaskAssignment,
        defaultGraceMinutes: Number(defaultGraceMinutes),
        notifyAdminsOnLeaveRequest,
      };

      const res = await fetch("/api/companies/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setCompanyError(data.error || "Failed to update company settings.");
      } else {
        setCompanySettings(data);
        setCompanySuccess("Company settings saved and applied successfully.");
        setTimeout(() => setCompanySuccess(null), 4000);
      }
    } catch (err: any) {
      setCompanyError(err.message || "Failed to save company settings.");
    } finally {
      setCompanySaving(false);
    }
  };

  const getRoleBadgeInfo = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return {
          label: "Super Admin",
          badgeClass: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
          description: "Full platform-level administration privileges across all workspaces.",
        };
      case "ADMIN":
        return {
          label: "Company Admin",
          badgeClass: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
          description: "Full management access to company tasks, departments, employees, and settings.",
        };
      case "MANAGER":
        return {
          label: "Manager",
          badgeClass: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          description: "Team management, task delegation, and attendance oversight.",
        };
      default:
        return {
          label: "Employee",
          badgeClass: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          description: "Standard workspace member with access to assigned tasks and personal attendance.",
        };
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  if (loading || !currentUser) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleBadgeInfo(currentUser.role);

  return (
    <div className="flex flex-col lg:flex-row h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      <Sidebar
        user={currentUser}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="p-3.5 sm:p-6 md:p-8 max-w-6xl w-full mx-auto flex-1 space-y-4 sm:space-y-6 min-w-0">
          {/* Header Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold tracking-wider uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{activeTab === "company" ? "Workspace Configuration" : "Account Settings"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activeTab === "company" ? "Company Settings" : "My Profile"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {activeTab === "company"
                  ? "Configure organization preferences, task overdue policies, and employee permissions"
                  : "Manage your personal details, profile picture, and security preferences"}
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
              >
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Visible for Admin and Super Admin) */}
          {canManageCompany && (
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-fit overflow-x-auto">
              <button
                type="button"
                onClick={() => handleTabSwitch("profile")}
                className={`inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex-1 sm:flex-none whitespace-nowrap ${
                  activeTab === "profile"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabSwitch("company")}
                className={`inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex-1 sm:flex-none whitespace-nowrap ${
                  activeTab === "company"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Company Settings</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: PERSONAL PROFILE VIEW                                              */}
          {/* ========================================================================= */}
          {activeTab === "profile" && (
            <>
              {/* Feedback Messages */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">Error:</span> {error}
                  </div>
                </div>
              )}

              {success && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-start gap-3 shadow-xs">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">Success!</span> {success}
                  </div>
                </div>
              )}

              {/* Profile Hero Card */}
              <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="h-24 sm:h-36 w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
                </div>

                <div className="px-3.5 sm:px-6 pb-5 sm:pb-6 pt-0 relative">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 -mt-12 sm:-mt-16 mb-4">
                    <div className="relative group self-start">
                      <div className="w-22 h-22 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-xl border-2 border-white dark:border-slate-800 shrink-0 overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt={name || "User"}
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-2xl sm:text-3xl flex items-center justify-center border border-indigo-100 dark:border-slate-700">
                            {name ? name.slice(0, 2).toUpperCase() : "U"}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-1.5 rounded-xl bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-medium cursor-pointer"
                        title="Upload / Change Photo"
                      >
                        <Camera className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-indigo-300" />
                        <span className="text-[10px] sm:text-xs">Change</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>

                    <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Upload Photo</span>
                      </button>

                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 transition-colors cursor-pointer shrink-0"
                          title="Remove Avatar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {currentUser.name}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleInfo.badgeClass}`}
                      >
                        <Briefcase className="w-3 h-3" />
                        {roleInfo.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5 min-w-0 break-all">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {currentUser.email}
                      </span>
                      {currentUser.companyName && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {currentUser.companyName}
                        </span>
                      )}
                      {profileData?.designation && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          {profileData.designation}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5 pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70">
                      <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 truncate">
                        <ListTodo className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> <span className="truncate">Assigned Tasks</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {profileData?._count?.assignedTasks ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70">
                      <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 truncate">
                        <ListTodo className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Tasks Created</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {profileData?._count?.createdTasks ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70">
                      <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <span className="truncate">Attendance Days</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {profileData?._count?.attendances ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70">
                      <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" /> <span className="truncate">Member Since</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1.5 truncate">
                        {profileData?.createdAt
                          ? new Date(profileData.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })
                          : "--"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Edit Personal Details (2 cols wide on desktop) */}
                <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-6">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Personal Information
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Update your public profile and contact preferences
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full min-h-11 pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          disabled
                          value={profileData?.email || currentUser.email}
                          className="w-full min-h-11 pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-base md:text-sm cursor-not-allowed select-all"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Email address is permanently linked to your login credentials.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Job Title / Designation
                      </label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="e.g. Senior Software Engineer, UI/UX Designer, HR Manager"
                          className="w-full min-h-11 pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Mobile / Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +880 1712-345678"
                          className="w-full min-h-11 pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setName(currentUser.name || "");
                          setDesignation(currentUser.designation || "");
                          setPhone(currentUser.phone || "");
                          setAvatarPreview(currentUser.avatar || null);
                          setAvatarDirty(false);
                          setError(null);
                        }}
                        disabled={saving}
                        className="min-h-11 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Discard Changes
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right: Organization & Security Cards (1 col wide on desktop) */}
                <div className="space-y-6">
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Organization
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Company & workspace details
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                          <Shield className="w-3.5 h-3.5 text-indigo-500" /> Role & Access
                        </span>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {roleInfo.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.badgeClass}`}>
                            {currentUser.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                          {roleInfo.description}
                        </p>
                      </div>

                      {currentUser.companyName && (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-blue-500" /> Company
                          </span>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {currentUser.companyName}
                          </div>
                          {profileData?.company?.slug && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {profileData.company.slug}
                            </span>
                          )}
                        </div>
                      )}

                      {(profileData?.departmentRel?.name || currentUser.department) && (
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                            <Layers className="w-3.5 h-3.5 text-purple-500" /> Department
                          </span>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {profileData?.departmentRel?.name || currentUser.department}
                          </div>
                        </div>
                      )}

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                          <Hash className="w-3.5 h-3.5 text-slate-400" /> User ID
                        </span>
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate select-all">
                          {currentUser.id}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Security
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Password & authentication settings
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            Account Password
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            ••••••••••••
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setChangePasswordOpen(true)}
                          className="inline-flex items-center justify-center gap-1 min-h-11 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 transition-colors cursor-pointer shrink-0"
                        >
                          <span>Update</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: COMPANY SETTINGS VIEW                                              */}
          {/* ========================================================================= */}
          {activeTab === "company" && canManageCompany && (
            <div className="space-y-6">
              {/* Feedback Messages */}
              {companyError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">Error:</span> {companyError}
                  </div>
                </div>
              )}

              {companySuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm flex items-start gap-3 shadow-xs">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">Success!</span> {companySuccess}
                  </div>
                </div>
              )}

              {companyLoading ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Loading company configuration...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveCompanySettings} className="space-y-6">
                  {/* Card 1: Company Profile & Workspace Info */}
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-5">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Company Profile
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Workspace identification and registered details
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Company Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Organization name"
                          className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Workspace Identifier (Slug)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            disabled
                            value={companySettings?.slug || ""}
                            className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-base md:text-sm font-mono cursor-not-allowed select-all"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Unique URL slug managed by Super Administrator.
                        </p>
                      </div>
                    </div>

                    {/* Workspace statistics summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Team Members</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {companySettings?._count?.users ?? 0}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <ListTodo className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Tasks</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {companySettings?._count?.tasks ?? 0}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Layers className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Departments</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {companySettings?._count?.departments ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Task Overdue Alert & Email Rules */}
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-6">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                        <ListTodo className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Task & Notification Rules
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Configure overdue alert targets, assignment permissions, and automated emails
                        </p>
                      </div>
                    </div>

                    {/* Feature 1: Task Overdue Alert Recipient Option */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Task Overdue Alert Recipients
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Specify who should receive email alerts when an assigned task exceeds its deadline without being completed.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                        {/* Option 1: Both Assignee and Assigner */}
                        <div
                          onClick={() => setOverdueAlertRecipient("BOTH")}
                          className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            overdueAlertRecipient === "BOTH"
                              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-xl ${
                                overdueAlertRecipient === "BOTH"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              }`}>
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                                  Both Assignee &amp; Assigner
                                </span>
                                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                  Default &amp; Recommended
                                </span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              overdueAlertRecipient === "BOTH"
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 dark:border-slate-700"
                            }`}>
                              {overdueAlertRecipient === "BOTH" && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                            Sends overdue reminder email directly to the assigned employee and CCs the task creator/manager so both parties stay informed.
                          </p>
                        </div>

                        {/* Option 2: Assignee Only */}
                        <div
                          onClick={() => setOverdueAlertRecipient("ASSIGNEE_ONLY")}
                          className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            overdueAlertRecipient === "ASSIGNEE_ONLY"
                              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-xl ${
                                overdueAlertRecipient === "ASSIGNEE_ONLY"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              }`}>
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                                  Assignee Only
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  Individual Alert
                                </span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              overdueAlertRecipient === "ASSIGNEE_ONLY"
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 dark:border-slate-700"
                            }`}>
                              {overdueAlertRecipient === "ASSIGNEE_ONLY" && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                            Sends overdue reminder strictly to the assigned employee. The task assigner or manager is omitted from the alert email.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-2" />

                    {/* Feature 2: Additional Task Controls */}
                    <div className="space-y-4">
                      {/* Notify Assigner on Task Complete Toggle */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate">Notify Assigner on Task Completion</span>
                          </span>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Send an automatic completion email to the task creator whenever an employee marks their task as Completed.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNotifyAssignerOnTaskComplete(!notifyAssignerOnTaskComplete)}
                          className={`relative inline-flex h-6 w-11 min-h-11 items-center shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            notifyAssignerOnTaskComplete ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              notifyAssignerOnTaskComplete ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* New Task Assignment Email Toggle */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Send className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="truncate">New Task Assignment Email Notification</span>
                          </span>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Dispatch instant email notifications to team members when a new task is created and assigned to them.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnableTaskCreatedEmail(!enableTaskCreatedEmail)}
                          className={`relative inline-flex h-6 w-11 min-h-11 items-center shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            enableTaskCreatedEmail ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              enableTaskCreatedEmail ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Employee Task Assignment Permission Toggle */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-purple-500 shrink-0" />
                            <span className="truncate">Allow Employees to Assign Tasks</span>
                          </span>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Allow regular employees to assign tasks to junior colleagues or self. When disabled, only Admins and Managers can assign tasks.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllowEmployeeTaskAssignment(!allowEmployeeTaskAssignment)}
                          className={`relative inline-flex h-6 w-11 min-h-11 items-center shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            allowEmployeeTaskAssignment ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              allowEmployeeTaskAssignment ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Attendance & Late Arrival Policy */}
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-5">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Attendance &amp; Arrival Policy
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Configure office check-in grace period and review late penalty status
                        </p>
                      </div>
                    </div>

                    {/* Super Admin Controlled Late Penalty Banner */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Late Penalty Calculation Policy
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            companySettings?.enableLatePenalty
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}>
                            {companySettings?.enableLatePenalty ? "ACTIVE" : "DISABLED"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Automatic salary deductions for late clock-ins are managed exclusively by the platform Super Administrator.
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg shrink-0">
                        Super Admin Only
                      </span>
                    </div>

                    {/* Grace Period Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Office Check-In Grace Period
                      </label>
                      <select
                        value={defaultGraceMinutes}
                        onChange={(e) => setDefaultGraceMinutes(Number(e.target.value))}
                        className="w-full sm:w-72 min-h-11 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-base md:text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                      >
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes (Standard)</option>
                        <option value={20}>20 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Allowable minutes after designated shift start time before arrival is marked as late.
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Leave Application Policy */}
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Leave Policy &amp; Alerts
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Automated notification rules for employee leave requests
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-purple-500 shrink-0" />
                          <span className="truncate">Notify Admins on Leave Applications</span>
                        </span>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Send instant email alerts to company administrators and managers whenever an employee submits a new leave application.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifyAdminsOnLeaveRequest(!notifyAdminsOnLeaveRequest)}
                        className={`relative inline-flex h-6 w-11 min-h-11 items-center shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifyAdminsOnLeaveRequest ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            notifyAdminsOnLeaveRequest ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => fetchCompanySettings()}
                      disabled={companySaving}
                      className="min-h-11 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Discard Changes
                    </button>

                    <button
                      type="submit"
                      disabled={companySaving}
                      className="inline-flex items-center justify-center gap-2 min-h-11 px-7 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      {companySaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{companySaving ? "Saving Settings..." : "Save Company Settings"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <Footer variant="compact" />
      </main>

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userEmail={profileData?.email || currentUser?.email}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
          <div className="flex h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Loading workspace...
              </p>
            </div>
          </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
