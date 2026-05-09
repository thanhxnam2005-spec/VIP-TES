import fetch from 'node-fetch';

async function run() {
    const url = "https://www.po18.tw/books/887398/articles";
    try {
        const res = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            }
        });
        console.log("Status:", res.status, res.statusText);
        const text = await res.text();
        console.log("HTML length:", text.length);
        if (text.includes("Cloudflare") || text.includes("Just a moment")) {
            console.log("Cloudflare blocked!");
        } else if (text.includes("登入") || text.includes("login")) {
            console.log("Found login text!");
        }
        console.log(text.substring(0, 1000));
    } catch(e) {
        console.error(e);
    }
}
run();
