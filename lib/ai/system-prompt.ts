/**
 * Prepend the global system instruction to a system prompt.
 * Returns the combined prompt, or the original if no global instruction is set.
 */
export function withGlobalInstruction(
  systemPrompt: string | undefined,
  globalInstruction: string | undefined,
): string | undefined {
  const global = globalInstruction?.trim();
  const local = systemPrompt?.trim();

  if (!global) return local || undefined;
  if (!local) return global;

  return `${global}\n\n${local}`;
}
