import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { fixDatabaseSchema } from "@/lib/db-fix";

export async function POST(request: NextRequest) {
  try {
    // Validate session
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

    // Check if user is admin (you can modify this as needed)
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 },
      );
    }

    // Run the schema fix
    const result = await fixDatabaseSchema();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Schema fix API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
