import { db } from "@/lib/db";
import { buildWritingContext } from "./context-builder";
import type { ContextAgentOutput, WritingContext } from "./types";

const ARC_TYPE_ORDER: Record<string, number> = {
  main: 0,
  character: 1,
  subplot: 2,
};

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n...[đã rút gọn]";
}

/**
 * Deterministic ContextAgentOutput (no LLM) for smart writing mode.
 * Downstream direction/outline/review agents receive the same JSON shape as classic mode.
 */
export async function buildSyntheticContextOutput(
  novelId: string,
  chapterOrder: number,
): Promise<{ output: ContextAgentOutput; writingContext: WritingContext }> {
  const writingContext = await buildWritingContext(
    novelId,
    chapterOrder,
    "standard",
  );

  const [novel, chapters, characters, plotArcs] = await Promise.all([
    db.novels.get(novelId),
    db.chapters.where("novelId").equals(novelId).sortBy("order"),
    db.characters.where("novelId").equals(novelId).toArray(),
    db.plotArcs.where("novelId").equals(novelId).toArray(),
  ]);

  if (!novel) throw new Error("Novel not found");

  const previous = chapters.filter((ch) => ch.order < chapterOrder && ch.summary);
  const previousEvents =
    previous.length > 0
      ? truncate(
          previous
            .slice(-10)
            .map((ch) => `Chương ${ch.order} (${ch.title}): ${ch.summary}`)
            .join("\n\n"),
          4000,
        )
      : "(Chưa có tóm tắt chương trước.)";

  const characterStates = characters.map((c) => ({
    name: c.name,
    currentState: truncate(
      [c.role, c.description, c.personality, c.goals]
        .filter(Boolean)
        .join(" — ") || "(chưa mô tả)",
      400,
    ),
  }));

  const worldParts = [
    novel.synopsis && `Tóm tắt: ${novel.synopsis}`,
    novel.worldOverview && `Thế giới: ${novel.worldOverview}`,
    novel.powerSystem && `Sức mạnh: ${novel.powerSystem}`,
    novel.storySetting && `Bối cảnh: ${novel.storySetting}`,
  ].filter(Boolean) as string[];

  const worldState =
    worldParts.length > 0
      ? truncate(worldParts.join("\n"), 2000)
      : "(Chưa có thiết lập thế giới.)";

  const sortedArcs = [...plotArcs].sort(
    (a, b) =>
      (ARC_TYPE_ORDER[a.type] ?? 3) - (ARC_TYPE_ORDER[b.type] ?? 3),
  );

  const plotProgress =
    sortedArcs.length > 0
      ? truncate(
          sortedArcs
            .map((a) => `${a.title} (${a.type}, ${a.status}): ${a.description}`)
            .join("\n\n"),
          2000,
        )
      : "(Chưa có mạch truyện.)";

  const unresolvedThreads: string[] = [];
  outer: for (const arc of sortedArcs) {
    for (const p of arc.plotPoints) {
      if (p.status === "resolved") continue;
      unresolvedThreads.push(`${arc.title}: ${p.title}`);
      if (unresolvedThreads.length >= 20) break outer;
    }
  }

  const output: ContextAgentOutput = {
    previousEvents,
    characterStates,
    worldState,
    plotProgress,
    unresolvedThreads,
  };

  return { output, writingContext };
}
