import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

fetch('https://www.piaotia.com/bookinfo/15/15305.html').then(r => r.arrayBuffer()).then(buf => { 
    const t = iconv.decode(Buffer.from(buf), 'gbk');
    const $ = cheerio.load(t);
    let indexLink = $("a[href*='/html/'][href$='/index.html'], a[href='index.html'], a[href='./index.html']");
    console.log("Found indexLink?", indexLink.length);
    if(indexLink.length) console.log(indexLink.attr("href"));
})
