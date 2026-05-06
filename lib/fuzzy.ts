/** Returns matched char indices via subsequence matching (case-insensitive). */
export function fuzzyMatch(
  query: string,
  text: string,
): { matched: boolean; indices: number[] } {
  if (!query) return { matched: true, indices: [] };
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      indices.push(i);
      qi++;
    }
  }
  return { matched: qi === q.length, indices };
}
