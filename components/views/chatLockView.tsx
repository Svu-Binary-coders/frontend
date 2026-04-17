"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  MoreVertical,
  Ban,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Unlock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import {
  useSetLockPasswordGlobal,
  useVerifyGlobalPin,
  useUnlockChat,
} from "@/hooks/useChatAction";
import { Contact } from "@/types/chat";

//  PIN Dialog (With Show/Hide PIN)
interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onSubmit: (pin: string) => void;
  isPending?: boolean;
  error?: string;
  closable?: boolean;
}

function PinDialog({
  open,
  onClose,
  title,
  description,
  onSubmit,
  isPending,
  error,
  closable = true,
}: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = () => {
    if (pin.length < 4) return;
    onSubmit(pin);
    setPin("");
    setShowPin(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className="max-w-sm dark:bg-slate-900 dark:border-slate-800"
        {...(!closable && {
          onPointerDownOutside: (e) => e.preventDefault(),
          onEscapeKeyDown: (e) => e.preventDefault(),
        })}
      >
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-sky-100 dark:bg-sky-500/10 rounded-full">
              <KeyRound className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="relative">
            <Input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className={cn(
                "text-center text-xl tracking-widest pr-10 dark:bg-slate-800 dark:border-slate-700",
                error &&
                  "border-red-500 dark:border-red-500 focus-visible:ring-red-500",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showPin ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <Button
            className="w-full bg-sky-600 hover:bg-sky-700 text-white"
            onClick={handleSubmit}
            disabled={pin.length < 4 || isPending}
          >
            {isPending ? "Verifying..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

//  Locked Contact Item

interface LockedContactItemProps {
  contact: Contact;
  isActive: boolean;
  onClickChat: (contact: Contact) => void;
  onBlock?: (id: string) => void;
  onDelete?: (customChatId: string) => void;
}

function LockedContactItem({
  contact,
  isActive,
  onClickChat,
  onBlock,
  onDelete,
}: LockedContactItemProps) {
  const initials = contact.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // শুধু আনলক হুকটা নিলাম
  const { mutate: unlockChat, isPending: isUnlocking } = useUnlockChat(
    contact.customChatId as string,
  );

  return (
    <div
      onClick={() => onClickChat(contact)}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 transition-all duration-200 cursor-pointer outline-none",
        "hover:bg-sky-50/60 dark:hover:bg-slate-800/60",
        isActive
          ? "bg-sky-100/80 dark:bg-sky-500/10 border-l-[3px] border-sky-600 dark:border-sky-500"
          : "bg-transparent border-l-[3px] border-transparent hover:border-sky-300 dark:hover:border-slate-600",
        isUnlocking && "opacity-50 pointer-events-none", // আনলক হওয়ার সময় একটু হালকা হয়ে থাকবে
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11 border border-slate-200/10 dark:border-slate-800 transition-transform duration-200 group-hover:scale-105">
          <AvatarImage src={contact.avatar} alt={contact.name} />
          <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-600 text-white text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {contact.isOnline && (
          <span
            className={cn(
              "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500",
              "ring-2 ring-white dark:ring-[#0b141a] shadow-sm z-10",
            )}
          />
        )}

        {!contact.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-slate-700 dark:bg-slate-600 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            <Lock className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <p
          className={cn(
            "text-sm truncate transition-colors",
            isActive
              ? "text-sky-600 dark:text-sky-400 font-bold"
              : "font-medium text-slate-700 dark:text-slate-300",
          )}
        >
          {contact.name}
        </p>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-slate-400" />
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {contact.lastMessage
              ? `${contact.lastMessage.content.slice(0, 30)}${contact.lastMessage.content.length > 30 ? "..." : ""}`
              : "No messages yet"}
          </p>
        </div>
      </div>

      {/* 3-dot menu */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors outline-none"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44 dark:bg-slate-900 dark:border-slate-800 z-50"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                unlockChat();
              }}
              disabled={isUnlocking}
              className="cursor-pointer gap-2 text-sky-600 dark:text-sky-500"
            >
              <Unlock className="h-4 w-4" />
              <span>{isUnlocking ? "Unlocking..." : "Unlock Chat"}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onBlock?.(contact._id);
              }}
              className="cursor-pointer gap-2 text-orange-600 dark:text-orange-500"
            >
              <Ban className="h-4 w-4" />
              <span>Block User</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(contact.customChatId as string);
              }}
              className="cursor-pointer gap-2 text-red-600 dark:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Chat</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

//  Main View

export default function ChatLockView() {
  const router = useRouter();
  const { isChatLockEnabled } = useAuthStore();
  const { contacts, activeContact, openChat } = useChatStore();

  const lockedContacts = contacts.filter((c) => c.isChatLock === true);

  const [view, setView] = useState<"setup" | "verify" | "list">(
    !isChatLockEnabled ? "setup" : "verify",
  );

  const [setupError, setSetupError] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const { mutate: setGlobalPin, isPending: isSettingPin } =
    useSetLockPasswordGlobal();
  const { mutate: verifyGlobalPin, isPending: isVerifying } =
    useVerifyGlobalPin();

  const goBack = () => router.back();

  useEffect(() => {
    openChat(null);
    return () => {
      openChat(null);
    };
  }, [openChat]);

  const handleSetupPin = (pin: string) => {
    setSetupError("");
    setGlobalPin(
      { pin },
      {
        onSuccess: () => setView("list"),
        onError: () => setSetupError("Failed to set PIN. Please try again."),
      },
    );
  };

  const handleVerifyPin = (pin: string) => {
    setVerifyError("");
    verifyGlobalPin(
      { pin },
      {
        onSuccess: () => setView("list"),
        onError: () => setVerifyError("Wrong PIN. Please try again."),
      },
    );
  };

  const handleOpenChat = (contact: Contact) => {
    openChat(contact);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <PinDialog
        open={view === "setup"}
        onClose={goBack}
        title="Set up Chat Lock"
        description="Create a secure PIN to lock and unlock your chats."
        onSubmit={handleSetupPin}
        isPending={isSettingPin}
        error={setupError}
      />
      <PinDialog
        open={view === "verify"}
        onClose={goBack}
        title="Enter your PIN"
        description="Verify your PIN to access locked chats."
        onSubmit={handleVerifyPin}
        isPending={isVerifying}
        error={verifyError}
      />

      {view === "list" && (
        <>
          <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="mb-2 md:hidden">
              <Button
                variant="ghost"
                onClick={goBack}
                className="flex items-center gap-2 px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Go Back</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <br />
              <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Locked Chats
              </h2>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {lockedContacts.length} chat
              {lockedContacts.length !== 1 ? "s" : ""} locked
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {lockedContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                  <Lock className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  No locked chats
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Lock a chat from the chat list using the menu.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {lockedContacts.map((contact) => (
                  <LockedContactItem
                    key={contact._id}
                    contact={contact}
                    isActive={activeContact?._id === contact._id}
                    onClickChat={handleOpenChat}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
