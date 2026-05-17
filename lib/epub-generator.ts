import JSZip from "jszip";

export async function generateEpub(title: string, author: string, coverImageBase64: string | null, chapters: { title: string; content: string }[]): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder("META-INF")?.file("container.xml", containerXml);

  // 3. OEBPS folder
  const oebps = zip.folder("OEBPS");
  if (!oebps) throw new Error("Failed to create OEBPS folder");

  // Format content
  const formatContent = (text: string) => {
    return text.split('\n').map(p => p.trim()).filter(p => p.length > 0)
      .map(p => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
      .join("\n");
  };

  // Add Chapters
  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const navPoints: string[] = [];

  // Cover image handling
  let coverManifest = "";
  let coverMeta = "";
  if (coverImageBase64) {
    // Assuming base64 format: data:image/jpeg;base64,...
    const base64Data = coverImageBase64.split(",")[1] || coverImageBase64;
    const extMatch = coverImageBase64.match(/data:image\/([a-zA-Z]+);/);
    const ext = extMatch ? extMatch[1] : "jpeg";
    oebps.file(`cover.${ext}`, base64Data, { base64: true });
    coverManifest = `<item id="cover-image" href="cover.${ext}" media-type="image/${ext}"/>`;
    coverMeta = `<meta name="cover" content="cover-image"/>`;
  }

  chapters.forEach((ch, index) => {
    const chapterId = `chapter_${index + 1}`;
    const chapterFileName = `${chapterId}.xhtml`;
    const cleanTitle = ch.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${cleanTitle}</title>
  <style>
    body { font-family: sans-serif; line-height: 1.5; padding: 1em; margin: 0; }
    h2 { text-align: center; margin-bottom: 1em; font-weight: bold; }
    p { text-indent: 1.5em; margin-top: 0; margin-bottom: 0.5em; padding: 0; }
  </style>
</head>
<body>
  <h2>${cleanTitle}</h2>
  ${formatContent(ch.content)}
</body>
</html>`;

    oebps.file(chapterFileName, chapterHtml);

    manifestItems.push(`<item id="${chapterId}" href="${chapterFileName}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${chapterId}"/>`);
    navPoints.push(`
    <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
      <navLabel><text>${cleanTitle}</text></navLabel>
      <content src="${chapterFileName}"/>
    </navPoint>`);
  });

  // content.opf
  const cleanBookTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cleanAuthor = author.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${cleanBookTitle}</dc:title>
    <dc:creator opf:role="aut">${cleanAuthor}</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    ${coverMeta}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${coverManifest}
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
</package>`;
  oebps.file("content.opf", contentOpf);

  // toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${crypto.randomUUID()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${cleanBookTitle}</text></docTitle>
  <navMap>
    ${navPoints.join("\n")}
  </navMap>
</ncx>`;
  oebps.file("toc.ncx", tocNcx);

  // Generate blob
  return await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}
