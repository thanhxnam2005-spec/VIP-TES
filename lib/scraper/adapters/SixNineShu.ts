import type { SiteAdapter } from "../types";
import { extensionFetch } from "../extension-bridge";

export const SixNineShuAdapter: SiteAdapter = {
  name: "69书吧",
  group: "cn",
  urlPattern: /69shuba\.com|69shu\.me|69shu\.com/i,
  chapterWaitSelector: ".txtnav",

  async getNovelInfo(html, url) {
    let doc = new DOMParser().parseFromString(html, "text/html");
    let currentBase = new URL(url);

    // If we are on the book info page (.htm), we need to go to the chapter list page
    const isBookInfoPage = url.endsWith(".htm") || url.includes("/book/");
    const isChapterListPage = url.endsWith("/") && !url.includes("/txt/");

    if (!isChapterListPage) {
      // Find the "Mục lục đầy đủ" link
      const moreBtn = doc.querySelector("a.more-btn");
      if (moreBtn) {
        const indexUrl = new URL(moreBtn.getAttribute("href") || "", currentBase).href;
        const res = await extensionFetch(indexUrl);
        doc = new DOMParser().parseFromString(res.html, "text/html");
        currentBase = new URL(indexUrl);
      } else if (isBookInfoPage) {
        // Fallback: Try to derive index URL by removing .htm and ensuring trailing slash
        // https://www.69shuba.com/book/90442.htm -> https://www.69shuba.com/book/90442/
        const derivedUrl = url.replace(/\.htm$/, "") + "/";
        try {
          const res = await extensionFetch(derivedUrl);
          if (res && res.html) {
            doc = new DOMParser().parseFromString(res.html, "text/html");
            currentBase = new URL(derivedUrl);
          }
        } catch (e) {
          console.warn("Failed to fetch derived 69shu index URL", e);
        }
      }
    }

    const title = doc.querySelector("h1, .bookname h1")?.textContent?.trim() || "";
    const author = doc.querySelector(".booknav2 a[href*='author']")?.textContent?.trim() || "";
    
    const coverImg = doc.querySelector(".bookimg2 img, .bookimg img");
    const coverImage = coverImg ? new URL(coverImg.getAttribute("src") || "", currentBase).href : undefined;

    // Chapters are in <ul><li><a> - use a Map to deduplicate by URL
    const chapterLinks = doc.querySelectorAll("ul li a[href*='/txt/']");
    const seenUrls = new Set<string>();
    const chapters: any[] = [];
    
    Array.from(chapterLinks).forEach((a) => {
      const absUrl = new URL(a.getAttribute("href") || "", currentBase).href;
      if (seenUrls.has(absUrl)) return;
      seenUrls.add(absUrl);
      
      chapters.push({
        title: a.textContent?.trim() || `Chương ${chapters.length + 1}`,
        url: absUrl,
        order: chapters.length,
      });
    });

    return { title, author, chapters, coverImage };
  },

  getChapterContent(html, _url, contentText) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const chapterTitle = doc.querySelector("h1")?.textContent?.trim() || "";

    let text = contentText || "";
    if (!text) {
      const contentEl = doc.querySelector(".txtnav");
      if (contentEl) {
        const clone = contentEl.cloneNode(true) as HTMLElement;
        
        // Remove navigation, info, ads, scripts
        clone.querySelectorAll("h1, .txtinfo, #txtright, .contentadv, script, style, .bottom-ad").forEach((el) => el.remove());
        
        // Replace <br> with newlines
        clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
        
        text = clone.textContent || "";
      }
    }

    // Clean up
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/69书吧/g, "")
      .replace(/www\.69shuba\.com/g, "")
      .replace(/www\.69shu\.me/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { title: chapterTitle, content: text };
  },
};
