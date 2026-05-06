import { findAllOccurrences, applyRules } from "@/lib/replace-engine";
import type {
  ReplaceWorkerRequest,
  ReplaceWorkerResponse,
} from "./replace-engine.types";

function post(msg: ReplaceWorkerResponse) {
  self.postMessage(msg);
}

self.onmessage = (event: MessageEvent<ReplaceWorkerRequest>) => {
  const msg = event.data;

  switch (msg.type) {
    case "find": {
      try {
        const matches = findAllOccurrences(
          msg.text,
          msg.pattern,
          msg.isRegex,
          msg.caseSensitive,
        );
        post({
          type: "find-result",
          id: msg.id,
          matches,
          count: matches.length,
        });
      } catch (e) {
        post({
          type: "error",
          id: msg.id,
          message: e instanceof Error ? e.message : "Find failed",
        });
      }
      break;
    }

    case "replace": {
      try {
        const result = applyRules(msg.text, msg.rules);
        post({
          type: "replace-result",
          id: msg.id,
          output: result.output,
          matchCount: result.matchCount,
        });
      } catch (e) {
        post({
          type: "error",
          id: msg.id,
          message: e instanceof Error ? e.message : "Replace failed",
        });
      }
      break;
    }

    case "replace-batch": {
      try {
        for (const item of msg.items) {
          const result = applyRules(item.text, msg.rules);
          post({
            type: "batch-progress",
            id: msg.id,
            itemId: item.itemId,
            output: result.output,
            matchCount: result.matchCount,
          });
        }
        post({ type: "batch-complete", id: msg.id });
      } catch (e) {
        post({
          type: "error",
          id: msg.id,
          message: e instanceof Error ? e.message : "Batch replace failed",
        });
      }
      break;
    }
  }
};
