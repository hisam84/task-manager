import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vercel Task Manager — Multi-Tenant Enterprise",
  description: "Next.js 15 multi-tenant employee task manager styled with Vercel design system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white antialiased selection:bg-[#0070f3] selection:text-white">
        {children}
      </body>
    </html>
  );
}
