import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

const targets = [
  { name: 'uukanshu', url: 'https://www.uukanshu.cc/book/21820/' },
  { name: 'piaotia', url: 'https://www.piaotia.com/html/14/14748/', encoding: 'gbk' },
  { name: '69shu', url: 'https://www.69shuba.com/book/51449.htm' },
  { name: 'jjwxc', url: 'https://www.jjwxc.net/onebook.php?novelid=3362141', encoding: 'gbk' },
  { name: 'cuoceng', url: 'https://www.cuoceng.com/book/18318/' },
  { name: 'sangtacviet', url: 'https://sangtacviet.com/truyen/qidian/1/1036370336/' },
  { name: 'xtruyen', url: 'https://xtruyen.vn/truyen/nguoi-tai-than-thanh-thien-quoc-giai-tri-vo-doi-2559' }
];

async function testFetch() {
  for (const t of targets) {
    console.log(`\n================================`);
    console.log(`Testing: ${t.name} -> ${t.url}`);
    try {
      const res = await fetch(t.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        }
      });
      
      console.log(`Status: ${res.status} ${res.statusText}`);
      const buffer = await res.buffer();
      const html = t.encoding === 'gbk' ? iconv.decode(buffer, 'gbk') : buffer.toString('utf8');
      
      console.log(`HTML Length: ${html.length} bytes`);
      
      if (res.status === 200 || res.status === 403) {
        if (html.includes('Cloudflare') || html.includes('Just a moment...')) {
          console.log(`Result: BLOCKED BY CLOUDFLARE`);
        } else if (html.includes('id="app"')) {
           console.log(`Result: SPA (Javascript Rendered), Chapter list not in HTML`);
           // check if any chapters inside
           const $ = cheerio.load(html);
           const links = $('a').length;
           console.log(`Total <a> tags: ${links}`);
        } else {
          // parse
          const $ = cheerio.load(html);
          console.log(`Title tag: ${$('title').text().substring(0, 50)}`);
          
          let chapterLinks = [];
          if (t.name === 'piaotia') chapterLinks = $('.centent a');
          else if (t.name === 'jjwxc') chapterLinks = $('tr[itemprop="chapter"] a');
          else chapterLinks = $('a');
          
          console.log(`Found links matching selector: ${chapterLinks.length}`);
          if (chapterLinks.length > 0) {
              const sample = $(chapterLinks[Math.floor(chapterLinks.length/2)]);
              console.log(`Sample link: [${sample.text().trim()}] -> ${sample.attr('href')}`);
          }
        }
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

testFetch();
