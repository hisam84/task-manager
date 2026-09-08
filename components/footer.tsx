import React from "react";
import { ExternalLink } from "lucide-react";

interface FooterProps {
  className?: string;
  variant?: "dashboard" | "auth" | "compact";
}

export function Footer({ className = "", variant = "dashboard" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === "auth") {
    return (
      <footer className={`w-full mt-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5 ${className}`}>
        <p className="text-[11px] opacity-80">
          &copy; {currentYear} Task Manager Enterprise. All rights reserved.
        </p>
        <p className="flex items-center justify-center gap-1.5 text-xs">
          <span>Developed by</span>
          <a
            href="https://hisam-omega.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <span>Hisam</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </p>
      </footer>
    );
  }

  if (variant === "compact") {
    return (
      <footer className={`w-full pt-4 pb-2 text-center text-[11px] text-slate-500 dark:text-slate-400 space-y-1 ${className}`}>
        <p>&copy; {currentYear} Task Manager</p>
        <p className="flex items-center justify-center gap-1">
          <span>Developed by</span>
          <a
            href="https://hisam-omega.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
          >
            <span>Hisam</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        </p>
      </footer>
    );
  }

  return (
    <footer
      className={`w-full mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs shrink-0 ${className}`}
    >
      <div className="w-full px-4 sm:px-6 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 tracking-tight">Task Manager</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>&copy; {currentYear} All rights reserved.</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <span>Developed by</span>
          <a
            href="https://hisam-omega.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1 transition-colors group"
          >
            <span>Hisam</span>
            <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </div>
    </footer>
  );
}
