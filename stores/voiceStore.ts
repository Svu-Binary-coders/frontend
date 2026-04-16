import { create } from "zustand";

import api from "@/lib/axios";
import { API_URL } from "@/lib/chat-helpers";

interface VoiceState {
  isRecording: boolean;
  recordingTime: number;
  compressedAudioFile: File | null;
  isUploading: boolean;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  sendVoiceMessage: (chatId: string) => Promise<void>;
}

// MediaRecorder ব্রাউজারের গ্লোবাল API
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let timerInterval: NodeJS.Timeout | null = null;

export const useVoiceStore = create<VoiceState>((set, get) => ({
  isRecording: false,
  recordingTime: 0,
  compressedAudioFile: null,
  isUploading: false,

  startRecording: async () => {
    try {
      // মাইক্রোফোনের পারমিশন নেওয়া
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstart = () => {
        set({ isRecording: true, recordingTime: 0, compressedAudioFile: null });
        // টাইমার শুরু
        timerInterval = setInterval(() => {
          set((state) => ({ recordingTime: state.recordingTime + 1 }));
        }, 1000);
      };

      mediaRecorder.start(200); // প্রতি ২০০ms পর পর ডেটা নেবে
    } catch (error) {
      console.error("Microphone permission denied:", error);
      alert("Please allow microphone access to send voice messages.");
    }
  },

  stopRecording: async () => {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve();
        return;
      }

      mediaRecorder.onstop = async () => {
        if (timerInterval) clearInterval(timerInterval);
        set({ isRecording: false });

        // 1. Create a single Blob from the recorded audio chunks (Native WebM)
        const rawAudioBlob = new Blob(audioChunks, { type: "audio/webm" });

        // 2. সরাসরি ব্রাউজারের WebM ফাইলটিকেই ব্যবহার করছি (কোনো Wasm প্রসেসিং ছাড়া)
        const fileName = `voice_${Date.now()}.webm`;
        const audioFile = new File([rawAudioBlob], fileName, {
          type: "audio/webm",
        });

        console.log(
          `Final Voice Size (Native WebM): ${(audioFile.size / 1024).toFixed(2)} KB`,
        );

        set({ compressedAudioFile: audioFile });

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
    set({ isRecording: false, recordingTime: 0, compressedAudioFile: null });
  },

  sendVoiceMessage: async (chatId) => {
    const { compressedAudioFile } = get();
    if (!compressedAudioFile) return;

    set({ isUploading: true });

    try {
      const signRes = await api.post(`${API_URL}/uploads/sign-supabase`, {
        fileName: compressedAudioFile.name,
        fileType: "audio",
        fileSize: Number(compressedAudioFile.size),
      });
      const { uploadUrl, path, publicUrl } = signRes.data;

      // Supabase-এ পুট (PUT) রিকোয়েস্ট (MIME type এখন audio/webm)
      await fetch(uploadUrl, {
        method: "PUT",
        body: compressedAudioFile,
        headers: { "Content-Type": "audio/webm" },
      });

      const confirmRes = await api.post(
        `${API_URL}/uploads/confirm-attachment`,
        {
          chatId,
          text: "",
          attachments: [
            {
              url: publicUrl,
              path,
              type: "VoiceMessage",
              name: compressedAudioFile.name,
              size: compressedAudioFile.size,
              mimeType: "audio/webm", // 🔴 MIME type আপডেট করা হয়েছে
              provider: "supabase",
              publicId: null,
            },
          ],
        },
      );

      if (confirmRes.data.success) {
        set({
          compressedAudioFile: null,
          recordingTime: 0,
          isUploading: false,
        });
      }
    } catch (error) {
      console.error("Voice message upload failed:", error);
      set({ isUploading: false });
    }
  },
}));
