"use server";

import { uploadDictToAdminDrive, uploadToAdminDrive } from "@/lib/google-drive-admin-v2";

export async function uploadDictServerAction(formData: FormData) {
  try {
    const filename = formData.get("filename") as string;
    const file = formData.get("file") as File;
    if (!filename || !file) throw new Error("Missing filename or file");
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString("utf-8");

    await uploadDictToAdminDrive(filename, content);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadNovelDictServerAction(userIdentifier: string, novelId: string, filename: string, content: string) {
  try {
    const novelName = `${novelId}_${filename}`;
    const fileId = await uploadToAdminDrive(userIdentifier, novelName, content);
    return { success: true, fileId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


