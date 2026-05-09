import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function run() {
    const postID = "10382966";
    
    // We will simulate EXACTLY the browser fetch
    const body = new URLSearchParams({
        action: 'wp-manga-get-chapters',
        manga: postID,
        type: 'manga'
    });

    const headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://xtruyen.vn",
        "Referer": "https://xtruyen.vn/truyen/tien-nghich-sat-than-tro-ve-khai-cuc-cuoi-vo-ly-mo-uyen/"
    };

    console.log("Fetching AJAX with body:", body.toString());
    let res = await fetch("https://xtruyen.vn/wp-admin/admin-ajax.php", {
        method: "POST",
        headers,
        body: body.toString()
    });
    let html = await res.text();
    console.log("HTML length:", html.length);
    if(html.length > 5) {
        // console.log("Sample:", html.substring(0, 200).replace(/\n/g, ""));
        const $ = cheerio.load(html);
        console.log("Chapters found:", $('a').length);
    }
}
run();
