import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SplitterWorkerConfig {
  id: number;
  providerId: string;
  modelId: string;
}

interface SplitterState {
  sourceDict: string;
  setSourceDict: (source: string) => void;
  
  workerConfigs: SplitterWorkerConfig[];
  setWorkerConfigs: (configs: SplitterWorkerConfig[]) => void;
  
  chunkSize: number;
  setChunkSize: (size: number) => void;
}

export const useSplitterStore = create<SplitterState>()(
  persist(
    (set) => ({
      sourceDict: "vietphrase",
      setSourceDict: (source) => set({ sourceDict: source }),
      
      workerConfigs: [
        { id: 1, providerId: "", modelId: "" },
        { id: 2, providerId: "", modelId: "" },
        { id: 3, providerId: "", modelId: "" },
        { id: 4, providerId: "", modelId: "" },
        { id: 5, providerId: "", modelId: "" },
      ],
      setWorkerConfigs: (configs) => set({ workerConfigs: configs }),
      
      chunkSize: 100,
      setChunkSize: (size) => set({ chunkSize: size }),
    }),
    {
      name: "splitter-storage",
    }
  )
);
