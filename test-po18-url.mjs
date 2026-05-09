function generatePo18Url(href, baseUrl) {
    const fullUrl = new URL(href, baseUrl).toString();
    let cleanUrl = fullUrl.split("#")[0].split("?")[0];
    cleanUrl = cleanUrl.replace("/articles/", "/articlescontent/");
    return cleanUrl;
}

console.log(generatePo18Url("/books/887398/articles/12345", "https://www.po18.tw/books/887398/articles"));
console.log(generatePo18Url("https://www.po18.tw/books/887398/articles/12345", "https://www.po18.tw/books/887398/articles"));
