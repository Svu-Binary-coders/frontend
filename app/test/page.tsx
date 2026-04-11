"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Crypto helpers ────────────────────────────────────────────────────────
const S = () => window.crypto.subtle;
const rand = (n: number) => window.crypto.getRandomValues(new Uint8Array(n));
const utfEnc = (s: string) => new TextEncoder().encode(s);
const utfDec = (b: ArrayBuffer) => new TextDecoder().decode(b);

function b64e(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s);
}
function b64d(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    await S().digest("SHA-256", data as unknown as BufferSource),
  );
}

// ─── Key derivation ────────────────────────────────────────────────────────
async function deriveMasterKey(
  pin: string,
  saltB64: string,
): Promise<CryptoKey> {
  const pinK = await S().importKey("raw", utfEnc(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await S().deriveBits(
    {
      name: "PBKDF2",
      salt: b64d(saltB64) as unknown as BufferSource,
      iterations: 310_000,
      hash: "SHA-256",
    },
    pinK,
    256,
  );
  const hkdfSalt = await sha256(utfEnc(pin));
  const hkdfK = await S().importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return S().deriveKey(
    {
      name: "HKDF",
      salt: hkdfSalt as unknown as BufferSource,
      info: utfEnc("FCP-MASTER-v1"),
      hash: "SHA-256",
    },
    hkdfK,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

async function deriveRootKey(
  myPriv: CryptoKey,
  peerPub: CryptoKey,
): Promise<CryptoKey> {
  const bits = await S().deriveBits(
    { name: "ECDH", public: peerPub },
    myPriv,
    384,
  );
  return S().importKey("raw", bits, "HKDF", false, ["deriveKey", "deriveBits"]);
}

async function deriveChatKey(
  rootKey: CryptoKey,
  chatId: string,
): Promise<CryptoKey> {
  const chatIdHash = await sha256(utfEnc(chatId));
  const bits = await S().deriveBits(
    {
      name: "HKDF",
      salt: chatIdHash as unknown as BufferSource,
      info: utfEnc("FCP-CHAT-v1"),
      hash: "SHA-256",
    },
    rootKey,
    256,
  );
  return S().importKey("raw", bits, "HKDF", false, ["deriveKey", "deriveBits"]);
}

async function deriveMsgKey(
  chatKey: CryptoKey,
  timestamp: number,
): Promise<CryptoKey> {
  const tsSalt = await sha256(utfEnc(String(timestamp)));
  return S().deriveKey(
    {
      name: "HKDF",
      salt: tsSalt as unknown as BufferSource,
      info: utfEnc("FCP-MSG-v1"),
      hash: "SHA-256",
    },
    chatKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function buildChatId(...ids: string[]): Promise<string> {
  const sorted = [...ids].sort().join(":");
  const h = await sha256(utfEnc(sorted));
  return Array.from(h)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

// ─── Pack / Unpack ─────────────────────────────────────────────────────────
interface PackOpts {
  text: string;
  chatKey: CryptoKey;
  sigKey: CryptoKey;
  chatId: string;
  version: string;
  flags: number;
  conditions: string;
  ttlSeconds?: number | null;
  duressPin?: string | null;
  decoyText?: string | null;
}

async function packMessage(opts: PackOpts): Promise<string> {
  const {
    text,
    chatKey,
    sigKey,
    chatId,
    version,
    flags,
    conditions,
    ttlSeconds,
    duressPin,
    decoyText,
  } = opts;
  const ts = Date.now();

  const inner: Record<string, unknown> = { t: text };
  if (ttlSeconds) inner._ttl = ttlSeconds;

  if (flags & 32 && duressPin && decoyText) {
    const dk = await S().importKey("raw", utfEnc(duressPin), "PBKDF2", false, [
      "deriveKey",
    ]);
    const dk2 = await S().deriveKey(
      {
        name: "PBKDF2",
        salt: utfEnc("FCP-DECOY-SALT-v1"),
        iterations: 100_000,
        hash: "SHA-256",
      },
      dk,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const div = rand(12);
    const dct = await S().encrypt(
      { name: "AES-GCM", iv: div },
      dk2,
      utfEnc(JSON.stringify({ t: decoyText })),
    );
    inner._decoy = { iv: b64e(div), ct: b64e(dct) };
  }

  let pt = JSON.stringify(inner);
  if (version === "v4") pt = pt.padEnd(1024, "\0");

  const msgKey = await deriveMsgKey(chatKey, ts);
  const iv = rand(12);
  const ct = await S().encrypt({ name: "AES-GCM", iv }, msgKey, utfEnc(pt));
  const ivB64 = b64e(iv),
    ctB64 = b64e(ct);

  const sig = await S().sign("HMAC", sigKey, utfEnc(`${ts}:${ivB64}:${ctB64}`));
  return [version, flags, conditions, chatId, ts, ivB64, ctB64, b64e(sig)].join(
    ":",
  );
}

interface UnpackResult {
  text: string;
  flags: number;
  conditions: string;
  chatId: string;
  ts: number;
  ttl: number | null;
}

async function unpackMessage(
  envelope: string,
  chatKey: CryptoKey,
  sigKey: CryptoKey,
  duressPin?: string | null,
): Promise<UnpackResult> {
  const parts = envelope.split(":");
  if (parts.length < 8) throw new Error("Invalid envelope format");
  const [version, flagsStr, conditions, chatId, tsStr, ivB64, ctB64, sigB64] =
    parts;
  const flags = parseInt(flagsStr),
    ts = parseInt(tsStr);

  if (conditions.startsWith("TIME")) {
    const m = conditions.match(/TIME\(([^)]+)\)/);
    if (m && Date.now() < parseInt(m[1]))
      throw new Error(
        `Time-locked until ${new Date(parseInt(m[1])).toLocaleTimeString()}`,
      );
  }

  const valid = await S().verify(
    "HMAC",
    sigKey,
    b64d(sigB64) as unknown as BufferSource,
    utfEnc(`${ts}:${ivB64}:${ctB64}`),
  );
  if (!valid) throw new Error("Signature invalid — message tampered");

  const msgKey = await deriveMsgKey(chatKey, ts);
  const ptBuf = await S().decrypt(
    { name: "AES-GCM", iv: b64d(ivB64) as unknown as BufferSource },
    msgKey,
    b64d(ctB64) as unknown as BufferSource,
  );
  const pt = utfDec(ptBuf).replace(/\0+$/, ""); // remove padding zeros for v4;
  let payload: Record<string, unknown> = JSON.parse(pt);

  if (flags & 32 && duressPin && payload._decoy) {
    try {
      const dec = payload._decoy as { iv: string; ct: string };
      const dk = await S().importKey(
        "raw",
        utfEnc(duressPin),
        "PBKDF2",
        false,
        ["deriveKey"],
      );
      const dk2 = await S().deriveKey(
        {
          name: "PBKDF2",
          salt: utfEnc("FCP-DECOY-SALT-v1"),
          iterations: 100_000,
          hash: "SHA-256",
        },
        dk,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"],
      );
      const db = await S().decrypt(
        { name: "AES-GCM", iv: b64d(dec.iv) as unknown as BufferSource },
        dk2,
        b64d(dec.ct) as unknown as BufferSource,
      );
      payload = JSON.parse(utfDec(db));
    } catch {
      /* wrong duress pin — show real */
    }
  }

  const ttl = (payload._ttl as number) ?? null;
  return { text: payload.t as string, flags, conditions, chatId, ts, ttl };
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface Session {
  myName: string;
  peerName: string;
  chatId: string;
  myChatKey: CryptoKey;
  peerChatKey: CryptoKey;
  sigKey: CryptoKey;
}

interface Message {
  id: number;
  text: string;
  envelope: string;
  flags: number;
  conditions: string;
  ttl: number | null;
  ts: number;
}

interface StepState {
  status: "idle" | "active" | "done";
  desc: string;
}

const FLAG_TXT = 1,
  FLAG_BURN = 8,
  FLAG_DECOY = 32;

// ─── Component ─────────────────────────────────────────────────────────────
export default function FCPTesterPage() {
  const [myName, setMyName] = useState("Alice");
  const [peerName, setPeerName] = useState("Bob");
  const [pin, setPin] = useState("1234");
  const [session, setSession] = useState<Session | null>(null);
  const [setting, setSetting] = useState(false);
  const [setupErr, setSetupErr] = useState("");

  const [msgText, setMsgText] = useState("Hello from encrypted side!");
  const [version, setVersion] = useState("v1");
  const [activeFlags, setActiveFlags] = useState<Set<number>>(
    new Set([FLAG_TXT]),
  );
  const [condSel, setCondSel] = useState("NONE");

  // 🆕 Hacker View State (Attacker Side)
  const [hackerPin, setHackerPin] = useState("");

  const [ttlSec, setTtlSec] = useState(8);
  const [duressPin, setDuressPin] = useState("0000");
  const [decoyText, setDecoyText] = useState("Nothing here.");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [dbDecrypted, setDbDecrypted] = useState<Record<number, string>>({});
  const [dbDecrypting, setDbDecrypting] = useState<Record<number, boolean>>({});

  const [keyHierarchy, setKeyHierarchy] = useState({
    master: "",
    root: "",
    chat: "",
    chatId: "",
    msg: "derived on each send",
  });

  const [steps, setSteps] = useState<Record<number, StepState>>({
    1: {
      status: "idle",
      desc: "Generate identity key pairs for Alice and Bob",
    },
    2: { status: "idle", desc: "Derive root shared key via ECDH P-384" },
    3: { status: "idle", desc: "HKDF(root, chatId) → per-conversation key" },
    4: { status: "idle", desc: "AES-GCM-256 encrypt + HMAC-SHA256 sign" },
    5: { status: "idle", desc: "Condition check → sig verify → decrypt" },
  });

  const [stats, setStats] = useState({ sent: 0, dec: 0, fail: 0 });
  const burnTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const setStep = useCallback(
    (n: number, status: StepState["status"], desc?: string) => {
      setSteps((prev) => ({
        ...prev,
        [n]: { status, desc: desc ?? prev[n].desc },
      }));
    },
    [],
  );

  // ── Setup ────────────────────────────────────────────────────────────────
  const handleSetup = async () => {
    setSetupErr("");
    setSetting(true);
    try {
      setStep(1, "active");
      const salt = b64e(rand(32));
      await deriveMasterKey(pin, salt);
      setKeyHierarchy((h) => ({
        ...h,
        master: "PBKDF2(310k) + HKDF stretch — non-extractable",
      }));
      setStep(1, "done", `Key pairs for ${myName} and ${peerName} generated`);

      setStep(2, "active");
      const myPair = await S().generateKey(
        { name: "ECDH", namedCurve: "P-384" },
        true,
        ["deriveKey", "deriveBits"],
      );
      const peerPair = await S().generateKey(
        { name: "ECDH", namedCurve: "P-384" },
        true,
        ["deriveKey", "deriveBits"],
      );
      const sigKey = await S().generateKey(
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"],
      );
      const myRootKey = await deriveRootKey(
        myPair.privateKey,
        peerPair.publicKey,
      );
      const peerRootKey = await deriveRootKey(
        peerPair.privateKey,
        myPair.publicKey,
      );
      setKeyHierarchy((h) => ({
        ...h,
        root: "ECDH P-384 shared secret → imported as HKDF source",
      }));
      setStep(
        2,
        "done",
        "ECDH handshake complete — both sides agree on root key",
      );

      setStep(3, "active");
      const chatId = await buildChatId(myName, peerName);
      const myChatKey = await deriveChatKey(myRootKey, chatId);
      const peerChatKey = await deriveChatKey(peerRootKey, chatId);
      setKeyHierarchy((h) => ({
        ...h,
        chat: "HKDF(root, SHA256(chatId)) — per-conversation AES source",
        chatId,
      }));
      setStep(3, "done", `Chat key derived — chatId: ${chatId}`);

      setSession({ myName, peerName, chatId, myChatKey, peerChatKey, sigKey });
      setMessages([]);
      setDbDecrypted({});
      setStats({ sent: 0, dec: 0, fail: 0 });
    } catch (e: unknown) {
      setSetupErr((e as Error).message);
      setStep(1, "idle");
    } finally {
      setSetting(false);
    }
  };

  // ── Toggle flag ──────────────────────────────────────────────────────────
  const toggleFlag = (f: number) => {
    if (f === FLAG_TXT) return;
    setActiveFlags((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!session || !msgText.trim()) return;
    setSendErr("");
    setSending(true);
    setStep(4, "active");

    try {
      const flags = [...activeFlags].reduce((a, b) => a | b, 0);
      const conditions =
        condSel === "TIME" ? `TIME(${Date.now() + 20_000})` : "NONE";
      const ttlSeconds = activeFlags.has(FLAG_BURN) ? ttlSec : null;

      const envelope = await packMessage({
        text: msgText,
        chatKey: session.myChatKey,
        sigKey: session.sigKey,
        chatId: session.chatId,
        version,
        flags,
        conditions,
        ttlSeconds,
        duressPin: activeFlags.has(FLAG_DECOY) ? duressPin : null,
        decoyText: activeFlags.has(FLAG_DECOY) ? decoyText : null,
      });

      const ts = parseInt(envelope.split(":")[4]);
      const msg: Message = {
        id: Date.now(),
        text: msgText,
        envelope,
        flags,
        conditions,
        ttl: ttlSeconds,
        ts,
      };

      setMessages((prev) => [...prev, msg]);
      setStats((s) => ({ ...s, sent: s.sent + 1 }));
      setKeyHierarchy((h) => ({
        ...h,
        msg: `ts=${ts} → single-use AES-GCM-256 key derived (O(1))`,
      }));
      setStep(4, "done", `Packed ${version} — flags=${flags} — HMAC signed`);
      setMsgText("");

      // auto-unpack to verify
      setStep(5, "active");
      try {
        const result = await unpackMessage(
          envelope,
          session.peerChatKey,
          session.sigKey,
          activeFlags.has(FLAG_DECOY) ? duressPin : null,
        );
        setStats((s) => ({ ...s, dec: s.dec + 1 }));
        setStep(5, "done", `Decrypted OK — "${result.text.slice(0, 40)}"`);
      } catch (e: unknown) {
        setStats((s) => ({ ...s, fail: s.fail + 1 }));
        setStep(5, "done", (e as Error).message);
      }

      // BURN timer
      if (ttlSeconds && activeFlags.has(FLAG_BURN)) {
        const t = setTimeout(() => {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          burnTimers.current.delete(msg.id);
        }, ttlSeconds * 1000);
        burnTimers.current.set(msg.id, t);
      }
    } catch (e: unknown) {
      setSendErr((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  // ── DB decrypt click ──────────────────────────────────────────────────────
  // ── DB decrypt click (Hacker View) ─────────────────────────────────────────
  const handleDbDecrypt = async (msg: Message) => {
    // 💥 FIX: এখান থেকে 'dbDecrypted[msg.id] !== undefined' কন্ডিশন মুছে দেওয়া হয়েছে
    // যাতে আপনি বারবার ক্লিক করে পিন টেস্ট করতে পারেন।
    if (!session) return;

    setDbDecrypting((p) => ({ ...p, [msg.id]: true }));
    try {
      const result = await unpackMessage(
        msg.envelope,
        session.peerChatKey,
        session.sigKey,
        hackerPin.trim() !== "" ? hackerPin.trim() : undefined,
      );

      setDbDecrypted((p) => ({
        ...p,
        [msg.id]: `"${result.text}"${result.ttl ? ` — TTL ${result.ttl}s` : ""}`,
      }));
    } catch (e: unknown) {
      setDbDecrypted((p) => ({
        ...p,
        [msg.id]: `Error: ${(e as Error).message}`,
      }));
    } finally {
      setDbDecrypting((p) => ({ ...p, [msg.id]: false }));
    }
  };

  // ── Envelope colorizer ───────────────────────────────────────────────────
  const colorEnvelope = (env: string) => {
    const p = env.split(":");
    if (p.length < 8)
      return (
        <span className="font-mono text-xs text-gray-400 break-all">{env}</span>
      );
    const [v, f, c, id, ts, iv, ct, sig] = p;
    const tr = (s: string, n = 10) => (s.length > n ? s.slice(0, n) + "…" : s);
    return (
      <span className="font-mono text-xs break-all leading-relaxed">
        <span className="text-emerald-600">{v}</span>:
        <span className="text-blue-600">{f}</span>:
        <span className="text-pink-700">{c}</span>:
        <span className="text-purple-600">{tr(id, 12)}</span>:
        <span className="text-amber-600">{ts}</span>:
        <span className="text-gray-500">{tr(iv)}</span>:
        <span className="text-gray-400">{tr(ct, 18)}</span>:
        <span className="text-red-500">{tr(sig)}</span>
      </span>
    );
  };

  // ── Step indicator ────────────────────────────────────────────────────────
  const StepDot = ({ n }: { n: number }) => {
    const { status } = steps[n];
    const base =
      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0";
    const cls =
      status === "done"
        ? `${base} bg-emerald-100 text-emerald-700 border border-emerald-300`
        : status === "active"
          ? `${base} bg-blue-100 text-blue-700 border border-blue-300 animate-pulse`
          : `${base} bg-gray-100 text-gray-500 border border-gray-200`;
    return <div className={cls}>{status === "done" ? "✓" : n}</div>;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            F
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              Flex Chat Protocol — FCP Tester
            </h1>
            <p className="text-xs text-gray-500">
              3-tier key hierarchy · AES-GCM-256 · HMAC-SHA256 · ECDH P-384
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              {stats.sent} sent
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {stats.dec} decrypted
            </span>
            {stats.fail > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                {stats.fail} failed
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── LEFT: Setup + Compose ── */}
          <div className="space-y-4">
            {/* Setup card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-medium text-gray-600">
                  Step 1 — Identity setup
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Your name
                    </label>
                    <input
                      className="w-full text-sm px-3 h-9 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={myName}
                      onChange={(e) => setMyName(e.target.value)}
                      disabled={!!session}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Peer name
                    </label>
                    <input
                      className="w-full text-sm px-3 h-9 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={peerName}
                      onChange={(e) => setPeerName(e.target.value)}
                      disabled={!!session}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    PIN (used for Master Key derivation)
                  </label>
                  <input
                    type="password"
                    className="w-full text-sm px-3 h-9 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    disabled={!!session}
                  />
                </div>
                <button
                  onClick={handleSetup}
                  disabled={setting}
                  className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {setting
                    ? "Generating keys…"
                    : session
                      ? "Reset session"
                      : "Generate keys + start session"}
                </button>
                {setupErr && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {setupErr}
                  </p>
                )}
                {session && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                    Session active — 3-tier key hierarchy ready
                  </p>
                )}
              </div>
            </div>

            {/* Key hierarchy card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs font-medium text-gray-600">
                  Key hierarchy (live)
                </span>
              </div>
              <div className="p-4 space-y-2">
                {[
                  {
                    label: "Master key",
                    value: keyHierarchy.master,
                    note: "PBKDF2 + HKDF",
                  },
                  {
                    label: "Root shared key",
                    value: keyHierarchy.root,
                    note: "ECDH P-384",
                  },
                  {
                    label: `Chat key ${keyHierarchy.chatId ? `(${keyHierarchy.chatId})` : ""}`,
                    value: keyHierarchy.chat,
                    note: "per-chat HKDF",
                  },
                  {
                    label: "Message key",
                    value: keyHierarchy.msg,
                    note: "per-message O(1)",
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-gray-500">
                        {row.label}
                      </span>
                      <span className="text-[9px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        {row.note}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-gray-500 leading-relaxed break-all">
                      {row.value || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compose card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs font-medium text-gray-600">
                  Step 2 — Compose message
                </span>
              </div>
              <div className="p-4 space-y-3">
                <textarea
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 h-20"
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Type your message…"
                  disabled={!session}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Version
                    </label>
                    <select
                      className="w-full text-xs h-8 px-2 border border-gray-200 rounded-lg bg-gray-50"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      disabled={!session}
                    >
                      <option value="v1">v1 — standard</option>
                      <option value="v4">v4 — + padding (1024 bytes)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Condition
                    </label>
                    <select
                      className="w-full text-xs h-8 px-2 border border-gray-200 rounded-lg bg-gray-50"
                      value={condSel}
                      onChange={(e) => setCondSel(e.target.value)}
                      disabled={!session}
                    >
                      <option value="NONE">None</option>
                      <option value="TIME">TIME lock (+20s)</option>
                    </select>
                  </div>
                </div>

                {/* Flags */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">
                    Flags (bitwise)
                  </label>
                  <div className="flex gap-2">
                    {[
                      {
                        flag: FLAG_TXT,
                        label: "TXT",
                        on: "bg-blue-100 text-blue-700 border-blue-300",
                        off: "bg-gray-100 text-gray-500 border-gray-200",
                      },
                      {
                        flag: FLAG_BURN,
                        label: "BURN",
                        on: "bg-red-100 text-red-700 border-red-300",
                        off: "bg-gray-100 text-gray-500 border-gray-200",
                      },
                      {
                        flag: FLAG_DECOY,
                        label: "DECOY",
                        on: "bg-purple-100 text-purple-700 border-purple-300",
                        off: "bg-gray-100 text-gray-500 border-gray-200",
                      },
                    ].map(({ flag, label, on, off }) => (
                      <button
                        key={flag}
                        onClick={() => toggleFlag(flag)}
                        disabled={!session}
                        className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${activeFlags.has(flag) ? on : off}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeFlags.has(FLAG_BURN) && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <label className="text-xs text-red-600 mb-1 block">
                      TTL (seconds)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={60}
                      className="w-20 text-xs h-7 px-2 border border-red-200 rounded bg-white"
                      value={ttlSec}
                      onChange={(e) => setTtlSec(parseInt(e.target.value) || 8)}
                    />
                  </div>
                )}

                {activeFlags.has(FLAG_DECOY) && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 space-y-2">
                    <div>
                      <label className="text-xs text-purple-600 mb-1 block">
                        Decoy text (shown under duress PIN)
                      </label>
                      <input
                        className="w-full text-xs h-7 px-2 border border-purple-200 rounded bg-white"
                        value={decoyText}
                        onChange={(e) => setDecoyText(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-purple-600 mb-1 block">
                        Duress PIN
                      </label>
                      <input
                        className="w-24 text-xs h-7 px-2 border border-purple-200 rounded bg-white"
                        value={duressPin}
                        onChange={(e) => setDuressPin(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={!session || sending || !msgText.trim()}
                  className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
                >
                  {sending ? "Encrypting…" : "Encrypt and send"}
                </button>
                {sendErr && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {sendErr}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── MIDDLE: Chat view ── */}
          <div className="space-y-4">
            <div
              className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col"
              style={{ minHeight: 420 }}
            >
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs font-medium text-gray-600">
                  Chat view —{" "}
                  {session
                    ? `${session.myName} → ${session.peerName}`
                    : "setup keys first"}
                </span>
              </div>
              <div
                className="flex-1 p-4 overflow-y-auto space-y-3"
                style={{ maxHeight: 460 }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-xs mt-16">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col items-end gap-1">
                      <div className="flex gap-1 flex-wrap justify-end">
                        {msg.flags & FLAG_BURN ? (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            BURN
                          </span>
                        ) : null}
                        {msg.flags & FLAG_DECOY ? (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            DECOY
                          </span>
                        ) : null}
                        {msg.conditions !== "NONE" ? (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            {msg.conditions.slice(0, 20)}
                          </span>
                        ) : null}
                      </div>
                      <div className="max-w-[85%] bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm">
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.ts).toLocaleTimeString()}
                      </span>
                      {msg.ttl && (
                        <BurnCountdown
                          id={msg.id}
                          ttl={msg.ttl}
                          onExpire={() =>
                            setMessages((prev) =>
                              prev.filter((m) => m.id !== msg.id),
                            )
                          }
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Workflow steps */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-medium text-gray-600">
                  Workflow status
                </span>
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex gap-3">
                    <StepDot n={n} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {
                          [
                            "Key generation",
                            "ECDH handshake",
                            "Chat key derivation",
                            "Pack message",
                            "Unpack + verify",
                          ][n - 1]
                        }
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {steps[n].desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Server / DB view ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs font-medium text-gray-300">
                  Server / DB view
                </span>
              </div>
              <span className="text-[10px] bg-red-900 text-red-300 px-2 py-0.5 rounded">
                attacker sees this
              </span>
            </div>

            <div
              className="p-3 space-y-2 overflow-y-auto flex-1"
              style={{ maxHeight: 680 }}
            >
              {/* 🆕 Hacker PIN Input UI */}
              <div className="bg-purple-900 rounded-lg px-3 py-3 border border-purple-700 mb-4 shadow-lg shadow-purple-900/20">
                <label className="text-[11px] text-purple-200 mb-1.5 block font-bold">
                  🕵️ Hacker's Decryption Attempt (Test DECOY)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 text-sm h-8 px-2 border border-purple-500 rounded bg-gray-950 text-white focus:outline-none focus:border-purple-400 placeholder-gray-600"
                    placeholder="Enter intercepted PIN..."
                    value={hackerPin}
                    onChange={(e) => setHackerPin(e.target.value)}
                  />
                  <button
                    onClick={() => {}} // Just visually acts as a set button, value is bound to state
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 rounded font-bold transition-colors"
                  >
                    Set PIN
                  </button>
                </div>
                <p className="text-[9px] text-purple-300 mt-1.5">
                  Type <span className="font-bold text-white">0000</span> to
                  test Duress PIN, or leave empty for Right PIN. Then click a
                  message below to decrypt.
                </p>
              </div>

              {/* Envelope legend */}
              <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                <p className="text-[10px] text-gray-500 mb-1 font-medium">
                  Envelope segments
                </p>
                <p className="text-[10px] font-mono leading-relaxed">
                  <span className="text-emerald-400">version</span>
                  <span className="text-gray-600">:</span>
                  <span className="text-blue-400">flags</span>
                  <span className="text-gray-600">:</span>
                  <span className="text-pink-400">conditions</span>
                  <span className="text-gray-600">:</span>
                  <span className="text-purple-400">chatId</span>
                  <span className="text-gray-600">:</span>
                  <span className="text-amber-400">timestamp</span>
                  <span className="text-gray-600">:</span>
                  <span className="text-gray-400">iv:cipher:sig</span>
                </p>
              </div>

              {messages.length === 0 && (
                <p className="text-xs text-gray-600 italic p-2">
                  Waiting for encrypted traffic…
                </p>
              )}

              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-3 cursor-pointer hover:border-gray-500 transition-colors"
                  onClick={() => handleDbDecrypt(msg)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-amber-400 font-mono">
                      row #{i + 1}
                    </span>
                    <div className="flex gap-1">
                      {msg.flags & FLAG_TXT ? (
                        <span className="text-[9px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">
                          TXT
                        </span>
                      ) : null}
                      {msg.flags & FLAG_BURN ? (
                        <span className="text-[9px] bg-red-900 text-red-300 px-1.5 py-0.5 rounded">
                          BURN
                        </span>
                      ) : null}
                      {msg.flags & FLAG_DECOY ? (
                        <span className="text-[9px] bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded">
                          DECOY
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mb-2">{colorEnvelope(msg.envelope)}</div>
                  {dbDecrypting[msg.id] && (
                    <p className="text-[10px] text-blue-400 animate-pulse">
                      Decrypting…
                    </p>
                  )}
                  {dbDecrypted[msg.id] !== undefined && (
                    <div
                      className={`mt-2 px-2 py-1.5 rounded text-[11px] font-mono border ${
                        dbDecrypted[msg.id].startsWith("Error")
                          ? "bg-red-950 border-red-800 text-red-300"
                          : "bg-emerald-950 border-emerald-800 text-emerald-300"
                      }`}
                    >
                      {dbDecrypted[msg.id].startsWith("Error")
                        ? "Decryption failed"
                        : "Decrypted"}
                      : {dbDecrypted[msg.id]}
                    </div>
                  )}
                  {dbDecrypted[msg.id] === undefined &&
                    !dbDecrypting[msg.id] && (
                      <p className="text-[10px] text-gray-600">
                        Click to decrypt with Bob&apos;s key
                      </p>
                    )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Burn countdown sub-component ──────────────────────────────────────────
function BurnCountdown({
  id,
  ttl,
  onExpire,
}: {
  id: number;
  ttl: number;
  onExpire: () => void;
}) {
  const [rem, setRem] = useState(ttl);
  const called = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      setRem((r) => {
        if (r <= 1) {
          clearInterval(t);
          if (!called.current) {
            called.current = true;
            onExpire();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  });
  return (
    <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
      BURN in {rem}s
    </span>
  );
}

// ─── Step dot sub-component ─────────────────────────────────────────────────
function StepDot({
  n,
  steps,
}: {
  n: number;
  steps: Record<number, StepState>;
}) {
  const { status } = steps[n];
  const base =
    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5";
  const cls =
    status === "done"
      ? `${base} bg-emerald-100 text-emerald-700`
      : status === "active"
        ? `${base} bg-blue-100 text-blue-700 animate-pulse`
        : `${base} bg-gray-100 text-gray-500`;
  return <div className={cls}>{status === "done" ? "✓" : n}</div>;
}
