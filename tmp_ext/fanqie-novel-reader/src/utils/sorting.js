export function sortChaptersByNumber(chapters, order = 'ascending') {
  const items = [...(chapters || [])];
  return order === 'descending' ? items.reverse() : items;
}
