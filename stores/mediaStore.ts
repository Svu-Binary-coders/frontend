/* eslint-disable @typescript-eslint/no-explicit-any */
// stores/mediaStore.ts
import { create } from "zustand";
import api from "@/lib/axios";
import { API_URL } from "@/lib/chat-helpers";
import { MessageStatus, StorageProvider } from "@/types/chat";

export type AttachmentType = "image" | "video" | "audio" | "file";

export interface SelectedMedia {
  id: string;
  file: File;
  previewUrl: string;
  type: AttachmentType;
}

export interface UploadingMedia {
  id: string;
  type: AttachmentType;
  previewUrl: string; // blob URL — matching key
  name: string;
  size: number;
  progress: number; // 0-100
  done: boolean;
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

const detectType = (file: File): AttachmentType => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

const SIZE_LIMITS: Record<AttachmentType, number> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  file: 30 * 1024 * 1024,
};

const MAX_FILES = 5;

//  XHR upload — withCredentials + upload progress
function xhrUpload(
  url: string,
  body: FormData | File | Blob,
  onProgress?: (pct: number) => void,
  options: {
    method?: "POST" | "PUT";
    skipCredentials?: boolean;
    extraHeaders?: Record<string, string>;
  } = {},
): Promise<any> {
  const {
    method = "POST",
    skipCredentials = false,
    extraHeaders = {},
  } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    if (!skipCredentials) {
      xhr.withCredentials = true; // cookie auto-attach
    }

    Object.entries(extraHeaders).forEach(([k, v]) =>
      xhr.setRequestHeader(k, v),
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({});
        }
      } else {
        let message = `Upload failed: ${xhr.status}`;
        try {
          const err = JSON.parse(xhr.responseText);
          message = err?.error?.message ?? err?.message ?? message;
        } catch {}
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.send(body);
  });
}

//  Single file upload
async function uploadSingle(
  media: SelectedMedia,
  onProgress?: (pct: number) => void,
): Promise<Attachment & { provider: StorageProvider }> {
  const { file, type } = media;

  if (type === "image") {
    const form = new FormData();
    form.append("media", file);
    const data = await xhrUpload(
      `${API_URL}/uploads/chat-image`,
      form,
      onProgress,
    );
    return {
      url: data.url,
      publicId: data.publicId,
      type: "image",
      name: file.name,
      size: file.size,
      mimeType: file.type,
      provider: "cloudinary",
      path: null,
    };
  }

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

    const cloudData = await xhrUpload(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      form,
      onProgress,
      { skipCredentials: true },
    );

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

  // Audio / File → Supabase
  const fileType = type === "audio" ? "audio" : "file";
  const signRes = await api.post(`${API_URL}/uploads/sign-supabase`, {
    fileName: file.name,
    fileType,
    fileSize: Number(file.size),
  });
  const { uploadUrl, path, publicUrl } = signRes.data;

  await xhrUpload(uploadUrl, file, onProgress, {
    method: "PUT",
    skipCredentials: true,
    extraHeaders: { "Content-Type": file.type },
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

//  Store
interface MediaState {
  selectedMedias: SelectedMedia[];
  uploadingMedias: UploadingMedia[];
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
  uploadingMedias: [],
  isUploading: false,
  uploadError: null,

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
      valid.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: type === "image" ? URL.createObjectURL(file) : "",
        type,
      });
    }

    if (errors.length > 0) return { ok: false, error: errors.join(", ") };
    set((s) => ({ selectedMedias: [...s.selectedMedias, ...valid] }));
    return { ok: true };
  },

  removeFile: (id) => {
    const target = get().selectedMedias.find((m) => m.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    set((s) => ({
      selectedMedias: s.selectedMedias.filter((m) => m.id !== id),
    }));
  },

  clearMedia: () => {
    if (get().isUploading) return;
    get().selectedMedias.forEach((m) => {
      if (m.previewUrl) URL.revokeObjectURL(m.previewUrl);
    });
    set({ selectedMedias: [], uploadError: null, uploadingMedias: [] });
  },

  uploadAndConfirm: async (chatId, text, onOptimistic, onSuccess, onError) => {
    const { selectedMedias } = get();
    if (selectedMedias.length === 0) return;

    const snapshot = [...selectedMedias];
    const tempId = `temp_${Date.now()}`;

    onOptimistic({
      _id: tempId,
      isTemp: true,
      content: text,
      attachments: snapshot.map((m) => ({
        url: m.previewUrl, // blob URL
        type: m.type,
        name: m.file.name,
        size: m.file.size,
        mimeType: m.file.type,
      })),
      createdAt: new Date().toISOString(),
      status: MessageStatus.SENDING,
    });

    set({
      selectedMedias: [],
      isUploading: true,
      uploadError: null,
      uploadingMedias: snapshot.map((m) => ({
        id: m.id,
        type: m.type,
        previewUrl: m.previewUrl,
        name: m.file.name,
        size: m.file.size,
        progress: 0,
        done: false,
      })),
    });

    try {
      const uploaded = await Promise.all(
        snapshot.map((m) =>
          uploadSingle(m, (pct) => {
            set((s) => ({
              uploadingMedias: s.uploadingMedias.map((u) =>
                u.id === m.id ? { ...u, progress: pct, done: pct === 100 } : u,
              ),
            }));
          }),
        ),
      );

      const confirmRes = await api.post(
        `${API_URL}/uploads/confirm-attachment`,
        { chatId, text, attachments: uploaded },
      );

      snapshot.forEach((m) => {
        if (m.previewUrl) URL.revokeObjectURL(m.previewUrl);
      });
      set({ isUploading: false, uploadingMedias: [] });

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
      snapshot.forEach((m) => {
        if (m.previewUrl) URL.revokeObjectURL(m.previewUrl);
      });
      set({
        isUploading: false,
        uploadingMedias: [],
        uploadError:
          error.response?.data?.message ?? error.message ?? "Upload failed.",
      });
      onError(tempId);
    }
  },
}));

export function useAttachmentProgress(attachmentUrl: string) {
  return useMediaStore((s) => {
    if (!attachmentUrl.startsWith("blob:")) return null;
    const match = s.uploadingMedias.find((u) => u.previewUrl === attachmentUrl);
    return match ? { progress: match.progress, done: match.done } : null;
  });
}
