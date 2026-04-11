// src/core/e2e/SessionManager.ts
//
// 3-Tier Message Key Hierarchy
// ─────────────────────────────────────────────────────────────────────────
//
// Tier 1 — Root Shared Key   (per user-pair, one-time ECDH)
//   ECDH(myPriv, theirPub) → 384 raw bits
//   importKey("raw", bits, "HKDF") → rootKey
//
// Tier 2 — Chat Key          (per conversation, derived from chatId)
//   chatId = SHA-256(sort([userAId, userBId]).join(":"))  → stable, canonical
//   HKDF(rootKey, salt=chatId, info="FCP-CHAT-v1") → chatKey
//
//   Benefit: even if two users have multiple chats (group vs DM), each chat
//   gets a completely isolated key.  The chatId is embedded in the envelope
//   so the receiver can verify which chat the message belongs to.
//
// Tier 3 — Message Key       (per message, derived from timestamp)
//   HKDF(chatKey, salt=timestamp, info="FCP-MSG-v1") → msgKey
//
//   O(1) derivation — no ratchet loop, no "max skip" DoS.
//   Out-of-order messages handled natively (each key is independently
//   derivable from the timestamp embedded in the envelope).

const subtle = () => window.crypto.subtle;
const enc = (s: string) => new TextEncoder().encode(s);

// ── helpers ───────────────────────────────────────────────────────────────
function b64d(s: string): Uint8Array {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const result = await subtle().digest(
    "SHA-256",
    data as unknown as BufferSource,
  );
  return new Uint8Array(result);
}

export class SessionManager {
  // ════════════════════════════════════════════════════════════════════════
  // Tier 1 — Root Shared Key
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Both Alice and Bob call this once per session (after handshake).
   * Alice: deriveRootKey(alicePriv, bobPub)
   * Bob:   deriveRootKey(bobPriv,   alicePub)
   * → Both arrive at the same root key. (ECDH guarantee)
   */
  static async deriveRootKey(
    myPrivateKey: CryptoKey,
    peerPublicKey: CryptoKey,
  ): Promise<CryptoKey> {
    const sharedBits = await subtle().deriveBits(
      { name: "ECDH", public: peerPublicKey },
      myPrivateKey,
      384,
    );
    // Import as HKDF source — never used for encryption directly
    return subtle().importKey("raw", sharedBits, "HKDF", false, [
      "deriveKey",
      "deriveBits",
    ]);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tier 2 — Chat Key  (per chatId)
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Derives a stable, conversation-scoped key from the Root Key and chatId.
   *
   * chatId MUST be canonical — use `SessionManager.buildChatId()` to create it.
   * Both Alice and Bob derive the same Chat Key because they share the same
   * Root Key and agree on the same chatId.
   *
   * Cache this key per session (store in memory, never in IndexedDB).
   */
  static async deriveChatKey(
    rootKey: CryptoKey,
    chatId: string,
  ): Promise<CryptoKey> {
    // Use SHA-256(chatId) as salt — gives us a fixed-length, domain-separated salt
    const chatIdHash = await sha256(enc(chatId));

    return subtle().deriveKey(
      {
        name: "HKDF",
        salt: chatIdHash as BufferSource,
        info: enc("FCP-CHAT-v1"),
        hash: "SHA-256",
      },
      rootKey,
      { name: "AES-GCM", length: 256 }, // intermediate key
      false,
      ["deriveKey", "deriveBits"], // used only to derive msg keys
    ) as unknown as CryptoKey;

    // Note: We want the chatKey to be an HKDF key, not AES-GCM.
    // The trick: derive raw bits then re-import.
  }

  /**
   * Better implementation — derive chatKey as HKDF source bits.
   */
  static async deriveChatKeyHKDF(
    rootKey: CryptoKey,
    chatId: string,
  ): Promise<CryptoKey> {
    const chatIdHash = await sha256(enc(chatId));

    const bits = await subtle().deriveBits(
      {
        name: "HKDF",
        salt: chatIdHash as BufferSource,
        info: enc("FCP-CHAT-v1"),
        hash: "SHA-256",
      },
      rootKey,
      256,
    );

    // Re-import as HKDF source for Tier 3
    return subtle().importKey("raw", bits, "HKDF", false, [
      "deriveKey",
      "deriveBits",
    ]);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tier 3 — Message Key  (per timestamp, O(1))
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Derives a single-use AES-GCM key for one message.
   *
   * Input:  chatKey (Tier 2) + timestamp (from envelope) + flags (from envelope)
   * Output: AES-GCM-256 key — non-extractable, encrypt/decrypt only
   *
   * O(1): no loop, no state. Any message can be decrypted independently
   * just from its embedded timestamp.
   */
  static async deriveMessageKey(
    chatKey: CryptoKey,
    timestamp: number,
    flags: number,
  ): Promise<CryptoKey> {
    // Context token combines timestamp and flags to create a unique salt for each message key derivation . Help to . This ensures that even if two messages have the same timestamp (unlikely but possible), different flags will lead to different keys, enhancing security.
    const contextToken = `${timestamp}_${flags}`;

    // এই ইউনিক স্ট্রিং থেকে SHA-256 হ্যাশ করে Salt তৈরি করা হচ্ছে
    const tsSalt = await sha256(enc(contextToken));

    return subtle().deriveKey(
      {
        name: "HKDF",
        salt: tsSalt as BufferSource, // এখন সল্টটি টাইম এবং ফ্ল্যাগ উভয়ের ওপর নির্ভরশীল
        info: enc("FCP-MSG-v1"),
        hash: "SHA-256",
      },
      chatKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ChatId builder
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Canonical chatId: SHA-256( sort([userAId, userBId]).join(":") )
   *
   * - Deterministic regardless of who initiates.
   * - Safe to embed in the envelope (hash, not raw IDs).
   * - For group chats: sort all member IDs the same way.
   */
  static async buildChatId(...userIds: string[]): Promise<string> {
    const sorted = [...userIds].sort().join(":");
    const hash = await sha256(enc(sorted));
    // Return as hex for readability in the envelope
    return Array.from(hash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // ════════════════════════════════════════════════════════════════════════
  // Full session bootstrap (convenience)
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Call once after a WebSocket handshake delivers the peer's public key.
   *
   * Returns { rootKey, getChatKey } where getChatKey(chatId) is memoized.
   */
  static async bootstrapSession(
    myPrivateKey: CryptoKey,
    peerPublicKeyB64: string,
  ): Promise<{
    rootKey: CryptoKey;
    getChatKey: (chatId: string) => Promise<CryptoKey>;
  }> {
    const peerPubKey = await subtle().importKey(
      "spki",
      b64d(peerPublicKeyB64).buffer as ArrayBuffer,
      { name: "ECDH", namedCurve: "P-384" },
      false,
      [],
    );

    const rootKey = await SessionManager.deriveRootKey(
      myPrivateKey,
      peerPubKey,
    );

    // Memoize chat keys in memory (lost on page refresh — by design)
    const chatKeyCache = new Map<string, CryptoKey>();

    const getChatKey = async (chatId: string): Promise<CryptoKey> => {
      if (chatKeyCache.has(chatId)) return chatKeyCache.get(chatId)!;
      const ck = await SessionManager.deriveChatKeyHKDF(rootKey, chatId);
      chatKeyCache.set(chatId, ck);
      return ck;
    };

    return { rootKey, getChatKey };
  }
}
