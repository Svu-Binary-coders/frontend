import api from "@/lib/axios";
import React, { useState } from "react";
import { toast } from "sonner";

export default function ChatLock() {
  const [newPadsword, setNewPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data } = await api.post("/user/set-chat-lock-password", {
        password: newPadsword,
        oldPassword: oldPassword,
      });
      if(data.success) {
        toast.success("Chat lock password updated successfully!");
        setOldPassword("");
        setNewPassword("");
      }
    } catch (error) {
      console.error("Error setting chat lock password:", error);
      toast.error("Failed to set chat lock password. Please try again.");
    }
  };

  return <div></div>;
}
