import { cleanGarbageLines } from "../../text-utils";
import type { SiteAdapter } from "../types";

export const FanqieAdapter: SiteAdapter = {
  name: "Fanqie Novel",
  group: "cn",
  urlPattern: /fanqienovel\.com/i,
  chapterWaitSelector: ".muye-reader-content",
  minDelayMs: 11000,
  useSequentialTab: true,

  async getNovelInfo(html, url, onProgress) {
    let doc = new DOMParser().parseFromString(html, "text/html");
    let currentBase = new URL(url);

    const title = doc.querySelector("h1, .info-name")?.textContent?.trim() || doc.title.split("-")[0].trim();
    const author = doc.querySelector(".author-name, .info-author")?.textContent?.trim() || "";
    const description = doc.querySelector(".abstract, .info-desc")?.textContent?.trim() || "";
    
    const coverImg = doc.querySelector(".book-cover-img");
    const coverImage = coverImg ? new URL(coverImg.getAttribute("src") || "", currentBase).href : undefined;

    let chapters = Array.from(doc.querySelectorAll(".chapter-item-title"))
      .filter(el => !(el.textContent?.trim() || "").includes("最近更新"))
      .map((el, index) => {
      const title = el.textContent?.trim() || `Chapter ${index + 1}`;
      const href = el.getAttribute("href");
      return {
        id: href || `chapter-${index}`,
        title: title,
        url: href ? new URL(href, currentBase).toString() : url,
        order: index,
        hasHref: !!href
      };
    }).filter(c => c.hasHref).map(c => ({
      id: c.id,
      title: c.title,
      url: c.url,
      order: c.order
    }));

    if (chapters.length === 0) {
      chapters = [
        {
          id: "fanqie-init",
          title: "Bắt đầu từ chương hiện tại",
          url: url,
          order: 0,
        }
      ];
    }

    return { title, author, description, chapters, coverImage };
  },

  getChapterContent(html, _url, contentText) {
    // ── Get chapter title ──
    let chapterTitle = "";
    if (html && html.length > 100) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      chapterTitle = doc.querySelector("h1, .title, .reader-header-title, .muye-reader-title")?.textContent?.trim() || "";
    }
    if (!chapterTitle && contentText) {
      // Try to extract title from first line of contentText
      const firstLine = contentText.split('\n')[0]?.trim();
      if (firstLine && firstLine.length < 100) {
        chapterTitle = firstLine;
      }
    }

    // ── Get chapter content ──
    // Priority: contentText from extension (live DOM extraction) > HTML parsing
    let text = "";
    
    if (contentText && contentText.length > 100) {
      // Use contentText directly — it's already extracted from the live DOM by content script
      // This bypasses PUA font issues since the content script reads innerText/textContent
      text = contentText;
      console.log("[Fanqie] Using contentText from extension, length:", text.length);
    } else if (html && html.length > 100) {
      // Fallback: parse HTML
      const doc = new DOMParser().parseFromString(html, "text/html");
      const contentEl = doc.querySelector(".muye-reader-content, .article-content, #content");
      
      if (contentEl) {
        const junkSelectors = ["script", "style", ".bottom-ad", "iframe", ".nav", ".footer"];
        junkSelectors.forEach(sel => {
          contentEl.querySelectorAll(sel).forEach(el => el.remove());
        });
        
        let htmlContent = contentEl.innerHTML;
        htmlContent = htmlContent.replace(/<br\s*\/?>/gi, '\n');
        htmlContent = htmlContent.replace(/<p[^>]*>/gi, '\n');
        htmlContent = htmlContent.replace(/<\/p>/gi, '\n');
        
        const tempDiv = doc.createElement("div");
        tempDiv.innerHTML = htmlContent;
        text = tempDiv.textContent?.trim() || "";
      }
    }

    if (!text) {
      return { title: chapterTitle, content: "" };
    }

    // ── Clean up text ──
    // Don't strip ALL PUA chars — the static mapping is unreliable and gets stale.
    // Instead, just clean up obvious formatting issues.
    const lines = text.split('\n');
    const cleanedLines = lines
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => line.length > 0);
    text = cleanedLines.join('\n\n');

    text = text.replace(/ +/g, ' ');
    text = cleanGarbageLines(text);

    // Attempt to find Next Chapter URL from HTML
    let nextChapterUrl = "";
    if (html && html.length > 100) {
      try {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const nextLinks = Array.from(doc.querySelectorAll("a[href]"));
        for (const link of nextLinks) {
          const t = link.textContent?.trim() || "";
          if (t.includes("下一章") || t.includes("下一页") || t.includes("next")) {
            const href = link.getAttribute("href");
            if (href && !href.startsWith("javascript")) {
              nextChapterUrl = new URL(href, _url).toString();
              break;
            }
          }
        }
      } catch {}
    }

    return { title: chapterTitle, content: text, nextChapterUrl };
  },
};
