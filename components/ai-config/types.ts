export type ConfigItemId =
  | "global-instruction"
  | "chat-panel"
  | "analysis-chapter"
  | "analysis-aggregation"
  | "analysis-character"
  | "chapter-translate"
  | "chapter-review"
  | "chapter-rewrite"
  | "autowrite-setup"
  | "autowrite-world"
  | "autowrite-characters"
  | "autowrite-arcs"
  | "autowrite-plans"
  | "autowrite-context"
  | "autowrite-direction"
  | "autowrite-outline"
  | "autowrite-writer"
  | "autowrite-review"
  | "autowrite-rewrite";

export interface TreeLeaf {
  type: "leaf";
  id: ConfigItemId;
  label: string;
}

export interface TreeFolder {
  type: "folder";
  id: string;
  label: string;
  children: (TreeLeaf | TreeFolder)[];
}

export type TreeNode = TreeLeaf | TreeFolder;

export const TREE_STRUCTURE: TreeNode[] = [
  {
    type: "folder",
    id: "chapter-tools",
    label: "Công cụ chương",
    children: [
      { type: "leaf", id: "chapter-translate", label: "Dịch thuật" },
      { type: "leaf", id: "chapter-review", label: "Đánh giá" },
      { type: "leaf", id: "chapter-rewrite", label: "Viết lại" },
    ],
  },
];
