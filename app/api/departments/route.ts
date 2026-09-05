import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/access";

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = sessionUser.companyId;
    if (!companyId && sessionUser.role !== "SUPER_ADMIN") {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const filterCompanyId = searchParams.get("companyId") || companyId;

    if (!filterCompanyId) {
      return NextResponse.json([]);
    }

    const departments = await prisma.department.findMany({
      where: { companyId: filterCompanyId },
      include: {
        _count: {
          select: { users: true, tasks: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(departments);
  } catch (err: any) {
    console.error("GET departments error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch departments." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, companyId: requestedCompanyId } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Department name is required." }, { status: 400 });
    }

    const companyId = sessionUser.role === "SUPER_ADMIN" ? requestedCompanyId || sessionUser.companyId : sessionUser.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required." }, { status: 400 });
    }

    const existing = await prisma.department.findFirst({
      where: {
        companyId,
        name: { equals: name.trim(), mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this name already exists in the company." },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        companyId,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (err: any) {
    console.error("POST department error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create department." },
      { status: 500 }
    );
  }
}
