export function getChapterTitle(item) {
  return item?.title || `第 ${item?.item_id} 章`;
}

export function buildNovelDataFromDirectory(itemId, bookId, itemDataList) {
  const list = itemDataList || [];
  const index = list.findIndex((item) => String(item.item_id) === String(itemId));
  
  if (index < 0) return null;
  
  const item = list[index];
  const prevItem = list[index - 1];
  const nextItem = list[index + 1];
  
  return {
    book_id: bookId,
    title: getChapterTitle(item),
    order: String(index + 1),
    serial_count: String(list.length),
    pre_item_id: prevItem?.item_id ?? null,
    next_item_id: nextItem?.item_id ?? null,
  };
}
