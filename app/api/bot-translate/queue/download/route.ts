import { NextRequest, NextResponse } from "next/server";
import { downloadBotQueueFile } from "@/lib/google-drive-admin-v2";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    const content = await downloadBotQueueFile(fileId);

    if (!content) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error in bot queue download API:", error);
    return NextResponse.json({ error: error.message || "Failed to download from drive" }, { status: 500 });
  }
}
