require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function test() {
  try {
    // import the TS file using ts-node or just rewrite a small snippet here
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
      return res2.json();
    };
    
    // 1. Find master folder
    const q = encodeURIComponent(`name = 'Kho_chua_du_lieu_App' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`;
    const searchRes = await fetchDriveAPI(searchUrl);
    console.log('Master folder:', searchRes);
    
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
