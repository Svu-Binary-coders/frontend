"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  MessageCircle,
  Phone,
  Video,
  Share2,
  MapPin,
  AtSign,
  Globe,
  Ban,
  Flag,
  Loader2,
  Calendar,
  Mail,
  Star,
  Pin,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/axios";
import { API_URL, fmtTime } from "@/lib/chat-helpers";
import { useChatStore } from "@/stores/chatStore";
import { ActionTooltip } from "../reuse/ActionTooltip";

interface UserProfile {
  _id: string;
  userName: string;
  userEmail: string;
  customId: string;
  profilePicture?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  location?: { city: string; country: string };
  website?: string;
  createdAt?: string;
}

interface Props {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  const res = await api.get(`${API_URL}/chats/viewDetails/${userId}`);
  return res.data.user;
};

export default function ProfilePanel({ userId, open, onClose }: Props) {
  // 🎯 View কন্ট্রোল করার স্টেট (main = Profile, media = Gallery)
  const [currentView, setCurrentView] = useState<"main" | "media">("main");

  // প্যানেল বন্ধ করলে যেন আবার মেইন প্রোফাইলে ফিরে আসে
  useEffect(() => {
    if (!open) {
      setTimeout(() => setCurrentView("main"), 300);
    }
  }, [open]);

  const {
    data: user,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId && open,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { togglePin, toggleFavorite, contacts, openChat } = useChatStore();

  const contactStoreData = useMemo(() => {
    return contacts.find((c) => c._id === userId);
  }, [contacts, userId]);

  const isPinned = contactStoreData?.isPinned || false;
  const isFavorite = contactStoreData?.isFavorite || false;
  const customChatId = contactStoreData?.customChatId;

  return (
    <div
      className={`absolute top-0 right-0 h-full w-full md:w-[340px] lg:w-[400px] z-20
                   bg-slate-50 dark:bg-slate-950
                   border-l border-slate-200 dark:border-slate-800
                   flex flex-col overflow-hidden
                   transition-transform duration-300 ease-in-out
                   ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* Media View */}
      {currentView === "media" ? (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 animate-in slide-in-from-right-8 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 shadow-sm shrink-0 border-b dark:border-slate-800">
            <ActionTooltip text="Back to Profile" side="left">
              <button
                onClick={() => setCurrentView("main")}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors outline-none"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
            </ActionTooltip>
            <span className="text-[16px] font-semibold text-slate-800 dark:text-slate-200">
              Shared Media
            </span>
          </div>

          {/* Media Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="grid grid-cols-3 gap-2">
              {/* Placeholder media items */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        // main profile view
        <div className="flex flex-col h-full animate-in slide-in-from-left-8 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-blue-600 dark:bg-slate-900 text-white shrink-0 border-b dark:border-slate-800">
            <ActionTooltip text="Close" side="left">
              <button
                onClick={onClose}
                className="hover:bg-white/20 p-1.5 rounded-full transition-colors outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </ActionTooltip>
            <span className="text-[17px] font-semibold tracking-wide">
              Contact Info
            </span>
          </div>

          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600 dark:text-blue-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading profile...
              </p>
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Could not load profile.
              </p>
              <button
                onClick={() => refetch()}
                className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1 hover:underline outline-none"
              >
                Try again
              </button>
            </div>
          )}

          {user && !isLoading && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Cover + Avatar */}
              <div className="flex flex-col items-center py-8 bg-gradient-to-b from-blue-500 to-blue-600 dark:from-slate-800 dark:to-slate-900">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-800 shadow-md">
                    <AvatarImage src={user.profilePicture} />
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-3xl font-bold">
                      {user.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.isOnline && (
                    <span
                      className="absolute bottom-1 right-1 w-4 h-4 rounded-full
                                   bg-green-500 border-2 border-white dark:border-slate-800"
                    />
                  )}
                </div>
                <h2 className="mt-3 text-[20px] font-semibold text-white">
                  {user.userName}
                </h2>
                <p className="text-blue-100 dark:text-slate-400 text-[13px] mt-1 flex items-center gap-1.5">
                  {user.isOnline ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
                      Online
                    </>
                  ) : user.lastSeen ? (
                    `Last seen ${fmtTime(user.lastSeen)}`
                  ) : (
                    "Offline"
                  )}
                </p>
              </div>

              {/* Quick Action buttons */}
              <div className="flex justify-center gap-2 px-4 py-5 bg-white dark:bg-slate-900 shadow-sm border-b border-slate-100 dark:border-slate-800">
                {[
                  { icon: MessageCircle, label: "Message" },
                  { icon: Phone, label: "Audio" },
                  { icon: Video, label: "Video" },
                  { icon: Share2, label: "Share" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (label === "Message" && contactStoreData) {
                        openChat(contactStoreData);
                        onClose();
                      } else {
                        console.log(`${label} feature coming soon!`);
                      }
                    }}
                    className="flex flex-col items-center gap-2 flex-1 group outline-none"
                  >
                    <div
                      className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 
                                  flex items-center justify-center group-hover:bg-blue-100 
                                  dark:group-hover:bg-blue-500/20 transition-all duration-300 transform group-hover:scale-105"
                    >
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-[12px] text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Bio */}
              <PanelSection>
                <div className="px-5 py-4">
                  <p className="text-[12px] text-blue-600 dark:text-blue-400 font-semibold mb-1.5 uppercase tracking-wider">
                    About
                  </p>
                  <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {user.bio || "No bio available."}
                  </p>
                </div>
              </PanelSection>

              {/* Shared Media Section */}
              <PanelSection>
                <div className="px-5 py-4">
                  <button
                    onClick={() => setCurrentView("media")}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-lg transition-colors mb-3 outline-none group"
                  >
                    <span className="text-[12px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                      Shared Media
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                        See All
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>

                  <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-[72px] h-[72px] rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setCurrentView("media")}
                      />
                    ))}
                  </div>
                </div>
              </PanelSection>

              {/* Info rows */}
              <PanelSection>
                <PanelRow
                  icon={<Mail className="w-4 h-4" />}
                  label={user.userEmail}
                  sub="Email"
                />

                <PanelRow
                  icon={<AtSign className="w-4 h-4" />}
                  label={`@${user.customId}`}
                  sub="User ID"
                />
                {user.location && (
                  <PanelRow
                    icon={<MapPin className="w-4 h-4" />}
                    label={`${user.location.city}, ${user.location.country}`}
                    sub="Location"
                  />
                )}
                {user.website && (
                  <PanelRow
                    icon={<Globe className="w-4 h-4" />}
                    label={user.website}
                    sub="Website"
                    isLink
                  />
                )}
                {user.createdAt && (
                  <PanelRow
                    icon={<Calendar className="w-4 h-4" />}
                    label={fmtTime(user.createdAt)}
                    sub="Member since"
                    last
                  />
                )}
              </PanelSection>

              {/* User Action Section (Pin/Favorite) */}
              <PanelSection>
                <div className="flex flex-col">
                  {/* Favorite Button */}
                  <button
                    onClick={() => {
                      if (customChatId) toggleFavorite(customChatId);
                    }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group outline-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors shrink-0">
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          isFavorite
                            ? "text-amber-500 fill-amber-500"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      />
                    </div>
                    <span className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                      {isFavorite
                        ? "Remove from Favorites"
                        : "Add to Favorites"}
                    </span>
                  </button>

                  {/* Pin Button */}
                  <button
                    onClick={() => {
                      if (customChatId) togglePin(customChatId);
                    }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group outline-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors shrink-0">
                      <Pin
                        className={`w-4 h-4 transition-colors ${
                          isPinned
                            ? "text-slate-800 dark:text-slate-200 fill-slate-800 dark:fill-slate-200"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      />
                    </div>
                    <span className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                      {isPinned ? "Unpin Conversation" : "Pin Conversation"}
                    </span>
                  </button>
                </div>
              </PanelSection>

              {/* Danger zone */}
              <PanelSection className="mb-8 border-t-0">
                <DangerRow
                  icon={<Ban className="w-4 h-4" />}
                  label={`Block @${user.customId}`}
                />
                <DangerRow
                  icon={<Flag className="w-4 h-4" />}
                  label={`Report User`}
                  last
                />
              </PanelSection>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PanelSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 mt-2 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PanelRow({
  icon,
  label,
  sub,
  last = false,
  isLink = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  last?: boolean;
  isLink?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5
        ${!last ? "border-b border-slate-100 dark:border-slate-800/50" : ""}`}
    >
      <div
        className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10
                    flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className={`text-[14px] font-medium truncate
            ${
              isLink
                ? "text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                : "text-slate-800 dark:text-slate-200"
            }`}
        >
          {label}
        </p>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
          {sub}
        </p>
      </div>
    </div>
  );
}

function DangerRow({
  icon,
  label,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  last?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-4 px-5 py-3.5 outline-none
        hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors group
        ${!last ? "border-b border-slate-100 dark:border-slate-800/50" : ""}`}
    >
      <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-colors">
        <span className="text-red-500 dark:text-red-400">{icon}</span>
      </div>
      <span className="text-[14px] font-medium text-red-600 dark:text-red-400">
        {label}
      </span>
    </button>
  );
}
