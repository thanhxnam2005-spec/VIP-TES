"use client";

import { ConvertConfig } from "@/components/convert-config";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextCompareEditor } from "@/components/ui/text-compare-editor";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { useReaderPanel } from "@/lib/stores/reader-panel";
import { getMergedNameDict, bulkImportNameEntries } from "@/lib/hooks/use-name-entries";
import { useAIProviders, useAIModels } from "@/lib/hooks/use-ai-providers";
import { type TrainingSuggestion } from "@/lib/ai/training-tools";
import { aiPolishTranslation } from "@/lib/ai/convert-pipeline";
import { getModel } from "@/lib/ai/provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRightLeftIcon,
  BookTextIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardCopyIcon,
  ClipboardListIcon,
  FileUpIcon,
  LoaderIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  Trash2Icon,
  Volume2Icon,
  Wand2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sify } from "chinese-conv";
import { useTrainingStore } from "@/lib/stores/training-store";
import { useBackgroundTraining } from "@/lib/hooks/use-background-training";
import { toast } from "sonner";
import { stvTranslate } from "@/lib/api/stv-translator";
import { DictionaryManagement } from "@/components/dictionary-management";
import { useMergedNameEntries } from "@/lib/hooks/use-name-entries";
import { convertText, useQTEngineReady } from "@/lib/hooks/use-qt-engine";
import { useConvertSettings } from "@/lib/hooks/use-convert-settings";
import { cleanVietnameseText, cleanSTVOutput, cleanGarbageLines } from "@/lib/text-utils";

export default function ConvertPage() {
  const store = useTrainingStore();
  const { handleTrain, stopTraining } = useBackgroundTraining();
  const qtReady = useQTEngineReady();
  const convertSettings = useConvertSettings();
  const aiProviders = useAIProviders();
  const availableProviders = useMemo(() => aiProviders?.filter(p => p.isActive && p.providerType !== "webgpu") || [], [aiProviders]);
  
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  useEffect(() => {
    if (availableProviders.length > 0 && !selectedProviderId) {
      setSelectedProviderId(availableProviders[0].id);
    }
  }, [availableProviders, selectedProviderId]);

  const activeProvider = availableProviders.find(p => p.id === selectedProviderId);
  const models = useAIModels(selectedProviderId);
  
  useEffect(() => {
    if (models && models.length > 0) {
      if (!selectedModelId || !models.find(m => m.modelId === selectedModelId)) {
        setSelectedModelId(models[0].modelId);
      }
    } else {
      setSelectedModelId("");
    }
  }, [models, selectedModelId]);

  const defaultModel = models?.find(m => m.modelId === selectedModelId);

  const {
    input = "", setInput,
    output = "", setOutput,
    isTraining = false,
    trainingSuggestions = [], setTrainingSuggestions,
    batchProgress = null,
    lastProcessedIndex = 0, setLastProcessedIndex,
    isAutoNext = false, setIsAutoNext
  } = store;

  const [isScanning, setIsScanning] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [useSTVMode, setUseSTVMode] = useState(true);
  const [stvProgress, setSTVProgress] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<string | null>(null);
  const [dictPopoverOpen, setDictPopoverOpen] = useState(false);
  
  const [stvOut, setStvOut] = useState("");
  const [activeTab, setActiveTab] = useState<"ai" | "stv">("ai");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stvAbortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const mergedEntries = useMergedNameEntries("global");
  
  // Quét các từ điển đang xuất hiện trong văn bản
  const activeEntries = useMemo(() => {
    if (!input || !mergedEntries) return [];
    return mergedEntries.filter(e => input.includes(e.chinese)).slice(0, 20);
  }, [input, mergedEntries]);

  const debouncedInput = useDebouncedValue(input, 500);

  const handleSTVTranslate = useCallback(async () => {
    if (!input.trim()) {
      setStvOut("");
      return;
    }
    
    const cleanedInput = cleanGarbageLines(input);
    const seq = ++seqRef.current;
    setIsConverting(true);
    setSTVProgress(null);
    stvAbortRef.current?.abort();
    
    try {
      const controller = new AbortController();
      stvAbortRef.current = controller;
      
      const dict = await getMergedNameDict();
      
      const result = await stvTranslate(cleanedInput, {
        signal: controller.signal,
        dictionary: dict,
        onProgress: (p) => {
          if (seqRef.current !== seq) return;
          setStvOut(cleanVietnameseText(cleanSTVOutput(p.partialResult)));
          setSTVProgress(`Đang dịch STV: ${p.currentChunk + 1}/${p.totalChunks} phần`);
        },
      });
      
      if (seqRef.current === seq) {
        setStvOut(cleanVietnameseText(cleanSTVOutput(result)));
        setSTVProgress(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (seqRef.current === seq) {
        toast.error("Lỗi STV: " + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      if (seqRef.current === seq) {
        setIsConverting(false);
        setSTVProgress(null);
      }
    }
  }, [input]);

  const handleQuickScan = useCallback(async () => {
    if (!input.trim()) return;
    setIsScanning(true);
    try {
      // Thực hiện convert giả định bằng bộ máy QT cục bộ để bóc tách từ điển
      const result = await convertText(input, {
        options: {
          ...convertSettings,
          autoDetectNames: true,
          nameDetectMinFrequency: 1, // Quét triệt để
          maxPhraseLength: 10,
        }
      });
      
      // Thu thập tất cả các đoạn đã được dịch (không phải unknown hoặc phienam thuần túy)
      const recognizedEntries = new Map<string, string>();
      
      if (result.segments) {
        for (const seg of result.segments) {
          // Chỉ lấy các từ được nhận diện từ các nguồn từ điển (novel, global, qt, vietphrase, luatnhan)
          if (seg.source !== "unknown" && seg.source !== "phienam" && seg.original.length > 1) {
            recognizedEntries.set(seg.original, seg.translated);
          }
        }
      }

      // Bổ sung thêm các tên tự động nhận diện nếu có
      if (result.detectedNames) {
        for (const n of result.detectedNames) {
          recognizedEntries.set(n.chinese, n.vietnamese);
        }
      }
      
      if (recognizedEntries.size > 0) {
        const entriesToImport = Array.from(recognizedEntries.entries()).map(([chinese, vietnamese]) => ({
          chinese,
          vietnamese
        }));
        
        // Tự động lưu toàn bộ vào từ điển chung (Global)
        const importResult = await bulkImportNameEntries("global", entriesToImport, "khác", "skip");
        
        toast.success(`Đã quét toàn bộ! Tự động thêm ${importResult.added} cụm từ mới vào bộ quản lý.`);
        setDictPopoverOpen(true); // Tự động mở bảng quản lý
        
        if (importResult.skipped > 0) {
          toast.info(`${importResult.skipped} cụm từ đã tồn tại.`);
        }
      } else {
        toast.info("Không tìm thấy cụm từ nào mới trong văn bản");
      }
    } catch (err) {
      toast.error("Lỗi khi quét toàn bộ từ điển: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsScanning(false);
    }
  }, [input, convertSettings]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInput(content);
    };
    reader.readAsText(file);
  };

  const handleRead = useCallback(() => {
    if (!output.trim()) return;
    useReaderPanel.getState().loadText(output, "Kết quả convert");
  }, [output]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Đã sao chép");
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
    setStvOut("");
  }, [setInput, setOutput]);

  const handleCleanOutput = useCallback(() => {
    if (!output) return;
    const cleaned = cleanVietnameseText(cleanSTVOutput(output));
    setOutput(cleaned);
    toast.success("Đã dọn dẹp văn bản");
  }, [output, setOutput]);

  const handleAddTrainingSuggestion = async (s: TrainingSuggestion) => {
    try {
      await bulkImportNameEntries("global", [{ chinese: s.chinese, vietnamese: s.vietnamese }], s.category, "replace");
      setTrainingSuggestions(trainingSuggestions.filter(item => item.chinese !== s.chinese));
      toast.success(`Đã thêm "${s.chinese}" vào Từ điển tên chung`);
    } catch {
      toast.error("Lưu thất bại");
    }
  };

  const handleAIPipeline = async () => {
    if (!input.trim()) return;
    if (!activeProvider || !defaultModel) {
      toast.error("Vui lòng kích hoạt một AI Provider trong cài đặt để dùng tính năng này.");
      return;
    }
    
    setIsConverting(true);
    stvAbortRef.current?.abort();
    
    try {
      const model = await getModel(activeProvider, defaultModel.modelId);
      const dict = await getMergedNameDict();
      const cleanedInput = cleanGarbageLines(input);
      
      // Split input into chunks of max 1500 chars, preserving paragraph boundaries if possible
      const chunks = cleanedInput.match(/[^]{1,1500}(?:\n\n|$)|[^]{1,1500}/g) || [];
      let finalTranslation = "";
      let finalStv = "";
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].trim();
        if (!chunk) continue;
        
        setPipelineProgress(`Đang xử lý phần ${i + 1}/${chunks.length}... (STV)`);
        const draftTranslation = await stvTranslate(chunk, { dictionary: dict });
        const cleanedDraft = cleanVietnameseText(cleanSTVOutput(draftTranslation));
        finalStv += cleanedDraft + "\n\n";
        setStvOut(finalStv.trim());
        
        setPipelineProgress(`Đang xử lý phần ${i + 1}/${chunks.length}... (AI Nhuận sắc)`);
        const polished = await aiPolishTranslation({
          model,
          sourceText: chunk,
          draftTranslation: cleanedDraft,
        });
        
        finalTranslation += polished + "\n\n";
        setOutput(finalTranslation.trim());
        
        // Wait 2.5s to avoid AI rate limits (e.g. 15 RPM limit)
        if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 2500));
        }
      }
      
      toast.success("Dịch Thông Minh 3 Bước hoàn tất!");
      
    } catch (err) {
      toast.error("Lỗi Dịch Thông Minh: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsConverting(false);
      setPipelineProgress(null);
    }
  };

  return (
    <main className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden px-6 py-4">
      {/* ── Header ── */}
      <div className="mb-4 flex shrink-0 items-start justify-between flex-col sm:flex-row gap-2">
        <div>
          <h1 className="font-serif text-2xl font-bold">Convert nhanh</h1>
          {(stvProgress || pipelineProgress) && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1.5">
              <LoaderIcon className="size-3 animate-spin" />
              {pipelineProgress || stvProgress}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {input && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClear}
              title="Xóa"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          )}
          {output && (
            <>
              <Button variant="ghost" size="sm" onClick={handleRead}>
                <Volume2Icon className="mr-1.5 size-3.5" />
                Đọc
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <CheckIcon className="mr-1.5 size-3.5" />
                ) : (
                  <ClipboardCopyIcon className="mr-1.5 size-3.5" />
                )}
                {copied ? "Đã chép" : "Sao chép"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCleanOutput} title="Dọn dẹp văn bản (xóa dấu cách thừa, sửa chữ viết liền)">
                <Wand2Icon className="mr-1.5 size-3.5" />
                Dọn dẹp
              </Button>
            </>
          )}

          {(input || output) && <div className="h-5 w-px bg-border" />}

          <div className="flex items-center gap-2 border-l pl-4 mr-2">
            <Switch
              id="edit-mode"
              checked={editMode}
              onCheckedChange={setEditMode}
            />
            <Label htmlFor="edit-mode" className="text-sm">
              Chế độ sửa
            </Label>
          </div>

          <div className="flex items-center gap-1">
            {isConverting && (
              <LoaderIcon className="size-4 animate-spin text-muted-foreground mr-2" />
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleQuickScan}
              disabled={isScanning || !input || !qtReady}
              className="border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10"
            >
              {isScanning ? (
                <LoaderIcon className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <SearchIcon className="mr-1.5 size-3.5" />
              )}
              Quét QT
            </Button>

            <div className="flex items-center gap-1 border border-input rounded-md px-1 bg-background/50">
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger className="h-8 w-[100px] border-0 focus:ring-0 text-xs shadow-none px-2">
                  <SelectValue placeholder="AI Provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-px h-4 bg-border" />
              <Select value={selectedModelId} onValueChange={setSelectedModelId} disabled={!models?.length}>
                <SelectTrigger className="h-8 w-[120px] border-0 focus:ring-0 text-xs shadow-none px-2">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {models?.map(m => (
                    <SelectItem key={m.modelId} value={m.modelId} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeTab === "stv" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSTVTranslate}
                disabled={isConverting || !input}
                className="border-blue-500/30 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10"
              >
                <Wand2Icon className="mr-1.5 size-3.5" />
                Chạy STV Convert
              </Button>
            )}

            {activeTab === "ai" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAIPipeline}
                disabled={isConverting || !input}
                className="border-blue-500/30 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10"
              >
                <Wand2Icon className="mr-1.5 size-3.5" />
                Chạy Toàn Bộ (Dịch AI 2 Bước)
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTrain(lastProcessedIndex)}
              disabled={isTraining || !input}
              className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
            >
              {isTraining ? (
                <LoaderIcon className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <SparklesIcon className="mr-1.5 size-3.5" />
              )}
              {lastProcessedIndex > 0 ? "Tiếp tục huấn luyện AI" : "Huấn luyện AI"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Nhập văn bản từ file .txt"
            >
              <FileUpIcon className="mr-1.5 size-3.5" />
              Nhập File
            </Button>
            <input
              type="file"
              accept=".txt"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />

          </div>
        </div>
      </div>



      {/* ── Side-by-side editor ── */}
      <div className="flex-1 min-h-[600px] flex flex-col" ref={scrollContainerRef}>
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "ai" | "stv")} className="mb-2 w-full">
          <div className="flex justify-between items-center bg-muted/30 p-1 rounded-md border">
            <TabsList className="bg-transparent border-none h-8">
              <TabsTrigger value="ai" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Dịch AI</TabsTrigger>
              <TabsTrigger value="stv" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">STV Convert</TabsTrigger>
            </TabsList>
            <div className="text-[10px] text-muted-foreground mr-2 hidden sm:block">
              (Bản gốc tiếng Trung ở bên trái, kết quả chọn ở bên phải)
            </div>
          </div>
        </Tabs>

        <TextCompareEditor
          panelWrapperClassName="h-[calc(100vh-320px)] min-h-[500px]"
          leftValue={input}
          rightValue={
            activeTab === "stv" ? stvOut : output
          }
          onChange={editMode && activeTab === "ai" ? setOutput : undefined}
          editableSide={editMode && activeTab === "ai" ? "right" : "left"}
          storageKey="convert-stv"
          leftLabel="Văn bản gốc (Trung)"
          rightLabel={
            activeTab === "stv" ? "STV Convert (Chỉ đọc)" :
            (editMode ? "Dịch AI (Có thể sửa)" : "Dịch AI (Chỉ đọc)")
          }
        />
      </div>

      {/* ── Training Suggestions ── */}
      {(trainingSuggestions.length > 0 || batchProgress) && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                <ClipboardListIcon className="size-4" />
                Kết quả huấn luyện AI {batchProgress && `(Khối hiện tại: ${batchProgress.current}/${batchProgress.total})`}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                Tiến độ: {lastProcessedIndex.toLocaleString()} / {input.length.toLocaleString()} ký tự
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="auto-next" className="text-[10px] cursor-pointer">Tự động quét tiếp</Label>
                <Switch
                  id="auto-next"
                  checked={isAutoNext}
                  onCheckedChange={setIsAutoNext}
                  className="scale-75"
                />
              </div>
              {isTraining && (
                <Badge variant="secondary" className="animate-pulse">Đang quét...</Badge>
              )}
              {isTraining && (
                <Button variant="outline" size="xs" onClick={stopTraining}>Dừng</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {trainingSuggestions.map((s, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg bg-background border shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold">{s.chinese}</span>
                    <ArrowRightLeftIcon className="size-3 text-muted-foreground" />
                    <span className="text-sm text-primary font-medium">{s.vietnamese}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize h-5">{s.category}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 italic">&ldquo;{s.reason}&rdquo;</p>
                <Button size="xs" className="w-full mt-1" onClick={() => handleAddTrainingSuggestion(s)}>
                  Thêm vào từ điển
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
