import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { API_URL } from "@/lib/chat-helpers";
import { Contact } from "@/types/chat";
import { useChatStore } from "@/stores/chatStore";
import api from "@/lib/axios";

export const useContacts = (userId: string) => {
  const query = useQuery({
    queryKey: ["contacts", userId],
    networkMode: "offlineFirst",
    queryFn: async () => {
      const { data } = await api.get(`/chats/${userId}/contacts`);
      if (!data.success) throw new Error("Failed to load contacts");
      console.log("Fetched contacts:", data.contacts);
      return data.contacts;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // 1 hour
    meta: { persist: true },
  });

  useEffect(() => {
    if (!query.data) return;
    const { socket } = useChatStore.getState();

    query.data.forEach((c: Contact) => {
      socket?.emit("check_status", c._id, ({ online }: { online: boolean }) => {
        useChatStore.setState((s) => ({
          contacts: s.contacts.map((x) =>
            x._id === c._id ? { ...x, isOnline: online } : x,
          ),
        }));
      });
    });

    useChatStore.setState({ contacts: query.data });
  }, [query.data]);

  return query;
};
