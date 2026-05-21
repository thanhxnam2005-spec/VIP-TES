/**
 * Extracts book ID from user input. Supports:
 * - Plain numeric ID: "123456789"
 * - Full URL: "https://fanqienovel.com/page/123456789?query=xxx"
 * - URL without protocol: "fanqienovel.com/page/123456789?QUERY=xxxxxx"
 *
 * @param {string} input - Raw input (bookId or URL)
 * @returns {string|null} Extracted book ID, or null if none found
 */
export function parseBookIdFromInput(input) {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  // Match /page/{BOOKID} - bookId is digits, may be followed by ?query
  const pageMatch = trimmed.match(/\/page\/(\d+)/);
  if (pageMatch) return pageMatch[1];

  // Plain numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;

  return null;
}
