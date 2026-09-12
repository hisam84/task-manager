import { prisma } from "@/lib/prisma";
import { sendTaskDueReminderEmail } from "@/lib/mail";

export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * Pure evaluation function for whether a task qualifies for the 2-hour pre-overdue reminder email.
 * Rules:
 * 1. Must be in "TODO" status.
 * 2. Total allotted duration (dueDate - createdAt) must be at least 2 hours.
 * 3. Current time must be within the 2-hour pre-deadline window (dueDate - 2h <= now < dueDate).
 * 4. Must not have already received this reminder (dueReminderNotifiedAt == null).
 */
export function shouldSendDueReminder({
  status,
  dueDate,
  createdAt,
  dueReminderNotifiedAt,
  now = new Date(),
}: {
  status: string;
  dueDate: Date | string | null | undefined;
  createdAt: Date | string;
  dueReminderNotifiedAt?: Date | string | null;
  now?: Date;
}): boolean {
  if (status !== "TODO") return false;
  if (!dueDate) return false;
  if (dueReminderNotifiedAt) return false;

  const dueTime = new Date(dueDate).getTime();
  const createdTime = new Date(createdAt).getTime();
  const currentTime = now.getTime();

  if (isNaN(dueTime) || isNaN(createdTime)) return false;

  // Rule: Total task duration must be at least 2 hours to send reminder email
  const totalAllotted = dueTime - createdTime;
  if (totalAllotted < TWO_HOURS_MS) return false;

  // Rule: Send reminder strictly within the 2-hour window before due date
  const twoHoursBefore = dueTime - TWO_HOURS_MS;
  if (currentTime < twoHoursBefore) return false;
  if (currentTime >= dueTime) return false;

  return true;
}

/**
 * Checks for tasks that:
 * 1. Are in "TODO" status (only "TODO" tasks receive this reminder).
 * 2. Have a deadline set (dueDate is not null).
 * 3. Have not yet received a 2-hour reminder (dueReminderNotifiedAt is null).
 * 4. Have at least 2 hours total allotted time from creation to deadline (dueDate - createdAt >= 2 hours).
 * 5. Are within the 2-hour pre-deadline window (now >= dueDate - 2 hours and now < dueDate).
 */
export async function checkAndNotifyDueReminderTasks(companyId?: string | null) {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + TWO_HOURS_MS);

    // Find candidate tasks whose deadline is within the next 2 hours and still in the future
    const upcomingTasks = await prisma.task.findMany({
      where: {
        status: "TODO",
        dueDate: {
          not: null,
          gt: now,
          lte: twoHoursFromNow,
        },
        dueReminderNotifiedAt: null,
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

    if (upcomingTasks.length === 0) {
      return { count: 0, taskIds: [] };
    }

    const notifiedTaskIds: string[] = [];

    for (const task of upcomingTasks) {
      if (!task.dueDate) continue;

      // Condition: Total duration between task creation and due date must be at least 2 hours
      const totalAllottedDuration = task.dueDate.getTime() - task.createdAt.getTime();
      if (totalAllottedDuration < TWO_HOURS_MS) {
        // Skip tasks that were created with less than 2 hours total deadline time
        continue;
      }

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
          data: { dueReminderNotifiedAt: now },
        });
        continue;
      }

      for (const recipient of recipients) {
        let ccEmail: string | undefined = undefined;
        if (notifyAssigner && creatorEmail && creatorEmail.includes("@") && recipient.email !== creatorEmail) {
          ccEmail = creatorEmail;
        }

        try {
          await sendTaskDueReminderEmail({
            to: recipient.email,
            cc: ccEmail,
            assigneeName: recipient.name,
            taskTitle: task.title,
            taskDescription: task.description,
            priority: task.priority,
            dueDate: task.dueDate,
            creatorName: task.creator?.name,
            companyName: task.company?.name,
          });
        } catch (sendErr) {
          console.error(`[Task 2-Hour Reminder] Error sending email for task ${task.id} to ${recipient.email}:`, sendErr);
        }
      }

      await prisma.task.update({
        where: { id: task.id },
        data: { dueReminderNotifiedAt: now },
      });

      notifiedTaskIds.push(task.id);
    }

    return { count: notifiedTaskIds.length, taskIds: notifiedTaskIds };
  } catch (err) {
    console.error("[Task 2-Hour Reminder] Error running due reminder check:", err);
    return { count: 0, error: String(err) };
  }
}
