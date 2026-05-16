const extractChapterNumber = (titleText) => {
    const matchA = titleText.match(/第(\d+)章/);
    if (matchA) return parseInt(matchA[1], 10);

    const matchZh = titleText.match(/第([零一二三四五六七八九十百千]+)章/);
    if (matchZh) {
        const cnNums = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000 };
        let res = 0; let tmp = 0;
        for (let i = 0; i < matchZh[1].length; i++) {
            const val = cnNums[matchZh[1][i]] || 0;
            if (val === 10 || val === 100 || val === 1000) {
                if (tmp === 0) tmp = 1;
                res += tmp * val;
                tmp = 0;
            } else {
                tmp = val;
            }
        }
        res += tmp;
        return res;
    }
    return null;
};

const chs = [
    { title: "第一章 蘇醒", url: "1" },
    { title: "第二章 我嘲個系統啊", url: "2" },
    { title: "第19章 消費消費", url: "19" },
    { title: "第30章 實驗【生命工筆】", url: "30" }
];

chs.sort((a, b) => {
    const chA = extractChapterNumber(a.title) ?? Infinity;
    const chB = extractChapterNumber(b.title) ?? Infinity;
    if (chA !== chB) return chA - chB;

    const partA = a.title.match(/\((\d+)\/\d+\)/);
    const partB = b.title.match(/\((\d+)\/\d+\)/);
    const pA = partA ? parseInt(partA[1], 10) : 1;
    const pB = partB ? parseInt(partB[1], 10) : 1;
    return pA - pB;
});

console.log("Sorted:", chs);

const merged = [];
const seenChapterNums = new Set();
const seenRawTitles = new Set();

for (const ch of chs) {
    const chNum = extractChapterNumber(ch.title);
    const partMatch = ch.title.match(/\((\d+)\/(\d+)\)/);

    if (partMatch) {
        const partNum = parseInt(partMatch[1], 10);
        if (partNum === 1) {
            const cleanTitle = ch.title.replace(/\s*\(\d+\/\d+\)/, "").trim();
            merged.push({ title: cleanTitle, url: ch.url, order: merged.length });
            if (chNum !== null) seenChapterNums.add(chNum);
            seenRawTitles.add(cleanTitle);
        }
    } else {
        // No split marker
        if ((chNum !== null && !seenChapterNums.has(chNum)) || (chNum === null && !seenRawTitles.has(ch.title))) {
            merged.push({ title: ch.title, url: ch.url, order: merged.length });
            if (chNum !== null) seenChapterNums.add(chNum);
            seenRawTitles.add(ch.title);
        }
    }
}

console.log("Merged:", merged);
