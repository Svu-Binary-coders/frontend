/* eslint-disable @typescript-eslint/no-explicit-any */

interface WasmModule {
  HEAPU8: Uint8Array;
  HEAPF32: Float32Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  _process_image_wasm: (ptr: number, len: number, quality: number) => number;
  _get_out_data: () => number;
  _get_out_size: () => number;
  _free_out: () => void;
  _process_audio_wasm: (
    ptr: number,
    samples: number,
    sampleRate: number,
  ) => number;
  _get_audio_data: () => number;
  _get_audio_size: () => number;
  _free_audio: () => void;
}

export const getWasmEngine = (): WasmModule | null => {
  if (typeof window === "undefined") return null;
  const wasm = (window as any).Module;
  if (!wasm || typeof wasm._malloc !== "function") {
    console.warn("Wasm Engine not ready yet!");
    return null;
  }
  return wasm as WasmModule;
};

export const getFreshHeap = (wasm: WasmModule) => {
  return wasm.HEAPU8 || (window as any).HEAPU8;
};
