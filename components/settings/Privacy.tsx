"use client";

import { useState } from "react";
import {
  Camera,
  EyeOff,
  Ghost,
  KeyRound,
  ShieldAlert,
  Fingerprint,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Privacy() {
  // State variables for each privacy feature
  const [shoulderSurfing, setShoulderSurfing] = useState(false);
  const [watermark, setWatermark] = useState(false);
  const [camouflage, setCamouflage] = useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-sky-500" />
          Advanced Privacy & Security
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Protect your chats from prying eyes with next-gen security features.
        </p>
      </div>

      <div className="grid gap-6">
        {/* > 1. Shoulder Surfing Protection < */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-rose-500" />
                Shoulder Surfing Protection
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                >
                  Requires Camera
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm">
                Automatically blurs the chat if multiple faces are detected
                looking at your screen.
              </CardDescription>
            </div>
            <Switch
              checked={shoulderSurfing}
              onCheckedChange={setShoulderSurfing}
              // TODO: Add permission request logic here when toggled ON
            />
          </CardHeader>
        </Card>

        {/* > 2. Anti-Leak Watermark < */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-amber-500" />
                Anti-Leak Watermark
              </CardTitle>
              <CardDescription className="text-sm">
                Displays the viewer&#39;s ID as a faint watermark to prevent
                screenshot leaks.
              </CardDescription>
            </div>
            <Switch
              checked={watermark}
              onCheckedChange={setWatermark}
              // TODO: Add global CSS class or Context update when toggled
            />
          </CardHeader>
        </Card>

        {/* > 3. Camouflage Mode < */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Ghost className="h-4 w-4 text-emerald-500" />
                Camouflage Mode (Gibberish)
              </CardTitle>
              <CardDescription className="text-sm">
                Disguise your real messages as random Wikipedia articles or
                recipes.
              </CardDescription>
            </div>
            <Switch
              checked={camouflage}
              onCheckedChange={setCamouflage}
              // TODO: Add message text transformation logic when toggled
            />
          </CardHeader>
        </Card>

        {/* > 4. Decoy PIN / Panic Mode < */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-violet-500">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-violet-500" />
                  Decoy PIN (Panic Mode)
                  <Badge className="text-[10px] bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400">
                    Extreme Privacy
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm">
                  Set up a secondary PIN. If you are forced to open the app,
                  entering this PIN will show fake, safe chats instead of your
                  real ones.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="mt-2 w-full sm:w-auto">
              <Fingerprint className="mr-2 h-4 w-4" />
              Setup Decoy PIN
            </Button>
            {/* TODO: Open a modal to set the decoy PIN and generate dummy chats */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
