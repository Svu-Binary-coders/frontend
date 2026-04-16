/* eslint-disable @typescript-eslint/no-explicit-any */
import { getWasmEngine, getFreshHeap } from "@/lib/wasm/index";

export const compressAudioWithWasm = async (
  audioBlob: Blob,
): Promise<Blob | null> => {
  const wasm = getWasmEngine();
  if (!wasm) return audioBlob;

  try {
    // 1. Decode Audio to Float32
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // 2. Memory Allocation
    const inputPtr = wasm._malloc(rawData.length * 4);
    let heap = getFreshHeap(wasm);
    const heapF32 = new Float32Array(heap.buffer);
    heapF32.set(rawData, inputPtr / 4);

    const success = wasm._process_audio_wasm(
      inputPtr,
      rawData.length,
      sampleRate,
    );

    if (success === 1) {
      // 4. Get Final WAV Data
      const outPtr = wasm._get_audio_data();
      const outSize = wasm._get_audio_size();

      heap = getFreshHeap(wasm);
      const wavBytes = new Uint8Array(heap.buffer, outPtr, outSize);
      const finalWavBlob = new Blob([new Uint8Array(wavBytes)], {
        type: "audio/wav",
      });

      // Clean up
      wasm._free_audio();
      wasm._free(inputPtr);

      return finalWavBlob;
    } else {
      wasm._free(inputPtr);
      return audioBlob;
    }
  } catch (err) {
    console.error("Audio compression error:", err);
    return audioBlob;
  }
};
