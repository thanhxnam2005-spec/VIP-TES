import { fetchHtml, analyzeNovelPage } from "./lib/scraper/server-scraper.ts";

const sites = [
  "https://www.uukanshu.cc/book/21820/",
  "https://www.piaotia.com/html/14/14748/",
  "https://www.69shuba.com/book/51449.htm",
  "https://www.jjwxc.net/onebook.php?novelid=3362141",
  "https://www.cuoceng.com/book/18318/",
  "https://sangtacviet.com/truyen/qidian/1/1036370336/",
  "https://xtruyen.vn/truyen/nguoi-tai-than-thanh-thien-quoc-giai-tri-vo-doi-2559"
];

async function test() {
  for (const url of sites) {
    console.log(`\nTesting: ${url}`);
    try {
      const html = await fetchHtml(url);
      console.log(`[OK] Fetched ${html.length} bytes`);
      if (html.length < 1000) {
          console.log(`[WARN] HTML too short, might be blocked.`);
      } else {
         const info = await analyzeNovelPage(url);
         console.log(`Title: ${info.title}`);
         console.log(`Chapters found: ${info.chapters.length}`);
         if (info.chapters.length > 0) {
             console.log(`First chapter: ${info.chapters[0].title} -> ${info.chapters[0].url}`);
         }
      }
    } catch (e) {
      console.log(`[FAIL] ${e.message}`);
    }
  }
}

test();
