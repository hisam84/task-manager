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
        assignees: {
          select: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        company: {
          select: { id: true, name: true, overdueAlertRecipient: true },
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
      const creatorEmail = task.creator?.email?.trim();
      const notifyAssigner = (task.company as any)?.overdueAlertRecipient !== "ASSIGNEE_ONLY";

      const recipients: { name: string; email: string }[] = [];
      if (task.assignees && task.assignees.length > 0) {
        for (const a of task.assignees) {
          const email = a.user?.email?.trim();
          if (email && email.includes("@") && !recipients.some((r) => r.email === email)) {
            recipients.push({ name: a.user.name || "Team Member", email });
          }
        }
      }

      if (recipients.length === 0 && task.assignee?.email && task.assignee.email.includes("@")) {
        recipients.push({ name: task.assignee.name || "Team Member", email: task.assignee.email.trim() });
      }

      if (notifyAssigner && recipients.length === 0 && creatorEmail && creatorEmail.includes("@")) {
        recipients.push({ name: task.creator?.name || "Manager", email: creatorEmail });
      }

      if (recipients.length === 0) {
        await prisma.task.update({
          where: { id: task.id },
          data: { overdueNotifiedAt: now },
        });
        continue;
      }

      for (const recipient of recipients) {
        let ccEmail: string | undefined = undefined;
        if (notifyAssigner && creatorEmail && creatorEmail.includes("@") && recipient.email !== creatorEmail) {
          ccEmail = creatorEmail;
        }

        try {
          await sendTaskOverdueEmail({
            to: recipient.email,
            cc: ccEmail,
            assigneeName: recipient.name,
            taskTitle: task.title,
            taskDescription: task.description,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate!,
            creatorName: task.creator?.name,
            companyName: task.company?.name,
          });
        } catch (sendErr) {
          console.error(`[Task Overdue Check] Error sending alert for task ${task.id} to ${recipient.email}:`, sendErr);
        }
      }

      await prisma.task.update({
        where: { id: task.id },
        data: { overdueNotifiedAt: now },
      });

      notifiedTaskIds.push(task.id);
    }

    return { count: notifiedTaskIds.length, taskIds: notifiedTaskIds };
  } catch (err) {
    console.error("[Task Overdue Check] Error running overdue check:", err);
    return { count: 0, error: String(err) };
  }
}
