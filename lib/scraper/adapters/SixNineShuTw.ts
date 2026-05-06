import type { SiteAdapter } from "../types";
import { extensionFetch } from "../extension-bridge";

export const SixNineShuTwAdapter: SiteAdapter = {
  name: "69书吧 (TW)",
  group: "cn",
  urlPattern: /69shuba\.tw/i,
  chapterWaitSelector: ".txtnav, .nr_nr, #nr1",

  async getNovelInfo(html, url) {
    let doc = new DOMParser().parseFromString(html, "text/html");
    let currentBase = new URL(url);

    // Get basic info from the current page (book info page or first index page)
    const title = doc.querySelector("h1, .bookname h1, .book-title, .bookinfo h1")?.textContent?.trim() || "";
    const author = doc.querySelector(".booknav2 a[href*='author'], .author a, .bookinfo .author")?.textContent?.trim() || "";
    const coverImg = doc.querySelector(".bookimg2 img, .bookimg img, .book-cover img, .imgbox img, img[src*='p.69shuba']");
    const coverImage = coverImg ? new URL(coverImg.getAttribute("src") || "", currentBase).href : undefined;

    // Determine the first index page URL
    let indexUrl = url;
    const indexLink = doc.querySelector("a.more-btn, a[href^='/indexlist/']");
    if (indexLink && !url.includes("/indexlist/")) {
      indexUrl = new URL(indexLink.getAttribute("href") || "", currentBase).href;
    } else if (url.endsWith(".htm")) {
      indexUrl = url.replace(/\.htm$/, "") + "/";
    }

    if (indexUrl !== url) {
      try {
        const res = await extensionFetch(indexUrl);
        doc = new DOMParser().parseFromString(res.html, "text/html");
        currentBase = new URL(indexUrl);
      } catch (e) {
        console.warn("Failed to fetch 69shu tw index URL", e);
      }
    }

    // Now we are on the first index page.
    const chapters: any[] = [];
    const seenUrls = new Set<string>();

    const extractChaptersFromDoc = (d: Document, base: URL) => {
      const chapterLinks = d.querySelectorAll("ul li a[href*='/txt/'], ul li a[href*='/read/']");
      Array.from(chapterLinks).forEach((a) => {
        const absUrl = new URL(a.getAttribute("href") || "", base).href;
        if (seenUrls.has(absUrl)) return;
        seenUrls.add(absUrl);
        chapters.push({
          title: a.textContent?.trim() || `Chương ${chapters.length + 1}`,
          url: absUrl,
          order: chapters.length,
        });
      });
    };

    extractChaptersFromDoc(doc, currentBase);

    // Check if there is pagination (e.g., 69shuba.tw indexlist)
    const selectOptions = doc.querySelectorAll("select#indexselect-top option");
    if (selectOptions.length > 1) {
      for (let i = 0; i < selectOptions.length; i++) {
        const opt = selectOptions[i] as HTMLOptionElement;
        const pageUrl = new URL(opt.getAttribute("value") || "", currentBase).href;
        if (pageUrl !== currentBase.href) {
          try {
            const res = await extensionFetch(pageUrl);
            const pageDoc = new DOMParser().parseFromString(res.html, "text/html");
            extractChaptersFromDoc(pageDoc, new URL(pageUrl));
          } catch (e) {
            console.warn("Failed to fetch paginated index", pageUrl, e);
          }
        }
      }
    }

    return { title, author, chapters, coverImage };
  },

  getChapterContent(html, _url, contentText) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const chapterTitle = doc.querySelector("h1")?.textContent?.trim() || "";

    let text = "";
    const contentEl = doc.querySelector(".txtnav") || doc.querySelector("#nr1") || doc.querySelector(".nr_nr");
    
    if (contentEl) {
      const clone = contentEl.cloneNode(true) as HTMLElement;
      
      // Remove navigation, info, ads, scripts
      clone.querySelectorAll("h1, .txtinfo, #txtright, .contentadv, script, style, .bottom-ad, .reader-ad, .ad").forEach((el) => el.remove());
      
      // Replace <br> and <p> with newlines
      clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      clone.querySelectorAll("p").forEach((p) => p.insertAdjacentText("afterend", "\n\n"));
      
      text = clone.textContent || "";
    } else {
      text = contentText || "";
    }

    // Clean up
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/69书吧/g, "")
      .replace(/69shuba/ig, "")
      .replace(/www\.69shuba\.tw/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { title: chapterTitle, content: text };
  },
};
