import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";
import { z } from "zod";
import { apiError, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().min(0),
    })
  ).min(1),
});

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    if (!isManagerOrAdmin(user.role)) {
      return jsonError("Forbidden: Only Admins and Managers can reorder employees", 403);
    }

    const body = await req.json();
    const { orders } = reorderSchema.parse(body);

    const userIds = orders.map((o) => o.id);

    // Verify all target users exist and belong to the same company
    const usersInDb = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (user.role !== "SUPER_ADMIN") {
      const invalidUser = usersInDb.find((u) => u.companyId !== user.companyId);
      if (invalidUser) {
        return jsonError("Forbidden: Cannot modify users from another company", 403);
      }
    }

    // Execute batch update in transaction
    await prisma.$transaction(
      orders.map((item) =>
        prisma.user.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({ success: true, count: orders.length });
  } catch (error) {
    return apiError(error, "Failed to update employee order");
  }
}
