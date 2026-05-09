// Simulate what the adapter does with the user-provided HTML
const html = `<div class="read-txt font-m"><h1><font dir="auto" style="vertical-align: inherit;"><font dir="auto" style="vertical-align: inherit;">Tôi là một con chuột bò trong bóng tối.</font></font></h1><p><font dir="auto" style="vertical-align: inherit;"><font dir="auto" style="vertical-align: inherit;">Cánh cửa kính của quán cà phê được đẩy mở, một cơn gió lạnh ẩm ập vào, khiến những chiếc chuông gió treo trên khung cửa phát ra vài tiếng kêu khó chịu.
</font></font></p><blockquote cite="https://www.po18.tw/" class="copyright" style="background:#fff; border-left:5px solid #4a84ce; padding:20px 50px;">lsn8w1Sth9VLPa5BcZTAJzx2qRjgEubXOCrfv47F</blockquote><p><font dir="auto" style="vertical-align: inherit;"><font dir="auto" style="vertical-align: inherit;"> &nbsp;&nbsp;  &nbsp;&nbsp; Nó nổi bật hẳn lên giữa bầu không khí yên tĩnh. Qiu Xun đã nhắc nhở quản lý cửa hàng rằng tốt nhất nên gỡ bỏ nó đi, vì tiếng người ra vào khá ồn ào.</font></font></p><blockquote cite="https://www.po18.tw/" class="copyright" style="background:#fff;">OYLm84x6bQWnqsc07UrtygN5SCapXJliTjk1DuwM</blockquote><p> &nbsp;&nbsp; 秋洵的上城区暂住证是考上大学时政府给发的。</p><blockquote cite="https://www.po18.tw/" class="copyright">umQp73aTMX245wdZBqsrg6ivtVybKGHnlSFWY1Po</blockquote></div>`;

import * as cheerio from 'cheerio';

const $ = cheerio.load(html);
const contentNode = $('.read-txt');
console.log("Found .read-txt:", contentNode.length > 0);

// Remove copyright watermarks
contentNode.find('blockquote.copyright, blockquote[cite]').remove();
console.log("After removing blockquotes:");

// Get text from p tags
const lines = [];
contentNode.find('p').each((i, el) => {
    const text = $(el).text().trim();
    if (text) lines.push(text);
});

const result = lines
    .map(line => line.replace(/\u00a0/g, " ").replace(/ {2,}/g, " ").trim())
    .filter(line => line.length > 0)
    .filter(line => !/^[A-Za-z0-9]{30,}$/.test(line))
    .join("\n\n");

console.log("Result:");
console.log(result);
console.log("\nLength:", result.length);
