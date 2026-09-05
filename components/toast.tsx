"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  push: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 max-w-sm">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border px-3 py-2 text-xs shadow-lg ${
              item.kind === "success"
                ? "bg-emerald-950/90 border-emerald-800 text-emerald-100"
                : item.kind === "error"
                  ? "bg-red-950/90 border-red-800 text-red-100"
                  : "bg-[#111111] border-[#333333] text-white"
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: (message: string) => {
        window.alert(message);
      },
    };
  }
  return ctx;
}
