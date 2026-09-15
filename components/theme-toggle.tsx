"use client";

import React, { useEffect, useState, useId } from "react";
import { useTheme } from "./theme-provider";

export interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
  variant?: "premium" | "switch" | "button";
  size?: "sm" | "md" | "lg";
}

export function ThemeToggle({
  showLabel = false,
  className = "",
  variant = "premium",
  size = "sm",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const inputId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  // Scale calculations for premium toggle UI (190px x 92px native dimensions)
  const scaleMap = {
    sm: 0.38, // ~72px x 35px
    md: 0.55, // ~104.5px x 50.6px
    lg: 1.0,  // 190px x 92px
  };

  const scale = scaleMap[size] || 0.38;
  const width = Math.round(190 * scale);
  const height = Math.round(92 * scale);

  if (!mounted) {
    return (
      <div
        style={{ width: `${width}px`, height: `${height}px` }}
        className={`inline-block rounded-full bg-slate-200 dark:bg-slate-800/80 opacity-60 animate-pulse ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative inline-flex items-center select-none ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div
        className="premium-switch shrink-0 cursor-pointer"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: "190px",
          height: "92px",
        }}
      >
        <input
          type="checkbox"
          id={inputId}
          checked={isDark}
          onChange={toggleTheme}
        />
        <label
          className={`premium-toggle ${isDark ? "is-dark" : ""}`}
          htmlFor={inputId}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <div className="blob" />

          {/* Sun SVG */}
          <span className="icon sun">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4.5" />
              <line x1="12" y1="2" x2="12" y2="4.5" />
              <line x1="12" y1="19.5" x2="12" y2="22" />
              <line x1="2" y1="12" x2="4.5" y2="12" />
              <line x1="19.5" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" />
              <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" />
              <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" />
              <line x1="17.3" y1="6.7" x2="19.07" y2="4.93" />
            </svg>
          </span>

          {/* Moon SVG */}
          <span className="icon moon">
            <svg viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </span>
        </label>
      </div>
      {showLabel && (
        <span className="ml-3 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      )}
    </div>
  );
}

