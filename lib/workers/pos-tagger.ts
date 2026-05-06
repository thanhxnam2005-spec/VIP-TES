/**
 * POS tagger wrapper for jieba-wasm.
 * Runs inside the qt-engine Web Worker.
 * Lazy-loads the 4MB WASM binary on first use.
 */

import type { ConvertSegment } from "./qt-engine.types";
import type { Tag } from "jieba-wasm";
import init, { tag as jiebaTag } from "jieba-wasm";

let jiebaReady = false;
let initPromise: Promise<void> | null = null;

export async function initPOSTagger(): Promise<void> {
  if (jiebaReady) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await init("/wasm/jieba_rs_wasm_bg.wasm");
    jiebaReady = true;
  })();

  return initPromise;
}

export function isPOSReady(): boolean {
  return jiebaReady;
}

export function tagText(text: string): Tag[] {
  if (!jiebaReady) return [];
  return jiebaTag(text, true);
}

/**
 * Map jieba POS tags onto ConvertSegment[] by character offset alignment.
 *
 * jieba segments text differently from our dictionary-based segmentation,
 * so we align by character position: each segment covers chars
 * [charStart, charStart + original.length). It gets the POS tag of the
 * jieba token that overlaps its start position.
 */
export function enrichSegmentsWithPOS(
  segments: ConvertSegment[],
  originalText: string,
): void {
  if (!jiebaReady) return;

  const jiebaTokens = tagText(originalText);

  // Build char-offset → POS tag map
  const charPOS = new Array<string>(originalText.length).fill("");
  let offset = 0;
  for (const token of jiebaTokens) {
    for (let ci = 0; ci < token.word.length; ci++) {
      if (offset + ci < charPOS.length) {
        charPOS[offset + ci] = token.tag;
      }
    }
    offset += token.word.length;
  }

  // Map to segments by their start position in the original text
  let segOffset = 0;
  for (const seg of segments) {
    if (segOffset < charPOS.length && charPOS[segOffset]) {
      seg.posTag = charPOS[segOffset];
    }
    segOffset += seg.original.length;
  }
}
