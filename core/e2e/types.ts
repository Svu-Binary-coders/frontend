// src/core/e2e/types.ts

export enum FCPVersion {
  V1 = "v1", // Standard E2EE — HKDF timestamp salt, per-message key
  V4 = "v4", // + Padding     — all messages padded to same size (traffic analysis resistance)
  V5 = "v5", // + Bitwise flags
}

// ─── Bitwise Flag constants ────────────────────────────────────────────────
// Usage: flags = FCPFlags.BURN | FCPFlags.BIOMETRIC  →  flags = 0b00000110 = 6
export const FCPFlags = {
  NONE: 0b00000000, // 0
  TXT: 0b00000001, // 1  — plain text
  IMG: 0b00000010, // 2  — image  (URL encrypted inside cipher)
  FILE: 0b00000100, // 4  — file   (URL encrypted inside cipher)
  BURN: 0b00001000, // 8  — view-once, wipe after read
  BIOMETRIC: 0b00010000, // 16 — WebAuthn required before render
  DECOY: 0b00100000, // 32 — plausible-deniability sub-layer
  FORWARDED: 0b01000000, // 64 — show/hide is forward-alowed in UI
} as const;

export type FCPFlagValue = typeof FCPFlags[keyof typeof FCPFlags];

// Helper: test a single flag
export function hasFlag(flags: number, flag: number): boolean {
  return (flags & flag) !== 0;
}

// ─── Envelope (wire format) ───────────────────────────────────────────────
// "version:flags:conditions:chatId:timestamp:iv:ciphertext:signature"
export interface FCPEnvelope {
  version:    FCPVersion;
  flags:      number;       // bitwise
  conditions: string;       // "NONE" | "GEO(...)" | "TIME(...)" | "GEO(...);TIME(...)"
  chatId:     string;       // SHA-256 hash of sorted participant IDs
  timestamp:  number;       // ms since epoch (used as HKDF salt)
  iv:         string;       // base64 AES-GCM IV
  cipherText: string;       // base64 AES-GCM ciphertext
  signature:  string;       // base64 HMAC-SHA256
}

// ─── Payload (inside the ciphertext) ──────────────────────────────────────
export interface FCPPayload {
  t:  string;       // text
  m?: string[];     // media URLs (IMG / FILE)
  _ttl?: number;    // TTL seconds (BURN)
  _decoy?: {        // encrypted dummy (DECOY)
    iv: string;
    ct: string;
  };
}

// ─── Stored identity (IndexedDB) ──────────────────────────────────────────
export interface StoredIdentity {
  userId:        string;
  publicKeyB64:  string;   // spki, shared openly
  encPrivKeyB64: string;   // pkcs8, AES-GCM encrypted with Master Key
  privKeyIvB64:  string;   // IV used to encrypt the private key
  saltB64:       string;   // random PBKDF2 salt (32 bytes), per-user
  sigKeyB64:     string;   // HMAC signing key, AES-GCM encrypted with Master Key
  sigKeyIvB64:   string;
}

// ─── Unpack result ────────────────────────────────────────────────────────
export interface FCPUnpackResult {
  payload:     FCPPayload;
  flags:       number;
  conditions:  string;
  chatId:      string;
  timestamp:   number;
  ttlSeconds:  number | null;
}