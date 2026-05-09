import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

fetch('https://www.timotxt.com/2002590175/1.html').then(r => r.arrayBuffer()).then(buf => { 
    // it's probably utf8
    const t = Buffer.from(buf).toString('utf8');
    const $ = cheerio.load(t);
    console.log("Title:", $('h1').text());
    console.log("IDs:", $('[id]').map((i,el)=>$(el).attr('id')).get().join(", "));
    console.log("Classes:", $('div').map((i,el)=>$(el).attr('class')).get().join(", "));
    // see if it has content
    console.log("Has #content?", $('#content').length);
    console.log("Has .content?", $('.content').length);
    console.log("Has #chaptercontent?", $('#chaptercontent').length);
})
