"use client";
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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/axios";
import { API_URL, fmtTime } from "@/lib/chat-helpers";

interface UserProfile {
  _id: string;
  userName: string;
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

  return (
    <div
      className={`absolute top-0 right-0 h-full w-full md:w-[340px] lg:w-[400px] z-20
                   bg-slate-50 dark:bg-slate-950
                   border-l border-slate-200 dark:border-slate-800
                   flex flex-col overflow-hidden
                   transition-transform duration-300 ease-in-out
                   ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-blue-600 dark:bg-slate-900 text-white flex-shrink-0 border-b dark:border-slate-800">
        <button
          onClick={onClose}
          className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
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
            className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1 hover:underline"
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

          {/* Action buttons */}
          <div className="flex justify-center gap-2 px-4 py-5 bg-white dark:bg-slate-900 shadow-sm">
            {[
              { icon: MessageCircle, label: "Message" },
              { icon: Phone, label: "Audio" },
              { icon: Video, label: "Video" },
              { icon: Share2, label: "Share" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex flex-col items-center gap-2 flex-1 group"
              >
                <div
                  className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 
                              flex items-center justify-center group-hover:bg-blue-100 
                              dark:group-hover:bg-blue-500/20 transition-colors"
                >
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[12px] text-blue-700 dark:text-blue-400 font-medium">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Bio */}
          {user.bio && (
            <PanelSection>
              <div className="px-5 py-4">
                <p className="text-[12px] text-blue-600 dark:text-blue-400 font-semibold mb-1.5 uppercase tracking-wider">
                  About
                </p>
                <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  {user.bio}
                </p>
              </div>
            </PanelSection>
          )}

          {/* Info rows */}
          <PanelSection>
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
  );
}

// ──> Helper Components <──

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
                    flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0"
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
      className={`w-full flex items-center gap-4 px-5 py-3.5
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