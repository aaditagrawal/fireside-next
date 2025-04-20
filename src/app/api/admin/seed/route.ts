import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { seedDatabase } from "@/lib/db-seed";

export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const sessionToken = request.cookies.get("session-token")?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const user = await validateSession(sessionToken);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    // Verify user is admin
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Permission denied. Admin access required." },
        { status: 403 },
      );
    }

    // Run the seeding process
    const result = await seedDatabase(user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Seed database API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
