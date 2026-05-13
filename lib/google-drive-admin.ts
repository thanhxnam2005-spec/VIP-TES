import { google } from 'googleapis';
import { db } from './db';

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'];

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  undefined,
  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  SCOPES
);

const drive = google.drive({ version: 'v3', auth });

const MASTER_FOLDER_NAME = 'Novel_Studio_Master_Storage';

/** Find or create a folder by name under a parent */
async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${
    parentId ? ` and '${parentId}' in parents` : ''
  }`;

  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create it
  const createRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });

  return createRes.data.id!;
}

export async function uploadToAdminDrive(userId: string, novelId: string, filename: string, content: string) {
  // 1. Get Master Folder
  const masterId = await findOrCreateFolder(MASTER_FOLDER_NAME);

  // 2. Get User Folder
  const userFolderId = await findOrCreateFolder(userId, masterId);

  // 3. Get Novel Folder
  const novelFolderId = await findOrCreateFolder(novelId, userFolderId);

  // 4. Check if file exists
  const q = `name = '${filename}' and '${novelFolderId}' in parents and trashed = false`;
  const listRes = await drive.files.list({ q, fields: 'files(id)' });

  if (listRes.data.files && listRes.data.files.length > 0) {
    // Update
    const fileId = listRes.data.files[0].id!;
    await drive.files.update({
      fileId,
      media: {
        mimeType: 'text/plain',
        body: content,
      },
    });
    return fileId;
  } else {
    // Create
    const createRes = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [novelFolderId],
        mimeType: 'text/plain',
      },
      media: {
        mimeType: 'text/plain',
        body: content,
      },
      fields: 'id',
    });
    return createRes.data.id;
  }
}

export async function downloadFromAdminDrive(userId: string, novelId: string, filename: string): Promise<string | null> {
  const masterId = await findOrCreateFolder(MASTER_FOLDER_NAME);
  const userFolderId = await findOrCreateFolder(userId, masterId);
  const novelFolderId = await findOrCreateFolder(novelId, userFolderId);

  const q = `name = '${filename}' and '${novelFolderId}' in parents and trashed = false`;
  const listRes = await drive.files.list({ q, fields: 'files(id)' });

  if (!listRes.data.files || listRes.data.files.length === 0) return null;

  const fileId = listRes.data.files[0].id!;
  const res = await drive.files.get({
    fileId,
    alt: 'media',
  });

  return res.data as string;
}

export async function listFilesFromAdminDrive(userId: string, novelId: string) {
    const masterId = await findOrCreateFolder(MASTER_FOLDER_NAME);
    const userFolderId = await findOrCreateFolder(userId, masterId);
    const novelFolderId = await findOrCreateFolder(novelId, userFolderId);
  
    const res = await drive.files.list({
      q: `'${novelFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, modifiedTime, size)',
    });
  
    return res.data.files || [];
}
