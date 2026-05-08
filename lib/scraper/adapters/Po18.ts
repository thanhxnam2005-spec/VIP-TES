import { SiteAdapter } from "../types";

export const Po18Adapter: SiteAdapter = {
  name: "Po18",
  urlPattern: /po18\.tw/,

  getNovelInfo(html, url) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    const title = doc.querySelector("h1.book_name, h1")?.textContent?.trim() || "Unknown Title";
    const author = doc.querySelector(".book_author, .author, a[href*='/author/']")?.textContent?.trim() || "Unknown Author";
    const coverImage = doc.querySelector(".book_cover img, img.book_cover")?.getAttribute("src") || undefined;
    const description = doc.querySelector(".book_intro, .book_desc, .intro")?.textContent?.trim() || "";

    const chapters: { title: string; url: string; order: number }[] = [];
    const seenUrls = new Set<string>();

    // PO18 chapter links are typically found under /books/[id]/articles/[article_id]
    // The actual link to read is often an <a> with href containing "/articles/"
    const links = Array.from(doc.querySelectorAll("a[href*='/articles/']"));

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      
      // Skip non-reading links (like comments)
      if (href.includes("comments") || href.includes("rewards")) return;

      let titleText = link.textContent?.trim();

      // On PO18, the link to read might just say "閱讀" (Read) or "訂購" (Buy/Order)
      // The actual title is often in a sibling or parent element with class .l_chaptname
      if (!titleText || titleText.includes("閱讀") || titleText.includes("訂購") || titleText === "") {
        const row = link.closest("div, li, tr");
        if (row) {
          const nameEl = row.querySelector(".l_chaptname, .chapter_name");
          if (nameEl && nameEl.textContent) {
            titleText = nameEl.textContent.trim();
          }
        }
      }

      // If we still don't have a good title, use a generic one
      if (!titleText || titleText.includes("閱讀") || titleText.includes("訂購")) {
        titleText = `Chương ${chapters.length + 1}`;
      }

      const fullUrl = new URL(href, url).toString();

      // Avoid duplicates and self-referencing links
      const cleanUrl = fullUrl.split("#")[0].split("?")[0];
      if (!seenUrls.has(cleanUrl)) {
        chapters.push({
          title: titleText,
          url: cleanUrl,
          order: chapters.length,
        });
        seenUrls.add(cleanUrl);
      }
    });

    return {
      title,
      author,
      coverImage: coverImage ? new URL(coverImage, url).toString() : undefined,
      description,
      chapters,
    };
  },

  getChapterContent(html, _url, contentText) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const chapterTitle = doc.querySelector("h1, h2, .l_chaptname")?.textContent?.trim() || "";

    // Extension stealth mode usually provides text directly
    if (contentText) {
      return { title: chapterTitle, content: contentText };
    }

    // Typical PO18 content container
    const contentNode = doc.querySelector(".article-content, #article_content, .b_content, #b_content");
    if (!contentNode) return { title: chapterTitle, content: "" };

    // Remove hidden/garbage elements
    const junkSelectors = ["script", "style", "iframe", ".watermark", ".hidden"];
    junkSelectors.forEach(sel => {
      contentNode.querySelectorAll(sel).forEach(el => el.remove());
    });

    return {
      title: chapterTitle,
      content: (contentNode as HTMLElement).innerText.trim(),
    };
  },
};
