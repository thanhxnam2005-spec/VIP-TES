"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReplaceRule } from "@/lib/db";
import {
  createReplaceRule,
  updateReplaceRule,
} from "@/lib/hooks/use-replace-rules";
import { validatePattern } from "@/lib/replace-engine";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function ReplaceRuleForm({
  editingEntry,
  activeNovelId,
  isNovelContext,
  defaultScope,
  nextOrder,
  onClose,
}: {
  editingEntry: ReplaceRule | null;
  activeNovelId: string | null;
  isNovelContext: boolean;
  defaultScope: "novel" | "global";
  nextOrder: number;
  onClose: () => void;
}) {
  const [pattern, setPattern] = useState(editingEntry?.pattern ?? "");
  const [replacement, setReplacement] = useState(
    editingEntry?.replacement ?? "",
  );
  const [isRegex, setIsRegex] = useState(editingEntry?.isRegex ?? false);
  const [caseSensitive, setCaseSensitive] = useState(
    editingEntry?.caseSensitive ?? false,
  );
  const [scope, setScope] = useState<"novel" | "global">(
    editingEntry
      ? editingEntry.scope === "global"
        ? "global"
        : "novel"
      : defaultScope,
  );

  const regexError = useMemo(
    () => (isRegex && pattern ? validatePattern(pattern) : null),
    [isRegex, pattern],
  );

  const handleSave = async () => {
    if (!pattern.trim()) {
      toast.error("Nhập mẫu tìm kiếm");
      return;
    }
    if (isRegex) {
      const err = validatePattern(pattern);
      if (err) {
        toast.error(`Regex không hợp lệ: ${err}`);
        return;
      }
    }

    if (editingEntry) {
      await updateReplaceRule(editingEntry.id, {
        pattern: pattern.trim(),
        replacement,
        isRegex,
        caseSensitive,
      });
      toast.success("Đã cập nhật rule");
    } else {
      const resolvedScope =
        scope === "novel" && activeNovelId ? activeNovelId : "global";
      await createReplaceRule({
        scope: resolvedScope,
        pattern: pattern.trim(),
        replacement,
        isRegex,
        caseSensitive,
        enabled: true,
        order: nextOrder,
      });
      toast.success("Đã thêm rule");
    }
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editingEntry ? "Chỉnh sửa rule" : "Thêm rule thay thế"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Mẫu tìm kiếm</Label>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="đảo quốc nhân"
          />
          {regexError && (
            <p className="text-xs text-destructive">{regexError}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Thay thế bằng</Label>
          <Input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="người Nhật Bản"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="rule-regex"
              checked={isRegex}
              onCheckedChange={(v) => setIsRegex(v === true)}
            />
            <Label htmlFor="rule-regex" className="cursor-pointer text-sm">
              Regex
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id="rule-case"
              checked={caseSensitive}
              onCheckedChange={(v) => setCaseSensitive(v === true)}
            />
            <Label htmlFor="rule-case" className="cursor-pointer text-sm">
              Phân biệt hoa/thường
            </Label>
          </div>
        </div>
        {!editingEntry && isNovelContext && (
          <div className="space-y-1">
            <Label>Phạm vi</Label>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as "novel" | "global")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novel">Riêng tiểu thuyết</SelectItem>
                <SelectItem value="global">Chung (toàn cục)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button
          onClick={handleSave}
          disabled={!pattern.trim() || !!regexError}
        >
          {editingEntry ? "Lưu" : "Thêm"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ReplaceRuleDialog({
  open,
  onOpenChange,
  editingEntry,
  activeNovelId,
  isNovelContext,
  defaultScope,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEntry: ReplaceRule | null;
  activeNovelId: string | null;
  isNovelContext: boolean;
  defaultScope: "novel" | "global";
  nextOrder: number;
}) {
  // Key resets internal form state when dialog opens or entry changes
  const formKey = editingEntry?.id ?? (open ? "new" : "closed");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ReplaceRuleForm
            key={formKey}
            editingEntry={editingEntry}
            activeNovelId={activeNovelId}
            isNovelContext={isNovelContext}
            defaultScope={defaultScope}
            nextOrder={nextOrder}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
