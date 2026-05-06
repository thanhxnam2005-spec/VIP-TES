"use client";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  WritingAgentRole,
  WritingSession,
  WritingStepResult,
} from "@/lib/db";
import type { ContextAgentOutput } from "@/lib/writing/types";
import { BookOpenIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { PipelineStepConfig } from "./pipeline-step-config";

function SmartContextPipelineCta({
  title,
  description,
  onStartPipeline,
  disabled,
}: {
  title: string;
  description: string;
  onStartPipeline: () => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium flex items-center gap-2">
          <BookOpenIcon className="h-4 w-4" />
          {title}
        </h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      <Button
        type="button"
        onClick={() => onStartPipeline()}
        disabled={disabled}
      >
        Chạy pipeline
      </Button>
    </div>
  );
}

function ContextOutputView({ output }: { output: ContextAgentOutput }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sự kiện trước đó
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
          {output.previousEvents}
        </p>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tiến trình cốt truyện
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
          {output.plotProgress}
        </p>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tuyến chưa giải quyết
        </h3>
        {output.unresolvedThreads.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">(Không có)</p>
        ) : (
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
            {output.unresolvedThreads.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Trạng thái nhân vật
        </h3>
        <ul className="mt-1.5 space-y-2">
          {output.characterStates.map((c, i) => (
            <li
              key={i}
              className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground"> — </span>
              <span className="leading-relaxed">{c.currentState}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Thế giới & bối cảnh
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
          {output.worldState}
        </p>
      </section>
    </div>
  );
}

export function ContextStepPanel({
  novelId,
  effectivePlanId,
  activeSession,
  isRunning,
  smartWritingMode = false,
  contextResult,
  contextOutput,
  pipelinePreRunRole,
  onStartPipeline,
  onRerunContext,
}: {
  novelId: string;
  effectivePlanId: string | null;
  activeSession: WritingSession | undefined;
  isRunning: boolean;
  smartWritingMode?: boolean;
  contextResult: WritingStepResult | undefined;
  contextOutput: ContextAgentOutput | null;
  pipelinePreRunRole: WritingAgentRole | null;
  onStartPipeline: () => void;
  onRerunContext: () => void | Promise<void>;
}) {
  const ctxStatus = contextResult?.status;
  const ctxError = contextResult?.error;
  const [contextRerunConfigOpen, setContextRerunConfigOpen] = useState(false);

  const smartContextDone =
    smartWritingMode && contextOutput && ctxStatus === "completed";

  if (smartContextDone) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-medium flex items-center gap-2">
            <BookOpenIcon className="h-4 w-4" />
            Bối cảnh (smart)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Đã tổng hợp tự động từ dữ liệu truyện (không gọi AI). Các bước sau
            vẫn dùng mô hình theo cài đặt viết.
          </p>
        </div>
        <ScrollArea className="h-[calc(100svh-280px)] rounded-lg border pr-3">
          <div className="p-4">
            <ContextOutputView output={contextOutput} />
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (pipelinePreRunRole === "context") {
    if (smartWritingMode) {
      return (
        <SmartContextPipelineCta
          title="Chạy pipeline"
          description="Chế độ smart không dùng AI cho bối cảnh. Bấm để tiếp tục — bối cảnh sẽ được tạo tức thì từ dữ liệu truyện."
          onStartPipeline={onStartPipeline}
          disabled={isRunning}
        />
      );
    }
    return (
      <PipelineStepConfig
        novelId={novelId}
        role="context"
        instructionKey="context"
        title="Tạo lại bối cảnh"
        description="Chỉnh mô hình, yêu cầu và system prompt, sau đó chạy AI."
        runLabel="Chạy AI"
        onRun={() => void onStartPipeline()}
        disabled={isRunning}
      />
    );
  }

  if (isRunning && activeSession?.currentStep === "context") {
    return (
      <Empty className="h-[calc(100svh-400px)]">
        <EmptyMedia>
          <Loader2Icon className="h-10 w-10 animate-spin text-primary" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>
            {smartWritingMode
              ? "Đang tổng hợp bối cảnh"
              : "Đang phân tích bối cảnh"}
          </EmptyTitle>
          <EmptyDescription>
            {smartWritingMode
              ? "Đang ghép bối cảnh từ nhân vật, thế giới và các chương trước…"
              : "AI đang tổng hợp bối cảnh từ nhân vật, thế giới và các chương trước…"}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!activeSession && effectivePlanId) {
    if (smartWritingMode) {
      return (
        <SmartContextPipelineCta
          title="Bắt đầu viết chương"
          description="Chế độ smart: bối cảnh tự động từ dữ liệu truyện (không gọi AI). Các bước hướng đi, giàn ý, nội dung vẫn dùng AI theo cài đặt. Bạn có thể đổi kế hoạch chương ở sidebar."
          onStartPipeline={onStartPipeline}
          disabled={isRunning}
        />
      );
    }
    return (
      <PipelineStepConfig
        novelId={novelId}
        role="context"
        instructionKey="context"
        title="Bắt đầu viết chương"
        description="Cấu hình bước bối cảnh rồi chạy pipeline. Bạn có thể đổi kế hoạch chương ở sidebar."
        runLabel="Chạy pipeline"
        onRun={() => void onStartPipeline()}
        disabled={isRunning}
      />
    );
  }

  if (
    activeSession?.currentStep === "context" &&
    !isRunning &&
    ctxStatus !== "completed"
  ) {
    if (smartWritingMode) {
      return (
        <SmartContextPipelineCta
          title="Tiếp tục pipeline"
          description="Bối cảnh smart sẽ được tạo ngay khi chạy pipeline — không cần cấu hình mô hình cho bước này."
          onStartPipeline={onStartPipeline}
          disabled={isRunning}
        />
      );
    }
    return (
      <PipelineStepConfig
        novelId={novelId}
        role="context"
        instructionKey="context"
        title="Bối cảnh chương"
        description="Cấu hình bước bối cảnh rồi chạy để tiếp tục pipeline."
        runLabel="Chạy pipeline (tiếp tục)"
        onRun={() => void onStartPipeline()}
        disabled={isRunning}
      />
    );
  }

  if (ctxStatus === "error" && ctxError) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {ctxError}
        </div>
        <PipelineStepConfig
          novelId={novelId}
          role="context"
          instructionKey="context"
          title="Thử lại bối cảnh"
          description="Chỉnh cấu hình nếu cần rồi chạy lại bước này."
          runLabel="Chạy pipeline (tiếp tục)"
          onRun={() => void onStartPipeline()}
          disabled={isRunning}
        />
      </div>
    );
  }

  if (ctxStatus === "completed" && !contextOutput) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Không đọc được kết quả bối cảnh (dữ liệu không hợp lệ).
        </p>
        <PipelineStepConfig
          novelId={novelId}
          role="context"
          instructionKey="context"
          title="Chạy lại bối cảnh"
          description="Tạo lại bước bối cảnh với cấu hình hiện tại."
          runLabel="Chạy lại từ bối cảnh"
          onRun={() => void onRerunContext()}
          disabled={isRunning}
        />
      </div>
    );
  }

  if (
    !smartWritingMode &&
    contextOutput &&
    ctxStatus === "completed" &&
    contextRerunConfigOpen &&
    activeSession &&
    effectivePlanId &&
    !isRunning
  ) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => setContextRerunConfigOpen(false)}
        >
          ← Quay lại
        </Button>
        <PipelineStepConfig
          novelId={novelId}
          role="context"
          instructionKey="context"
          title="Chạy lại bối cảnh"
          description="Xóa kết quả từ bối cảnh trở đi (hướng đi, giàn ý, nội dung, đánh giá), rồi tạo bối cảnh mới. Chỉnh model hoặc prompt nếu cần."
          runLabel="Chạy AI"
          onRun={() => {
            void (async () => {
              setContextRerunConfigOpen(false);
              await onRerunContext();
              void onStartPipeline();
            })();
          }}
          disabled={isRunning}
        />
      </div>
    );
  }

  if (contextOutput && ctxStatus === "completed") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-medium flex items-center gap-2">
            <BookOpenIcon className="h-4 w-4" />
            Kết quả bối cảnh
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dùng cho các bước sau. Chạy lại sẽ xóa hướng đi, giàn ý và nội dung
            đã tạo.
          </p>
        </div>
        <ScrollArea className="h-[calc(100svh-280px)] rounded-lg border pr-3">
          <div className="p-4">
            <ContextOutputView output={contextOutput} />
          </div>
        </ScrollArea>
        {!smartWritingMode && activeSession && effectivePlanId && !isRunning ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            title="Chạy lại sẽ xóa hướng đi, giàn ý và nội dung đã tạo"
            onClick={() => setContextRerunConfigOpen(true)}
          >
            <RotateCcwIcon className="h-4 w-4" />
            Chạy lại bối cảnh
          </Button>
        ) : null}
      </div>
    );
  }

  if (activeSession && effectivePlanId && !isRunning) {
    if (smartWritingMode) {
      return (
        <SmartContextPipelineCta
          title="Tiếp tục"
          description="Chạy pipeline để tạo hoặc cập nhật bối cảnh smart từ dữ liệu truyện."
          onStartPipeline={onStartPipeline}
          disabled={isRunning}
        />
      );
    }
    return (
      <PipelineStepConfig
        novelId={novelId}
        role="context"
        instructionKey="context"
        title="Bối cảnh — chạy lại từ đầu"
        description="Xóa kết quả từ bối cảnh trở đi và cấu hình lại."
        runLabel="Chạy lại từ bối cảnh"
        onRun={() => void onRerunContext()}
        disabled={isRunning}
      />
    );
  }

  return (
    <Empty className="h-[60vh]">
      <EmptyMedia variant="icon">
        <BookOpenIcon />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Bối cảnh chương</EmptyTitle>
        <EmptyDescription>
          Chọn một kế hoạch chương ở sidebar, cấu hình bước bối cảnh rồi chạy
          pipeline (hoặc nút Viết chương trên thanh công cụ).
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
