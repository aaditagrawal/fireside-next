import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const results = await executeQuery({
      query: "SELECT Name FROM Categories ORDER BY Name;",
    });
    const categories = Array.isArray(results)
      ? (results as any[]).map((row) => row.Name as string)
      : [];
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
