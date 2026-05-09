import fs from 'fs';

async function fetchPage() {
  const url = 'https://welove-gourmet.com/book/chapter/18641682';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });
  const html = await res.text();
  fs.writeFileSync('chapter.html', html);
  console.log('done');
}

fetchPage();
