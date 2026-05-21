const fetch = require('node-fetch').default || require('node-fetch');

const STV_API_URL = "https://comic.sangtacvietcdn.xyz/tsm.php?cdn=";

async function translateChunk(text) {
    const postData = new URLSearchParams();
    postData.append("sajax", "trans");
    postData.append("content", text);

    try {
        const res = await fetch(STV_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: postData.toString(),
        });
        if (!res.ok) {
            console.log(`Length: ${text.length} -> HTTP ${res.status}`);
            return false;
        }
        const result = await res.text();
        console.log(`Length: ${text.length} -> Success. Result length: ${result.length}, contains HTML: ${result.includes('<html')}`);
        // Print first 50 chars of result
        console.log(`  Preview: ${result.substring(0, 80).replace(/\n/g, '\\n')}`);
        return true;
    } catch (err) {
        console.log(`Length: ${text.length} -> Error: ${err.message}`);
        return false;
    }
}

async function run() {
    const chineseChar = "选"; // A common Chinese character

    // Test lengths: 500, 1000, 1500, 2000, 2500, 3000, 4000, 8000
    const lengths = [500, 1000, 1500, 2000, 2500, 3000, 4000, 8000];
    for (const len of lengths) {
        const text = chineseChar.repeat(len);
        await translateChunk(text);
        await new Promise(r => setTimeout(r, 1000)); // sleep to avoid rate limits
    }
}

run();
