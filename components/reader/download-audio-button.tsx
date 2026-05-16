"use client";

import { useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReaderPanel } from "@/lib/stores/reader-panel";
import { getProvider } from "@/lib/tts";
import { concatenateAndExportAudio } from "@/lib/tts/audio-exporter";
import { toast } from "sonner";

export function DownloadAudioButton() {
    const [isDownloading, setIsDownloading] = useState(false);
    const [progressMsg, setProgressMsg] = useState("");
    const [progressPct, setProgressPct] = useState(0);

    const ttsSettings = useReaderPanel((s) => s.ttsSettings);
    const sentences = useReaderPanel((s) => s.sentences);

    async function handleDownload() {
        if (sentences.length === 0) {
            toast.error("Không có nội dung để tải");
            return;
        }

        try {
            setIsDownloading(true);
            setProgressMsg("Chuẩn bị tải...");
            setProgressPct(0);

            const providerId = ttsSettings.providerId;
            if (!providerId) {
                throw new Error("Vui lòng chọn Giọng đọc trong Cài đặt trước.");
            }

            const provider = getProvider(providerId);

            // Inject API keys if needed
            if (provider.requiresApiKey && provider.setApiKey) {
                const key = ttsSettings.providerApiKeys?.[providerId] || "";
                provider.setApiKey(key);
            }

            provider.setVoice(ttsSettings.voiceId);
            if (provider.setRate) provider.setRate(ttsSettings.rate);
            if (provider.setPitch) provider.setPitch(ttsSettings.pitch);

            if (!provider.fetchAudio) {
                throw new Error("Nguồn phát âm thanh này không hỗ trợ tải xuống.");
            }

            const blobs: Blob[] = [];
            const total = sentences.length;

            // Setup options
            const options = {
                voice: ttsSettings.voiceId,
                rate: ttsSettings.rate,
                pitch: ttsSettings.pitch,
            };

            for (let i = 0; i < total; i++) {
                setProgressMsg(`Đang lấy câu ${i + 1}/${total}`);
                setProgressPct(Math.round(((i + 1) / total) * 100));

                const sentence = sentences[i];
                const text = sentence.text.trim();
                if (!text) continue;

                const blob = await provider.fetchAudio(text, options);
                blobs.push(blob);
            }

            setProgressMsg("Đang xử lý âm thanh...");
            const finalBlob = await concatenateAndExportAudio(blobs, (msg, pct) => {
                setProgressMsg(msg);
                setProgressPct(pct);
            });

            // Trigger download
            const url = URL.createObjectURL(finalBlob);
            const a = document.createElement("a");
            a.href = url;
            const chapterName = document.title || "chapter";
            a.download = `${chapterName}-audio.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(url), 10000);
            toast.success("Tải xuống thành công!");

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Tải xuống thất bại");
        } finally {
            setIsDownloading(false);
            setProgressMsg("");
            setProgressPct(0);
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="flex gap-1.5 min-w-[110px]"
            onClick={handleDownload}
            disabled={isDownloading || sentences.length === 0}
            title="Ghép toàn bộ chương thành 1 file MP3/WAV để tải về"
        >
            {isDownloading ? (
                <>
                    <Loader2Icon className="size-3.5 animate-spin" />
                    <span className="text-[10px] tabular-nums max-w-[80px] truncate">{progressMsg} ({progressPct}%)</span>
                </>
            ) : (
                <>
                    <DownloadIcon className="size-3.5" />
                    <span className="text-xs">Tải Audio</span>
                </>
            )}
        </Button>
    );
}
