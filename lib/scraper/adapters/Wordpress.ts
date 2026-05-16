import type { SiteAdapter } from "../types";

export const WordpressAdapter: SiteAdapter = {
    name: "WordPress Blog",
    group: "vn",
    urlPattern: /\.wordpress\.com/i,

    async getNovelInfo(html, url) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const currentBase = new URL(url);

        // Title is usually h1
        const title = doc.querySelector("h1.entry-title, h1")?.textContent?.trim() || "Unknown Title";

        // Attempt to guess author from text (optional, difficult on WP)
        const author = "N/A";
        const description = "";

        // Find cover image 
        const coverEl = doc.querySelector(".entry-content img, figure.wp-block-image img");
        let coverImage = undefined;
        if (coverEl) {
            coverImage = new URL(coverEl.getAttribute("src") || "", currentBase).href;
        }

        // Chapters are usually lists of links in .entry-content
        // We filter out share links, comment links, etc.
        const chapterLinks = doc.querySelectorAll(".entry-content a");
        const chapters: { title: string, url: string, order: number }[] = [];

        let order = 0;
        chapterLinks.forEach((a) => {
            const chTitle = a.textContent?.trim() || "";
            const chUrlStr = a.getAttribute("href") || "";

            // Heuristic: Must have "chương", "tiết", "phần", "phiên ngoại", "ngoại truyện"
            // or MUST be a link within the same domain that's not a share/comment link.
            const lowerTitle = chTitle.toLowerCase();
            const isChapterText = /(chương|tiết|phần|quyển|ngoại truyện|phiên ngoại)/i.test(lowerTitle);

            let isSameHost = false;
            try {
                const u = new URL(chUrlStr, currentBase);
                isSameHost = u.hostname === currentBase.hostname;
            } catch (e) { }

            if (isChapterText && isSameHost) {
                const chUrl = new URL(chUrlStr, currentBase).href;

                // Prevent duplicate (some WP themes have duplicate links)
                if (!chapters.find(c => c.url === chUrl)) {
                    chapters.push({
                        title: chTitle,
                        url: chUrl,
                        order: order++,
                    });
                }
            }
        });

        if (chapters.length === 0) {
            chapters.push({
                title: "Toàn Văn (Trang hiện tại)",
                url: url,
                order: 0,
            });
        }

        return { title, author, description, coverImage, chapters };
    },

    getChapterContent(html, _url, contentText) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const chapterTitle = doc.querySelector("h1.entry-title, h1")?.textContent?.trim() || "";

        let text = "";
        const contentEl = doc.querySelector(".entry-content");

        if (contentEl) {
            const clone = contentEl.cloneNode(true) as HTMLElement;

            // Remove wordpress specific junk
            clone.querySelectorAll("script, style, .sharedaddy, .jp-relatedposts, #comments, .wpcnt, .comment-respond").forEach((el) => el.remove());
            // Remove any navigation links (Next/Prev) often placed inside entry-content
            clone.querySelectorAll("a").forEach(a => {
                const t = a.textContent?.toLowerCase() || "";
                if (t.includes("chương tiếp") || t.includes("chương trước") || t.includes("tiếp theo") || t.includes("mục lục")) {
                    a.remove();
                }
            });

            clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
            clone.querySelectorAll("p").forEach(p => {
                const pText = p.textContent?.trim();
                if (pText) {
                    p.replaceWith(`\n${pText}\n`);
                } else {
                    p.remove();
                }
            });

            text = clone.textContent || "";
        } else {
            text = contentText || "";
        }

        text = text.trim().replace(/\n\s*\n/g, "\n\n");

        return { title: chapterTitle, content: text };
    },
};
