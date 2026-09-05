import { AppShell } from "@/components/app-shell";
import { requireCompanyAdmin } from "@/lib/require-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCompanyAdmin();
  return <AppShell user={user}>{children}</AppShell>;
}
