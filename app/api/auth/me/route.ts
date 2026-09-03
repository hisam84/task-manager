import { NextResponse } from "next/server";
import { getCurrentUser, getAllDemoPersonas } from "@/lib/auth";
import { apiError } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const personas = await getAllDemoPersonas();

    return NextResponse.json({
      user,
      personas,
    });
  } catch (error) {
    return apiError(error, "Failed to fetch session");
  }
}
