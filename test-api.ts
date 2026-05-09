import { analyzeChapterPage } from "./lib/scraper/server-scraper.ts";

async function run() {
    try {
        const url = "https://metruyenchu.com.vn/tay-mon-tien-toc/chuong-1-_Wqm3vF_ODhu";
        console.log("Analyzing Chapter:", url);
        const res = await analyzeChapterPage(url);
        console.log("Title:", res.title);
        console.log("Content Length:", res.content.length);
        console.log("First lines:", res.content.slice(0, 3));
    } catch(e) {
        console.error(e);
    }
}
run();
