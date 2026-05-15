import { NextRequest, NextResponse } from "next/server";
import { uploadBotQueueFile, deleteDriveFile } from "@/lib/google-drive-admin-v2";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { filename, content } = await req.json();

    if (!filename || !content) {
      return NextResponse.json({ error: "Missing filename or content" }, { status: 400 });
    }

    const fileId = await uploadBotQueueFile(filename, content);

    return NextResponse.json({ success: true, fileId });
  } catch (error: any) {
    console.error("Error in bot queue upload API:", error);
    return NextResponse.json({ error: error.message || "Failed to upload to drive" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { fileId } = await req.json();
    if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    
    await deleteDriveFile(fileId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in bot queue upload API DELETE:", error);
    return NextResponse.json({ error: error.message || "Failed to delete from drive" }, { status: 500 });
  }
}
