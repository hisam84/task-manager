import { NextResponse } from "next/server";
import { getCurrentUser, getAllDemoPersonas } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const personas = await getAllDemoPersonas();

    return NextResponse.json({
      user,
      personas,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch session" }, { status: 500 });
  }
}
