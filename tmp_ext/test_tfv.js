const fs = require('fs');
const cheerio = require('cheerio');

async function run() {
    const url = 'https://truyenfull.vision/my-dung-su-xuyen-qua-lam-nong-phu-lam-giau-nuoi-con/';
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        const html = await res.text();
        fs.writeFileSync('tmp_ext/tfv.html', html);
        console.log("HTML length:", html.length);

        const $ = cheerio.load(html);

        // Metadata
        const title = $('h3.title').text().trim() || $('.title').text().trim();
        console.log("Title:", title);

        const author = $('a[itemprop="author"]').text().trim();
        console.log("Author:", author);

        const cover = $('.book img').attr('src') || $('.info-holder img').attr('src');
        console.log("Cover:", cover);

        const desc = $('.desc-text').text().trim().substring(0, 100);
        console.log("Description:", desc + "...");

        // Pagination logic
        const chapters = [];
        $('ul.list-chapter li a').each((_, el) => {
            chapters.push({ title: $(el).text().trim(), url: $(el).attr('href') });
        });
        console.log("First page chapters:", chapters.length);
        if (chapters.length > 0) {
            console.log("First 3 chapters:", chapters.slice(0, 3));
        } else {
            // Maybe the selector is different
            console.log("Looking for other chapter links...");
            $('.list-chapter li a').each((_, el) => {
                chapters.push({ title: $(el).text().trim(), url: $(el).attr('href') });
            });
            console.log("Found:", chapters.length);
        }

        // Pagination check
        const paginationLinks = [];
        $('.pagination li a').each((_, el) => {
            paginationLinks.push($(el).attr('href'));
        });
        console.log("Pagination links:", paginationLinks);

        // Total pages?
        const totalPagesText = $('.pagination .active + li a').attr('href') || "none";
        console.log("Next page link:", totalPagesText);

    } catch (err) {
        console.error(err);
    }
}
run();
