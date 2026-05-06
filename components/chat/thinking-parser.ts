const THINK_OPEN = /<think(?:ing)?>/i;
const THINK_CLOSE = /<\/think(?:ing)?>/i;

/**
 * Parse accumulated stream text to separate `<think>`/`<thinking>` blocks
 * from the visible content. Handles partial tags during streaming.
 */
export function parseThinkingTags(raw: string): {
  reasoning: string;
  content: string;
  isThinking: boolean;
} {
  const openMatch = raw.match(THINK_OPEN);
  if (!openMatch) return { reasoning: "", content: raw, isThinking: false };

  const afterOpen = raw.slice(openMatch.index! + openMatch[0].length);
  const closeMatch = afterOpen.match(THINK_CLOSE);

  if (!closeMatch) {
    // Still inside thinking — no closing tag yet
    return { reasoning: afterOpen, content: "", isThinking: true };
  }

  const reasoning = afterOpen.slice(0, closeMatch.index!);
  const content = afterOpen.slice(closeMatch.index! + closeMatch[0].length);
  return {
    reasoning: reasoning.trim(),
    content: content.trimStart(),
    isThinking: false,
  };
}
