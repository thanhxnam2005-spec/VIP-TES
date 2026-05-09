import fetch from 'node-fetch';

const urls = [
    "https://www.guihualianpian.cn/collectioninfor/?ID=150",
    "https://www.timotxt.com/2402590123/",
    "https://czbooks.net/n/skg2jda8a4e",
    "https://www.popo.tw/books/858223"
];

async function checkUrl(url) {
    try {
        console.log(`\nTesting: ${url}`);
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            timeout: 10000
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`HTML Length: ${text.length}`);
        
        if (text.includes("Cloudflare") || text.includes("Just a moment")) {
            console.log("Verdict: BLOCKED BY CLOUDFLARE -> Needs Extension");
        } else if (text.length < 10000 && (text.includes("login") || text.includes("登入"))) {
            console.log("Verdict: REQUIRES LOGIN -> Needs Extension");
        } else if (res.status === 200) {
            console.log("Verdict: SERVER MODE POSSIBLE -> Fast Import");
        } else {
            console.log("Verdict: FAILED -> Might need Extension");
        }
    } catch(e) {
        console.error(`Verdict: FETCH ERROR (${e.message}) -> Needs Extension`);
    }
}

async function run() {
    for (const url of urls) {
        await checkUrl(url);
    }
}

run();
