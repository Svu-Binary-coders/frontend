"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Monitor,
  Smartphone,
  Globe,
  LogOut,
  ShieldCheck,
  Loader2,
  MapPin, // 🔴 লোকেশনের জন্য নতুন আইকন
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import { toast } from "sonner";
import { timeFormatFn } from "@/lib/dateHelper";

// 🔴 আপনার JSON রেসপন্স অনুযায়ী ইন্টারফেস আপডেট করা হলো
interface DeviceSession {
  sessionId: string;
  os: string;
  browser: string;
  deviceType: "desktop" | "mobile" | "web" | string;
  lastLogin: string;
  lastLogout: string | null;
  location: {
    city: string;
    country: string;
    region: string;
    timezone: string;
  } | null;
  ip: string;
  isActiveSession: boolean;
  isCurrentDevice: boolean;
}

export default function DeviceList() {
  const queryClient = useQueryClient();

  // API থেকে ডাটা Fetch করা
  const { data: devices, isLoading } = useQuery({
    queryKey: ["active-devices"],
    queryFn: async () => {
      const { data } = await api.get("/account/devices");
      return data.devices as DeviceSession[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // ডিভাইস লগআউট (Delete) করার API
  const { mutate: logoutDevice, isPending } = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/account/devices/${sessionId}`);
    },
    onSuccess: () => {
      toast.success("Device logged out successfully!");
      queryClient.invalidateQueries({ queryKey: ["active-devices"] });
    },
    onError: () => {
      toast.error("Failed to log out device.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="mb-2">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <ShieldCheck className="text-emerald-500" /> Logged in Devices
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You are currently logged in to these devices.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {devices?.map((device) => (
          <div
            key={device.sessionId}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-colors",
              device.isCurrentDevice
                ? "bg-sky-50/50 border-sky-200 dark:bg-sky-900/10 dark:border-sky-800"
                : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800",
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "p-3 rounded-full shrink-0",
                  device.isCurrentDevice
                    ? "bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                {device.deviceType === "mobile" ? (
                  <Smartphone className="h-5 w-5" />
                ) : device.deviceType === "desktop" ? (
                  <Monitor className="h-5 w-5" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200 flex items-center gap-2 truncate">
                  {device.os} — {device.browser}
                  {device.isCurrentDevice && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0">
                      Current
                    </span>
                  )}
                </span>

                {/* 🔴 Location এবং IP Address */}
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                  {device.location?.city && (
                    <>
                      <MapPin className="h-3 w-3 shrink-0" />
                      {device.location.city}, {device.location.country} •
                    </>
                  )}
                  IP: {device.ip}
                </span>

                {/* 🔴 Last Login Time */}
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                  Last active:{" "}
                  {device.lastLogin
                    ? timeFormatFn(device.lastLogin, "12h")
                    : "Unknown"}
                </span>
              </div>
            </div>

            {/* ডান দিক: লগআউট বাটন */}
            {!device.isCurrentDevice && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutDevice(device.sessionId)}
                disabled={isPending}
                className="shrink-0 text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/30 ml-2"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
