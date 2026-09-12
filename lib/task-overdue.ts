import { prisma } from "@/lib/prisma";
import { sendTaskOverdueEmail } from "@/lib/mail";

/**
 * Checks for tasks that have passed their deadline, are not completed (status !== 'DONE'),
 * and have not yet received an overdue alert email. Sends an email notification to the assignee
 * (and CCs the creator if applicable), and flags `overdueNotifiedAt` to prevent duplicate emails.
 */
export async function checkAndNotifyOverdueTasks(companyId?: string | null) {
  try {
    const now = new Date();

    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: {
          not: null,
          lte: now,
        },
        overdueNotifiedAt: null,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
      take: 25,
      orderBy: { dueDate: "asc" },
    });

    if (overdueTasks.length === 0) {
      return { count: 0, taskIds: [] };
    }

    console.log(`[Task Overdue Check] Found ${overdueTasks.length} overdue task(s) to notify.`);

    const notifiedTaskIds: string[] = [];

    for (const task of overdueTasks) {
      const assigneeEmail = task.assignee?.email?.trim();
      const creatorEmail = task.creator?.email?.trim();

      let recipientEmail: string | undefined = undefined;
      let recipientName = task.assignee?.name || "Team Member";
      let ccEmail: string | undefined = undefined;

      if (assigneeEmail && assigneeEmail.includes("@")) {
        recipientEmail = assigneeEmail;
        recipientName = task.assignee?.name || "Team Member";
        if (creatorEmail && creatorEmail.includes("@") && task.creator?.id !== task.assignee?.id) {
          ccEmail = creatorEmail;
        }
      } else if (creatorEmail && creatorEmail.includes("@")) {
        // Fallback: notify creator if assignee has no email
        recipientEmail = creatorEmail;
        recipientName = task.creator?.name || "Manager";
      }

      if (!recipientEmail) {
        await prisma.task.update({
          where: { id: task.id },
          data: { overdueNotifiedAt: now },
        });
        continue;
      }

      try {
        await sendTaskOverdueEmail({
          to: recipientEmail,
          cc: ccEmail,
          assigneeName: recipientName,
          taskTitle: task.title,
          taskDescription: task.description,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate!,
          creatorName: task.creator?.name,
          companyName: task.company?.name,
        });

        await prisma.task.update({
          where: { id: task.id },
          data: { overdueNotifiedAt: now },
        });

        notifiedTaskIds.push(task.id);
        console.log(`[Task Overdue Check] Successfully notified for task ${task.id} (${task.title}) to ${recipientEmail}${ccEmail ? ` (CC: ${ccEmail})` : ""}`);
      } catch (sendErr) {
        console.error(`[Task Overdue Check] Error sending alert for task ${task.id}:`, sendErr);
      }
    }

    return { count: notifiedTaskIds.length, taskIds: notifiedTaskIds };
  } catch (err) {
    console.error("[Task Overdue Check] Error running overdue check:", err);
    return { count: 0, error: String(err) };
  }
}
