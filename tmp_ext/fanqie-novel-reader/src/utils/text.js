import { MAX_ABSTRACT_LENGTH, MOBILE_ABSTRACT_LENGTH } from './constants';

export { MAX_ABSTRACT_LENGTH, MOBILE_ABSTRACT_LENGTH };

export function cleanAbstract(text) {
  if (!text) return '';
  return text.replace(/\n[\u3000]+/g, '\n').trim();
}

export function truncateText(text, maxLength = MAX_ABSTRACT_LENGTH) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}
