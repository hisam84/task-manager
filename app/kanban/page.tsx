import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForRole } from "@/lib/domain";

export default async function KanbanRedirectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN" || user.role === "MANAGER") redirect("/admin/tasks");
  if (user.role === "EMPLOYEE") redirect("/employee/tasks");
  redirect(homePathForRole(user.role));
}
