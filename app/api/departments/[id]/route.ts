import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Department name is required." }, { status: 400 });
    }

    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
      return NextResponse.json({ error: "Department not found." }, { status: 404 });
    }

    if (sessionUser.role !== "SUPER_ADMIN" && department.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT department error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update department." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const department = await prisma.department.findUnique({ where: { id } });

    if (!department) {
      return NextResponse.json({ error: "Department not found." }, { status: 404 });
    }

    if (sessionUser.role !== "SUPER_ADMIN" && department.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.department.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Department deleted." });
  } catch (err: any) {
    console.error("DELETE department error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete department." },
      { status: 500 }
    );
  }
}
