import { NextResponse } from "next/server";
import { getCurrentUser, canAccessTask } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";
import { sendTaskCompletedEmail } from "@/lib/mail";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

const notifySchema = z.object({
  completionNote: z.string().max(1000).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = notifySchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        company: {
          select: { id: true, name: true, slug: true, notifyAssignerOnTaskComplete: true },
        },
      },
    });

    if (!task) {
      return jsonError("Task not found", 404);
    }

    if (!canAccessTask(user, task)) {
      return jsonError("Forbidden", 403);
    }

    if ((task.company as any)?.notifyAssignerOnTaskComplete === false) {
      return jsonError("Completion notification emails are disabled in company settings.", 400);
    }

    if (!task.creator?.email) {
      return jsonError("Task assigner has no registered email address", 400);
    }

    // If task is not yet marked as DONE, automatically mark it as DONE
    if (task.status !== "DONE") {
      await prisma.task.update({
        where: { id },
        data: { status: "DONE" },
      });
      task.status = "DONE";
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "https://taskmanager-iit.vercel.app/";
    const taskUrl = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;

    const noteText = data.completionNote?.trim() || null;

    try {
      await sendTaskCompletedEmail({
        to: task.creator.email,
        creatorName: task.creator.name || "Manager",
        assigneeName: user.name || task.assignee?.name || "Employee",
        taskTitle: task.title,
        taskDescription: task.description,
        priority: task.priority,
        completedAt: new Date(),
        completionNote: noteText,
        companyName: task.company?.name || user.companyName,
        taskUrl,
      });
    } catch (err) {
      console.error("Failed to send task completion notification email:", err);
      return jsonError("Failed to send email. Please verify SMTP configuration.", 500);
    }

    // Add activity comment record
    await prisma.comment.create({
      data: {
        taskId: id,
        authorId: user.id,
        body: `✅ [Task Completed & Notified] ${user.name} sent completion notification email to ${task.creator.name} (${task.creator.email}).${noteText ? `\nNote: ${noteText}` : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Completion email sent to ${task.creator.name} (${task.creator.email})`,
      notifiedEmail: task.creator.email,
      notifiedName: task.creator.name,
    });
  } catch (error) {
    return apiError(error, "Failed to send completion notification");
  }
}
