"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  User,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Layers,
  Shield,
  Mail,
  Upload,
} from "lucide-react";
import type { SessionUser } from "@/lib/types";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SessionUser;
  onUserUpdated?: (updatedUser: SessionUser) => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}: EditProfileModalProps) {
  const [name, setName] = useState(user.name || "");
  const [designation, setDesignation] = useState(user.designation || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar || null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user.name || "");
      setDesignation(user.designation || "");
      setAvatarPreview(user.avatar || null);
      setAvatarDirty(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Compress & resize image to standard square via Canvas (client-side)
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
        let width = img.width;
        let height = img.height;

        // Center crop to square
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

        ctx.drawImage(
          img,
          startX,
          startY,
          minDim,
          minDim,
          0,
          0,
          maxDim,
          maxDim
        );

        // Export as JPEG with 0.85 quality
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
    // reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter a valid name (at least 2 characters).");
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        name: trimmedName,
        designation: designation.trim() || null,
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

      const updatedUser: SessionUser = {
        ...user,
        name: trimmedName,
        designation: designation.trim() || null,
        avatar: avatarPreview,
      };

      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }

      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = () => {
    if (user.role === "SUPER_ADMIN")
      return { label: "Super Admin", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    if (user.role === "ADMIN" || user.role === "MANAGER")
      return { label: "Company Admin", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    return { label: "Employee", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Profile</h2>
              <p className="text-xs text-slate-400">Update your name & profile photo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            <div className="relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={name || "Profile"}
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500/50 shadow-lg shadow-indigo-600/10"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-800 text-indigo-400 font-bold text-2xl flex items-center justify-center border-2 border-slate-700 shadow-inner">
                  {name ? name.slice(0, 2).toUpperCase() : "U"}
                </div>
              )}

              {/* Hover/Tap overlay to change photo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-medium cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-5 h-5 mb-0.5 text-indigo-300" />
                <span>Change</span>
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Avatar Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>{avatarPreview ? "Change Photo" : "Upload Photo"}</span>
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="mt-2 text-[10px] text-slate-500 text-center">
              Supports PNG, JPG, WebP. Automatically optimized for fast display.
            </p>
          </div>

          {/* Full Name Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Designation Field */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Senior Software Engineer, UI/UX Designer"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Read-Only Account Details */}
          <div className="bg-slate-950/40 rounded-xl border border-slate-800/80 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
              <span className="text-slate-300 font-mono text-[11px] truncate max-w-[200px]">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Role
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadge.bg}`}>
                {roleBadge.label}
              </span>
            </div>

            {user.companyName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Company
                </span>
                <span className="text-slate-300 font-medium truncate max-w-[200px]">
                  {user.companyName}
                </span>
              </div>
            )}

            {user.department && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Department
                </span>
                <span className="text-slate-300 font-medium truncate max-w-[200px]">
                  {user.department}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
