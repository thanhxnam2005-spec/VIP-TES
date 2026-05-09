import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('./page.html', 'utf-8');
const $ = cheerio.load(html);

console.log("Title: ", $('h1').text().trim() || $('title').text().trim());
console.log("Cover: ", $('img').map((i, el) => $(el).attr('src')).get().slice(0, 5));
console.log("Links: ", $('a').map((i, el) => $(el).attr('href') + " | " + $(el).text().trim().substring(0, 20)).get().slice(0, 20));

// Specific welove-gourmet details:
console.log("og:title", $('meta[property="og:title"]').attr('content'));
console.log("og:image", $('meta[property="og:image"]').attr('content'));
