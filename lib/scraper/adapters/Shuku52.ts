import type { SiteAdapter } from "../types";

export const Shuku52Adapter: SiteAdapter = {
    name: "52书库",
    group: "cn",
    urlPattern: /52shuku\.net/i,

    async getNovelInfo(html, url) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const currentBase = new URL(url);

        // Title & Author inside h1 -> Title_Author
        let h1Text = doc.querySelector("h1")?.textContent?.trim() || "";
        // remove page "(X)"
        h1Text = h1Text.replace(/\(\d+\)$/, "").trim();
        // remove 【完结】
        h1Text = h1Text.replace(/【[^】]+】/g, "").trim();

        const parts = h1Text.split("_");
        const title = parts[0]?.trim() || "Unknown Title";
        const author = parts[1]?.trim() || "Unknown Author";
        const description = "";
        const coverImage = undefined;

        // Chapters list usually in ul.list.clearfix l.mulu a
        const chapterLinks = doc.querySelectorAll("ul.list.clearfix li.mulu a, .list li a");
        const chapters = Array.from(chapterLinks).map((a, i) => {
            let chTitle = a.textContent?.trim() || "";
            if (!chTitle) chTitle = `Trang ${i + 1}`;

            const chUrl = new URL(a.getAttribute("href") || "", currentBase).href;

            return {
                title: chTitle,
                url: chUrl,
                order: i,
            };
        });

        // Fallback: If no links, just add the current URL as the only chapter.
        if (chapters.length === 0) {
            chapters.push({
                title: "Full Text",
                url: url,
                order: 0
            });
        }

        return { title, author, description, coverImage, chapters };
    },

    getChapterContent(html, _url, contentText) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const chapterTitle = doc.querySelector("h1")?.textContent?.trim() || "";

        let text = "";
        const contentEl = doc.querySelector("#text, .book_con");

        if (contentEl) {
            const clone = contentEl.cloneNode(true) as HTMLElement;
            // remove ads and extra non-text blocks
            clone.querySelectorAll("script, style, iframe, .ads, .nr_set, .pagination2, .related_top, .contentmargin, a").forEach((el) => el.remove());

            clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
            clone.querySelectorAll("p").forEach((p) => {
                const pText = p.textContent?.trim();
                if (pText && !pText.includes("52书库") && !pText.includes("52shuku")) {
                    p.replaceWith(`\n${pText}\n`);
                } else {
                    p.remove();
                }
            });

            text = clone.textContent || "";
        } else {
            text = contentText || "";
        }

        text = text
            .trim()
            // Clean up common ads or extra spaces
            .replace(/\n\s*\n/g, "\n\n");

        return { title: chapterTitle, content: text };
    },
};
