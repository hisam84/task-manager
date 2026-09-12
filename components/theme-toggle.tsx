"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
  variant?: "button" | "switch";
}

export function ThemeToggle({
  showLabel = false,
  className = "",
  variant = "button",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    if (variant === "switch") {
      return (
        <div
          className={`h-7 w-14 rounded-full bg-slate-200 dark:bg-slate-800 opacity-60 ${className}`}
        />
      );
    }
    return (
      <button
        type="button"
        disabled
        className={`h-10 inline-flex items-center justify-center rounded-xl text-slate-400 bg-slate-800/40 opacity-70 ${className}`}
        aria-label="Toggle theme"
      >
        <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
      </button>
    );
  }

  const isDark = theme === "dark";

  if (variant === "switch") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`relative inline-flex items-center justify-between w-14 h-7 p-1 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shrink-0 select-none shadow-xs ${className}`}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <Moon className="w-3.5 h-3.5 text-indigo-600 ml-0.5" />
        <Sun className="w-3.5 h-3.5 text-amber-400 mr-0.5" />
        <span
          className={`absolute top-0.5 left-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform duration-200 ease-in-out ${
            isDark ? "translate-x-7 text-amber-400" : "translate-x-0 text-indigo-600"
          }`}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`h-10 inline-flex items-center justify-center gap-2 px-2.5 rounded-xl text-xs font-medium transition-all select-none ${
        isDark
          ? "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 shadow-sm"
          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm"
      } ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 shrink-0 transition-transform hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="text-xs font-medium truncate">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
