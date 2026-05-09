import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('./page.html', 'utf-8');
const $ = cheerio.load(html);

const links = $('a').map((i, el) => {
   return { href: $(el).attr('href'), text: $(el).text().trim() };
}).get();

console.log("All Links: ", links.filter(l => l.href && l.href.includes('/book')).slice(0, 20));
console.log("IDs: ", $('*').map((i, el) => $(el).attr('id')).get().filter(x => x).slice(0, 20));
console.log("Classes: ", $('*').map((i, el) => $(el).attr('class')).get().filter(x => x && x.includes('chap')).slice(0, 20));
