import { AppShell } from "@/components/app-shell";
import { requireEmployee } from "@/lib/require-user";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireEmployee();
  return <AppShell user={user}>{children}</AppShell>;
}
