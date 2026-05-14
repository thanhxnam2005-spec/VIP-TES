require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function test() {
  try {
    const fetchDriveAPI = async (url, options = {}) => {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      });
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Auth failed: " + JSON.stringify(data));
      
      const token = data.access_token;
      
      const res2 = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res2.ok) {
        throw new Error("Drive API failed: " + await res2.text());
      }
      
      if (url.includes('alt=media')) {
        return res2.text();
      }
      if (options.method === 'DELETE') return null;
      return res2.json();
    };

    // 1. Get folder ID
    const q = encodeURIComponent(`name = 'Kho_chua_du_lieu_App' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await fetchDriveAPI(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`);
    const parentId = searchRes.files[0].id;

    // 2. Upload file
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    
    const mimeType = 'text/plain';
    const metadata = {
      name: 'test_file_hello.txt',
      mimeType: mimeType,
      parents: [parentId]
    };
    const content = "Xin chào Việt Nam!";
    
    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
      content +
      close_delim;
      
    console.log("Uploading...");
    const uploadRes = await fetchDriveAPI("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartRequestBody
    });
    console.log("Upload res:", uploadRes);

    // 3. Download file
    console.log("Downloading...");
    const dlRes = await fetchDriveAPI(`https://www.googleapis.com/drive/v3/files/${uploadRes.id}?alt=media`);
    console.log("Download res:", dlRes);

  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
