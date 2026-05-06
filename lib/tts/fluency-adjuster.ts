import type { TTSOptions } from "./providers/types";

/**
 * Contextual voice modulation.
 *
 * Adjusts rate/pitch based on the textual content of a sentence so that
 * dialogue, exclamations, and sound effects sound more natural.
 *
 * `effectiveness` controls the strength of the adjustment on a 0-2 scale:
 * - 0 = disabled (options returned unchanged)
 * - 1 = moderate
 * - 2 = maximum
 */
export class FluentnessAdjuster {
  effectiveness = 0;

  /**
   * Return a copy of `options` with rate/pitch adjusted for the given text.
   *
   * Rules (applied in priority order):
   * 1. Dialogue with exclamation/question mark -> slower rate, higher pitch
   * 2. Plain dialogue ("...") -> slightly faster rate, slightly higher pitch
   * 3. Short SFX (<=10 chars with punctuation like ... -- !) -> much slower
   */
  getAdjustmentFor(text: string, options: TTSOptions = {}): TTSOptions {
    if (this.effectiveness <= 0) return { ...options };

    const rate = options.rate ?? 1.0;
    const pitch = options.pitch ?? 1.0;
    const trimmed = text.trim();
    const adjustment: TTSOptions = { ...options };

    const isHighPitch = this.isExclamationOrQuestion(trimmed);
    const isDialogue = this.isCharacterDialogue(trimmed);

    if (isHighPitch && isDialogue) {
      // Excited dialogue: slow down slightly, raise pitch
      adjustment.rate = rate * (1 + this.effectiveness * -0.1);
      adjustment.pitch = pitch * (1 + this.effectiveness * 0.1);
    } else if (isDialogue) {
      // Normal dialogue: speed up slightly, raise pitch
      adjustment.rate = rate * (1 + this.effectiveness * 0.1);
      adjustment.pitch = pitch * (1 + this.effectiveness * 0.1);
    } else if (this.isMaybeSFX(trimmed)) {
      // Short SFX: slow down significantly
      adjustment.rate = rate * (1 + this.effectiveness * -0.25);
      adjustment.pitch = pitch * (1 + this.effectiveness * 0.05);
    }

    return adjustment;
  }

  // ---- detection helpers ------------------------------------------------

  /** Text contains `!` or `?`. */
  private isExclamationOrQuestion(text: string): boolean {
    return /[!?]/.test(text);
  }

  /** Text looks like character dialogue (contains curly quotes). */
  private isCharacterDialogue(text: string): boolean {
    return /[\u201C\u201D]/.test(text);
  }

  /**
   * Short text with SFX-like punctuation (ellipsis, dashes, exclamation).
   * E.g. "Bang!!!", "Crack--", "..."
   */
  private isMaybeSFX(text: string): boolean {
    return text.length <= 10 && /[\u2026\u2014\u2013\-!]|\.\.\./.test(text);
  }
}
