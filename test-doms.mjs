import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

async function analyzeSite(url, chapterUrl) {
    console.log(`\n--- Analyzing ${url} ---`);
    try {
        // Fetch Novel Page
        let res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }});
        let buffer = await res.arrayBuffer();
        let html = Buffer.from(buffer).toString('utf-8');
        
        // Detect encoding
        let charset = "utf-8";
        if (html.toLowerCase().includes('charset="gbk"') || html.toLowerCase().includes('charset=gbk')) {
            charset = "gbk";
            html = iconv.decode(Buffer.from(buffer), 'gbk');
        }
        console.log(`Charset: ${charset}`);
        
        let $ = cheerio.load(html);
        console.log(`Novel Title: ${$('title').text().substring(0, 50)}`);
        const chapters = $('a[href]').filter((i, el) => {
            const text = $(el).text();
            return text.includes("第") || text.includes("章") || text.includes("Chương");
        });
        console.log(`Found ${chapters.length} chapter links using basic heuristics.`);

        // Fetch Chapter Page if provided
        if (chapterUrl) {
            console.log(`\nFetching chapter: ${chapterUrl}`);
            res = await fetch(chapterUrl, { headers: { "User-Agent": "Mozilla/5.0" }});
            if (res.status !== 200) {
                console.log(`Chapter fetch failed with status ${res.status}`);
                return;
            }
            buffer = await res.arrayBuffer();
            html = charset === "gbk" ? iconv.decode(Buffer.from(buffer), 'gbk') : Buffer.from(buffer).toString('utf-8');
            $ = cheerio.load(html);
            
            // Find content
            const contentCandidates = ['#content', '.content', '#chaptercontent', '.read-content', '#nr1', '#BookText'];
            let found = false;
            for (const sel of contentCandidates) {
                const text = $(sel).text().trim();
                if (text.length > 100) {
                    console.log(`Content found in selector: ${sel} (Length: ${text.length})`);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log("Could not find content using standard selectors. Let's dump longest div:");
                let maxLen = 0;
                let maxSel = "";
                $('div').each((i, el) => {
                    const text = $(el).text().trim();
                    if (text.length > maxLen) {
                        maxLen = text.length;
                        maxSel = el.attribs.class || el.attribs.id;
                    }
                });
                console.log(`Longest div has length ${maxLen}, class/id: ${maxSel}`);
            }
        }
    } catch(e) {
        console.error("Error:", e.message);
    }
}

async function run() {
    await analyzeSite("https://www.guihualianpian.cn/collectioninfor/?ID=150", "https://www.guihualianpian.cn/collectioninfor/?ID=150"); // Wait, does guihualianpian have chapter pages? Let's see.
    await analyzeSite("https://www.timotxt.com/2402590123/", "https://www.timotxt.com/2402590123/2.html"); // Assuming standard chapter format
    await analyzeSite("https://czbooks.net/n/skg2jda8a4e", null); // Czbooks is blocked by CF, can't test chapter easily
    await analyzeSite("https://www.popo.tw/books/858223", null); // Popo requires login, can't test chapter easily
}
run();
