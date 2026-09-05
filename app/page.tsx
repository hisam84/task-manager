import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForRole } from "@/lib/domain";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(homePathForRole(user.role));
}
