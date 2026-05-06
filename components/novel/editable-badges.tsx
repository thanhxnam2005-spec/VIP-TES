"use client";

import { useState, useRef } from "react";
import { XIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function EditableBadges({
  values,
  onSave,
  label,
  variant = "default",
}: {
  values: string[];
  onSave: (values: string[]) => void;
  label?: string;
  variant?: "default" | "secondary" | "outline";
}) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onSave([...values, trimmed]);
    }
    setNewValue("");
    setAdding(false);
  };

  const handleRemove = (index: number) => {
    onSave(values.filter((_, i) => i !== index));
  };

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {label}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((v, i) => (
          <Badge key={`${v}-${i}`} variant={variant} className="gap-1 pr-1">
            {v}
            <button
              onClick={() => handleRemove(i)}
              className="ml-0.5 rounded-sm p-0.5 opacity-50 transition-opacity hover:opacity-100"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
        {adding ? (
          <Input
            ref={inputRef}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") {
                setNewValue("");
                setAdding(false);
              }
            }}
            onBlur={handleAdd}
            placeholder="Nhập và nhấn Enter"
            className="h-6 w-32 text-xs"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex h-6 items-center gap-1 rounded-md border border-dashed px-2 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <PlusIcon className="size-3" />
            Thêm
          </button>
        )}
      </div>
    </div>
  );
}
