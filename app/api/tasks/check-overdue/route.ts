import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkAndNotifyOverdueTasks } from "@/lib/task-overdue";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handleOverdueCheck(req);
}

export async function POST(req: Request) {
  return handleOverdueCheck(req);
}

async function handleOverdueCheck(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secretParam = searchParams.get("secret") || searchParams.get("key");
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized =
      Boolean(cronSecret) &&
      (secretParam === cronSecret || bearerToken === cronSecret);

    // If not authorized by CRON_SECRET, check user session
    let user = null;
    if (!isCronAuthorized) {
      user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const companyId = user?.companyId || searchParams.get("companyId") || null;
    const result = await checkAndNotifyOverdueTasks(companyId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      notifiedCount: result.count,
      taskIds: result.taskIds || [],
    });
  } catch (error: any) {
    console.error("Task overdue API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process overdue notifications" },
      { status: 500 }
    );
  }
}
