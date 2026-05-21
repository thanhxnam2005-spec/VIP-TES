/**
 * Clean up Vietnamese text:
 * - Replace multiple spaces with a single space.
 * - Fix spacing around punctuation.
 * - Trim lines.
 */
export function cleanVietnameseText(text: string): string {
  if (!text) return "";

  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=[a-zA-Z\u00C0-\u1EF9])/g, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

// ── Vietnamese phonotactic helpers ──────────────────────────

const VIET_LETTER_RE =
  /^[a-zA-ZđĐàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]$/;

function isSingleVietnameseLetter(token: string): boolean {
  return token.length === 1 && VIET_LETTER_RE.test(token);
}

/** Vietnamese consonant letters (lowercase) */
const CONSONANTS = new Set("bcdfghjklmnpqrstvwxzđ".split(""));

/** Valid 2-letter initial consonant clusters */
const VALID_INITIALS = new Set([
  "ch", "gh", "gi", "kh", "ng", "nh", "ph", "qu", "th", "tr",
]);

/** Valid Vietnamese syllable-final consonant clusters */
const VALID_FINALS = new Set([
  "c", "ch", "m", "n", "ng", "nh", "p", "t",
]);

// ── Foreign word dictionary ─────────────────────────────────
// STV often splits foreign words: "In te r net" → "Internet"
const FOREIGN_WORDS: Record<string, string> = {
  "in te r net": "Internet",
  "in ter net": "Internet",
  "inter net": "Internet",
  "we b site": "website",
  "web site": "website",
  "fa ce book": "Facebook",
  "face book": "Facebook",
  "goo gle": "Google",
  "you tu be": "YouTube",
  "you tube": "YouTube",
  "twit ter": "Twitter",
  "ti k to k": "TikTok",
  "tik tok": "TikTok",
  "wec hat": "WeChat",
  "we chat": "WeChat",
  "qq": "QQ",
  "bi li bi li": "Bilibili",
  "bi li": "Bilibili",
};

function fixForeignWords(text: string): string {
  let result = text;
  for (const [split, correct] of Object.entries(FOREIGN_WORDS)) {
    // Case-insensitive replacement, preserving word boundaries
    const regex = new RegExp(split.replace(/ /g, "\\s+"), "gi");
    result = result.replace(regex, correct);
  }
  return result;
}

/**
 * Merge Vietnamese syllables that were split apart by the STV API.
 *
 * STV sometimes returns "t rắn g" instead of "trắng".
 * This uses phonotactic rules to decide merge direction:
 *
 * 1. If single consonant + next token forms a valid initial (tr, ph, ch…) → merge RIGHT
 * 2. If prev's last char(s) + this letter forms a valid final (ng, nh…) → merge LEFT
 * 3. If next starts with vowel AND prev doesn't claim this as a final → merge RIGHT
 * 4. Default → merge LEFT (treat as final consonant)
 */
function mergeSplitSyllables(text: string): string {
  // Pre-process: separate punctuation from letters so "g," becomes "g ,"
  const separated = text.replace(
    /([a-zA-ZđĐ\u00C0-\u1EF9])([,.!?;:"""''…。，！？])/g,
    "$1 $2",
  );

  return separated
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;

      const tokens = line.split(" ");
      const merged: string[] = [];

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (!isSingleVietnameseLetter(token)) {
          merged.push(token);
          continue;
        }

        // It's a single Vietnamese letter — decide direction
        const lower = token.toLowerCase();
        const isConsonant = CONSONANTS.has(lower);
        const next = i + 1 < tokens.length ? tokens[i + 1] : undefined;
        const prevIdx = merged.length - 1;
        const prevToken = prevIdx >= 0 ? merged[prevIdx] : "";
        const prevLast = prevToken[prevToken.length - 1]?.toLowerCase() ?? "";

        if (isConsonant && next) {
          const nextFirst = next[0]?.toLowerCase() ?? "";
          const pair = lower + nextFirst;

          // Rule 1: valid initial cluster → merge RIGHT
          // Exception: "gh" is only valid before e, ê, i, y
          const GH_VOWELS = /^[eêéèẻẽẹếềểễệiíìỉĩịyýỳỷỹỵ]/i;
          if (VALID_INITIALS.has(pair) && !(pair === "gh" && !GH_VOWELS.test(next.slice(1)))) {
            // But first check: would this letter be a better final for prev?
            const finalCluster = prevLast + lower;
            if (prevToken && VALID_FINALS.has(finalCluster) &&
              /[aăâeêioôơuưyàáảãạắằẳẵặấầẩẫậèéẻẽẹếềểễệìíỉĩịòóỏõọốồổỗộớờởỡợùúủũụứừửữựỳýỷỹỵ]/i.test(prevToken)) {
              // prev wants this as a final AND pair is valid initial → prefer final
              merged[prevIdx] = prevToken + token;
              continue;
            }
            tokens[i + 1] = token + next;
            continue;
          }

          // Rule 2: forms a valid final with prev → merge LEFT
          const finalCluster = prevLast + lower;
          if (VALID_FINALS.has(finalCluster) || VALID_FINALS.has(lower)) {
            // Check: does prev token contain at least one vowel?
            if (prevToken && /[aăâeêioôơuưyàáảãạắằẳẵặấầẩẫậèéẻẽẹếềểễệìíỉĩịòóỏõọốồổỗộớờởỡợùúủũụứừửữựỳýỷỹỵ]/i.test(prevToken)) {
              merged[prevIdx] = prevToken + token;
              continue;
            }
          }

          // Rule 3: next starts with vowel → merge RIGHT
          const nextIsVowel = nextFirst !== "" && !CONSONANTS.has(nextFirst);
          if (nextIsVowel) {
            tokens[i + 1] = token + next;
            continue;
          }
        }

        // Single vowel letter: merge RIGHT if next starts with consonant (forming a syllable)
        if (!isConsonant && next) {
          const nextFirst = next[0]?.toLowerCase() ?? "";
          if (CONSONANTS.has(nextFirst)) {
            // This vowel + next consonant-starting word could form a syllable
            // Only merge if the vowel is a valid Vietnamese standalone vowel start
            tokens[i + 1] = token + next;
            continue;
          }
        }

        // Default: merge LEFT if possible
        if (prevIdx >= 0) {
          merged[prevIdx] = merged[prevIdx] + token;
          continue;
        }

        merged.push(token);
      }

      return merged.join(" ");
    })
    .join("\n");
}

/**
 * Fix stuck words and split words in Vietnamese text.
 *
 * 1. Split syllables: "t rắn g" → "trắng" (STV API artifact)
 * 2. Stuck words: "bìnhthường" → "bình thường" (missing spaces)
 * 3. Foreign words: "In te r net" → "Internet"
 */
export function fixStuckWords(text: string): string {
  if (!text) return "";

  // Normalize Unicode to NFC (precomposed) to ensure single-char detection works
  // STV API may return decomposed Unicode (e.g. a + combining accent instead of á)
  let cleaned = text.normalize("NFC");

  // Phase 0: Fix foreign words BEFORE merge (so merge doesn't break them further)
  cleaned = fixForeignWords(cleaned);

  // Phase 1: Merge split syllables (run 3 times for cascading merges like "t r ắn g")
  cleaned = mergeSplitSyllables(cleaned);
  cleaned = mergeSplitSyllables(cleaned);
  cleaned = mergeSplitSyllables(cleaned);

  // Phase 2: Split stuck words
  // Rule A: Invalid Consonant-Consonant sequences
  const CONSONANTS_STR = "bcdfghjklmnpqrstvwxzđBCDFGHJKLMNPQRSTVWXZĐ";
  const VALID_PAIRS = new Set(["ch", "gh", "kh", "ng", "nh", "ph", "th", "tr", "CH", "GH", "KH", "NG", "NH", "PH", "TH", "TR", "Ch", "Gh", "Kh", "Ng", "Nh", "Ph", "Th", "Tr"]);

  cleaned = cleaned.replace(
    new RegExp(`([${CONSONANTS_STR}])(?=([${CONSONANTS_STR}]))`, 'g'),
    (match, c1, c2) => {
      const pair = (c1 + c2).toLowerCase();
      if (VALID_PAIRS.has(pair)) {
        return c1;
      }
      return `${c1} `;
    }
  );

  // Rule B: Exception for 'gh' -> only valid before e, ê, i, y.
  cleaned = cleaned.replace(/gh(?![eéèẻẽẹêếềểễệiíìỉĩịyýỳỷỹỵ])/gi, "g h");

  // Rule C: Invalid Vowel-Consonant sequences (Consonant is not a valid final)
  const VOWELS = "aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴ";
  const INVALID_FINALS = "bdđghklqrsvxBDĐGHKLQRSVX";
  cleaned = cleaned.replace(
    new RegExp(`([${VOWELS}])(?=[${INVALID_FINALS}])`, 'g'),
    "$1 "
  );

  // lowercase followed by Uppercase (e.g. làTòng → là Tòng)
  cleaned = cleaned.replace(
    /[\p{Ll}][\p{Lu}]/gu,
    (match) => match[0] + " " + match[1],
  );

  // Phase 3: Common Vietnamese words stuck to previous word
  // This is a comprehensive list of common Vietnamese words that often get stuck
  cleaned = cleaned.replace(
    /([a-zđàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ])(là|không|có|cũng|theo|tại|khỏi|rất|như|thế|cái|mấy|với|mà|của|được|những|một|đã|đang|sẽ|rời|định|cảnh|mặc|nghĩ|nhận|coi|tiếp|vừa|vẫn|còn|nữa|chuyên|môn|bình|thường|thật|nhiên|thiếu|niên|đường|nuôi|tập|tục|xưng|vọng|mộc|tượng|xuất|thân|huyện|thành|phẩm|cửa|hàng|trong|ngoài|trên|dưới|giữa|phải|trước|sau|khi|nếu|thì|nhưng|hoặc|bởi|ngay|xong|luôn|nghe|nhìn|biết|nên|bên|liền|người|chính|giống|hiện|nơi|khắp|ánh|sáng|sinh|vật|nhanh|chóng|không|khí|đó|từng|hạt|giọt|nước|tựa|rực|rỡ|ngọc|trai|khỏa|đặt|vào|hào|quang|yêu|dị|ở|ỷ|đều|hết|lại|cho|đến|cũng|về|đi|lên|xuống|gần|chỉ|hay|đây|kia|nào|này|ấy|đấy|sao|thì|mới|toàn|cùng|từ|qua|đem|lấy|đang|sắp|suốt|khác|riêng|chung|đủ|thêm|lần|rồi|chưa|đừng|chớ|hãy|càng|rằng|bị|để|đến|mỗi|mọi|cả|hơn|nhất|quá|khá|cực|siêu|rõ|lắm|hầu|rất|tuy|dù|mặc|mà|song|dẫu|nhưng|bằng|tức|liền|cùng|cứ|đối|vẫn)(?=[^a-zA-ZđĐàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]|$)/gi,
    "$1 $2",
  );

  // Phase 4: Vietnamese vowel-vowel stuck words
  // When a word ending in a vowel is stuck to a word starting with a Vietnamese vowel
  // that carries a diacritical mark (ở, ấy, ủa, etc.) — these are clearly separate words
  // e.g. "ngườiở" → "người ở", "giấuở" → "giấu ở"
  const VIET_VOWELS_WITH_MARKS = "àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ";
  const VIET_VOWELS_LOWER = "aăâeêioôơuưy" + VIET_VOWELS_WITH_MARKS;
  cleaned = cleaned.replace(
    new RegExp(`([${VIET_VOWELS_LOWER}])([${VIET_VOWELS_WITH_MARKS}])`, 'g'),
    (match, v1, v2) => {
      // Check if v1+v2 form a known Vietnamese vowel combination (diphthong/triphthong)
      // If so, don't split. Common combinations: ai, ao, au, ay, âu, ây, eo, êu, ia, iê, iu, 
      // oa, oă, oe, oi, oo, ơi, ua, uâ, ue, ui, uô, ưa, ưi, ưu, ya, yê
      const combo = (v1 + v2).normalize("NFC");
      const base1 = v1.normalize("NFD").charAt(0);
      const base2 = v2.normalize("NFD").charAt(0);
      const baseCombo = base1 + base2;
      const VALID_VOWEL_COMBOS = new Set([
        "ai", "ao", "au", "ay", "âu", "ây", "eo", "êu",
        "ia", "iê", "iu", "oa", "oă", "oe", "oi", "oo",
        "ơi", "ua", "uâ", "ue", "ui", "uô", "ưa", "ưi", "ưu",
        "ya", "yê", "uê", "uơ", "ươ",
      ]);
      if (VALID_VOWEL_COMBOS.has(baseCombo)) {
        return match; // Keep together — valid Vietnamese vowel combination
      }
      return v1 + " " + v2;
    }
  );

  // Clean up any double spaces introduced by the rules
  cleaned = cleaned.replace(/ {2,}/g, " ");

  return cleaned;
}

/**
 * Gentle cleanup specifically for STV API output.
 * 
 * STV output is generally accurate — this function only fixes:
 * 1. Foreign words that got split ("In te r net" → "Internet")
 * 2. Split Vietnamese syllables ("t rắn g" → "trắng")
 * 3. Common stuck words ("ngườiở" → "người ở")
 * 
 * It does NOT apply aggressive consonant/vowel splitting rules
 * (Phase 2 of fixStuckWords) which can break valid STV output.
 */
export function cleanSTVOutput(text: string): string {
  if (!text) return "";

  // Normalize Unicode to NFC
  let cleaned = text.normalize("NFC");

  // Fix foreign words
  cleaned = fixForeignWords(cleaned);

  // Merge split syllables (gentle — only merges single isolated letters)
  cleaned = mergeSplitSyllables(cleaned);
  cleaned = mergeSplitSyllables(cleaned);
  cleaned = mergeSplitSyllables(cleaned);

  // Danh sách từ phổ biến thường bị dính
  const COMMON_WORDS = "ở|là|không|có|với|của|được|những|một|đã|đang|sẽ|vào|cho|để|từ|về|đi|lên|ra|lại|đến|còn|nữa|mà|thì|nào|này|ấy|đó|khi|nếu|nhưng|cũng|vẫn|đều|hết|rất|quá|rồi|chưa|bị|theo|tại|trong|ngoài|trên|dưới|sau|trước|bên|giữa|phải|ngay|như|thế|cái|người|chính|luôn|liền|và|hay|hoặc|sao|gì|nên|nơi|đây|kia";
  const VIET_CHARS = "a-zA-ZđĐàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ";

  // Chạy nhiều lần để xử lý chuỗi dính liên tiếp: "hếtởrể" → "hết ởrể" → "hết ở rể"
  for (let pass = 0; pass < 3; pass++) {
    // Rule A: Chữ dính TRƯỚC từ phổ biến: "ngườiở" → "người ở"
    cleaned = cleaned.replace(
      new RegExp(`([${VIET_CHARS}])(${COMMON_WORDS})`, "gi"),
      "$1 $2",
    );

    // Rule B: Từ phổ biến dính VỚI chữ tiếp theo: "ởrể" → "ở rể"
    cleaned = cleaned.replace(
      new RegExp(`\\b(${COMMON_WORDS})([${VIET_CHARS}])`, "gi"),
      "$1 $2",
    );
  }

  // Clean up double spaces
  cleaned = cleaned.replace(/ {2,}/g, " ");

  return cleaned;
}

/**
 * Filter out injected ads and navigation links from scraped text.
 */
export function cleanGarbageLines(text: string): string {
  if (!text) return text;

  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const t = line.trim().toLowerCase();
    if (!t) return true;

    // STV navigation
    if (t.includes("chương trước") && t.includes("mục lục") && t.includes("chương sau")) return false;
    if (t === "về trang sách" || t.includes("về trang sách") || t.includes("quay lại trang sách")) return false;
    if (t.includes("bạn đang đọc truyện trên")) return false;
    if (t.includes("sangtacviet")) return false;

    // Common injected ads
    if (t.includes("meetsingles")) return false;
    if (t.includes("singleflirt")) return false;
    if (t.includes("looking for someone in")) return false;
    if (t.includes("seeking someone to do")) return false;
    if (t.includes("never believe why i moved to")) return false;

    return true;
  });

  return cleanedLines.join('\n').replace(/\n{3,}/g, "\n\n");
}

/**
 * Remove icons, emojis, and decorative symbols that commonly cause AI translation errors.
 */
export function cleanErrorCausingCharacters(text: string): string {
  if (!text) return "";

  // 1. Normalize Unicode to NFC
  let cleaned = text.normalize("NFC");

  // 2. Remove standard emojis, pictographs and other symbols using Unicode property escapes
  cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, "");
  cleaned = cleaned.replace(/\p{So}/gu, "");

  // 3. Remove common decorative shapes, signs, and symbols that aren't letters or numbers
  cleaned = cleaned.replace(/[♥♡❣❤✨⭐🌟⚡💥🔥✖️➖➕➗🥀🌹🍀🍁🍂🍃🌸🌺🌻🌼🏵️⚜️🔱⚓🌈🌊🌀🌬️💨🫧❄️⛄☄️⛱️☔☠️☣️☢️✓✔✕✖✗✘♫♪♫♬♩♯✙✚✛✜✝✞✟✠✡✢✣✤✥✦✧✩✪✫✬✭✮✯✰★☆✨🌠🌌🌙☀️⛅⚡❄️🍀☘️🌿🌾🌴🌲🌳🌵🌸🌹🌺🌻🌼💐⚛️🕉️☸️☮️☯️☪️☦️🛐🔘🔳🔲🔺🔻🔸🔹🔶🔷▪️▫️⬕⬔⬗⬘⬙⬚◽◾◼️◻️🔲🔳]/gu, "");
  cleaned = cleaned.replace(/[❀✿❁❃❋✦✧✩✪✫✬✭✭✮✯✰★☆❖⊙㍿卍卐▬▭▮▮▰▱▲▼◆◇○●■□◎☉☼☽☾♨]/g, "");

  // 4. Remove miscellaneous symbols/dingbats/geometric shapes [\u2500-\u28FF] (covers box drawing, block elements, geometric shapes, dingbats, braille)
  cleaned = cleaned.replace(/[\u2500-\u28FF]/g, "");
  cleaned = cleaned.replace(/[\u2190-\u21FF]/g, ""); // Remove arrows

  // 5. Clean up any double spaces caused by removal (but preserve paragraphs)
  cleaned = cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * Splits a large text into smaller chunks based on a maximum character limit.
 * Attempts to break cleanly at paragraph marks.
 */
export function chunkText(text: string, maxLimit: number = 2500): string[] {
  if (!text) return [];
  if (text.length <= maxLimit) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split("\n");
  let currentChunk = "";

  for (const p of paragraphs) {
    if (currentChunk.length + p.length > maxLimit && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = p + "\n";
    } else {
      currentChunk += p + "\n";
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

