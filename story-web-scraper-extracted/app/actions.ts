'use server';

import * as cheerio from 'cheerio';

export interface StoryInfo {
  title: string;
  coverImage: string | null;
  chapters: { title: string; url: string }[];
}

export interface ChapterData {
  title: string;
  content: string[]; // Array of paragraphs
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return await response.text();
}

function getBestSelector($: any, el: any): string {
    const id = $(el).attr('id');
    if (id) return `#${id}`;
    
    // Check for specific unique classes
    const classStr = $(el).attr('class');
    if (classStr) {
        const classes = classStr.trim().split(/\s+/).filter((c: string) => !c.includes('hover:') && !c.includes('focus:')); // ignoring tailwind states if any
        if (classes.length > 0) {
            return `.${classes.join('.')}`;
        }
    }
    return el.name || ''; // tag name
}

export async function generateScrapingPrompt(url: string): Promise<string> {
    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        // 1. Tên truyện
        let titleSelector = '';
        if ($('meta[property="og:title"]').length > 0) {
            titleSelector = 'Thẻ <meta property="og:title"> lấy thuộc tính content';
        } else if ($('h1').length > 0) {
            titleSelector = `Thẻ ${getBestSelector($, $('h1').first())}`;
        } else {
            titleSelector = 'Thẻ <title>';
        }

        // 2. Ảnh bìa
        let coverSelector = '';
        if ($('meta[property="og:image"]').length > 0) {
            coverSelector = 'Thẻ <meta property="og:image"> lấy thuộc tính content';
        } else {
            const possibleCovers = $('img').filter((i, el) => {
                const src = $(el).attr('src') || '';
                const cls = $(el).attr('class') || '';
                return src.includes('cover') || cls.includes('cover') || src.includes('thumb');
            });
            if (possibleCovers.length > 0) {
                coverSelector = `Thẻ img có css: ${getBestSelector($, possibleCovers.first())}`;
            } else {
                coverSelector = 'Thẻ <img> đầu tiên trong thẻ bọc thông tin truyện (Cần check class thủ công vì web mã hóa)';
            }
        }

        // 3. Danh sách chương
        let chapSelector = '';
        let sampleChapUrl = '';
        
        const chapLinks = $('a').filter((i, el) => {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr('href')?.toLowerCase() || '';
            const cls = $(el).attr('class')?.toLowerCase() || '';
            return text.includes('chương') || text.includes('chapter') || 
                   href.includes('chuong') || href.includes('chapter') || 
                   cls.includes('chap');
        });

        if (chapLinks.length > 0) {
            const listContainer = chapLinks.first().closest('ul, div[class*="list"], div[id*="list"]');
            if (listContainer.length > 0) {
                chapSelector = `Các thẻ <a> nằm trong khối ${getBestSelector($, listContainer)}`;
            } else {
                // Determine class of link itself
                chapSelector = `Các thẻ <a> có Selector là: ${getBestSelector($, chapLinks.first())}`;
            }
            sampleChapUrl = new URL(chapLinks.first().attr('href') || '', url).toString();
        } else {
            // Try fallback finding a div containing many links
            let bestList = null as any;
            let maxLinks = 0;
            $('div, ul').each((i, el) => {
                const linksCount = $(el).children('a').length;
                if (linksCount > maxLinks && linksCount > 5) {
                    maxLinks = linksCount;
                    bestList = $(el);
                }
            });
            
            if (bestList) {
                chapSelector = `Các thẻ <a> nằm trong vùng danh sách ${getBestSelector($, bestList)}`;
                sampleChapUrl = new URL(bestList.find('a').first().attr('href') || '', url).toString();
            } else {
                chapSelector = 'Tất cả thẻ <a> (Cần lọc theo URL bằng RegEx)';
                // Fallback attempt to get one link
                const anyLink = $('a').filter((i, el) => ($(el).attr('href')||'').length > 10).first();
                if (anyLink.length > 0) {
                    sampleChapUrl = new URL(anyLink.attr('href') || '', url).toString();
                }
            }
        }

        // 4. Nội dung chương
        let chapTitleSelector = '';
        let contentSelector = '';
        if (sampleChapUrl && sampleChapUrl.startsWith('http')) {
            try {
                const chapHtml = await fetchHtml(sampleChapUrl);
                const $c = cheerio.load(chapHtml);
                
                // Tiêu đề chương
                if ($c('h1').length > 0) {
                    chapTitleSelector = `Thẻ ${getBestSelector($c, $c('h1').first())}`;
                } else if ($c('.chaptitle, .chapter-title, .title-chuong').length > 0) {
                    chapTitleSelector = `Thẻ ${getBestSelector($c, $c('.chaptitle, .chapter-title, .title-chuong').first())}`;
                } else if ($c('title').length > 0) {
                    chapTitleSelector = 'Thẻ <title>';
                } else {
                    chapTitleSelector = 'Không rõ (cần tìm theo text)';
                }
                
                // Nội dung chữ
                let maxPCount = 0;
                let bestContainer = null as any;
                $c('div, main, section, article').each((i, el) => {
                    const pCount = $c(el).children('p').length;
                    if (pCount > maxPCount) {
                        maxPCount = pCount;
                        bestContainer = $c(el);
                    }
                });

                if (bestContainer && maxPCount > 3) {
                    contentSelector = `Lấy tất cả text từ các thẻ <p> nằm trong vùng ${getBestSelector($c, bestContainer)}`;
                } else {
                    // Try by HTML length
                    let maxLen = 0;
                    $c('div').each((i,el) => {
                        const len = $c(el).text().length;
                        if (len > maxLen && $c(el).children('div').length === 0) {
                            maxLen = len;
                            bestContainer = $c(el);
                        }
                    });
                    if (bestContainer) {
                        contentSelector = `Lấy nội dung chữ (text) bên trong ${getBestSelector($c, bestContainer)}`;
                    } else {
                        contentSelector = 'Khối nội dung chính (không tìm thấy selector cụ thể qua phân tích tự động)';
                    }
                }
            } catch (err) {
                chapTitleSelector = `(Lỗi không truy cập được link chương mẫu ${sampleChapUrl})`;
                contentSelector = `(Lỗi không định vị được vì link lỗi)`;
            }
        } else {
            chapTitleSelector = `(Chưa có link chương mẫu để phân tích)`;
            contentSelector = `(Chưa có link chương mẫu để phân tích)`;
        }

        // Generate the final prompt string
        let promptText = `Bạn hãy đóng vai là một lập trình viên Python/Node.js chuyên nghiệp. Hãy viết đoạn code Scraping để cào dữ liệu truyện từ website: ${url}\n\n`;
        
        promptText += `⚠️ LƯU Ý QUAN TRỌNG VỀ JAVASCRIPT / PHÂN TRANG:\n`;
        promptText += `Trang web này có thể chứa danh sách chương cực lớn, được chia trang bằng JavaScript (AJAX) hoặc tải hết nhưng ẩn đi bằng CSS (display: none/block).\n`;
        promptText += `👉 Yêu cầu: Sử dụng Playwright hoặc Selenium (thay vì Request/BeautifulSoup) để kết xuất (render) toàn bộ DOM.\n`;
        promptText += `👉 Nếu có phân trang, hãy viết hàm vòng lặp click vào nút "Trang tiếp theo" (Next Page) hoặc can thiệp thực thi mã JS (page.evaluate) để lật mở toàn bộ danh sách ẩn trước khi quét vòng lặp.\n\n`;
        
        promptText += `Dưới đây là các CSS Selector tĩnh tôi đã nhận diện được, hãy kết hợp vào code của bạn để bóc tách:\n`;
        promptText += `[ THÔNG TIN TRUYỆN ]\n`;
        promptText += `- Tên truyện: Lấy từ ${titleSelector}\n`;
        promptText += `- Ảnh bìa truyện: Lấy từ ${coverSelector}\n`;
        promptText += `- Danh sách chương: Trích xuất href và tiêu đề từ ${chapSelector}\n\n`;
        
        promptText += `[ NỘI DUNG CHƯƠNG ĐỌC ]\n`;
        promptText += `(Dựa trên chương mẫu: ${sampleChapUrl})\n`;
        promptText += `- Tiêu đề chương: Lấy từ ${chapTitleSelector}\n`;
        promptText += `- Nội dung chữ của chương: ${contentSelector}\n\n`;
        
        promptText += `Hãy cung cấp code hoàn chỉnh (có Try/Catch xử lý timeout, delay ngẫu nhiên chống block) và in ra định dạng JSON/TXT gọn gàng.`;

        return promptText;
    } catch (error: any) {
        console.error("Error generating prompt:", error);
        throw new Error('Đã có lỗi xảy ra khi phân tích: ' + error.message);
    }
}

export async function scrapeStoryInfo(url: string): Promise<StoryInfo> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    // Heuristics for Title
    let title = $('h1').first().text().trim() || 
                $('meta[property="og:title"]').attr('content') || 
                $('title').text().trim();

    // Heuristics for Cover Image
    let coverImage = $('meta[property="og:image"]').attr('content') || 
                     $('.book-cover img').attr('src') || 
                     $('.img-cover img').attr('src') ||
                     $('img').filter((i, el) => {
                         const src = $(el).attr('src') || '';
                         const cls = $(el).attr('class') || '';
                         const alt = $(el).attr('alt') || '';
                         return src.includes('cover') || cls.includes('cover') || alt.includes('cover') || alt === title;
                     }).first().attr('src') || null;
                     
    // Resolve relative URL for image if needed
    if (coverImage && !coverImage.startsWith('http')) {
        const baseUrl = new URL(url).origin;
        coverImage = new URL(coverImage, baseUrl).toString();
    }

    // Heuristics for Chapters
    const chapters: { title: string; url: string }[] = [];
    
    // Look for links that might be chapters
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      // Basic filter: link contains 'chuong', 'chapter' or text contains it
      if (href && text && (
          href.toLowerCase().includes('chuong') || 
          href.toLowerCase().includes('chapter') ||
          text.toLowerCase().includes('chương') ||
          text.toLowerCase().includes('chapter') ||
          $(el).closest('.list-chapter, .chapter-list').length > 0
      )) {
        // Resolve relative URL
        let absoluteUrl = href;
        if (!href.startsWith('http')) {
          absoluteUrl = new URL(href, new URL(url).origin).toString();
        }
        
        // Avoid duplicates or non-chapter links (e.g. pagination)
        if (!chapters.find(c => c.url === absoluteUrl) && text.length > 1) {
            chapters.push({ title: text, url: absoluteUrl });
        }
      }
    });

    // If heuristic fails to find chapters, maybe they are just in a list
    if (chapters.length === 0) {
        $('.list-chapter a, #list-chapter a, .chapter-list a, ul.chapters a').each((_, el) => {
             const href = $(el).attr('href');
             const text = $(el).text().trim();
             if (href && text) {
                 let absoluteUrl = href;
                 if (!href.startsWith('http')) {
                   absoluteUrl = new URL(href, new URL(url).origin).toString();
                 }
                 if (!chapters.find(c => c.url === absoluteUrl)) {
                     chapters.push({ title: text, url: absoluteUrl });
                 }
             }
        })
    }

    // (Hỗ trợ riêng Metruyenchu nếu có phân trang)
    const mtcPageLinks = $('a[onclick^="page("]');
    if (mtcPageLinks.length > 0) {
        try {
            // onclick='page(91057,2);'
            const firstOnClick = mtcPageLinks.first().attr('onclick') || '';
            const match = firstOnClick.match(/page\((\d+)/);
            if (match && match[1]) {
                const storyId = match[1];
                let maxPage = 2;
                mtcPageLinks.each((i, el) => {
                    const m = ($(el).attr('onclick') || '').match(/page\(\d+,(\d+)\)/);
                    if (m && m[1]) maxPage = Math.max(maxPage, parseInt(m[1]));
                });
                
                // Lấy thêm các trang (giới hạn 5 trang preview để bot chạy nhanh)
                for (let p = 2; p <= Math.min(maxPage, 5); p++) { 
                    try {
                        const origin = new URL(url).origin;
                        const pageUrl = `${origin}/get/listchap/${storyId}?page=${p}`;
                        const pageHtml = await fetchHtml(pageUrl);
                        let actualHtml = pageHtml;
                        try {
                            const parsed = JSON.parse(pageHtml);
                            if (parsed && parsed.data) {
                                actualHtml = parsed.data;
                            }
                        } catch (e) {
                            // fall back to raw html
                        }
                        
                        const $p = cheerio.load(actualHtml);
                        const plinks = $p('a').filter((i, el) => {
                            const text = $p(el).text().toLowerCase();
                            const href = $p(el).attr('href')?.toLowerCase() || '';
                            return text.includes('chương') || text.includes('chapter') || 
                                   href.includes('chuong') || href.includes('chapter') ||
                                   href.includes('chap') || href.includes('cv');
                        });
                        plinks.each((i, el) => {
                            const pTitle = $p(el).text().trim().replace(/\s+/g, ' ');
                            const href = $p(el).attr('href');
                            if (href && pTitle) {
                                let chapUrl = href;
                                if (!chapUrl.startsWith('http')) {
                                    chapUrl = chapUrl.startsWith('/') ? `${origin}${chapUrl}` : `${origin}/${chapUrl}`;
                                }
                                if (!chapters.find(c => c.url === chapUrl)) {
                                    chapters.push({ title: pTitle, url: chapUrl });
                                }
                            }
                        });
                    } catch (e) {
                        console.error(`Lỗi tải trang ${p}:`, e);
                    }
                }
            }
        } catch(e) {}
    }

    return { title, coverImage, chapters };
  } catch (error) {
    console.error("Error scraping story info:", error);
    throw new Error('Could not scrape story info');
  }
}

export async function scrapeChapterContent(url: string): Promise<ChapterData> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    let title = $('h1').first().text().trim() || 
                $('.title-chuong').text().trim() || 
                $('title').text().trim();

    // Heuristics for chapter content
    let contentContainer = $('#chapter-c, .chapter-content, .chapter-c, #chapter-content, .reading-content');
    
    if (contentContainer.length === 0) {
       // Fallback: look for the div with the most p tags
       let maxPCount = 0;
       $('div, article, main').each((_, el) => {
           const pCount = $(el).children('p').length;
           if (pCount > maxPCount) {
               maxPCount = pCount;
               contentContainer = $(el);
           }
       });
    }

    const paragraphs: string[] = [];
    if (contentContainer.length > 0) {
        contentContainer.html()?.split(/<br\s*\/?>/i).forEach(part => {
             const cleanText = $(`<div>${part}</div>`).text().trim();
             if (cleanText) paragraphs.push(cleanText);
        });
        
        // If splitting by <br> didn't yield much, maybe it uses <p> tags
        if (paragraphs.length < 3) {
            paragraphs.length = 0; // clear
            contentContainer.find('p').each((_, el) => {
               const pText = $(el).text().trim();
               if (pText) paragraphs.push(pText);
            });
        }
    }

    return { title, content: paragraphs };
  } catch (error) {
    console.error("Error scraping chapter content:", error);
    throw new Error('Could not scrape chapter content');
  }
}
