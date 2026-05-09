import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('./chapter.html', 'utf-8');
const $ = cheerio.load(html);

console.log("Title: ", $('h1').text().trim() || $('.title').text().trim() || $('.chaptitle').text().trim());

const p_tags = $('p').length;
console.log("P tags: ", p_tags);
console.log("ChapterPage ID length: ", $('#chapterPage').text().length);
console.log("Article length: ", $('article').text().length);
console.log("div class chapter content length: ", $('.chapter-content').text().length);
console.log("div id chapter-content length: ", $('#chapter-content').text().length);
