import { cleanGarbageLines } from "../../text-utils";
import type { SiteAdapter, ChapterLink } from "../types";
import { extensionFetch } from "../extension-bridge";

export const HaiTangSoShuAdapter: SiteAdapter = {
    name: "HaiTangSoShu",
    group: "cn",
    urlPattern: /haitangsoshu\.org/,
    chapterWaitSelector: "#chapterTitle",

    async getNovelInfo(html, url, onProgress) {
        const doc = new DOMParser().parseFromString(html, "text/html");

        const title =
            doc.querySelector("meta[property='og:title']")?.getAttribute("content") ||
            doc.querySelector(".BGsectionOne-top-right p.title")?.textContent?.trim() ||
            "";

        const author =
            doc.querySelector("meta[property='og:novel:author']")?.getAttribute("content") ||
            doc.querySelector(".BGsectionOne-top-right p.author a.b")?.textContent?.trim() ||
            "Đang cập nhật";

        const coverImage =
            doc.querySelector("meta[property='og:image']")?.getAttribute("content") ||
            doc.querySelector(".BGsectionOne-top-left img")?.getAttribute("src") ||
            "";

        const description =
            doc.querySelector("meta[name='description']")?.getAttribute("content") ||
            doc.querySelector("p.BGsectionTwo-bottom")?.textContent?.trim() ||
            "";

        // 1. Phân tích ID truyện
        const bookIdMatch = url.match(/\/book\/(\d+)/);
        const bookId = bookIdMatch ? bookIdMatch[1] : "";

        const chapters: ChapterLink[] = [];

        if (!bookId) {
            return { title, author, description, coverImage, chapters };
        }

        // Lặp qua các trang mục lục (catalog/1.html, catalog/2.html, ...)
        let page = 1;
        let hasNextPage = true;
        let limit = 50; // Bảo vệ vòng lặp vô hạn (mỗi trang mục lục thường rất dài)

        // Nếu URL nhập vào đã là mục lục, lấy content hiện tại luôn, sau đó mới quét tiếp
        const isCatalogUrl = url.includes("/catalog");

        while (hasNextPage && limit > 0) {
            limit--;
            const catalogUrl = `https://www.haitangsoshu.org/book/${bookId}/catalog/${page}.html`;

            try {
                let catalogHtml = html;
                if (page > 1 || !isCatalogUrl) { // Fetch if it's not the initial loaded HTML, or if it's info page
                    const res = await extensionFetch(catalogUrl);
                    if (!res || !res.html) {
                        hasNextPage = false;
                        break;
                    }
                    catalogHtml = res.html;
                }

                const catDoc = new DOMParser().parseFromString(catalogHtml, "text/html");

                // Hầu hết các thẻ liên kết được nén trong thẻ <a> class 'g'
                const chapterLinks = Array.from(catDoc.querySelectorAll("a.g, #catalogList a"));

                if (chapterLinks.length === 0) {
                    // Có khả năng cấu trúc mục lục trả về dạng raw DOM, dùng regex hỗ trợ
                    const jsMatches = catalogHtml.match(/gotochapter\('(\d+)','(\d+)'\)|readbook\('(\d+)','(\d+)'\)|gobook\('(\d+)','(\d+)'\)/g);
                    if (!jsMatches && chapterLinks.length === 0) {
                        hasNextPage = false;
                        break;
                    }
                }

                // Tìm toàn bộ thẻ a có liên quan
                for (const a of chapterLinks) {
                    const aHtml = (a as HTMLAnchorElement);
                    let href = aHtml.getAttribute("href") || "";
                    let chapId = "";

                    // Xử lý link bị mã hóa bằng JS
                    if (href.includes("javascript:")) {
                        const nums = href.match(/\d+/g);
                        if (nums && nums.length >= 2) {
                            chapId = nums[1]; // id của chương
                        }
                    } else {
                        const chapMatch = href.match(/\/book\/\d+\/(\d+)\.html/);
                        if (chapMatch) {
                            chapId = chapMatch[1];
                        }
                    }

                    if (chapId) {
                        chapters.push({
                            title: aHtml.textContent?.trim() || `Chương ${chapters.length + 1}`,
                            url: `https://www.haitangsoshu.org/book/${bookId}/${chapId}.html`,
                            order: chapters.length
                        });
                    }
                }

                // Cập nhật tiến trình cho UI
                onProgress?.(chapters.length);

                // Xác định trang tiếp theo
                const nextCatalogPage = Array.from(catDoc.querySelectorAll("a")).find(el => el.textContent?.includes("下一页"));
                if (!nextCatalogPage || catalogHtml.includes("没有下一页") || nextCatalogPage.getAttribute("href")?.includes("#")) {
                    hasNextPage = false;
                } else {
                    page++;
                }
            } catch (err) {
                console.error("Lỗi khi quét mục lục trang " + page, err);
                hasNextPage = false;
            }
        }

        // Đảo ngược danh sách nếu trang tự động hiển thị mới nhất trước
        if (chapters.length >= 2) {
            const order1 = parseInt(chapters[0].title.match(/\d+/)?.[0] || '1');
            const order2 = parseInt(chapters[chapters.length - 1].title.match(/\d+/)?.[0] || '999');
            if (order1 > order2) {
                chapters.reverse();
                chapters.forEach((c, idx) => c.order = idx);
            }
        }

        return { title, author, description, coverImage, chapters };
    },

    getChapterContent(html, url, contentText) {
        const doc = new DOMParser().parseFromString(html, "text/html");

        let title = doc.querySelector("#chapterTitle")?.textContent?.trim() || "";
        // Xóa hậu tố (1/3), (2/3) để Crawler có thể merge các phần của cùng một chương
        title = title.replace(/\(\d+\/\d+\)$/, "").trim();

        // Hệ thống chống crawl tạo div id lạ. Nội dung thực nằm ở div bao bọc các img class hz hoặc p
        let contentContainer = null;
        let fallbackText = "";

        // Quét tìm thẻ ảnh chống copy
        const imageAntiScraping = doc.querySelectorAll("img.hz");
        if (imageAntiScraping.length > 0) {
            contentContainer = imageAntiScraping[0].closest("div[id]");

            // Thay thế ảnh bị thiếu bằng placeholder [?] thay vì để chuỗi trống liền nhau
            // AI sẽ dịch mượt hơn nếu biết ở đó bị khuyết một từ.
            imageAntiScraping.forEach(img => {
                const span = doc.createElement("span");
                span.textContent = "[?]"; // Placeholder for OCR/AI mapping
                img.replaceWith(span);
            });
        }

        if (!contentContainer) {
            const firstP = doc.querySelector("p");
            if (firstP && firstP.parentElement) {
                contentContainer = firstP.parentElement;
            }
        }

        if (contentContainer) {
            // Làm sạch container
            contentContainer.querySelectorAll("script, style, a, .ads").forEach(el => el.remove());
            fallbackText = (contentContainer as HTMLElement).innerHTML
                .replace(/<(br|hr)\s*\/?>/gi, '\n')
                .replace(/<\/(p|div|section|article|li)>/gi, '\n')
                .replace(/<[^>]+>/g, '');
        }

        // Lấy link trang kế tiếp hoặc chương kế tiếp.
        let nextChapterUrl = "";

        // Nút bên phải: .RBGsectionTwo-right a hoặc tìm nút chứa "下一页"
        const nextBtn = Array.from(doc.querySelectorAll("a")).find(a =>
            a.textContent?.includes("下一页") || // Next Page (same chapter)
            a.textContent?.includes("下一章")    // Next Chapter
        );

        if (nextBtn) {
            const btnText = nextBtn.textContent?.trim();
            const href = nextBtn.getAttribute("href") || "";

            // Nếu là "下一页" (Next Page), chúng ta trả về liên kết này để Crawler gọi tự động tiếp.
            // Vì title không đổi (đã bị xóa số trang), Crawler sẽ merge nó vào chương hiện tại!
            if (btnText === "下一页" && href) {
                // href có thể dạng `/book/246892/18700986_2.html`
                nextChapterUrl = new URL(href, url).href;
            }
        }

        let rawText = contentText || fallbackText || "";

        let text = rawText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => {
                if (!line) return false;
                if (line.includes("haitangsoshu.org")) return false;
                return true;
            })
            .join("\n\n");

        text = cleanGarbageLines(text);

        return { title, content: text, nextChapterUrl };
    },
};
