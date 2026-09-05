import { prisma } from "@/lib/prisma";

export async function logTaskActivity(input: {
  taskId: string;
  actorId: string;
  action: string;
  detail?: string | null;
}) {
  await prisma.taskActivity.create({
    data: {
      taskId: input.taskId,
      actorId: input.actorId,
      action: input.action,
      detail: input.detail ?? null,
    },
  });
}
