"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ExternalLinkIcon,
  KeyIcon,
  CopyIcon,
  CheckIcon,
  SparklesIcon,
  GlobeIcon,
  ShieldIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FREE_API_SOURCES = [
  {
    name: "Catiecli (Gemini Proxy)",
    url: "https://catiecli.sukaka.top/dashboard",
    description: "Proxy miễn phí cho Gemini API. Hỗ trợ các model Gemini Pro, Flash. Tốc độ nhanh, ổn định.",
    baseUrl: "https://catiecli.sukaka.top/v1",
    color: "from-blue-500/10 to-cyan-500/10",
    borderColor: "border-blue-500/20",
    steps: [
      "Truy cập link bên trên → Đăng nhập bằng GitHub",
      "Vào Dashboard → Copy API Key",
      "Trong app: Cài đặt → Nhà cung cấp AI → Thêm nhà cung cấp",
      "Chọn loại: OpenAI Compatible",
      "Base URL: https://catiecli.sukaka.top/v1",
      "Dán API Key vào → Lưu → Tải mô hình",
    ],
  },
  {
    name: "Bắc Cực Tinh (多模型 Proxy)",
    url: "https://ag.beijixingxing.com/dashboard",
    description: "Proxy công ích hỗ trợ nhiều model: GPT-4o, Claude, Gemini, DeepSeek... Miễn phí có giới hạn token/ngày.",
    baseUrl: "https://ag.beijixingxing.com/v1",
    color: "from-purple-500/10 to-pink-500/10",
    borderColor: "border-purple-500/20",
    steps: [
      "Truy cập link bên trên → Đăng ký tài khoản",
      "Vào Dashboard → Tạo API Key mới",
      "Trong app: Cài đặt → Nhà cung cấp AI → Thêm nhà cung cấp",
      "Chọn loại: OpenAI Compatible",
      "Base URL: https://ag.beijixingxing.com/v1",
      "Dán API Key vào → Lưu → Tải mô hình",
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã copy!");
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button variant="ghost" size="icon-xs" onClick={handleCopy} title="Copy">
      {copied ? <CheckIcon className="size-3 text-green-500" /> : <CopyIcon className="size-3" />}
    </Button>
  );
}

export default function ApiGuidePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <KeyIcon className="size-6 text-primary" />
          <h1 className="font-heading text-2xl font-bold tracking-tight">Lấy API Key Miễn Phí</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Hướng dẫn lấy API Key miễn phí từ các nguồn proxy để sử dụng các tính năng AI trong app (dịch truyện, chat, phân tích...).
        </p>
      </div>

      {/* Important note */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldIcon className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Lưu ý quan trọng</p>
            <p className="text-xs text-muted-foreground">
              API Key được lưu trữ <strong>hoàn toàn cục bộ</strong> trên trình duyệt của bạn. 
              Server không lưu hay thu thập key của bạn. 
              Các nguồn dưới đây là proxy miễn phí của cộng đồng, có thể bị giới hạn token/ngày.
            </p>
          </div>
        </div>
      </div>

      {/* API Sources */}
      <div className="space-y-6">
        {FREE_API_SOURCES.map((source, idx) => (
          <Card key={idx} className={`overflow-hidden ${source.borderColor}`}>
            <CardHeader className={`bg-gradient-to-r ${source.color}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-5 text-primary" />
                  <CardTitle className="text-lg">{source.name}</CardTitle>
                </div>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <GlobeIcon className="size-3" />
                  Miễn phí
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {source.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Link */}
              <div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLinkIcon className="size-4" />
                  Mở trang lấy API Key
                </a>
              </div>

              {/* Base URL */}
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Base URL:</span>
                <code className="text-xs font-mono flex-1 truncate">{source.baseUrl}</code>
                <CopyButton text={source.baseUrl} />
              </div>

              {/* Steps */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Các bước thực hiện:</p>
                <ol className="space-y-1.5">
                  {source.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0 flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick setup section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cách dùng nhanh trong App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Sau khi có API Key, bạn vào <strong>Cài đặt → Nhà cung cấp AI → Thêm nhà cung cấp</strong>, chọn loại 
            <strong> OpenAI Compatible</strong>, dán Base URL và API Key vào, lưu rồi bấm <strong>Tải mô hình</strong>.
          </p>
          <p>
            Sau đó khi dịch truyện hoặc chat, chọn nhà cung cấp bạn vừa thêm và chọn model phù hợp (VD: <code>gemini-2.0-flash</code>, <code>gpt-4o-mini</code>...).
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
