export function appendUserInstructionToPrompt(
  prompt: string,
  instruction?: string,
): string {
  const t = instruction?.trim();
  if (!t) return prompt;
  return `${prompt}\n\nYêu cầu thêm từ người dùng:\n${t}`;
}
