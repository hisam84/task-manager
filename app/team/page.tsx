import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForRole } from "@/lib/domain";

export default async function TeamRedirectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN" || user.role === "MANAGER") redirect("/admin/employees");
  redirect(homePathForRole(user.role));
}
