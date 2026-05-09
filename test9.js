import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

fetch('https://czbooks.net/n/s6lij1', {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
}).then(r => r.text()).then(t => { 
    const $ = cheerio.load(t);
    console.log("Title:", $('title').text());
    console.log("Body length:", $('body').html()?.length);
    if($('title').text().includes('Cloudflare') || $('title').text().includes('Security')) {
        console.log("Blocked by Cloudflare!");
    }
})
