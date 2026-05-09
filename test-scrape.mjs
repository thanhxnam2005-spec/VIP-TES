const res = await fetch("http://localhost:3000/api/scrape", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "analyze", url: "https://welove-gourmet.com/book/130970" }),
});
console.log("Status:", res.status);
const data = await res.json();
console.log("Title:", data.title);
console.log("Author:", data.author);
console.log("Cover:", data.coverImage?.substring(0, 80));
console.log("Chapters:", data.chapters?.length);
data.chapters?.forEach((ch, i) => console.log(`  ${i+1}. ${ch.title} -> ${ch.url}`));
