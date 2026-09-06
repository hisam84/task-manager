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
    const year = searchParams.get("year");

    if (!filterCompanyId) {
      return NextResponse.json([]);
    }

    let dateFilter = {};
    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      dateFilter = {
        date: {
          gte: startOfYear,
          lte: endOfYear,
        },
      };
    }

    const holidays = await prisma.holiday.findMany({
      where: {
        companyId: filterCompanyId,
        ...dateFilter,
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(holidays);
  } catch (err: any) {
    console.error("GET holidays error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch holidays." },
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
    const { name, date, companyId: requestedCompanyId } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Holiday name is required." }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    const companyId =
      sessionUser.role === "SUPER_ADMIN"
        ? requestedCompanyId || sessionUser.companyId
        : sessionUser.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required." }, { status: 400 });
    }

    // Normalize date to midnight UTC
    const dateObj = new Date(date);
    dateObj.setUTCHours(0, 0, 0, 0);

    const holiday = await prisma.holiday.upsert({
      where: {
        companyId_date: {
          companyId,
          date: dateObj,
        },
      },
      update: {
        name: name.trim(),
      },
      create: {
        companyId,
        date: dateObj,
        name: name.trim(),
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (err: any) {
    console.error("POST holiday error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save holiday." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(sessionUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Holiday ID is required." }, { status: 400 });
    }

    const holiday = await prisma.holiday.findUnique({ where: { id } });
    if (!holiday) {
      return NextResponse.json({ error: "Holiday not found." }, { status: 404 });
    }

    if (sessionUser.role !== "SUPER_ADMIN" && holiday.companyId !== sessionUser.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE holiday error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete holiday." },
      { status: 500 }
    );
  }
}
