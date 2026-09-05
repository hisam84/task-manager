import { AppShell } from "@/components/app-shell";
import { requireSuperAdmin } from "@/lib/require-user";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  return <AppShell user={user}>{children}</AppShell>;
}
