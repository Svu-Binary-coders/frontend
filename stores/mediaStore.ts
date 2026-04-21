/* eslint-disable @typescript-eslint/no-explicit-any */
// stores/mediaStore.ts
import { create } from "zustand";
import api from "@/lib/axios";
import { API_URL } from "@/lib/chat-helpers";
import { MessageStatus, StorageProvider } from "@/types/chat";
import { getWasmEngine, getFreshHeap } from "@/lib/wasm/index"; // 🔴 Manager ইম্পোর্ট

export type AttachmentType =
  | "image"
  | "video"
  | "audio"
  | "file"
  | "VoiceMessage";

export interface SelectedMedia {
  id: string;
  file: File;
  previewUrl: string;
  type: AttachmentType;
}

export interface UploadingMedia {
  id: string;
  type: AttachmentType;
  previewUrl: string;
  name: string;
  size: number;
  progress: number;
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
  VoiceMessage: 5 * 1024 * 1024,
};

const MAX_FILES = 5;

// Wasm compression function, which takes a File and returns a compressed File (or the original if compression fails)
const compressWithWasm = async (
  file: File,
  quality: number = 75,
): Promise<File> => {
  const wasm = getWasmEngine();

  if (!wasm) {
    console.warn("Wasm Engine not fully ready. Returning original file.");
    return file;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const inputPtr = wasm._malloc(uint8Array.length);

    let heap = getFreshHeap(wasm);
    heap.set(uint8Array, inputPtr);

    const success = wasm._process_image_wasm(
      inputPtr,
      uint8Array.length,
      quality,
    );

    if (success === 1) {
      const outPtr = wasm._get_out_data();
      const outSize = wasm._get_out_size();

      heap = getFreshHeap(wasm);
      const heapView = new Uint8Array(heap.buffer, outPtr, outSize);
      const resultBytes = new Uint8Array(outSize);
      resultBytes.set(heapView);

      const compressedFile = new File([resultBytes], file.name, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      wasm._free_out();
      wasm._free(inputPtr);

      return compressedFile;
    } else {
      wasm._free(inputPtr);
      return file;
    }
  } catch (err) {
    console.error("Wasm compression error:", err);
    return file;
  }
};
//

// XHR upload — withCredentials + upload progress
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
    if (!skipCredentials) xhr.withCredentials = true;

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
    xhr.send(body);
  });
}

// Single file upload
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

interface MediaState {
  selectedMedias: SelectedMedia[];
  uploadingMedias: UploadingMedia[];
  isUploading: boolean;
  uploadError: string | null;
  uploadVoice: (
    file: File,
    chatId: string,
    onOptimistic: (msg: OptimisticPayload | any) => void,
    onSuccess: (data: ConfirmSuccessPayload) => void,
    onError: (tempId: string) => void,
  ) => Promise<void>;
  addFiles: (files: File[]) => Promise<{ ok: boolean; error?: string }>;
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

  addFiles: async (files) => {
    const { selectedMedias } = get();
    if (selectedMedias.length + files.length > MAX_FILES) {
      return { ok: false, error: `Max ${MAX_FILES} files allowed` };
    }

    const errors: string[] = [];
    const valid: SelectedMedia[] = [];

    for (const originalFile of files) {
      const type = detectType(originalFile);
      let processedFile = originalFile;

      if (type === "image") {
        processedFile = await compressWithWasm(originalFile, 80);
      }

      console.log(
        `File: ${originalFile.name} | Before: ${(originalFile.size / 1024).toFixed(2)} KB | After: ${(processedFile.size / 1024).toFixed(2)} KB`,
      );

      const limit = SIZE_LIMITS[type];
      if (processedFile.size > limit) {
        errors.push(
          `${processedFile.name}: too large (max ${limit / 1024 / 1024}MB)`,
        );
        continue;
      }

      valid.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file: processedFile,
        previewUrl: type === "image" ? URL.createObjectURL(processedFile) : "",
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
        url: m.previewUrl,
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
  uploadVoice: async (file, chatId, onOptimistic, onSuccess, onError) => {
    const tempId = `temp_${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);
    const mediaId = `voice_${Date.now()}`;

    // optimistic update , instantly show the voice message in the chat with a temporary ID and "sending" status
    onOptimistic({
      _id: tempId,
      isTemp: true,
      content: "",
      attachments: [
        {
          url: previewUrl,
          type: "VoiceMessage",
          name: file.name,
          size: file.size,
          mimeType: "audio/webm",
        },
      ],
      createdAt: new Date().toISOString(),
      status: MessageStatus.SENDING,
    });

    // add the uploading media to the store to show upload progress in the UI
    set((state) => ({
      isUploading: true,
      uploadingMedias: [
        ...state.uploadingMedias,
        {
          id: mediaId,
          type: "audio",
          previewUrl,
          name: file.name,
          size: file.size,
          progress: 0,
          done: false,
        },
      ],
    }));

    try {
      //  upload the voice file and get the attachment data (like URL) in response
      const uploadedAtt = await uploadSingle(
        { id: mediaId, file, previewUrl, type: "audio" },
        (pct) => {
          set((s) => ({
            uploadingMedias: s.uploadingMedias.map((u) =>
              u.id === mediaId ? { ...u, progress: pct, done: pct === 100 } : u,
            ),
          }));
        },
      );

      // Since this is a voice message, we need to explicitly set the type to "VoiceMessage" for the backend to recognize it as such
      uploadedAtt.type = "VoiceMessage";

      const confirmRes = await api.post(
        `${API_URL}/uploads/confirm-attachment`,
        {
          chatId,
          text: "",
          attachments: [uploadedAtt],
        },
      );

// after upload (regardless of success or failure), we need to remove the uploading media from the store and revoke the preview URL to free up memory
      set((s) => ({
        isUploading: s.uploadingMedias.length <= 1 ? false : s.isUploading,
        uploadingMedias: s.uploadingMedias.filter((u) => u.id !== mediaId),
      }));

      // if upload and confirmation is successful, we call onSuccess with the real message ID and attachment data to update the optimistic message in the chat. If it fails, we call onError to revert the optimistic update. In both cases, we also revoke the preview URL since it's no longer needed after upload completes.
      if (confirmRes.data.success) {
        onSuccess({
          tempId,
          messageId: confirmRes.data.messageId || confirmRes.data.message?._id,
          attachments: confirmRes.data.attachments ||
            confirmRes.data.message?.attachments || [uploadedAtt],
          text: "",
        });
        setTimeout(() => URL.revokeObjectURL(previewUrl), 2000);
      } else {
        onError(tempId);
      }
    } catch (error) {
      console.error("Voice upload failed:", error);
      onError(tempId);
      set((s) => ({
        isUploading: s.uploadingMedias.length <= 1 ? false : s.isUploading,
        uploadingMedias: s.uploadingMedias.filter((u) => u.id !== mediaId),
      }));
      URL.revokeObjectURL(previewUrl);
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
