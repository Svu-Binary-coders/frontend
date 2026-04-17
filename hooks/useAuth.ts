import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { KeyManager } from "@/core/e2e/KeyManager"; // এটি ইমপোর্ট করতে ভুলবেন না
import { useSessionStore } from "@/stores/sessionStore";

export const useAuth = () => {
  const query = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me");
      if (!data.success) throw new Error("Unauthorized");
      return data.userDetails;
    },
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    const setupSession = async () => {
      if (query.data) {
        const activeKeys = await KeyManager.loadActiveKeys();

        useSessionStore.setState({
          userId: query.data._id,
          privateKey: activeKeys?.privateKey || null,
          signingKey: activeKeys?.signingKey || null,
          needPin: !activeKeys,
        });
        console.log("Active keys loaded into session store:", {
          privateKey: activeKeys?.privateKey,
          signingKey: activeKeys?.signingKey,
        });

        useAuthStore.setState({
          myId: query.data._id,
          myDetails: query.data,
          isAuthenticated: true,
          isChatLockEnabled: query.data.isChatLockEnabled,
        });

        // socket setup
        const { socket } = useChatStore.getState();
        socket?.emit("setup", query.data._id);
      }
    };

    setupSession();
  }, [query.data]);

  return query;
};
