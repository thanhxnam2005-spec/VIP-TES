import { createClient } from '@/lib/supabase/server';
import { uploadToAdminDrive, downloadFromAdminDrive, listFilesFromAdminDrive } from '@/lib/google-drive-admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, novelId, filename, content } = await req.json();
    const userId = user.id;

    if (action === 'upload') {
      if (!novelId || !filename || content === undefined) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }
      const fileId = await uploadToAdminDrive(userId, novelId, filename, content);
      return NextResponse.json({ success: true, fileId });
    }

    if (action === 'download') {
      if (!novelId || !filename) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }
      const text = await downloadFromAdminDrive(userId, novelId, filename);
      if (text === null) return NextResponse.json({ error: 'File not found' }, { status: 404 });
      return NextResponse.json({ success: true, content: text });
    }

    if (action === 'list') {
      if (!novelId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      const files = await listFilesFromAdminDrive(userId, novelId);
      return NextResponse.json({ success: true, files });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Drive Storage Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
