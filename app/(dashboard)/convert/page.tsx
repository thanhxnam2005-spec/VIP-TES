"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { useTrainingStore } from "@/lib/stores/training-store";
import { cn } from "@/lib/utils";
import {
  FileUpIcon,
  LoaderIcon,
  Trash2Icon,
  WrenchIcon,
  SparklesIcon,
  ArrowRightLeftIcon,
  BotIcon,
  LibraryIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { convertText, useQTEngineReady } from "@/lib/hooks/use-qt-engine";
import { useConvertSettings } from "@/lib/hooks/use-convert-settings";
import { useAIProviders, useAIModels } from "@/lib/hooks/use-ai-providers";
import { extractDictionaryEntries, type TrainingSuggestion } from "@/lib/ai/training-tools";
import { getModel } from "@/lib/ai/provider";
import { appendToDictSource } from "@/lib/hooks/use-dict-entries";
import { type DictSource, db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNovels } from "@/lib/hooks/use-novels";
import { useChapters } from "@/lib/hooks/use-chapters";

const GENRE_DICTS = [
  "ngontinh", "hiendai", "tienhiep", "huyenhuyen", "dammi", "hocduong", 
  "nsfw", "hentai", "dongphuong", "dothi", "vongdu", "khoahuyen", 
  "quybi", "xuyenkhong", "hethong", "trinhtham", "lichsu"
];

const GENRE_LABELS: Record<string, string> = {
  ngontinh: "Ngôn tình", hiendai: "Hiện đại", tienhiep: "Tiên hiệp",
  huyenhuyen: "H Huyền huyễn", dammi: "Đam mỹ", hocduong: "Học đường",
  nsfw: "NSFW (18+)", hentai: "Hentai", dongphuong: "Đông phương",
  dothi: "Đô thị", vongdu: "Võng du", khoahuyen: "Khoa huyễn",
  quybi: "Quỷ bí", xuyenkhong: "Xuyên không", hethong: "Hệ thống",
  trinhtham: "Trinh thám", lichsu: "Lịch sử"
};

interface WorkerState {
  id: number;
  providerId: string;
  modelId: string;
  isProcessing: boolean;
  currentChunk: string;
}

export default function ConvertPage() {
  const store = useTrainingStore();
  const qtReady = useQTEngineReady();
  const convertSettings = useConvertSettings();
  
  const { input = "", setInput } = store;
  const [qtOut, setQtOut] = useState("");
  const [activeTab, setActiveTab] = useState<"qt" | "train" | "results">("qt");
  const [activeDictSources, setActiveDictSources] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [isConvertingQT, setIsConvertingQT] = useState(false);
  
  // Library selection state
  const novels = useNovels();
  const [selectedNovelId, setSelectedNovelId] = useState<string>("");
  const chapters = useChapters(selectedNovelId);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [targetGenre, setTargetGenre] = useState<string>("auto");
  
  const selectedChapterIdRef = useRef(selectedChapterId);
  useEffect(() => { selectedChapterIdRef.current = selectedChapterId; }, [selectedChapterId]);

  // Load chapter text when selected
  useEffect(() => {
    if (selectedChapterId && !isQueueRunning) {
      db.scenes.where("[chapterId+isActive]").equals([selectedChapterId, 1]).sortBy("order").then(scenes => {
        const text = scenes.map(s => s.content).join("\n");
        setInput(text);
      });
    }
  }, [selectedChapterId, setInput]);

  // AI Training state
  const aiProviders = useAIProviders();
  const availableProviders = useMemo(() => aiProviders?.filter(p => p.isActive && p.providerType !== "webgpu") || [], [aiProviders]);
  
  const [extractedTerms, setExtractedTerms] = useState<TrainingSuggestion[]>([]);
  const [autoSave, setAutoSave] = useState(true);

  // Multi-worker state
  const [workers, setWorkers] = useState<WorkerState[]>(() => 
    Array.from({ length: 5 }).map((_, i) => ({
      id: i + 1,
      providerId: "",
      modelId: "",
      isProcessing: false,
      currentChunk: "",
    }))
  );
  
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const isQueueRunningRef = useRef(false);

  // Auto-select first provider/model for all workers initially
  useEffect(() => {
    if (availableProviders.length > 0) {
      const pId = availableProviders[0].id;
      setWorkers(prev => {
        let changed = false;
        const next = prev.map(w => {
          if (!w.providerId) {
            changed = true;
            return { ...w, providerId: pId };
          }
          return w;
        });
        return changed ? next : prev;
      });
    }
  }, [availableProviders]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debouncedInput = useDebouncedValue(input, 500);

  useEffect(() => {
    if (!qtReady || activeTab !== "qt") return;
    if (!debouncedInput.trim()) {
      setQtOut("");
      return;
    }
    
    let isMounted = true;
    setIsConvertingQT(true);
    convertText(debouncedInput, {
      options: {
        ...convertSettings,
        activeDictSources,
      }
    }).then(res => {
      if (isMounted) setQtOut(res.plainText);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      if (isMounted) setIsConvertingQT(false);
    });

    return () => { isMounted = false; };
  }, [debouncedInput, qtReady, convertSettings, activeDictSources, activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      let text = new TextDecoder("utf-8").decode(buffer);
      if (text.includes("")) {
        text = new TextDecoder("gb18030").decode(buffer);
      }
      setInput(text);
      setSelectedNovelId("");
      setSelectedChapterId("");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClear = useCallback(() => {
    setInput("");
    setQtOut("");
    setExtractedTerms([]);
    setSelectedNovelId("");
    setSelectedChapterId("");
    stopQueue();
  }, [setInput]);

  const processAutoSave = async (suggestions: TrainingSuggestion[]) => {
    const grouped = suggestions.reduce((acc, curr) => {
      const g = curr.genre || "global";
      if (!acc[g]) acc[g] = [];
      acc[g].push(curr);
      return acc;
    }, {} as Record<string, TrainingSuggestion[]>);

    let totalSaved = 0;
    for (const [genre, terms] of Object.entries(grouped)) {
      const targetSource = genre === "global" ? "names" : (GENRE_DICTS.includes(genre) ? genre as DictSource : "names");
      const savedCount = await appendToDictSource(targetSource, terms.map(t => ({ chinese: t.chinese, vietnamese: t.vietnamese })));
      totalSaved += savedCount;
    }
    if (totalSaved > 0) {
      toast.success(`Đã lưu tự động ${totalSaved} từ vào từ điển.`);
    }
  };

  const stopQueue = () => {
    isQueueRunningRef.current = false;
    setIsQueueRunning(false);
  };

  const workersRef = useRef(workers);
  useEffect(() => {
    workersRef.current = workers;
  }, [workers]);

  const startQueue = async () => {
    if (!input.trim()) return;
    setIsQueueRunning(true);
    isQueueRunningRef.current = true;

    const processingWorkerIds = new Set<number>();

    while (isQueueRunningRef.current) {
      const idleWorkers = workersRef.current.filter(
        w => !processingWorkerIds.has(w.id) && !w.isProcessing && w.providerId && w.modelId
      );
      
      if (idleWorkers.length === 0) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      let currentInput = useTrainingStore.getState().input;

      if (!currentInput.trim()) {
        const currentChId = selectedChapterIdRef.current;
        if (currentChId) {
           const currCh = await db.chapters.get(currentChId);
           if (currCh) {
             const nextCh = await db.chapters.where("novelId").equals(currCh.novelId)
               .filter(c => c.order > currCh.order)
               .sortBy("order")
               .then(arr => arr[0]);
               
             if (nextCh) {
               const scenes = await db.scenes.where("[chapterId+isActive]").equals([nextCh.id, 1]).sortBy("order");
               const text = scenes.map(s => s.content).join("\n");
               useTrainingStore.getState().setInput(text);
               setSelectedChapterId(nextCh.id);
               toast.info(`Tự động chuyển sang chương tiếp theo: ${nextCh.title}`);
               await new Promise(r => setTimeout(r, 1000));
               continue;
             }
           }
        }
        
        toast.success("Đã phân tích xong toàn bộ văn bản!");
        stopQueue();
        break;
      }

      // Lấy 15 dòng cho mỗi worker
      const lines = currentInput.split('\n');
      const chunkLines = lines.slice(0, 15);
      const remainingLines = lines.slice(15);
      
      const chunkText = chunkLines.join('\n');
      
      useTrainingStore.getState().setInput(remainingLines.join('\n'));

      if (!chunkText.trim()) continue;

      const workerToUse = idleWorkers[0];
      processingWorkerIds.add(workerToUse.id);
      
      setWorkers(prev => prev.map(w => w.id === workerToUse.id ? { ...w, isProcessing: true, currentChunk: chunkText } : w));

      runWorkerTask(workerToUse, chunkText).finally(() => {
        processingWorkerIds.delete(workerToUse.id);
        setWorkers(prev => prev.map(w => w.id === workerToUse.id ? { ...w, isProcessing: false, currentChunk: "" } : w));
      });
      
      await new Promise(r => setTimeout(r, 100));
    }
  };

  const runWorkerTask = async (worker: WorkerState, chunkText: string) => {
    if (!isQueueRunningRef.current) return;
    try {
      const provider = availableProviders.find(p => p.id === worker.providerId);
      if (!provider) return;
      const model = await getModel(provider, worker.modelId);

      const suggestions = await extractDictionaryEntries({
        model,
        sourceText: chunkText,
        targetGenre: targetGenre && targetGenre !== "auto" ? targetGenre : undefined,
      });

      if (suggestions.length > 0) {
        setExtractedTerms(prev => [...suggestions, ...prev]);
        if (autoSave) {
          await processAutoSave(suggestions);
        }
      }
    } catch (err) {
      console.error(`Worker ${worker.id} error:`, err);
      toast.error(`Worker ${worker.id} lỗi: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <main className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden px-6 py-4">
      <div className="mb-4 flex shrink-0 items-start justify-between flex-col sm:flex-row gap-2">
        <div>
          <h1 className="font-serif text-2xl font-bold">Convert QT (Live Test)</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {input && (
            <Button variant="ghost" size="icon-sm" onClick={handleClear} title="Xóa toàn bộ">
              <Trash2Icon className="size-3.5" />
            </Button>
          )}

          {input && <div className="h-5 w-px bg-border hidden sm:block" />}

          {activeTab === "qt" && (
            <div className="flex items-center gap-2 border-l pl-4 mr-2">
              <Switch id="edit-mode" checked={editMode} onCheckedChange={setEditMode} />
              <Label htmlFor="edit-mode" className="text-sm">Sửa bản gốc</Label>
            </div>
          )}

          {activeTab === "train" && (
            <>
              {isQueueRunning ? (
                <Button variant="destructive" size="sm" onClick={stopQueue} className="animate-pulse">
                  <LoaderIcon className="mr-1.5 size-3.5 animate-spin" />
                  Dừng Phân tích
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={startQueue}
                  disabled={!input.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <SparklesIcon className="mr-1.5 size-3.5" />
                  Bắt đầu Cuốn chiếu Song song (15 dòng/Worker)
                </Button>
              )}
              
              <div className="flex items-center gap-2 border-l pl-2 ml-2">
                <Switch id="auto-save" checked={autoSave} onCheckedChange={setAutoSave} />
                <Label htmlFor="auto-save" className="text-xs">Tự động Lưu</Label>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            {isConvertingQT && activeTab === "qt" && (
              <LoaderIcon className="size-4 animate-spin text-muted-foreground mr-2" />
            )}
            
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <FileUpIcon className="mr-1.5 size-3.5" /> Nhập File txt
            </Button>
            <input type="file" accept=".txt" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[600px] flex flex-col">
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)} className="mb-2 w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-muted/30 p-1 rounded-md border gap-2">
            <TabsList className="bg-transparent border-none h-8 shrink-0">
              <TabsTrigger value="qt" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Từ điển QT (Live)</TabsTrigger>
              <TabsTrigger value="train" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Train từ điển (Đa luồng)</TabsTrigger>
              <TabsTrigger value="results" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Kết quả Từ điển Đã Lưu</TabsTrigger>
            </TabsList>
            
            {activeTab === "train" && (
              <div className="flex items-center gap-2 mr-2 flex-wrap">
                <LibraryIcon className="size-3.5 text-muted-foreground shrink-0" />
                <Select value={selectedNovelId} onValueChange={setSelectedNovelId} disabled={isQueueRunning}>
                  <SelectTrigger className="h-7 text-xs w-[160px]">
                    <SelectValue placeholder="Chọn truyện..." />
                  </SelectTrigger>
                  <SelectContent>
                    {novels?.map(n => (
                      <SelectItem key={n.id} value={n.id} className="text-xs">{n.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedNovelId && (
                  <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={isQueueRunning}>
                    <SelectTrigger className="h-7 text-xs w-[120px]">
                      <SelectValue placeholder="Chọn chương..." />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters?.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
                
                <Select value={targetGenre} onValueChange={setTargetGenre} disabled={isQueueRunning}>
                  <SelectTrigger className="h-7 text-xs w-[140px] bg-emerald-500/5 border-emerald-500/20 text-emerald-700">
                    <SelectValue placeholder="Tất cả thể loại (AI tự chọn)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto" className="text-xs font-semibold text-muted-foreground">Tất cả thể loại (AI tự chọn)</SelectItem>
                    {GENRE_DICTS.map(genre => (
                      <SelectItem key={genre} value={genre} className="text-xs">{GENRE_LABELS[genre]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="text-[10px] text-muted-foreground mr-2 flex items-center gap-2">
              {activeTab === "qt" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="xs" className="h-6 text-[10px] border-primary/20 text-primary bg-primary/5 hover:bg-primary/10">
                      <WrenchIcon className="size-3 mr-1" /> Từ điển: {activeDictSources.length}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-3">
                    <h4 className="font-semibold text-xs mb-2 text-muted-foreground">Chọn bối cảnh truyện để dịch Live</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {GENRE_DICTS.map(src => {
                        const isActive = activeDictSources.includes(src);
                        return (
                          <button
                            key={src}
                            onClick={() => {
                              if (isActive) setActiveDictSources(activeDictSources.filter(s => s !== src));
                              else setActiveDictSources([...activeDictSources, src]);
                            }}
                            className={cn(
                              "text-[10px] px-2 py-1 rounded-md border transition-colors",
                              isActive ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                            )}
                          >
                            {GENRE_LABELS[src]}
                          </button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </Tabs>

        {activeTab === "qt" && (
          <TextCompareEditor
            panelWrapperClassName="h-[calc(100vh-200px)] min-h-[500px]"
            leftValue={input}
            rightValue={qtOut}
            onChange={editMode ? setInput : undefined}
            editableSide={editMode ? "left" : undefined}
            storageKey="convert-qt"
            leftLabel="Văn bản gốc (Trung)"
            rightLabel="Từ điển QT (Tự động cập nhật)"
          />
        )}
        
        {activeTab === "train" && (
          <div className="flex flex-col gap-4 h-[calc(100vh-200px)] min-h-[500px] overflow-y-auto pr-2 pb-10">
            <div className="flex flex-col rounded-xl border bg-background shadow-sm overflow-hidden shrink-0">
              <div className="bg-muted px-4 py-2 font-semibold text-sm border-b shrink-0 flex justify-between">
                <span>Văn bản gốc chờ phân tích</span>
                <span className="text-xs font-normal text-muted-foreground">Tự động cắt 15 dòng cho mỗi luồng</span>
              </div>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 resize-y rounded-none border-0 focus-visible:ring-0 p-4 min-h-[150px] max-h-[300px]"
                placeholder="Dán nội dung tiếng Trung, nhập File txt, hoặc chọn truyện từ thư viện ở bên trên..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-sm text-muted-foreground pl-1">Công nhân AI (Workers)</h3>
              <div className="flex flex-col gap-2">
                {workers.map((worker) => (
                  <WorkerCard 
                    key={worker.id} 
                    worker={worker} 
                    availableProviders={availableProviders}
                    onUpdate={(updates) => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, ...updates } : w))}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "results" && (
          <div className="flex flex-col rounded-xl border bg-background shadow-sm overflow-hidden h-[calc(100vh-200px)] min-h-[500px]">
            <div className="bg-muted px-4 py-2 font-semibold text-sm border-b shrink-0 flex justify-between items-center">
              <span>Các Thể Loại Từ Điển Đã Train ({extractedTerms.length} từ)</span>
              {extractedTerms.length > 0 && !autoSave && (
                 <Button size="xs" variant="secondary" onClick={() => processAutoSave(extractedTerms)}>Lưu toàn bộ</Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {extractedTerms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                  {isQueueRunning ? (
                    <><LoaderIcon className="size-6 animate-spin mb-2" /> Đang nhận kết quả từ các luồng AI...</>
                  ) : "Kết quả từ các AI sẽ được phân loại vào từng ngăn kéo tương ứng ở đây."}
                </div>
              ) : (
                <GroupedExtractionList terms={extractedTerms} onRemove={(term) => setExtractedTerms(extractedTerms.filter(t => t !== term))} />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function WorkerCard({ 
  worker, 
  availableProviders, 
  onUpdate 
}: { 
  worker: WorkerState, 
  availableProviders: ReturnType<typeof useAIProviders>,
  onUpdate: (u: Partial<WorkerState>) => void 
}) {
  const models = useAIModels(worker.providerId);
  
  useEffect(() => {
    if (models && models.length > 0 && !worker.modelId) {
      onUpdate({ modelId: models[0].modelId });
    }
  }, [models, worker.modelId, onUpdate]);

  return (
    <div className={cn("border rounded-lg flex items-stretch overflow-hidden text-xs transition-colors h-[100px]", worker.isProcessing ? "border-emerald-500 shadow-sm bg-emerald-50/30" : "bg-muted/10")}>
      <div className={cn("px-3 py-2 font-bold border-r flex flex-col justify-center items-center w-20 shrink-0", worker.isProcessing ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")}>
        <BotIcon className="size-5 mb-1" />
        W{worker.id}
        {worker.isProcessing && <LoaderIcon className="size-3 animate-spin mt-1" />}
      </div>
      
      <div className="p-3 border-r bg-background flex flex-col justify-center gap-2 w-[220px] shrink-0">
        <Select value={worker.providerId} onValueChange={v => onUpdate({ providerId: v, modelId: "" })} disabled={worker.isProcessing}>
          <SelectTrigger className="h-7 px-2 text-[11px]">
            <SelectValue placeholder="AI API" />
          </SelectTrigger>
          <SelectContent>
            {availableProviders?.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-[11px]">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={worker.modelId} onValueChange={v => onUpdate({ modelId: v })} disabled={!models?.length || worker.isProcessing}>
          <SelectTrigger className="h-7 px-2 text-[11px]">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {models?.map(m => (
              <SelectItem key={m.modelId} value={m.modelId} className="text-[11px]">{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 flex-1 overflow-hidden relative">
        {worker.currentChunk ? (
          <div className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-tight opacity-80 h-full overflow-y-auto pr-2 custom-scrollbar">
            {worker.currentChunk}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/50 italic">Đang chờ việc...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupedExtractionList({ terms, onRemove }: { terms: TrainingSuggestion[], onRemove: (term: TrainingSuggestion) => void }) {
  const grouped = terms.reduce((acc, curr) => {
    const g = curr.genre || "global";
    if (!acc[g]) acc[g] = [];
    acc[g].push(curr);
    return acc;
  }, {} as Record<string, TrainingSuggestion[]>);

  const handleDownloadDict = async (genre: string) => {
    try {
      const targetSource = genre === "global" ? "names" : (GENRE_DICTS.includes(genre) ? genre as DictSource : "names");
      const cached = await db.dictCache.get(targetSource);
      if (!cached || !cached.rawText) {
        toast.error("Từ điển này hiện đang trống!");
        return;
      }
      
      const blob = new Blob([cached.rawText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${targetSource}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Đã tải xuống kho từ điển ${targetSource}.txt`);
    } catch (err) {
      toast.error("Lỗi khi tải từ điển");
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([genre, items]) => (
        <div key={genre} className="space-y-2 bg-background border p-4 rounded-xl shadow-sm">
          <h4 className="font-bold text-[13px] text-primary border-b pb-2 uppercase flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span>{genre === "global" ? "TỪ CHUNG (NAMES)" : (GENRE_LABELS[genre] || genre)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">{items.length} từ mới</Badge>
              <Button size="xs" variant="outline" className="h-5 px-2 text-[10px]" onClick={() => handleDownloadDict(genre)}>
                Tải Kho Từ Điển (.txt)
              </Button>
            </div>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
            {items.map((term, idx) => (
               <div key={`${term.chinese}-${idx}`} className="flex flex-col gap-1.5 p-2 bg-muted/20 rounded-md border hover:border-emerald-500/50 transition-colors">
                 <div className="flex items-center justify-between">
                   <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-background">{term.category}</Badge>
                   <span className="text-[9px] text-muted-foreground italic truncate max-w-[120px]">{term.context_zh}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="font-mono font-bold text-sm text-foreground/90">{term.chinese}</span>
                   <ArrowRightLeftIcon className="size-3 text-muted-foreground/50 shrink-0" />
                   <span className="font-medium text-emerald-600 text-sm truncate">{term.vietnamese}</span>
                 </div>
               </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
