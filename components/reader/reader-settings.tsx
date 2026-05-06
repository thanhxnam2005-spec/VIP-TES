"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { useReaderPanel } from "@/lib/stores/reader-panel";
import { getProvider, listProviders } from "@/lib/tts";
import type { Voice } from "@/lib/tts/providers/types";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, KeyIcon, SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ReaderSettings() {
  const ttsSettings = useReaderPanel((s) => s.ttsSettings);
  const updateSettings = useReaderPanel((s) => s.updateSettings);

  const [isOpen, setIsOpen] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const providers = listProviders();
  const selectedProvider = ttsSettings.providerId;

  // Check if selected provider requires API key
  const providerNeedsKey = (() => {
    try {
      const p = getProvider(selectedProvider);
      return !!p.requiresApiKey;
    } catch {
      return false;
    }
  })();

  // Fetch voices when provider changes
  useEffect(() => {
    if (!selectedProvider) {
      setVoices([]);
      return;
    }

    let cancelled = false;
    setLoadingVoices(true);

    (async () => {
      try {
        const provider = getProvider(selectedProvider);
        await provider.initialize();
        const v = await provider.getVoices();
        if (!cancelled) setVoices(v);
      } catch {
        if (!cancelled) setVoices([]);
      } finally {
        if (!cancelled) setLoadingVoices(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProvider]);

  const handleProviderChange = (providerId: string) => {
    // Reset voice to first available when switching providers
    updateSettings({ providerId, voiceId: "0" });
  };

  const currentApiKey = ttsSettings.providerApiKeys?.[selectedProvider] ?? "";

  const handleApiKeyChange = (key: string) => {
    updateSettings({
      providerApiKeys: {
        ...ttsSettings.providerApiKeys,
        [selectedProvider]: key,
      },
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <SettingsIcon className="size-3.5" />
        Cài đặt giọng đọc
        <ChevronDownIcon
          className={cn(
            "ml-auto size-3.5 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 px-4 pb-4">
          {/* Provider selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nhà cung cấp</Label>
            <NativeSelect
              className="w-full"
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {providers.map((p) => (
                <NativeSelectOption key={p.name} value={p.name}>
                  {p.friendlyName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          {/* Voice selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Giọng đọc</Label>
            <NativeSelect
              className="w-full"
              value={ttsSettings.voiceId}
              onChange={(e) => updateSettings({ voiceId: e.target.value })}
              disabled={loadingVoices || voices.length === 0}
            >
              {loadingVoices && (
                <NativeSelectOption value="">Đang tải...</NativeSelectOption>
              )}
              {voices.map((voice) => (
                <NativeSelectOption key={voice.id} value={String(voice.id)}>
                  {voice.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          {/* API key (only for providers that need it) */}
          {providerNeedsKey && (
            <div className="space-y-1.5">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                <KeyIcon className="size-3" />
                API Key
                <ChevronDownIcon
                  className={cn(
                    "size-3 transition-transform",
                    showApiKey && "rotate-180",
                  )}
                />
              </button>
              {showApiKey && (
                <Input
                  type="password"
                  placeholder="Nhập API key..."
                  value={currentApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="h-8 text-xs"
                />
              )}
            </div>
          )}

          {/* Rate slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tốc độ đọc</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {ttsSettings.rate.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0.5}
              max={2.5}
              step={0.05}
              value={[ttsSettings.rate]}
              onValueChange={([v]) => updateSettings({ rate: v })}
            />
          </div>

          {/* Pitch slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Độ cao giọng</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {ttsSettings.pitch.toFixed(2)}
              </span>
            </div>
            <Slider
              min={0.5}
              max={2}
              step={0.05}
              value={[ttsSettings.pitch]}
              onValueChange={([v]) => updateSettings({ pitch: v })}
            />
          </div>

          {/* Fluency adjust slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Điều chỉnh ngữ cảnh</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {ttsSettings.fluencyAdjust.toFixed(1)}
              </span>
            </div>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={[ttsSettings.fluencyAdjust]}
              onValueChange={([v]) => updateSettings({ fluencyAdjust: v })}
            />
          </div>

          {/* Highlight color */}
          <div className="space-y-1.5">
            <Label className="text-xs">Màu làm nổi bật</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={ttsSettings.highlightColor}
                onChange={(e) =>
                  updateSettings({ highlightColor: e.target.value })
                }
                className="size-7 cursor-pointer rounded border border-input bg-transparent p-0.5"
              />
              <span className="text-xs text-muted-foreground">
                {ttsSettings.highlightColor}
              </span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
