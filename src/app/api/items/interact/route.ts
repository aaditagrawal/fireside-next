import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";

export async function POST(request: NextRequest) {
  // Authenticate
  const token = request.cookies.get("session-token")?.value;
  const user = token ? await validateSession(token) : null;
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  // Parse payload
  const { itemId, type, content } = await request.json();
  if (!itemId || !type) {
    return NextResponse.json({ success: false, error: "Missing itemId or type" }, { status: 400 });
  }

  // Insert into Interactions
  try {
    await executeQuery({
      query: "INSERT INTO Interactions (UserID, ItemID, Type) VALUES (?, ?, ?)",
      values: [user.id, itemId, type],
    });

    // Additional tables
    if (type === "note" && typeof content === "string") {
      await executeQuery({
        query: "INSERT INTO Notes (UserID, ItemID, Content) VALUES (?, ?, ?)",
        values: [user.id, itemId, content],
      });
    }

    if (type === "save") {
      await executeQuery({
        query: "INSERT IGNORE INTO User_FeedItems (UserID, ItemID) VALUES (?, ?)",
        values: [user.id, itemId],
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Interaction insert error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to record interaction" }, { status: 500 });
  }
}
