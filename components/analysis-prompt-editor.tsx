"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/use-debounce";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LineEditor } from "@/components/ui/line-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useAnalysisSettings, updateAnalysisSettings } from "@/lib/hooks";
import {
  DEFAULT_CHAPTER_ANALYSIS_SYSTEM,
  DEFAULT_NOVEL_AGGREGATION_SYSTEM,
  DEFAULT_CHARACTER_PROFILING_SYSTEM,
} from "@/lib/analysis";

interface PromptField {
  key: "chapterAnalysisPrompt" | "novelAggregationPrompt" | "characterProfilingPrompt";
  label: string;
  description: string;
  defaultValue: string;
}

const PROMPT_FIELDS: PromptField[] = [
  {
    key: "chapterAnalysisPrompt",
    label: "Phân tích chương",
    description:
      "Chỉ thị hệ thống để phân tích từng chương. Kiểm soát những gì được trích xuất (tóm tắt, cảnh, nhân vật).",
    defaultValue: DEFAULT_CHAPTER_ANALYSIS_SYSTEM,
  },
  {
    key: "novelAggregationPrompt",
    label: "Tổng quan tiểu thuyết",
    description:
      "Chỉ thị hệ thống cho phân tích tổng quan. Kiểm soát phát hiện thể loại, viết tóm tắt và trích xuất thế giới quan.",
    defaultValue: DEFAULT_NOVEL_AGGREGATION_SYSTEM,
  },
  {
    key: "characterProfilingPrompt",
    label: "Lập hồ sơ nhân vật",
    description:
      "Chỉ thị hệ thống để xây dựng hồ sơ nhân vật từ dữ liệu xuyên chương.",
    defaultValue: DEFAULT_CHARACTER_PROFILING_SYSTEM,
  },
];

function DebouncedTextarea({
  field,
  value,
  onSave,
  onReset,
}: {
  field: PromptField;
  value: string;
  onSave: (key: string, value: string) => void;
  onReset: (field: PromptField) => void;
}) {
  const isCustomized = value.trim() !== "";
  const [text, setText] = useState(value || field.defaultValue);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(value || field.defaultValue);
  }, [value, field.defaultValue]);

  const debouncedSave = useDebouncedCallback(
    (val: string) => onSave(field.key, val),
    800,
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <Label>{field.label}</Label>
          <p className="text-xs text-muted-foreground">{field.description}</p>
        </div>
        {isCustomized && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReset(field)}
            className="h-7 text-xs"
          >
            <RotateCcwIcon className="mr-1 size-3" />
            Đặt lại
          </Button>
        )}
      </div>
      <div className="h-[120px]">
        <LineEditor
          value={text}
          onChange={(v) => { setText(v); debouncedSave.run(v); }}
          contentFont="text-xs leading-5"
          gutterFont="text-xs leading-5"
          xmlColors
        />
      </div>
    </div>
  );
}

export function AnalysisPromptEditor() {
  const settings = useAnalysisSettings();
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = useCallback(
    async (key: string, value: string) => {
      await updateAnalysisSettings({
        [key]: value.trim() || undefined,
      });
    },
    [],
  );

  const handleReset = useCallback(async (field: PromptField) => {
    await updateAnalysisSettings({ [field.key]: undefined });
    toast.success(`Đã đặt lại prompt ${field.label} về mặc định`);
  }, []);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          )}
          <div>
            <CardTitle className="text-base">Prompt tùy chỉnh</CardTitle>
            <CardDescription>
              Tùy chỉnh chỉ thị hệ thống cho từng bước phân tích. Tự động lưu khi chỉnh sửa.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-5 pt-0">
          {PROMPT_FIELDS.map((field) => (
            <DebouncedTextarea
              key={field.key}
              field={field}
              value={settings[field.key] ?? ""}
              onSave={handleSave}
              onReset={handleReset}
            />
          ))}

          <p className="text-xs text-muted-foreground">
            Để trống để sử dụng prompt mặc định. Định dạng đầu ra (JSON
            schema) cố định — chỉ thay đổi chỉ thị.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
