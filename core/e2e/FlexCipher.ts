// src/core/e2e/FlexCipher.ts
//
// Pack / Unpack — the public-facing API of FCP
//
// Envelope wire format (colon-separated, 8 segments):
//
//   version : flags : conditions : chatId : timestamp : iv : ciphertext : signature
//   ─────────────────────────────────────────────────────────────────────────────────
//   [0]       [1]    [2]          [3]      [4]         [5]  [6]          [7]
//
// Signature covers: timestamp + ":" + iv + ":" + ciphertext
// (version/flags/conditions/chatId are public metadata — signed separately if needed)

import {
  FCPVersion,
  FCPFlags,
  FCPPayload,
  FCPEnvelope,
  FCPUnpackResult,
  hasFlag,
} from "./types";
import { SessionManager } from "./SessionManager";

const subtle = () => window.crypto.subtle;
const enc = (s: string) => new TextEncoder().encode(s);
const rand = (n: number) => window.crypto.getRandomValues(new Uint8Array(n));

// ── Base64 helpers ─────────────────────────────────────────────────────────
function b64e(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64d(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

// ── V4 padding (traffic-analysis resistance) ──────────────────────────────
const V4_PAD_SIZE = 1024; // all messages padded to 1024 chars
function pad(text: string): string {
  return text.padEnd(V4_PAD_SIZE, "\0");
}
function unpad(text: string): string {
  return text.replace(/\0+$/, "");
}

// ── HMAC helpers ──────────────────────────────────────────────────────────
function sigData(timestamp: number, iv: string, ct: string): Uint8Array {
  return enc(`${timestamp}:${iv}:${ct}`);
}

async function hmacSign(
  signingKey: CryptoKey,
  timestamp: number,
  iv: string,
  ct: string,
): Promise<string> {
  const sig = await subtle().sign(
    "HMAC",
    signingKey,
    sigData(timestamp, iv, ct) as unknown as BufferSource,
  );
  return b64e(sig);
}

async function hmacVerify(
  signingKey: CryptoKey,
  timestamp: number,
  iv: string,
  ct: string,
  sigB64: string,
): Promise<boolean> {
  return subtle().verify(
    "HMAC",
    signingKey,
    b64d(sigB64) as unknown as BufferSource,
    sigData(timestamp, iv, ct) as unknown as BufferSource,
  );
}

// ── DECOY sub-layer (PBKDF2 duress-pin key) ───────────────────────────────
async function duressKeyFromPin(pin: string): Promise<CryptoKey> {
  const pinKey = await subtle().importKey(
    "raw",
    enc(pin) as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle().deriveKey(
    {
      name: "PBKDF2",
      salt: enc("FCP-DECOY-SALT-v1") as unknown as BufferSource, 
      iterations: 100_000,
      hash: "SHA-256",
    },
    pinKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface PackOptions {
  payload: FCPPayload;
  chatKey: CryptoKey; // Tier-2 key from SessionManager
  signingKey: CryptoKey; // HMAC key from KeyManager
  chatId: string; // canonical chatId (hex SHA-256)
  version?: FCPVersion;
  flags?: number; // bitwise FCPFlags
  conditions?: string; // "NONE" | "GEO(...)" | "TIME(...);GEO(...)"

  // DECOY support
  duressPin?: string;
  decoyPayload?: FCPPayload;

  // BURN support
  ttlSeconds?: number;
}

export interface UnpackOptions {
  envelope: string;
  chatKey: CryptoKey; // Tier-2 key (same chatId as envelope)
  signingKey: CryptoKey;

  // Optional duress pin — if DECOY flag is set and this pin decrypts the
  // dummy layer, the decoy payload is returned instead.
  duressPin?: string;
}

export class FlexCipher {
  // ════════════════════════════════════════════════════════════════════════
  // PACK  (sender side)
  // ════════════════════════════════════════════════════════════════════════

  static async packMessage(opts: PackOptions): Promise<string> {
    const {
      payload,
      chatKey,
      signingKey,
      chatId,
      version = FCPVersion.V1,
      flags = FCPFlags.TXT,
      conditions = "NONE",
      duressPin,
      decoyPayload,
      ttlSeconds,
    } = opts;

    const timestamp = Date.now();

    // Attach TTL and DECOY sub-layers inside the encrypted payload
    const innerPayload: FCPPayload = { ...payload };

    if (ttlSeconds && hasFlag(flags, FCPFlags.BURN)) {
      innerPayload._ttl = ttlSeconds;
    }

    if (hasFlag(flags, FCPFlags.DECOY) && duressPin && decoyPayload) {
      const dk = await duressKeyFromPin(duressPin);
      const div = rand(12);

      const dct = await subtle().encrypt(
        { name: "AES-GCM", iv: div as unknown as BufferSource },
        dk,
        enc(JSON.stringify(decoyPayload)) as unknown as BufferSource,
      );
      innerPayload._decoy = { iv: b64e(div), ct: b64e(dct) };
    }

    // Serialize → optionally pad (V4)
    let plainText = JSON.stringify(innerPayload);
    if (version === FCPVersion.V4) plainText = pad(plainText);

    // ── Tier 3: message key ──────────────────────────────────────────────
    const msgKey = await SessionManager.deriveMessageKey(chatKey, timestamp, flags);

    // ── AES-GCM encrypt ─────────────────────────────────────────────────
    const iv = rand(12);

    const ctBuffer = await subtle().encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      msgKey,
      enc(plainText) as unknown as BufferSource,
    );

    const ivB64 = b64e(iv);
    const ctB64 = b64e(ctBuffer);

    // ── HMAC sign ───────────────────────────────────────────────────────
    const signature = await hmacSign(signingKey, timestamp, ivB64, ctB64);

    // ── Assemble envelope ───────────────────────────────────────────────
    // [0]version : [1]flags : [2]conditions : [3]chatId : [4]timestamp : [5]iv : [6]ct : [7]sig
    return [
      version,
      flags,
      conditions,
      chatId,
      timestamp,
      ivB64,
      ctB64,
      signature,
    ].join(":");
  }

  // ════════════════════════════════════════════════════════════════════════
  // UNPACK  (receiver side)
  // ════════════════════════════════════════════════════════════════════════

  static async unpackMessage(opts: UnpackOptions): Promise<FCPUnpackResult> {
    const { envelope, chatKey, signingKey, duressPin } = opts;

    // ── 1. Parse ─────────────────────────────────────────────────────────
    const parts = envelope.split(":");
    if (parts.length < 8)
      throw new Error("Invalid FCP envelope: wrong segment count");

    const [
      versionStr,
      flagsStr,
      conditions,
      chatId,
      tsStr,
      ivB64,
      ctB64,
      signature,
    ] = parts;

    const version = versionStr as FCPVersion;
    const flags = parseInt(flagsStr, 10);
    const timestamp = parseInt(tsStr, 10);

    if (!Object.values(FCPVersion).includes(version))
      throw new Error(`Unsupported FCP version: ${version}`);
    if (isNaN(flags) || isNaN(timestamp))
      throw new Error("Envelope parse error: flags or timestamp is NaN");

    // ── 2. Condition gate ────────────────────────────────────────────────
    await FlexCipher._checkConditions(conditions);

    // ── 3. Signature verify ──────────────────────────────────────────────
    const valid = await hmacVerify(
      signingKey,
      timestamp,
      ivB64,
      ctB64,
      signature,
    );
    if (!valid)
      throw new Error("⚠️ Signature invalid — message tampered or wrong key");

    // ── 4. Derive message key ────────────────────────────────────────────
    const msgKey = await SessionManager.deriveMessageKey(chatKey, timestamp, flags);

    // ── 5. AES-GCM decrypt ───────────────────────────────────────────────

    const decryptedBuffer = await subtle().decrypt(
      { name: "AES-GCM", iv: b64d(ivB64) as unknown as BufferSource },
      msgKey,
      b64d(ctB64) as unknown as BufferSource,
    );

    let plainText = new TextDecoder().decode(decryptedBuffer);
    if (version === FCPVersion.V4) plainText = unpad(plainText);

    let payload: FCPPayload = JSON.parse(plainText);

    // ── 6. DECOY branch ──────────────────────────────────────────────────
    if (hasFlag(flags, FCPFlags.DECOY) && duressPin && payload._decoy) {
      try {
        const dk = await duressKeyFromPin(duressPin);

        const decoyBuffer = await subtle().decrypt(
          {
            name: "AES-GCM",
            iv: b64d(payload._decoy.iv) as unknown as BufferSource,
          },
          dk,
          b64d(payload._decoy.ct) as unknown as BufferSource,
        );
        payload = JSON.parse(new TextDecoder().decode(decoyBuffer));
      } catch {
        // Wrong duress pin → real payload is shown (plausible deniability intact)
      }
    }

    // ── 7. Extract TTL ───────────────────────────────────────────────────
    const ttlSeconds = payload._ttl ?? null;
    delete payload._ttl;
    delete payload._decoy;

    return { payload, flags, conditions, chatId, timestamp, ttlSeconds };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Condition Engine
  // ════════════════════════════════════════════════════════════════════════

  private static async _checkConditions(condStr: string): Promise<void> {
    if (!condStr || condStr === "NONE") return;

    for (const clause of condStr.split(";")) {
      // TIME(futureUnixMs)
      if (clause.startsWith("TIME")) {
        const m = clause.match(/TIME\(([^)]+)\)/);
        if (!m) throw new Error("Malformed TIME condition");
        const unlockAt = parseInt(m[1], 10);
        if (Date.now() < unlockAt)
          throw new Error(
            `⏱ Time-locked until ${new Date(unlockAt).toLocaleString()}`,
          );
      }

      // GEO(lat,lng,radiusKm)
      if (clause.startsWith("GEO")) {
        const m = clause.match(/GEO\(([^,]+),([^,]+),([^)]+)\)/);
        if (!m) throw new Error("Malformed GEO condition");
        const [, lat, lng, radius] = m;
        const ok = await FlexCipher._geoCheck(+lat, +lng, +radius);
        if (!ok)
          throw new Error(
            "📍 GEO lock: you are not within the allowed location",
          );
      }
    }
  }

  private static _haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private static _geoCheck(
    targetLat: number,
    targetLng: number,
    radiusKm: number,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(false);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const dist = FlexCipher._haversine(
            coords.latitude,
            coords.longitude,
            targetLat,
            targetLng,
          );
          resolve(dist <= radiusKm);
        },
        () => resolve(false),
        { timeout: 6000, maximumAge: 30_000 },
      );
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Condition builder helpers (for the sender UI)
  // ════════════════════════════════════════════════════════════════════════

  static conditions = {
    none: () => "NONE",
    time: (futureDate: Date | number) =>
      `TIME(${futureDate instanceof Date ? futureDate.getTime() : futureDate})`,
    geo: (lat: number, lng: number, km = 1) => `GEO(${lat},${lng},${km})`,
    combine: (...parts: string[]) => parts.join(";"),
  };

  // ════════════════════════════════════════════════════════════════════════
  // Flag builder helpers (bitwise)
  // ════════════════════════════════════════════════════════════════════════

  static buildFlags(...flags: number[]): number {
    return flags.reduce((acc, f) => acc | f, 0);
  }
}
