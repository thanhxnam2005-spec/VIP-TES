import type { ReplaceRule } from "@/lib/replace-engine";

// Messages TO worker
export type ReplaceWorkerRequest =
  | {
      type: "find";
      id: string;
      text: string;
      pattern: string;
      isRegex?: boolean;
      caseSensitive?: boolean;
    }
  | {
      type: "replace";
      id: string;
      text: string;
      rules: ReplaceRule[];
    }
  | {
      type: "replace-batch";
      id: string;
      items: Array<{ itemId: string; text: string }>;
      rules: ReplaceRule[];
    };

// Messages FROM worker
export type ReplaceWorkerResponse =
  | {
      type: "find-result";
      id: string;
      matches: Array<{ index: number; length: number }>;
      count: number;
    }
  | {
      type: "replace-result";
      id: string;
      output: string;
      matchCount: number;
    }
  | {
      type: "batch-progress";
      id: string;
      itemId: string;
      output: string;
      matchCount: number;
    }
  | {
      type: "batch-complete";
      id: string;
    }
  | {
      type: "error";
      id: string;
      message: string;
    };
