"use client";

import { useChatStore } from "@/stores/useChatStore";
import LoginScreen from "@/components/chat/LoginScreen";
import ChatContainer from "@/components/chat/ChatContainer";

export default function ChatPage() {
  const isConnected = useChatStore((s) => s.isConnected);
  return isConnected ? <ChatContainer /> : <LoginScreen />;
}