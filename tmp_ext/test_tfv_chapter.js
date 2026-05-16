const fs = require('fs');
const cheerio = require('cheerio');

async function run() {
    const url = 'https://truyenfull.vision/my-dung-su-xuyen-qua-lam-nong-phu-lam-giau-nuoi-con/chuong-1/';
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        // The content is usually in .chapter-c
        let content = $('.chapter-c').html();
        if (!content) {
            console.log('Class .chapter-c not found, testing #chapter-c...');
            content = $('#chapter-c').html();
        }

        if (content) {
            // clean up html
            content = content.replace(/<br\s*[\/]?>/gi, "\n");
            const chapterCheerio = cheerio.load(content);
            let text = chapterCheerio.text().trim();
            console.log("Content length (first 200 chars):", text.substring(0, 200));
        } else {
            console.log("Failed to find chapter content container.");
        }

    } catch (err) {
        console.error(err);
    }
}
run();
