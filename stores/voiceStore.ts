/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface VoiceState {
  isRecording: boolean;
  recordingTime: number;
  compressedAudioFile: File | null; // UI-তে প্রিভিউ দেখানোর জন্য

  startRecording: () => Promise<void>;
  // 🔴 এটি রেকর্ডিং থামাবে এবং ফাইল ও ডিউরেশন রিটার্ন করবে
  stopRecording: () => Promise<{ file: File; duration: number } | null>;
  cancelRecording: () => void;
}

// স্টোরের বাইরে ভেরিয়েবল রাখা হয়েছে যাতে রি-রেন্ডারিংয়ে সমস্যা না হয়
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let timerInterval: NodeJS.Timeout | null = null;

export const useVoiceStore = create<VoiceState>((set, get) => ({
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
        // নতুন রেকর্ডিং শুরুর আগে সবকিছু রিসেট করে নিন
        set({ isRecording: true, recordingTime: 0, compressedAudioFile: null });

        // টাইমার শুরু করুন
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

  stopRecording: async () => {
    return new Promise((resolve) => {
      // যদি আগে থেকেই বন্ধ থাকে বা না থাকে, তবে null রিটার্ন করবে
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = async () => {
        // ১. সবার আগে টাইমার বন্ধ করুন
        if (timerInterval) clearInterval(timerInterval);

        // ২. অডিও চাঙ্ক থেকে ফাইল তৈরি করুন
        const rawAudioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const fileName = `voice_${Date.now()}.webm`;
        const audioFile = new File([rawAudioBlob], fileName, {
          type: "audio/webm",
        });

        // ✅ ৩. টাইম জিরো করার আগে আসল ডিউরেশনটা ধরে রাখুন!
        const finalDuration = get().recordingTime;

        // ৪. স্টোর আপডেট করুন (এখানে recordingTime জিরো করবেন না, প্রিভিউর জন্য লাগবে)
        set({
          isRecording: false,
          compressedAudioFile: audioFile,
        });

        // ৫. মাইক্রোফোনের এক্সেস রিলিজ করে দিন
        mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

        // ✅ ৬. ফাইল এবং ডিউরেশন দুটোই রিটার্ন করে দিন
        resolve({ file: audioFile, duration: finalDuration });
      };

      // রেকর্ডিং থামানোর কমান্ড দিন
      mediaRecorder.stop();
    });
  },

  cancelRecording: () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    if (timerInterval) clearInterval(timerInterval);
    mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

    // ক্যান্সেল করলে সবকিছু রিসেট করে দিন
    set({ isRecording: false, recordingTime: 0, compressedAudioFile: null });
  },
}));
