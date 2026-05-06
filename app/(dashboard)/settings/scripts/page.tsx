"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, GlobeIcon, LanguagesIcon, ZapIcon, ShieldCheckIcon } from "lucide-react";

export default function ScriptsPage() {
  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tiện ích & Scripts</h1>
        <p className="text-muted-foreground">
          Công cụ dịch trang web trực tiếp trên trình duyệt, hỗ trợ đa ngôn ngữ.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <img src="/logo.png" alt="App Icon" className="size-10 rounded-lg" />
              </div>
              <div className="space-y-1 flex-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                  Browser Screen Translator
                  <Badge variant="default">Chrome Extension</Badge>
                </CardTitle>
                <CardDescription>
                  Tiện ích dịch màn hình trình duyệt — hỗ trợ tiếng Trung, tiếng Anh và nhiều ngôn ngữ khác sang tiếng Việt.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-muted/50 p-3 text-center">
                <LanguagesIcon className="size-5 mx-auto mb-1.5 text-blue-500" />
                <p className="text-xs font-medium">Đa ngôn ngữ</p>
                <p className="text-[10px] text-muted-foreground">Trung, Anh, Nhật, Hàn...</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3 text-center">
                <ZapIcon className="size-5 mx-auto mb-1.5 text-amber-500" />
                <p className="text-xs font-medium">Dịch tức thì</p>
                <p className="text-[10px] text-muted-foreground">Google Translate API</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3 text-center">
                <GlobeIcon className="size-5 mx-auto mb-1.5 text-green-500" />
                <p className="text-xs font-medium">Mọi trang web</p>
                <p className="text-[10px] text-muted-foreground">Tự động phát hiện</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3 text-center">
                <ShieldCheckIcon className="size-5 mx-auto mb-1.5 text-purple-500" />
                <p className="text-xs font-medium">Không Tampermonkey</p>
                <p className="text-[10px] text-muted-foreground">Extension thuần</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Tính năng nổi bật:</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Dịch tiếng Trung, tiếng Anh, Nhật, Hàn và các ngôn ngữ khác sang tiếng Việt.</li>
                <li>Sử dụng Google Translate API — tốc độ cao, chính xác.</li>
                <li>Tự động phát hiện ngôn ngữ trang web và dịch realtime.</li>
                <li>Không cần cài thêm Tampermonkey, chạy trực tiếp trên Chrome.</li>
                <li>Icon ứng dụng Thuyết Thư Các chuyên nghiệp.</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t mt-auto">
              <Button className="flex-1" onClick={() => window.open("/scripts/stv-google-translator-extension.zip", "_blank")}>
                <DownloadIcon className="mr-2 size-4" />
                Tải về Extension (.zip)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-400 text-base">Hướng dẫn cài Extension</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
            <p>1. Tải file ZIP về máy và giải nén ra một thư mục.</p>
            <p>2. Mở Chrome, truy cập <code>chrome://extensions/</code>.</p>
            <p>3. Bật <strong>&quot;Developer mode&quot;</strong> (Chế độ nhà phát triển) ở góc trên bên phải.</p>
            <p>4. Nhấn <strong>&quot;Load unpacked&quot;</strong> và chọn thư mục bạn vừa giải nén.</p>
            <p>5. Extension sẽ tự động dịch mọi trang web có ngôn ngữ ngoại (Trung, Anh, Nhật...).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
