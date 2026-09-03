import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session_user_id");

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to log out" }, { status: 500 });
  }
}
