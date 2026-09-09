"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [profileData, setProfileData] = useState<DetailedProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarDirty(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter a valid name (at least 2 characters).");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: trimmedName,
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
        throw new Error(data.error || "Failed to update profile.");
      }

      setSuccess("Profile updated successfully!");
      setAvatarDirty(false);

      if (currentUser) {
        const updatedUser: SessionUser = {
          ...currentUser,
          name: trimmedName,
          designation: designation.trim() || null,
          phone: phone.trim() || null,
          avatar: avatarPreview,
        };
        setCurrentUser(updatedUser);
      }

      setTimeout(() => {
        setSuccess(null);
      }, 4000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-500 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isCompanyAdmin = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return {
        label: "Super Admin",
        badgeClass: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
        description: "Full system administration & multi-company privileges",
      };
    }
    if (isCompanyAdmin) {
      return {
        label: currentUser.role === "ADMIN" ? "Company Admin" : "Manager",
        badgeClass: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
        description: "Management and full administration of workspace members and tasks",
      };
    }
    return {
      label: "Employee",
      badgeClass: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
      description: "Standard member with assigned tasks and attendance tracking",
    };
  };

  const roleInfo = getRoleBadge();

  const memberSinceFormatted = profileData?.createdAt
    ? new Date(profileData.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Active";

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      <Sidebar
        user={currentUser}
        onUserUpdated={(u) => {
          setCurrentUser(u);
          setName(u.name);
          setDesignation(u.designation || "");
          setPhone(u.phone || "");
          setAvatarPreview(u.avatar || null);
        }}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between">
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto flex-1 space-y-6">
          {/* Header Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold tracking-wider uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                My Profile
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your personal details, profile picture, and security preferences
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span>Change Password</span>
              </button>
            </div>
          </div>

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
            {/* Top decorative gradient mesh */}
            <div className="h-28 sm:h-36 w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
            </div>

            {/* Profile Overview Row */}
            <div className="px-6 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
                {/* Avatar with live photo edit button */}
                <div className="relative group self-start">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-xl border-2 border-white dark:border-slate-800 shrink-0 overflow-hidden">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={name || "User"}
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-3xl flex items-center justify-center border border-indigo-100 dark:border-slate-700">
                        {name ? name.slice(0, 2).toUpperCase() : "U"}
                      </div>
                    )}
                  </div>

                  {/* Camera overlay button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-1.5 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-medium cursor-pointer"
                    title="Upload / Change Photo"
                  >
                    <Camera className="w-6 h-6 mb-1 text-indigo-300" />
                    <span>Change</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Avatar action buttons */}
                <div className="flex items-center gap-2 self-start sm:self-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Upload New Photo</span>
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 transition-colors cursor-pointer"
                      title="Remove Avatar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Name, Role & Company */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
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
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
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

              {/* Activity Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Assigned Tasks</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {profileData?._count?.assignedTasks ?? 0}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>Created Tasks</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {profileData?._count?.createdTasks ?? 0}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Attendance Records</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {profileData?._count?.attendances ?? 0}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>Member Since</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 truncate">
                    {memberSinceFormatted}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Edit Form & Account Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Edit Profile Form (2 cols wide on desktop) */}
            <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Personal Information
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Update your public display name, designation, and phone number
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Full Name */}
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
                      placeholder="e.g. John Doe"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Email Address (Read-only) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Email Address
                    </label>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                      Primary Login
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      disabled
                      value={currentUser.email}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 text-sm cursor-not-allowed select-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Email address is permanently linked to your login credentials.
                  </p>
                </div>

                {/* Designation / Title */}
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
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Mobile / Phone Number */}
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
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80">
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
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Discard Changes
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Organization & Security Cards (1 col wide on desktop) */}
            <div className="space-y-6">
              {/* Organization & Role Info Card */}
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
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
                    <div className="flex items-center justify-between pt-0.5">
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

              {/* Security & Password Card */}
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
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
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
                    <div>
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 transition-colors cursor-pointer"
                    >
                      <span>Update</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
