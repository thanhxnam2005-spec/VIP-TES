import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function run() {
    // A random XTruyen novel link (example)
    // I need a link to test. I will search for a popular novel on XTruyen.
    const searchRes = await fetch("https://xtruyen.vn/?s=tien+nghich&post_type=wp-manga");
    const searchHtml = await searchRes.text();
    const $search = cheerio.load(searchHtml);
    const novelLink = $search('.post-title a').first().attr('href');
    
    if (!novelLink) {
        console.log("No novel found");
        return;
    }
    console.log("Found Novel:", novelLink);

    const res = await fetch(novelLink);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const chapters = $('li.wp-manga-chapter a');
    console.log("Found chapters count:", chapters.length);
    if (chapters.length > 0) {
        console.log("First chapter:", chapters.first().text().trim());
        console.log("Last chapter:", chapters.last().text().trim());
    }
    
    // Let's check for AJAX chapter list mechanism
    const mangaId = $('.rating-post-id').val() || $('[data-id]').attr('data-id');
    console.log("Manga ID:", mangaId);
}
run();
