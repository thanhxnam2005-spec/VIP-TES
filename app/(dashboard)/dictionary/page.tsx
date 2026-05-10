"use client";

import { DictionaryManagement } from "@/components/dictionary-management";
import { DatabaseIcon } from "lucide-react";

export default function DictionaryPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <DatabaseIcon className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Quản lý từ điển
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Đồng bộ, tải xuống và đóng góp từ điển cho hệ thống dịch thuật.
              </p>
            </div>
          </div>
        </div>
      </div>
      <DictionaryManagement />
    </main>
  );
}
