import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

fetch('https://www.piaotia.com/bookinfo/15/15305.html').then(r => r.arrayBuffer()).then(buf => { 
    const t = iconv.decode(Buffer.from(buf), 'gbk');
    const $ = cheerio.load(t); 
    console.log($('a').map((i,el) => $(el).text().trim() + ' : ' + $(el).attr('href')).get()); 
})
