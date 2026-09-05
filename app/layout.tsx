import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Role-based task manager for companies, departments, and employees.",
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
