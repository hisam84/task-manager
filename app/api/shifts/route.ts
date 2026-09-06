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

    const shifts = await prisma.shift.findMany({
      where: { companyId: filterCompanyId },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(shifts);
  } catch (err: any) {
    console.error("GET shifts error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch shifts." },
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
    const { name, startTime, endTime, graceMinutes, companyId: requestedCompanyId } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Shift name is required." }, { status: 400 });
    }

    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Start time and end time are required." }, { status: 400 });
    }

    const companyId =
      sessionUser.role === "SUPER_ADMIN"
        ? requestedCompanyId || sessionUser.companyId
        : sessionUser.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required." }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        name: name.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        graceMinutes: typeof graceMinutes === "number" ? graceMinutes : 15,
        companyId,
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (err: any) {
    console.error("POST shift error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create shift." },
      { status: 500 }
    );
  }
}
