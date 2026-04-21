/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface VoiceState {
  isRecording: boolean;
  recordingTime: number;
  compressedAudioFile: File | null; // 🔴 UI-তে প্রিভিউ দেখানোর জন্য এটি লাগবে

  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>; // 🔴 এটি শুধু রেকর্ডিং থামাবে এবং ফাইল তৈরি করবে
  cancelRecording: () => void;
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let timerInterval: NodeJS.Timeout | null = null;

export const useVoiceStore = create<VoiceState>((set) => ({
  isRecording: false,
  recordingTime: 0,
  compressedAudioFile: null,

  startRecording: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstart = () => {
        // befor starting new recording, reset everything
        set({ isRecording: true, recordingTime: 0, compressedAudioFile: null });
        timerInterval = setInterval(() => {
          set((state) => ({ recordingTime: state.recordingTime + 1 }));
        }, 1000);
      };

      mediaRecorder.start(200);
    } catch (error) {
      console.error("Microphone permission denied:", error);
      alert("Please allow microphone access to record voice messages.");
    }
  },

  // if recording is already stopped, it will just resolve immediately without doing anything
  stopRecording: async () => {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve();
        return;
      }

      mediaRecorder.onstop = async () => {
        if (timerInterval) clearInterval(timerInterval);

        // craete a file from the recorded audio chunks
        const rawAudioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const fileName = `voice_${Date.now()}.webm`;
        const audioFile = new File([rawAudioBlob], fileName, {
          type: "audio/webm",
        });

        // save the compressed audio file in the store for preview and later use in the message sending
        set({
          isRecording: false,
          recordingTime: 0,
          compressedAudioFile: audioFile,
        });

        mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
        resolve();
      };

      mediaRecorder.stop();
    });
  },

  cancelRecording: () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (timerInterval) clearInterval(timerInterval);
    mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

    // after canceling, reset everything
    set({ isRecording: false, recordingTime: 0, compressedAudioFile: null });
  },
}));
