/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import {
  Bell,
  MonitorSmartphone,
  Volume2,
  Mic,
  Camera,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Reusable Switch Component ──
function Switch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors duration-200",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        checked ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function Notifications() {
  // ── States for App Preferences ──
  const [inAppSound, setInAppSound] = useState(true);

  // ── States for Browser Permissions ──
  const [permissions, setPermissions] = useState({
    notifications: false,
    microphone: false,
    camera: false,
    location: false,
  });

  // ── ১. Check Initial Browser Permissions ──
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check Notifications
        const notifStatus = Notification.permission === "granted";

        // Helper to check standard navigator permissions
        const check = async (name: any) => {
          try {
            const res = await navigator.permissions.query({ name });
            return res.state === "granted";
          } catch {
            return false;
          }
        };

        const micStatus = await check("microphone");
        const camStatus = await check("camera");
        const locStatus = await check("geolocation");

        setPermissions({
          notifications: notifStatus,
          microphone: micStatus,
          camera: camStatus,
          location: locStatus,
        });
      } catch (error) {
        console.error("Permission check error:", error);
      }
    };

    checkPermissions();
  }, []);

  // ── ২. Permission Handlers ──

  // Notifications
  const handleNotificationToggle = async () => {
    if (permissions.notifications) {
      setPermissions((p) => ({ ...p, notifications: false }));
      alert("App will ignore notifications. To fully disable, block it in browser settings.");
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setPermissions((p) => ({ ...p, notifications: true }));
      new Notification("Notifications Enabled!", { body: "You will receive alerts here." });
    } else if (perm === "denied") {
      alert("Notifications are blocked by your browser. Please enable them in your URL bar settings (padlock icon).");
    }
  };

  // Microphone
  const handleMicToggle = async () => {
    if (permissions.microphone) {
      setPermissions((p) => ({ ...p, microphone: false }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop immediately after getting permission
      setPermissions((p) => ({ ...p, microphone: true }));
    } catch (err: any) {
      alert("Microphone access denied. Please enable it in your browser settings.");
    }
  };

  // Camera
  const handleCameraToggle = async () => {
    if (permissions.camera) {
      setPermissions((p) => ({ ...p, camera: false }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissions((p) => ({ ...p, camera: true }));
    } catch (err: any) {
      alert("Camera access denied. Please enable it in your browser settings.");
    }
  };

  // Location
  const handleLocationToggle = () => {
    if (permissions.location) {
      setPermissions((p) => ({ ...p, location: false }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setPermissions((p) => ({ ...p, location: true })),
      () => alert("Location access denied. Please enable it in your browser settings.")
    );
  };

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      
      {/* ── ALERTS & NOTIFICATIONS ── */}
      <div>
        <h3 className="text-xs font-bold tracking-wide text-sky-500 uppercase mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alerts & Sounds
        </h3>
        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 px-4 shadow-sm">
          
          <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 dark:bg-slate-800 rounded-lg">
                <Volume2 className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">In-App Sounds</p>
                <p className="text-xs text-slate-400">Play sounds for incoming messages.</p>
              </div>
            </div>
            <Switch checked={inAppSound} onChange={() => setInAppSound(!inAppSound)} />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 dark:bg-slate-800 rounded-lg">
                <MonitorSmartphone className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Browser Push Alerts</p>
                <p className="text-xs text-slate-400">Receive notifications even when app is hidden.</p>
              </div>
            </div>
            <Switch checked={permissions.notifications} onChange={handleNotificationToggle} />
          </div>
        </div>
      </div>

      {/* ── DEVICE PERMISSIONS ── */}
      <div>
        <h3 className="text-xs font-bold tracking-wide text-sky-500 uppercase mb-3 flex items-center gap-2 mt-8">
          <ShieldAlert className="h-4 w-4" />
          Device Permissions
        </h3>
        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 px-4 shadow-sm">
          
          {/* Microphone */}
          <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                <Mic className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Microphone</p>
                <p className="text-xs text-slate-400">Required for voice messages and calls.</p>
              </div>
            </div>
            <Switch checked={permissions.microphone} onChange={handleMicToggle} />
          </div>

          {/* Camera */}
          <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                <Camera className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Camera</p>
                <p className="text-xs text-slate-400">Required for video calls and capturing photos.</p>
              </div>
            </div>
            <Switch checked={permissions.camera} onChange={handleCameraToggle} />
          </div>

          {/* Location */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                <MapPin className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Location</p>
                <p className="text-xs text-slate-400">Required to share your location in chats.</p>
              </div>
            </div>
            <Switch checked={permissions.location} onChange={handleLocationToggle} />
          </div>

        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 text-center px-4">
          Note: Turning a toggle off tells the app to stop using the feature. To completely revoke access, change your browser&apos;s site settings (click the padlock icon in the URL bar).
        </p>
      </div>

    </div>
  );
}