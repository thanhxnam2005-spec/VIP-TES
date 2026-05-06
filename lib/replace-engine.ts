/**
 * Pure replace engine — works in both main thread and Web Worker.
 * No React, no DOM dependencies.
 */

export interface ReplaceRule {
  pattern: string;
  replacement: string;
  isRegex?: boolean;
  caseSensitive?: boolean;
}

export interface ReplaceMatch {
  index: number;
  length: number;
  match: string;
  replacement: string;
  ruleIndex: number;
}

export interface ReplaceResult {
  output: string;
  matches: ReplaceMatch[];
  matchCount: number;
}

/** Validate a regex pattern. Returns error message or null if valid. */
export function validatePattern(pattern: string): string | null {
  try {
    new RegExp(pattern);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid regex";
  }
}

/** Build a RegExp from a rule, handling literal vs regex and case sensitivity. */
function buildRegex(
  pattern: string,
  isRegex?: boolean,
  caseSensitive?: boolean,
): RegExp {
  const flags = `g${caseSensitive ? "" : "i"}`;
  if (isRegex) {
    return new RegExp(pattern, flags);
  }
  // Escape special regex characters for literal matching
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, flags);
}

/** Find all occurrences of a single pattern in text (for highlighting). */
export function findAllOccurrences(
  text: string,
  pattern: string,
  isRegex?: boolean,
  caseSensitive?: boolean,
): Array<{ index: number; length: number }> {
  if (!pattern) return [];

  try {
    const re = buildRegex(pattern, isRegex, caseSensitive);
    const matches: Array<{ index: number; length: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ index: m.index, length: m[0].length });
      // Prevent infinite loop on zero-length matches
      if (m[0].length === 0) re.lastIndex++;
    }
    return matches;
  } catch {
    return [];
  }
}

/** Find all matches for a single rule in text. */
function findMatchesForRule(
  text: string,
  rule: ReplaceRule,
  ruleIndex: number,
): ReplaceMatch[] {
  if (!rule.pattern) return [];

  try {
    const re = buildRegex(rule.pattern, rule.isRegex, rule.caseSensitive);
    const matches: ReplaceMatch[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const replacement = rule.isRegex
        ? m[0].replace(re, rule.replacement)
        : rule.replacement;
      // Reset regex for the replacement computation above
      re.lastIndex = m.index + m[0].length;
      matches.push({
        index: m.index,
        length: m[0].length,
        match: m[0],
        replacement,
        ruleIndex,
      });
      if (m[0].length === 0) re.lastIndex++;
    }
    return matches;
  } catch {
    return [];
  }
}

/**
 * Apply ordered rules sequentially: output of rule N is input of rule N+1.
 * Collects matches from the first pass on original text for display.
 */
export function applyRules(
  text: string,
  rules: ReplaceRule[],
): ReplaceResult {
  const allMatches: ReplaceMatch[] = [];
  let current = text;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule.pattern) continue;

    try {
      const re = buildRegex(rule.pattern, rule.isRegex, rule.caseSensitive);

      // Collect matches on current text (before this rule's replacement)
      const ruleMatches = findMatchesForRule(current, rule, i);
      allMatches.push(...ruleMatches);

      // Apply replacement
      current = current.replace(re, rule.replacement);
    } catch {
      // Skip invalid rules silently
    }
  }

  return {
    output: current,
    matches: allMatches,
    matchCount: allMatches.length,
  };
}
