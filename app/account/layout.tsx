import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
