import * as cheerio from 'cheerio';
import fs from 'fs';

const t = fs.readFileSync('timotxt_index.html', 'utf8');
const $ = cheerio.load(t);
$('a').each((i, el) => {
    const text = $(el).text().trim();
    if(text) console.log(text, $(el).attr('href'));
});
