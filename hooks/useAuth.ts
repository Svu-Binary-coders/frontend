import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";

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
    if (query.data) {
      useAuthStore.setState({
        myId: query.data._id,
        myDetails: query.data,
        isAuthenticated: true,
      });

      // socket setup
      const { socket } = useChatStore.getState();
      socket?.emit("setup", query.data._id);
    }
  }, [query.data]);

  return query;
};
