import React from "react";
import ChatPage from "./_mainChat";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sequre - Chat",
  description:
    "Chat with your contacts securely and privately using Sequre's end-to-end encrypted messaging platform. Experience seamless communication while keeping your conversations safe from prying eyes.",
    robots: "noindex, nofollow",
};

export default function page() {
  return (
    <div>
      <ChatPage />
    </div>
  );
}
