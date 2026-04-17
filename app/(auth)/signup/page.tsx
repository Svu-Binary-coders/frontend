"use client";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  User,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { useFingerprint } from "@/lib/useFingerprint";
import { KeyManager } from "@/core/e2e/KeyManager";
import { BackupManager } from "@/core/backup/Backupmanager";

// ── Modal step tracker ─────────────────────────────────────────────────────
type ModalStep = "otp" | "recovery";

export default function SignupPage() {
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  // UI toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modal state
  const [modalStep, setModalStep] = useState<ModalStep>("otp");
  const [showModal, setShowModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [phraseConfirmed, setPhraseConfirmed] = useState(false);

  const router = useRouter();
  const fingerprint = useFingerprint();

  // ── Step 1: OTP পাঠাও ────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !pin.trim()) {
      toast.error("সব field পূরণ করো (Chat PIN সহ)");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/otp/send-register-otp", { email });
      if (data.success) {
        toast.success("OTP sent to " + email);
        setModalStep("otp");
        setShowModal(true);
      } else {
        toast.error(data.message || "OTP sending fail");
      }
    } catch (e) {
      if (isAxiosError(e)) {
        toast.error(e.response?.data?.message || "OTP sending fail");
      } else {
        toast.error((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: OTP verify → user save → E2E keys → Backup ──────────────────
  const handleVerifyAndRegister = async () => {
    if (!otp.trim()) {
      toast.error("OTP দাও");
      return;
    }
    setVerifying(true);

    try {
      // 2a. OTP verify
      const verifyRes = await api.post("/otp/verify-register-otp", {
        email,
        otp,
      });

      if (!verifyRes.data.success) {
        toast.error(verifyRes.data.message || "OTP ভুল");
        setVerifying(false);
        return;
      }

      // 2b. User register
      const registerRes = await api.post("/auth/register", {
        name,
        email,
        password,
        fingerprintId: fingerprint,
        rememberMe,
      });

      if (!registerRes.data.success) {
        toast.error(registerRes.data.message || "Registration fail");
        setVerifying(false);
        return;
      }

      // userId বের করো (Safely fallback to userDetails._id if needed)
      const userId =
        registerRes.data.userId || registerRes.data.userDetails?._id;

      if (!userId) {
        toast.error("Server থেকে userId আসেনি — backend check করো");
        setVerifying(false);
        return;
      }

      // ── E2E Setup ──────────────────────────────────────────────────────

      // Step A: Identity তৈরি করো → IndexedDB তে save হবে
      const identity = await KeyManager.createAndStoreIdentity(userId, pin);

      // savee current keys to active session for auto-login
      const { privateKey, signingKey } = await KeyManager.loadIdentity(
        userId,
        pin,
      );
      await KeyManager.saveActiveKeys(userId, privateKey, signingKey);

      // Step B: PIN ও Salt দিয়ে MasterKey বানাও
      const masterKey = await KeyManager.deriveMasterKey(pin, identity.saltB64);

      // Step C: BackupKey + Recovery Phrase বানাও
      const { recoveryPhrase: phrase, encBackupKey } =
        await BackupManager.createBackupKey(masterKey);

      // Step D: Server এ crypto info save করো (Fixed Payload to match Backend Schema)
      await api.post("/backup/create", {
        userId,
        publicKey64: identity.publicKeyB64,
        saltB64: identity.saltB64,
        encBackupKey: {
          ctBase64: encBackupKey.ctB64,
          ivBase64: encBackupKey.ivB64,
        },
        identityBackup: {
          encPrivKeyB64: identity.encPrivKeyB64,
          privKeyIvB64: identity.privKeyIvB64,
          sigKeyB64: identity.sigKeyB64,
          sigKeyIvB64: identity.sigKeyIvB64,
        },
      });

      // Step E: Recovery Phrase দেখাও
      setRecoveryPhrase(phrase);
      setModalStep("recovery");
    } catch (e) {
      console.error("[Signup Error]:", e);
      // Better Error Handling for Axios
      if (isAxiosError(e)) {
        toast.error(e.response?.data?.message || "Registration fail হয়েছে");
      } else {
        toast.error((e as Error).message);
      }
    } finally {
      setVerifying(false);
    }
  };

  // ── Step 3: Phrase copy + confirm → chat এ যাও ────────────────────────
  const handleCopyPhrase = async () => {
    await navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    if (!phraseConfirmed) {
      toast.error("Recovery phrase save করেছ কিনা confirm করো");
      return;
    }
    toast.success("Registration সফল!");
    router.push("/chat?page=chats");
  };

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <div className="h-9 w-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-md shadow-sky-100">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-sky-500 tracking-tight">
          SecureChat
        </span>
      </div>

      {/* Signup Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-slate-800 mb-1.5">
            Create an account
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Setup your secure workspace and encryption keys
          </p>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="pl-9 h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:border-sky-400 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="pl-9 h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:border-sky-400 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 pr-10 h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:border-sky-400 placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Chat PIN */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Secure Chat PIN
            </label>
            <p className="text-xs text-slate-400">
              এই PIN দিয়ে তোমার messages locally encrypt হবে। ভুলে গেলে
              messages পড়া যাবে না।
            </p>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="e.g. 123456"
                className="pl-9 pr-10 h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:border-sky-400 placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPin ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2.5 pt-2">
            <Checkbox
              id="stay"
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(!!v)}
              className="rounded border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
            />
            <label
              htmlFor="stay"
              className="text-sm text-slate-600 cursor-pointer select-none"
            >
              Stay logged in for 30 days
            </label>
          </div>

          <Button
            onClick={handleSendOtp}
            disabled={
              !email.trim() ||
              !password.trim() ||
              !name.trim() ||
              !pin.trim() ||
              loading
            }
            className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-all shadow-md shadow-sky-100 hover:shadow-sky-200 disabled:opacity-50 mt-3"
          >
            {loading ? "OTP পাঠানো হচ্ছে..." : "Sign Up"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-sky-500 font-semibold hover:text-sky-600 transition-colors"
        >
          Log in
        </Link>
      </p>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 shadow-xl">
            {/* ── OTP Step ── */}
            {modalStep === "otp" && (
              <>
                <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
                  Email verify করো
                </h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                  <span className="font-semibold text-slate-700">{email}</span>{" "}
                  এ 6-digit code পাঠানো হয়েছে
                </p>
                <div className="space-y-4">
                  <Input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="OTP দাও"
                    className="text-center tracking-widest text-lg h-12 rounded-xl border-slate-200 focus-visible:ring-1 focus-visible:ring-sky-400"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      className="flex-1 rounded-xl border-slate-200 text-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyAndRegister}
                      disabled={!otp.trim() || verifying}
                      className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-100"
                    >
                      {verifying
                        ? "Account বানানো হচ্ছে..."
                        : "Verify & Create"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* ── Recovery Phrase Step ── */}
            {modalStep === "recovery" && (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
                  Recovery Phrase সংরক্ষণ করো
                </h3>
                <p className="text-sm text-slate-500 text-center mb-5">
                  PIN ভুলে গেলে এই phrase দিয়ে account recover করতে পারবে।
                  <span className="text-red-500 font-semibold">
                    {" "}
                    কোথাও লিখে রাখো।
                  </span>
                </p>

                {/* Phrase grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {recoveryPhrase.split(" ").map((word, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      <span className="text-[10px] text-slate-400 w-4 shrink-0">
                        {i + 1}.
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-700">
                        {word}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Copy button */}
                <button
                  onClick={handleCopyPhrase}
                  className="w-full flex items-center justify-center gap-2 text-sm text-sky-600 border border-sky-200 rounded-xl py-2.5 mb-4 hover:bg-sky-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy phrase
                    </>
                  )}
                </button>

                {/* Confirm checkbox */}
                <div className="flex items-start gap-2.5 mb-5">
                  <Checkbox
                    id="confirm"
                    checked={phraseConfirmed}
                    onCheckedChange={(v) => setPhraseConfirmed(!!v)}
                    className="mt-0.5 rounded border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <label
                    htmlFor="confirm"
                    className="text-sm text-slate-600 cursor-pointer leading-relaxed"
                  >
                    আমি এই recovery phrase নিরাপদ জায়গায় সংরক্ষণ করেছি এবং
                    বুঝেছি যে এটা হারালে account recover করা যাবে না।
                  </label>
                </div>

                <Button
                  onClick={handleFinish}
                  disabled={!phraseConfirmed}
                  className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold disabled:opacity-50"
                >
                  Chat এ যাও
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
