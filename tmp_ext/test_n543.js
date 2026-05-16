const http = require('https');
const cheerio = require('cheerio');

http.get('https://www.novel543.com/0808691207/', {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    }
}, (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
        const $ = cheerio.load(data);
        console.log("Status:", resp.statusCode);

        const imgs = [];
        $('img').each((i, el) => {
            imgs.push($(el).attr('src') + ' | alt: ' + $(el).attr('alt') + ' | class: ' + $(el).attr('class'));
        });
        console.log("Images:", imgs);

        // Links
        const links = [];
        $('.chapter-list a, .dir-list a, ul.flex a[href*=".html"], a[href*=".html"]').each((i, el) => {
            links.push($(el).text().trim() + ' => ' + $(el).attr('href'));
        });
        console.log("Total Links:", links.length);
        console.log("First 20 links:", links.slice(0, 20));
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
