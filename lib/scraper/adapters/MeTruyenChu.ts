import { SiteAdapter } from "../types";

export const MeTruyenChuAdapter: SiteAdapter = {
  name: "MeTruyenChu",
  host: "metruyenchu.com.vn",
  urlPattern: /metruyenchu\.com\.vn/,

  getNovelInfo(html, url) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    // Metadata theo Schema.org (Dựa trên bản JSON cấu hình)
    const coverEl = doc.querySelector("img[itemprop='image']");
    const title = coverEl?.getAttribute("alt")?.trim() || 
                  doc.querySelector('h1.title, h3.title')?.textContent?.trim() || "Unknown Title";
    
    const author = doc.querySelector("[itemprop='author']")?.textContent?.trim() || 
                   doc.querySelector(".info a[href*='/tac-gia/']")?.textContent?.trim() || "Unknown Author";
    
    const cover = coverEl?.getAttribute("src") || "";
    const description = doc.querySelector('.desc-text, [itemprop="description"], #tab-overview .content')?.innerHTML?.trim() || "";

    // Extract chapters - Sử dụng selector từ bản JSON
    const chapterSelectors = [
      '.list-chapter li a',
      '.chapter-list a',
      '#list-chapter li a'
    ];
    
    let links: Element[] = [];
    for (const selector of chapterSelectors) {
      const found = Array.from(doc.querySelectorAll(selector));
      if (found.length > 0) {
        links = found;
        break;
      }
    }

    // Fallback: Tìm các link chương có số thứ tự
    if (links.length === 0) {
      links = Array.from(doc.querySelectorAll('a')).filter(a => 
        /chương|chapter|quyển|tập|ch\s*\d+|\d+[\s.:|-]/i.test(a.textContent || "")
      );
    }

    const chapters = links.map((node, index) => ({
      title: node.textContent?.trim() || `Chương ${index + 1}`,
      url: new URL(node.getAttribute('href')!, url).toString(),
      order: index
    }));

    return {
      title,
      author,
      coverImage: cover ? new URL(cover, url).toString() : undefined,
      description,
      chapters
    };
  },

  getChapterContent(html, _url, contentText) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const chapterTitle = doc.querySelector(".chapter-title, h2, h3")?.textContent?.trim() || "";
    
    // Ưu tiên contentText từ Extension (Stealth Mode)
    if (contentText) {
      return { title: chapterTitle, content: contentText };
    }

    // Selector chính xác từ cấu hình: #vungdoc
    const contentNode = doc.querySelector('#vungdoc, .chapter-c, #chapter-c'); 
    if (!contentNode) return { title: chapterTitle, content: "" };

    // --- LÀM SẠCH QUẢNG CÁO VÀ RÁC (Dựa trên mảng cleanup trong JSON) ---
    const junkSelectors = [
      'script', 'noscript', 'style', 'iframe', 
      '.fb-like', '.fb-save', '.fb_iframe_widget',
      '[data-testid]', '.chapter-nav', '.adsbygoogle',
      '.box-notice', 'div[style*="visibility: visible; width: 0px; height: 0px"]'
    ];

    junkSelectors.forEach(selector => {
      contentNode.querySelectorAll(selector).forEach(el => el.remove());
    });

    return {
      title: chapterTitle,
      content: contentNode.innerText.trim(),
    };
  }
};
