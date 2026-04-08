// stores/mediaStore.ts
import { create } from "zustand";
import api from "@/lib/axios";
import { API_URL } from "@/lib/chat-helpers";
import { MessageStatus, StorageProvider } from "@/types/chat";

// ── Types ──
export type AttachmentType = "image" | "video" | "audio" | "file";

export interface SelectedMedia {
  id: string; // local temp id
  file: File;
  previewUrl: string; // blob URL (image এ দেখাবে)
  type: AttachmentType;
}

export interface Attachment {
  url: string;
  type: AttachmentType;
  name: string;
  size: number;
  mimeType: string;
  publicId?: string | null;
  path?: string | null;
  provider: StorageProvider;
}

export interface OptimisticPayload {
  _id: string;
  isTemp: true;
  content: string;
  attachments: Omit<Attachment, "provider">[];
  createdAt: string;
  status: MessageStatus.SENDING;
}

export interface ConfirmSuccessPayload {
  tempId: string;
  messageId: string;
  attachments: Attachment[];
  text: string;
}

// ── File type detector ──
const detectType = (file: File): AttachmentType => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

// ── Size limits ──
const SIZE_LIMITS: Record<AttachmentType, number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
  audio: 20 * 1024 * 1024, // 20MB
  file: 30 * 1024 * 1024, // 30MB
};

const MAX_FILES = 5;

interface MediaState {
  selectedMedias: SelectedMedia[]; // multiple files
  isUploading: boolean;
  uploadError: string | null;

  addFiles: (files: File[]) => { ok: boolean; error?: string };
  removeFile: (id: string) => void;
  clearMedia: () => void;
  uploadAndConfirm: (
    chatId: string,
    text: string,
    onOptimistic: (msg: OptimisticPayload) => void,
    onSuccess: (data: ConfirmSuccessPayload) => void,
    onError: (tempId: string) => void,
  ) => Promise<void>;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  selectedMedias: [],
  isUploading: false,
  uploadError: null,

  // ── File add ──
  addFiles: (files) => {
    const { selectedMedias } = get();

    if (selectedMedias.length + files.length > MAX_FILES) {
      return { ok: false, error: `Max ${MAX_FILES} files allowed` };
    }

    const errors: string[] = [];
    const valid: SelectedMedia[] = [];

    for (const file of files) {
      const type = detectType(file);
      const limit = SIZE_LIMITS[type];

      if (file.size > limit) {
        errors.push(`${file.name}: too large (max ${limit / 1024 / 1024}MB)`);
        continue;
      }

      // video/audio/file — preview URL দেখাবে না, শুধু icon
      const previewUrl = type === "image" ? URL.createObjectURL(file) : "";

      valid.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl,
        type,
      });
    }

    if (errors.length > 0) {
      return { ok: false, error: errors.join(", ") };
    }

    set((s) => ({ selectedMedias: [...s.selectedMedias, ...valid] }));
    return { ok: true };
  },

  // ── Single file remove ──
  removeFile: (id) => {
    const { selectedMedias } = get();
    const target = selectedMedias.find((m) => m.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    set((s) => ({
      selectedMedias: s.selectedMedias.filter((m) => m.id !== id),
    }));
  },

  // ── Clear all ──
  clearMedia: () => {
    if (get().isUploading) return;
    get().selectedMedias.forEach((m) => {
      if (m.previewUrl) URL.revokeObjectURL(m.previewUrl);
    });
    set({ selectedMedias: [], uploadError: null });
  },

  // ── Upload + Confirm ──
  uploadAndConfirm: async (chatId, text, onOptimistic, onSuccess, onError) => {
    const { selectedMedias } = get();
    if (selectedMedias.length === 0) return;

    const snapshot = [...selectedMedias]; // local copy
    const tempId = `temp_${Date.now()}`;

    // ── ১. Optimistic message ──
    onOptimistic({
      _id: tempId,
      isTemp: true,
      content: text,
      attachments: snapshot.map((m) => ({
        url: m.previewUrl,
        type: m.type,
        name: m.file.name,
        size: m.file.size,
        mimeType: m.file.type,
      })),
      createdAt: new Date().toISOString(),
      status: MessageStatus.SENDING,
    });

    // ── ২. Store clear — input bar ফাঁকা হবে ──
    snapshot.forEach((m) => {
      if (m.previewUrl) URL.revokeObjectURL(m.previewUrl);
    });
    set({ selectedMedias: [], isUploading: true, uploadError: null });

    try {
      const uploaded = await Promise.all(snapshot.map((m) => uploadSingle(m)));

      // ── ৩. DB confirm ──
      const confirmRes = await api.post(
        `${API_URL}/uploads/confirm-attachment`,
        {
          chatId,
          text,
          attachments: uploaded,
        },
      );

      set({ isUploading: false });

      if (confirmRes.data.success) {
        onSuccess({
          tempId,
          messageId: confirmRes.data.messageId,
          attachments: confirmRes.data.attachments,
          text,
        });
      } else {
        onError(tempId);
      }
    } catch (error: any) {
      set({
        isUploading: false,
        uploadError: error.response?.data?.message ?? "Upload failed.",
      });
      onError(tempId);
    }
  },
}));

// ── Single file upload helper ──
async function uploadSingle(
  media: SelectedMedia,
): Promise<Attachment & { provider: StorageProvider }> {
  const { file, type } = media;

  // ── Image → Cloudinary (server) ──
  if (type === "image") {
    const form = new FormData();
    form.append("media", file);
    const res = await api.post(`${API_URL}/uploads/chat-image`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return {
      url: res.data.url,
      publicId: res.data.publicId,
      type: "image",
      name: file.name,
      size: file.size,
      mimeType: file.type,
      provider: "cloudinary",
      path: null,
    };
  }

  // ── Video → Cloudinary (direct signed upload) ──
  if (type === "video") {
    const signRes = await api.post(`${API_URL}/uploads/sign-video`, {
      fileSize: file.size,
      fileName: file.name,
    });
    const { signature, timestamp, folder, apiKey, cloudName } = signRes.data;

    const form = new FormData();
    form.append("file", file);
    form.append("signature", signature);
    form.append("timestamp", String(timestamp));
    form.append("folder", folder);
    form.append("api_key", apiKey);

    // ── FIX: কাস্টম 'api.post'-এর বদলে ডিফল্ট 'fetch' ব্যবহার করা হলো ──
    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      {
        method: "POST",
        body: form,
      },
    );

    const cloudData = await cloudRes.json();

    // যদি Cloudinary থেকে কোনো এরর আসে
    if (!cloudRes.ok) {
      throw new Error(
        cloudData.error?.message || "Cloudinary video upload failed",
      );
    }

    return {
      url: cloudData.secure_url,
      publicId: cloudData.public_id,
      type: "video",
      name: file.name,
      size: file.size,
      mimeType: file.type,
      provider: "cloudinary",
      path: null,
    };
  }

  // ── Audio / File → Supabase (direct signed upload) ──
  const fileType = type === "audio" ? "audio" : "file";
  const signRes = await api.post(`${API_URL}/uploads/sign-supabase`, {
    fileName: file.name,
    fileType,
    fileSize: file.size,
  });
  const { uploadUrl, path, publicUrl } = signRes.data;

  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  return {
    url: publicUrl,
    path,
    type,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    provider: "supabase",
    publicId: null,
  };
}
