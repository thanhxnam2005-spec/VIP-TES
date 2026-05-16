const http = require('https');
const cheerio = require('cheerio');

http.get('https://sbtinwonderland.wordpress.com/2020/12/14/so-tay-trinh-tham-chuong-1/', (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
        const $ = cheerio.load(data);
        const content = $('.entry-content');

        // clean up
        content.find('.sharedaddy, script, style, .jp-relatedposts').remove();

        let text = content.text().trim().replace(/\n\s*\n/g, '\n\n');
        console.log("Chapter Title:", $('h1.entry-title').text());
        console.log("Content start:\n", text.substring(0, 500));
    });
});
