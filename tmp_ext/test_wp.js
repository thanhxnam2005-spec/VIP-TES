const http = require('https');
const cheerio = require('cheerio');

http.get('https://sbtinwonderland.wordpress.com/ca-truong-thanh/so-tay-hinh-su-thanh-van-tieu-thi/', (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
        const $ = cheerio.load(data);
        const links = [];
        $('.entry-content a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text();
            if (href && text) links.push({ text: text.trim().substring(0, 50), href, element: el.tagName, outer: $.html(el) });
        });

        console.log("Found links inside entry-content:", links.length);
        console.log(links.slice(0, 10));
        console.log("...");
        console.log(links.slice(-5));

        const h1 = $('h1').text();
        console.log("H1:", h1);

        // Look for image
        const imgs = [];
        $('.entry-content img').each((i, el) => {
            imgs.push($(el).attr('src'));
        });
        console.log("Images:", imgs);
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
