import { SiteAdapter, NovelInfo, ChapterContent } from "../types";

export const ZhihuAdapter: SiteAdapter = {
  name: "Zhihu (Text)",
  urlPattern: /zhihu\.com\/(question|p|market\/paid_column)\//,

  async getNovelInfo(html: string, url: string): Promise<NovelInfo> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Lấy tiêu đề bài viết
    let title = "Zhihu Story";
    const titleEl = doc.querySelector("h1.QuestionHeader-title, h1.Post-Title, .ManuscriptTitle, .SectionTitle, .Title");
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    } else {
      const docTitle = doc.querySelector("title");
      if (docTitle && docTitle.textContent) {
        title = docTitle.textContent.replace("- 知乎", "").trim();
      }
    }

    // Lấy tên tác giả (nếu có)
    let author = "Zhihu User";
    const authorEl = doc.querySelector(".AuthorInfo-name .UserLink-link, .AuthorInfo-name");
    if (authorEl && authorEl.textContent) {
      author = authorEl.textContent.trim();
    }

    return {
      title: title,
      author: author,
      description: "Truyện ngắn Zhihu tải về dưới dạng text. URL: " + url,
      coverImage: "https://pic4.zhimg.com/v2-8dcb480eec920b7a950153835694cbf3_xl.jpg", // Zhihu logo placeholder
      chapters: [
        {
          title: "Toàn bộ bài viết",
          url: url,
          order: 0,
        }
      ],
    };
  },

  async getChapterContent(html: string): Promise<ChapterContent> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Nội dung chính thường nằm trong .RichText
    const contentEl = doc.querySelector(".RichText.ztext, .Post-RichText, .ManuscriptItem-content, .Section-content, .Post-RichTextContainer");
    
    let textContent = "";

    if (contentEl) {
      // Trích xuất các đoạn văn (p) và xuống dòng
      const paragraphs = contentEl.querySelectorAll("p");
      if (paragraphs.length > 0) {
        paragraphs.forEach(p => {
          const text = p.textContent?.trim();
          if (text) {
            textContent += text + "\n\n";
          }
        });
      } else {
        // Fallback nếu không có thẻ p (hiếm)
        textContent = contentEl.textContent?.trim() || "Nội dung rỗng";
      }
    } else {
      // Fallback: Tìm thẻ div có nhiều thẻ p nhất
      const allDivs = doc.querySelectorAll("div");
      let maxPCount = 0;
      let bestDiv: Element | null = null;
      allDivs.forEach(div => {
        const pCount = div.querySelectorAll("p").length;
        if (pCount > maxPCount) {
          maxPCount = pCount;
          bestDiv = div;
        }
      });

      if (bestDiv && maxPCount > 0) {
        const paragraphs = bestDiv.querySelectorAll("p");
        paragraphs.forEach(p => {
          const text = p.textContent?.trim();
          if (text) {
            textContent += text + "\n\n";
          }
        });
      } else {
        return { content: "Không tìm thấy nội dung bài viết Zhihu.", title: "Toàn bộ bài viết" };
      }
    }

    return {
      title: "Toàn bộ bài viết",
      content: textContent.trim(),
    };
  },
};
