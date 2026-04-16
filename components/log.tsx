"use client";

import { KeyManager } from "@/core/e2e";
import { useAuthStore } from "@/stores/authStore";

export const initDebugLog = async () => {
  if (typeof window !== "undefined") {
    const myId = useAuthStore.getState().myDetails?.customId;
    if (myId) {
      try {
        const rawData = await KeyManager._idbGet(`fcp_identity_${myId}`);
        console.log("--- FCP Identity Debug Log ---");
        console.log("User ID:", myId);
        console.log("Data:", rawData);
      } catch (err) {
        console.error("IndexedDB পড়তে সমস্যা হয়েছে:", err);
      }
    } else {
      console.warn("Log করার জন্য কোনো myId পাওয়া যায়নি।");
    }
  }
};
