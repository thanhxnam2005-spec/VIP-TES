import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

fetch('https://www.piaotia.com/html/15/15305/11545107.html').then(r => r.arrayBuffer()).then(buf => { 
    const t = iconv.decode(Buffer.from(buf), 'gbk');
    const $ = cheerio.load(t);
    // Find text nodes directly under body
    $('script, style, div, table, a, center').remove();
    const text = $('body').text().trim();
    console.log("Text directly in body:", text.substring(0, 500));
})
