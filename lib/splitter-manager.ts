import { createClient } from "@/lib/supabase/client";
import { db, type DictSource } from "@/lib/db";
import { resolveChapterToolModel } from "./chapter-tools/stream-runner";
import { useChatSettings } from "./hooks/use-chat-settings";
import { useAIProvider } from "./hooks/use-ai-providers";
import { splitDictionaryChunk } from "./ai/splitter-tools";
import { appendToDictSource } from "./hooks/use-dict-entries";
import type { SplitterWorkerConfig } from "./stores/splitter-store";

export interface SplitterState {
  id: number;
  providerId: string;
  modelId: string;
  isProcessing: boolean;
  processedLines: number;
  currentChunk: string;
}

let isRunning = false;
let shouldStop = false;
let globalConfig: {
  sourceDict: string;
  workers: SplitterWorkerConfig[];
  chunkSize: number;
} | null = null;

let workerStates: SplitterState[] = [];
let listeners: Array<() => void> = [];

export function subscribeSplitterManager(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function isSplitterRunning() {
  return isRunning;
}

export function getSplitterWorkerStates() {
  return workerStates;
}

export function configureSplitter(config: {
  sourceDict: string;
  workers: SplitterWorkerConfig[];
  chunkSize: number;
}) {
  globalConfig = config;
  workerStates = config.workers.map((w) => ({
    id: w.id,
    providerId: w.providerId,
    modelId: w.modelId,
    isProcessing: false,
    processedLines: 0,
    currentChunk: "",
  }));
  notify();
}

export function startSplitter() {
  if (isRunning) return;
  if (!globalConfig) throw new Error("Splitter not configured");
  
  isRunning = true;
  shouldStop = false;
  notify();
  
  runLoop().catch((err) => {
    console.error("Splitter loop crashed:", err);
    isRunning = false;
    notify();
  });
}

export function stopSplitter() {
  shouldStop = true;
  isRunning = false;
  notify();
}

async function runLoop() {
  if (!globalConfig) return;
  
  // 1. Load the entire source dictionary into memory
  const sourceEntries = await db.dictEntries
    .where("source")
    .equals(globalConfig.sourceDict)
    .toArray();
    
  if (sourceEntries.length === 0) {
    isRunning = false;
    notify();
    return;
  }
  
  // We will consume entries from the end (or we can maintain an index)
  let currentIndex = 0;
  
  // We use a Map to accumulate results before saving to IDB to avoid too many small transactions
  // Or we can save them immediately after each chunk. Saving immediately is safer.
  
  while (currentIndex < sourceEntries.length && !shouldStop) {
    const idleWorkers = workerStates.filter(w => !w.isProcessing);
    if (idleWorkers.length === 0) {
      await new Promise(r => setTimeout(r, 500));
      continue;
    }
    
    // Assign chunks to idle workers
    for (const worker of idleWorkers) {
      if (currentIndex >= sourceEntries.length || shouldStop) break;
      
      const chunk = sourceEntries.slice(currentIndex, currentIndex + globalConfig.chunkSize);
      currentIndex += globalConfig.chunkSize;
      
      worker.isProcessing = true;
      worker.currentChunk = chunk.slice(0, 5).map(e => `${e.chinese}=${e.vietnamese}`).join("\\n") + (chunk.length > 5 ? "\\n..." : "");
      notify();
      
      // Fire and forget, they will update their own state when done
      processChunk(worker, chunk).finally(() => {
        worker.isProcessing = false;
        notify();
      });
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Wait for all workers to finish
  while (workerStates.some(w => w.isProcessing)) {
    await new Promise(r => setTimeout(r, 500));
  }
  
  isRunning = false;
  notify();
}

async function processChunk(worker: SplitterState, chunk: Array<{ chinese: string; vietnamese: string }>) {
  try {
    const model = await resolveChapterToolModel(
      { providerId: worker.providerId, modelId: worker.modelId },
      undefined,
      undefined
    );
    if (!model) throw new Error("Model not found");

    const result = await splitDictionaryChunk(model, chunk);
    
    if (result && result.results) {
      // Group by category
      const grouped = result.results.reduce((acc, curr) => {
        const cat = curr.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({ chinese: curr.chinese, vietnamese: curr.vietnamese });
        return acc;
      }, {} as Record<string, Array<{ chinese: string; vietnamese: string }>>);
      
      // Save to IDB
      for (const [cat, entries] of Object.entries(grouped)) {
        // Map category to DictSource
        let targetSource = cat;
        if (cat === "core") targetSource = "vietphrase";
        if (cat === "khac") targetSource = "vietphrase"; // keep unknown in base
        
        await appendToDictSource(targetSource as DictSource, entries);
        
        // Also delete them from the ORIGINAL source dict so we don't process them again!
        // Wait, if source is vietphrase and target is vietphrase, we don't delete.
        // If target is tienhiep, we delete from vietphrase.
        if (globalConfig?.sourceDict && targetSource !== globalConfig.sourceDict) {
          const chineseKeys = entries.map(e => e.chinese);
          await db.dictEntries
            .where("[source+chinese]")
            .anyOf(chineseKeys.map(c => [globalConfig!.sourceDict, c]))
            .delete();
        }
      }
    }
    
    worker.processedLines += chunk.length;
  } catch (err) {
    console.error(`Worker ${worker.id} failed chunk:`, err);
    // In a robust system we would requeue the chunk, but for now we just skip
  }
}
