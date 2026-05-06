export function HighlightedText({
  text,
  indices,
}: {
  text: string;
  indices: number[];
}) {
  if (indices.length === 0) return <span>{text}</span>;
  const indexSet = new Set(indices);
  const parts: { chars: string; highlight: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const hl = indexSet.has(i);
    if (parts.length > 0 && parts[parts.length - 1].highlight === hl) {
      parts[parts.length - 1].chars += text[i];
    } else {
      parts.push({ chars: text[i], highlight: hl });
    }
  }
  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className="bg-transparent font-semibold underline decoration-dotted decoration-orange-400"
          >
            {part.chars}
          </mark>
        ) : (
          <span key={i}>{part.chars}</span>
        ),
      )}
    </>
  );
}
