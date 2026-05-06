import type { SiteAdapter } from "../types";

export const FanqieAdapter: SiteAdapter = {
  name: "番茄小说 (Fanqie)",
  group: "cn",
  urlPattern: /fanqienovel\.com/i,
  chapterWaitSelector: ".muye-reader-content",

  async getNovelInfo(html, url) {
    let doc = new DOMParser().parseFromString(html, "text/html");
    let currentBase = new URL(url);

    // Lấy tên truyện
    const title = doc.querySelector("h1, .info-name")?.textContent?.trim() || doc.title.split("-")[0].trim();
    // Lấy tác giả
    const author = doc.querySelector(".author-name, .info-author")?.textContent?.trim() || "";
    
    // Lấy ảnh bìa
    const coverImg = doc.querySelector(".book-cover-img");
    const coverImage = coverImg ? new URL(coverImg.getAttribute("src") || "", currentBase).href : undefined;

    // Lấy danh sách chương
    const chapters: any[] = [];
    const chapterLinks = doc.querySelectorAll(".chapter-item a, a.chapter-item-title");
    
    Array.from(chapterLinks).forEach((a) => {
      const absUrl = new URL(a.getAttribute("href") || "", currentBase).href;
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
    const chapterTitle = doc.querySelector("h1, .title")?.textContent?.trim() || "";

    let text = "";
    const contentEl = doc.querySelector(".muye-reader-content");
    
    if (contentEl) {
      const clone = contentEl.cloneNode(true) as HTMLElement;
      
      // Xóa các script, quảng cáo nếu có
      clone.querySelectorAll("script, style, .bottom-ad").forEach((el) => el.remove());
      
      // Đổi thẻ p và br thành xuống dòng
      clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      clone.querySelectorAll("p").forEach((p) => p.insertAdjacentText("afterend", "\n\n"));
      
      text = clone.textContent || "";
    } else {
      text = contentText || "";
    }

    text = text.replace(/\n{3,}/g, "\n\n").trim();

    return { title: chapterTitle, content: text };
  },
};
