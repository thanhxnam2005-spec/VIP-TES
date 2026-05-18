import { cleanGarbageLines } from "../../text-utils";
import type { SiteAdapter, ChapterLink } from "../types";

/**
 * Adapter for TruyenMo.com
 *
 * Anti-scraping mechanism:
 *   - Common words are replaced with empty <span> tags with random class names
 *   - A <style> block injects CSS rules like `.randomClass:before { content: "word"; }`
 *   - We decode this by parsing the style block and rebuilding the text
 *
 * Chapter list is displayed newest-first, so we reverse the order.
 * Paywall is client-side only — full content is always in the HTML.
 */
export const TruyenMoAdapter: SiteAdapter = {
    name: "TruyenMo",
    group: "vn",
    urlPattern: /truyenmo\.com/,

    async getNovelInfo(html, url, onProgress) {
        const doc = new DOMParser().parseFromString(html, "text/html");

        // --- Basic info ---
        const title =
            doc.querySelector("h1")?.textContent?.trim() ||
            doc.querySelector(".page-comics-detail h1")?.textContent?.trim() ||
            "";

        const author =
            doc.querySelector('a[href*="/tac-gia/"]')?.textContent?.trim() ||
            "Đang cập nhật";

        const coverImage =
            doc.querySelector(".page-comics-detail .img-fluid")?.getAttribute("src") ||
            doc.querySelector('img[alt*="' + title.substring(0, 20) + '"]')?.getAttribute("src") ||
            "";

        const descEl = doc.querySelector(".card .text-justify, .summary-content, .description");
        const description = descEl?.textContent?.trim() || "";

        // --- Chapter list ---
        // Chapters are inside div.list-chapters > div.item > div.episode-title > a
        const chapterEls = doc.querySelectorAll(".list-chapters .item .episode-title a");
        const chapters: ChapterLink[] = [];

        chapterEls.forEach((el) => {
            const a = el as HTMLAnchorElement;
            const href = a.getAttribute("href") || "";
            const chTitle = a.textContent?.trim() || "";
            if (href && chTitle) {
                const fullUrl = href.startsWith("http") ? href : new URL(href, url).href;
                chapters.push({ title: chTitle, url: fullUrl, order: 0 });
            }
        });

        // Chapters are newest-first on the page, reverse to get correct order
        chapters.reverse();
        chapters.forEach((ch, i) => (ch.order = i));

        onProgress?.(chapters.length);
        console.log(`TruyenMo: Found ${chapters.length} chapters for "${title}"`);

        return { title, author, description, coverImage, chapters };
    },

    getChapterContent(html, _url, contentText) {
        const doc = new DOMParser().parseFromString(html, "text/html");

        // --- Decode CSS pseudo-element obfuscation ---
        // Parse all <style> blocks to find .randomClass:before { content: "word"; }
        const cssMap = new Map<string, string>();
        const styleBlocks = doc.querySelectorAll("style");
        const cssRegex = /\.([a-zA-Z0-9_-]+)\s*:\s*before\s*\{\s*content\s*:\s*"([^"]*)"\s*;?\s*\}/g;

        styleBlocks.forEach((style) => {
            const text = style.textContent || "";
            let match;
            while ((match = cssRegex.exec(text)) !== null) {
                cssMap.set(match[1], match[2]);
            }
        });

        // --- Extract content ---
        const container =
            doc.querySelector("#chapter-content-render") ||
            doc.querySelector(".chapter-content") ||
            doc.querySelector(".content-container");

        if (!container && !contentText) return { title: "", content: "" };

        // Chapter title from hidden input or heading
        const title =
            (doc.querySelector('input[name="chapter_title"]') as HTMLInputElement)?.value?.trim() ||
            doc.querySelector(".chapter-title h2")?.textContent?.trim() ||
            "";

        // If we have contentText from extension bridge (innerText), it already includes
        // the pseudo-element content rendered by the browser → use it directly
        if (contentText && contentText.trim().length > 100) {
            let text = contentText
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => {
                    if (!line) return false;
                    if (line.includes("truyenmo.com")) return false;
                    if (line.includes("Shopee")) return false;
                    if (line.includes("Bấm vào")) return false;
                    return true;
                })
                .join("\n\n");

            text = cleanGarbageLines(text);
            return { title, content: text };
        }

        // Otherwise, decode from HTML + CSS map
        if (container) {
            // Replace obfuscated spans with their decoded text
            if (cssMap.size > 0) {
                container.querySelectorAll("span").forEach((span) => {
                    const classes = span.className.split(/\s+/);
                    for (const cls of classes) {
                        if (cssMap.has(cls)) {
                            span.textContent = cssMap.get(cls)!;
                            break;
                        }
                    }
                });
            }

            // Remove ad/paywall elements
            container
                .querySelectorAll(".affClick, script, style, .ads, .quangcao, ins, .adsbygoogle")
                .forEach((el) => el.remove());

            // Get the actual content div (may be inside .affActive)
            const contentDiv =
                container.querySelector(".affActive") || container;

            let rawHtml = (contentDiv as HTMLElement).innerHTML || "";

            // Convert HTML to text
            let rawText = rawHtml
                .replace(/<(br|hr)\s*\/?>/gi, "\n")
                .replace(/<\/(p|div|section)\s*>/gi, "\n")
                .replace(/<[^>]+>/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");

            let text = rawText
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => {
                    if (!line) return false;
                    if (line.includes("truyenmo.com")) return false;
                    if (line.includes("Shopee")) return false;
                    if (line.includes("Bấm vào")) return false;
                    if (line.includes("quảng cáo")) return false;
                    return true;
                })
                .join("\n\n");

            text = cleanGarbageLines(text);
            return { title, content: text };
        }

        return { title, content: "" };
    },
};
