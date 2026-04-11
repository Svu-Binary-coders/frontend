// src/core/e2e/index.ts
//
// ══════════════════════════════════════════════════════════════════════════
//  Flex Chat Protocol (FCP) — Entry Point
// ══════════════════════════════════════════════════════════════════════════
//
// Key Hierarchy (3 tiers):
//
//   PIN
//    └─ PBKDF2(310k) + HKDF stretch ──► MasterKey  [non-extractable, wrapKey only]
//         └─ AES-GCM wrap ─────────────► Encrypted PrivKey  (IndexedDB)
//         └─ AES-GCM wrap ─────────────► Encrypted SigKey   (IndexedDB)
//
//   ECDH(myPriv + peerPub)
//    └─ importKey("HKDF") ────────────► RootKey    [Tier 1, per user-pair]
//         └─ HKDF(salt=SHA256(chatId)) ► ChatKey   [Tier 2, per conversation]
//              └─ HKDF(salt=SHA256(ts)) ► MsgKey   [Tier 3, per message, O(1)]
//
// Wire Envelope (8 segments, colon-separated):
//   version:flags:conditions:chatId:timestamp:iv:ciphertext:signature

export { KeyManager } from "./KeyManager";
export { SessionManager } from "./SessionManager";
export { FlexCipher } from "./FlexCipher";
export * from "./types";

// ══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLES (copy-paste for your chat components)
// ══════════════════════════════════════════════════════════════════════════

/*
──────────────────────────────────────────────
  REGISTRATION  (once per user)
──────────────────────────────────────────────

import { KeyManager } from "@/core/e2e";

const identity = await KeyManager.createAndStoreIdentity("alice", "my-secret-pin");
// identity.publicKeyB64  → share with server / peer
// everything else        → stored in IndexedDB automatically


──────────────────────────────────────────────
  LOGIN  (unlock identity with PIN)
──────────────────────────────────────────────

const { identity, privateKey, signingKey } =
  await KeyManager.loadIdentity("alice", "my-secret-pin");

// If wrong PIN → unwrapKey throws → show "Wrong PIN" to user


──────────────────────────────────────────────
  SESSION SETUP  (after WebSocket handshake)
──────────────────────────────────────────────

import { SessionManager } from "@/core/e2e";

// Server delivers Bob's public key during handshake
const { getChatKey } = await SessionManager.bootstrapSession(
  privateKey,          // Alice's private key (from loadIdentity)
  bobPublicKeyB64      // Bob's spki public key (from server)
);

// Build a canonical chatId (deterministic, works for group chats too)
const chatId = await SessionManager.buildChatId("alice", "bob");

// Derive the Tier-2 chat key (cached in memory automatically)
const chatKey = await getChatKey(chatId);


──────────────────────────────────────────────
  SEND A MESSAGE
──────────────────────────────────────────────

import { FlexCipher, FCPFlags } from "@/core/e2e";

const envelope = await FlexCipher.packMessage({
  payload:    { t: "Hello Bob!", m: [] },
  chatKey,
  signingKey,
  chatId,
  flags:      FCPFlags.TXT,
  conditions: "NONE",
});

// Send `envelope` string via WebSocket / REST
socket.emit("message", { to: "bob", envelope });


──────────────────────────────────────────────
  SEND A BURN + TTL MESSAGE
──────────────────────────────────────────────

const envelope = await FlexCipher.packMessage({
  payload:    { t: "This self-destructs in 10 seconds!" },
  chatKey,
  signingKey,
  chatId,
  flags:      FCPFlags.TXT | FCPFlags.BURN,
  ttlSeconds: 10,
});


──────────────────────────────────────────────
  SEND WITH TIME LOCK (time-capsule)
──────────────────────────────────────────────

const unlockAt = new Date();
unlockAt.setMinutes(unlockAt.getMinutes() + 30); // unlock in 30 min

const envelope = await FlexCipher.packMessage({
  payload:    { t: "You can read this in 30 minutes." },
  chatKey,
  signingKey,
  chatId,
  flags:      FCPFlags.TXT,
  conditions: FlexCipher.conditions.time(unlockAt),
});


──────────────────────────────────────────────
  SEND WITH DECOY (plausible deniability)
──────────────────────────────────────────────

const envelope = await FlexCipher.packMessage({
  payload:      { t: "Top secret message." },
  chatKey,
  signingKey,
  chatId,
  flags:        FCPFlags.TXT | FCPFlags.DECOY,
  duressPin:    "1234",
  decoyPayload: { t: "Nothing to see here." },
});

// Real PIN → real message
// Duress PIN "1234" → decoy message (plausible deniability)


──────────────────────────────────────────────
  RECEIVE A MESSAGE
──────────────────────────────────────────────

const result = await FlexCipher.unpackMessage({
  envelope,
  chatKey,     // derive from chatId embedded in envelope
  signingKey,
});

console.log(result.payload.t);   // decrypted text
console.log(result.flags);       // bitwise flags
console.log(result.ttlSeconds);  // null or number → start countdown

// Start TTL countdown if BURN:
if (result.ttlSeconds) {
  setTimeout(() => deleteMessageFromDB(result.timestamp), result.ttlSeconds * 1000);
}
*/
