import { cleanGarbageLines } from "../../text-utils";
import type { SiteAdapter } from "../types";
import { extensionFetch } from "../extension-bridge";

export const Novel543Adapter: SiteAdapter = {
  name: "Novel543",
  group: "cn",
  urlPattern: /novel543\.com/,
  useSequentialTab: false,

  async getNovelInfo(html, url, onProgress) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    let currentBase = new URL(url);

    // If we are on the main page, user should provide the /dir page or we try to extract what we can
    // The user mentioned cover image is on the main page:
    // <img src="https://i2.novel543.com/thumb/120x160/20260508/091259111977.jpg" alt="HP：布萊克夫人的世紀救贖">
    let title = "Unknown Title";
    let coverImgStr = "";

    // Try to get title from the cover image alt or h1
    const coverImgEl = doc.querySelector("img[src*='thumb'], .cover img, .book-img img, .novel-cover img") || doc.querySelector("img[alt]");
    if (coverImgEl && coverImgEl.getAttribute("alt")) {
      title = coverImgEl.getAttribute("alt") || title;
      coverImgStr = coverImgEl.getAttribute("src") || "";
    } else {
      title = doc.querySelector("h1")?.textContent?.trim() || doc.title.split("-")[0].trim() || title;
    }

    const coverImage = coverImgStr 
      ? `/api/proxy-image?url=${encodeURIComponent(new URL(coverImgStr, currentBase).toString())}`
      : undefined;

    // Helper to parse chapters
    const parseChapters = (targetDoc: Document, targetUrl: string) => {
      const urlMap = new Map<string, { title: string; url: string }>();

      // "danh sách chương chúng ta lấy ở dòng này <ul class="flex one two-700 three-900 all"><li><a rel="nofollow" href="/0401691119/8096_1.html">第1章 畫像的尖叫與初逢異世</a></li>"
      // Loại bỏ bộ chọn chung `a[href*='.html']` vì nó sẽ bắt luôn cả link quảng cáo!
      const links = Array.from(targetDoc.querySelectorAll("ul.flex a[href*='.html'], .chapter-list a, .dir-list a"));

      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (!href) return;

        const titleText = link.textContent?.trim() || "";
        if (titleText.length < 2) return;

        // BỘ LỌC NGHIÊM NGẶT: Phải chứa chữ "Chương" hoặc "第" hoặc ít nhất là có số.
        // Tránh tình trạng bắt nhầm link quảng cáo / truyện đề cử.
        if (!titleText.includes("章") && !titleText.includes("第") && !titleText.match(/\d/)) {
          return;
        }

        const fullUrl = new URL(href, targetUrl).toString();
        const cleanUrl = fullUrl.split("#")[0].split("?")[0];

        // Chỉ lấy những link cùng domain novel543.com để tránh click vào web ngoài
        if (!cleanUrl.includes("novel543.com")) return;

        // Delete first to preserve the LAST insertion order (so "Latest updates" dupes are moved to their correct position at the end)
        urlMap.delete(cleanUrl);
        urlMap.set(cleanUrl, { title: titleText, url: cleanUrl });
      });

      const chs = Array.from(urlMap.values());
      
      // Sắp xếp lại dựa trên số chương (nếu có) để đảm bảo chính xác tuyệt đối
      chs.sort((a, b) => {
        const matchA = a.title.match(/第(\d+)章/);
        const matchB = b.title.match(/第(\d+)章/);
        
        if (matchA && matchB) {
          return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
        }
        // Đẩy các link không có số chương xuống cuối cùng (đề phòng sót quảng cáo)
        if (matchA && !matchB) return -1;
        if (!matchA && matchB) return 1;
        
        return 0; // Giữ nguyên thứ tự
      });

      return chs.map((ch, idx) => ({ ...ch, order: idx }));
    };

    let chapters = parseChapters(doc, url);

    // Trang chính có thể chứa vài chương mới nhất (Latest Updates).
    // Phải luôn ưu tiên vào trang mục lục (/dir) để lấy danh sách đầy đủ nếu có nút Mục Lục.
    const tocLink = doc.querySelector("a[href$='/dir'], a[href*='dir']");
    if (tocLink && !url.endsWith("dir") && !url.endsWith("dir/")) {
      const href = tocLink.getAttribute("href")!;
      const tocUrl = new URL(href, currentBase).toString();
      try {
         const res = await extensionFetch(tocUrl);
         const tocDoc = new DOMParser().parseFromString(res.html, "text/html");
         const fullChapters = parseChapters(tocDoc, tocUrl);
         if (fullChapters.length > 0) {
           chapters = fullChapters;
         }
      } catch(e) {
         console.warn("Failed to fetch TOC", e);
      }
    }

    if (chapters.length === 0) {
      throw new Error("Không tìm thấy danh sách chương trên trang này.");
    }

    return {
      title,
      coverImage,
      chapters,
    };
  },

  getChapterContent(html, _url, contentText) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    // <div class="chapter-content px-3"><h1> 第1章 畫像的尖叫與初逢異世 (1/2) </h1><div class="content py-5" ...>
    let chapterTitle = doc.querySelector(".chapter-content h1, h1")?.textContent?.trim() || "";

    // Clean up pagination in title like (1/2)
    chapterTitle = chapterTitle.replace(/\(\d+\/\d+\)/g, "").trim();

    let rawText = "";

    // Extract from DOM
    const contentNode = doc.querySelector(".content, .chapter-content .content");
    if (contentNode) {
      const junkSelectors = ["script", "style", "iframe", ".ad", ".nav", ".footer", "ins", ".gadBlock", ".clickforceads", ".adBlock"];
      junkSelectors.forEach(sel => {
        contentNode.querySelectorAll(sel).forEach(el => el.remove());
      });
      
      let htmlContent = contentNode.innerHTML;
      htmlContent = htmlContent.replace(/<br\s*\/?>/gi, '\n');
      htmlContent = htmlContent.replace(/<p[^>]*>/gi, '\n');
      htmlContent = htmlContent.replace(/<\/p>/gi, '\n');
      
      const tempDiv = doc.createElement("div");
      tempDiv.innerHTML = htmlContent;
      rawText = tempDiv.textContent?.trim() || "";
    }

    if (!rawText && contentText) {
      rawText = contentText;
    }

    // Attempt to find Next Chapter URL for pagination
    let nextChapterUrl = "";
    const nextLinks = Array.from(doc.querySelectorAll("a[href]"));
    for (const link of nextLinks) {
      const text = link.textContent?.toLowerCase() || "";
      if (text.includes("下一頁") || text.includes("下一页") || text.includes("下一章")) {
         const href = link.getAttribute("href");
         if (href && !href.startsWith("javascript")) {
             nextChapterUrl = new URL(href, _url).toString();
             break;
         }
      }
    }

    return {
      title: chapterTitle,
      content: cleanGarbageLines(rawText),
      nextChapterUrl
    };
  },
};
