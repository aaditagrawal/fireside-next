import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";
import { markItemRead, saveItem } from "@/lib/feed-processor";

export async function POST(request: NextRequest) {
  // Authenticate
  const token = request.cookies.get("session-token")?.value;
  const user = token ? await validateSession(token) : null;
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  // Parse payload
  const { itemId, type, content, saveItem: shouldSave } = await request.json();
  if (!itemId || !type) {
    return NextResponse.json(
      { success: false, error: "Missing itemId or type" },
      { status: 400 },
    );
  }

  try {
    // Record the interaction
    await executeQuery({
      query: "INSERT INTO Interactions (UserID, ItemID, Type) VALUES (?, ?, ?)",
      values: [user.id, itemId, type],
    });

    // Handle specific interaction types
    if (type === "read") {
      await markItemRead(user.id, itemId);
    }

    if (type === "save" || shouldSave) {
      await saveItem(user.id, itemId);
    }

    if (type === "note" && typeof content === "string") {
      await executeQuery({
        query: "INSERT INTO Notes (UserID, ItemID, Content) VALUES (?, ?, ?)",
        values: [user.id, itemId, content],
      });
    }

    if (type === "hide") {
      // For hide, we'll update the User_FeedItems table
      const existingRecord = await executeQuery({
        query: "SELECT 1 FROM User_FeedItems WHERE UserID = ? AND ItemID = ?",
        values: [user.id, itemId],
      });

      if (Array.isArray(existingRecord) && existingRecord.length > 0) {
        // Update existing record with a custom property
        await executeQuery({
          query:
            "UPDATE User_FeedItems SET IsRead = 1, LastInteractionAt = NOW() WHERE UserID = ? AND ItemID = ?",
          values: [user.id, itemId],
        });
      } else {
        // Create a new record
        await executeQuery({
          query:
            "INSERT INTO User_FeedItems (UserID, ItemID, IsRead, IsSaved, LastInteractionAt) VALUES (?, ?, 1, 0, NOW())",
          values: [user.id, itemId],
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Interaction insert error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to record interaction" },
      { status: 500 },
    );
  }
}
