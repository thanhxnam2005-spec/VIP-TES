import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

fetch('https://www.guihualianpian.cn/serial_novel/novel_detail.php?novel_id=15').then(r => r.text()).then(t => { 
    const $ = cheerio.load(t);
    console.log('Images src:', $('img').map((i,e)=>$(e).attr('src')).get().slice(0, 5));
    console.log('Images data-original:', $('img').map((i,e)=>$(e).attr('data-original')).get().filter(x=>x).slice(0, 5));
    console.log('Images data-src:', $('img').map((i,e)=>$(e).attr('data-src')).get().filter(x=>x).slice(0, 5));
    // check divs with background-image
    const bgs = [];
    $('*[style*="background-image"]').each((i, e) => bgs.push($(e).attr('style')));
    console.log("Backgrounds:", bgs);
})
