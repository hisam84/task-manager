import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        ...(body.name ? { name: body.name } : {}),
      },
    });

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update company" }, { status: 500 });
  }
}
