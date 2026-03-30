"use client";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { toast } from "sonner";
import { useFingerprint } from "@/lib/useFingerprint";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setrememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const fingerprint = useFingerprint();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
        fingerprintId: fingerprint,
        rememberMe,
      });

      if (data.success) {
        router.push("/chat?page=chats");
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-9 w-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-md shadow-sky-100">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-sky-500 tracking-tight">
          SecureChat
        </span>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-slate-800 mb-1.5">
            Welcome back
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Enter your credentials to access your secure workspace
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Email or Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="name@company.com"
                className="pl-9 h-11 rounded-xl border-slate-200 text-sm
                           focus-visible:ring-1 focus-visible:ring-sky-400
                           focus-visible:border-sky-400 placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-sky-500 hover:text-sky-600 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className="pl-9 pr-10 h-11 rounded-xl border-slate-200 text-sm
                           focus-visible:ring-1 focus-visible:ring-sky-400
                           focus-visible:border-sky-400 placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                           hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox
              id="stay"
              checked={rememberMe}
              onCheckedChange={(v) => setrememberMe(!!v)}
              className="rounded border-slate-300
                         data-[state=checked]:bg-sky-500
                         data-[state=checked]:border-sky-500"
            />
            <label
              htmlFor="stay"
              className="text-sm text-slate-600 cursor-pointer select-none"
            >
              Stay logged in for 30 days
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!email.trim() || !password.trim() || loading}
            className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-600 text-white
                       font-semibold text-sm transition-all shadow-md shadow-sky-100
                       hover:shadow-sky-200 disabled:opacity-50 mt-1"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Logging in...
              </span>
            ) : (
              "Log In"
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
          By continue you agree our{" "}
          <Link href="/terms" className="text-slate-500 hover:underline">
            term and condition
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-slate-500 hover:underline">
            privacy policy
          </Link>
        </p>
      </div>

      <p className="text-sm text-slate-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-sky-500 font-semibold hover:text-sky-600 transition-colors"
        >
          Sign up
        </Link>
      </p>

      <p className="text-xs text-slate-300 mt-8 flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3" />
        End-to-end encrypted authentication protocol v2.4
      </p>
    </div>
  );
}
