import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

fetch('https://www.piaotia.com/html/15/15305/index.html').then(r => r.arrayBuffer()).then(async buf => { 
    const t = iconv.decode(Buffer.from(buf), 'gbk');
    const $ = cheerio.load(t);
    const firstHref = $('.centent a').first().attr('href');
    const url = 'https://www.piaotia.com/html/15/15305/' + firstHref;
    console.log("Fetching", url);
    const chBuf = await fetch(url).then(r => r.arrayBuffer());
    const chHtml = iconv.decode(Buffer.from(chBuf), 'gbk');
    const $ch = cheerio.load(chHtml);
    console.log($ch('body').text().substring(0, 300).replace(/\s+/g, ' '));
})
