import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function run() {
    const url = "https://www.guihualianpian.cn/collectioninfor/?ID=150";
    let res = await fetch(url);
    let html = await res.text();
    let $ = cheerio.load(html);
    
    console.log("Guihua links containing numbers:");
    const links = $('a[href]');
    let count = 0;
    links.each((i, el) => {
        const href = $(el).attr('href');
        if (href.match(/\d/)) {
            console.log($(el).text().trim(), href);
            count++;
        }
    });
    console.log(`Printed ${count} links.`);
}
run();
