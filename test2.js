import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

fetch('https://www.piaotia.com/html/15/15305/index.html').then(r => r.arrayBuffer()).then(buf => { 
    const t = iconv.decode(Buffer.from(buf), 'gbk');
    const $ = cheerio.load(t); 
    console.log($('.centent a').length);
    console.log($('.mainbody div').map((i,e)=>$(e).attr('class')).get());
})
