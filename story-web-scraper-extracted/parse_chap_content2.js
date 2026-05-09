import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('./chapter.html', 'utf-8');
const $ = cheerio.load(html);

console.log("Max P text container: ");
let maxPCount = 0;
let bestContainer = null;
$('div, main, section, article').each((i, el) => {
    const pCount = $(el).children('p').length;
    if (pCount > maxPCount) {
        maxPCount = pCount;
        bestContainer = $(el);
    }
});

console.log("Max P count: ", maxPCount);
console.log("Best container class: ", bestContainer.attr('class'));
console.log("Best container id: ", bestContainer.attr('id'));
console.log("First 3 p tags: ", bestContainer.children('p').slice(0, 3).map((i, el) => $(el).text()).get());

console.log("Title inside reading area: ", bestContainer.parent().find('h1, h2, h3, .title, .chap-title, .chapter-title, .chaptitle').text().trim().substring(0, 50));
