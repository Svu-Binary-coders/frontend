const subtle = () => window.crypto.subtle;
const enc = (s: string) => new TextEncoder().encode(s);

function b64d(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    await subtle().digest("SHA-256", data as unknown as BufferSource),
  );
}

export class SessionManager {
  //  Tier 1: Root Shared Key (ECDH) 
  /**
   *
   * @param myPrivateKey This is your private key (should be generated and stored securely, e.g. in IndexedDB)
   * @param peerPublicKey This is the other party's public key (should be obtained from the server or exchanged securely)
   * @returns A CryptoKey that can be used as the root key for deriving chat keys. This key is not directly usable for encryption, but can be used to derive chat-specific keys.
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
    return subtle().importKey("raw", sharedBits, "HKDF", false, [
      "deriveKey",
      "deriveBits",
    ]);
  }

  //  Tier 2: Chat Key (per chatId, HKDF) 
  static async deriveChatKeyHKDF(
    rootKey: CryptoKey,
    chatId: string,
  ): Promise<CryptoKey> {
    const chatIdHash = await sha256(enc(chatId));
    const bits = await subtle().deriveBits(
      {
        name: "HKDF",
        salt: chatIdHash as unknown as BufferSource,
        info: enc("FCP-CHAT-v1"),
        hash: "SHA-256",
      },
      rootKey,
      256,
    );
    return subtle().importKey("raw", bits, "HKDF", false, [
      "deriveKey",
      "deriveBits",
    ]);
  }

  //  Tier 3: Message Key (per timestamp, O(1)) 
  static async deriveMessageKey(
    chatKey: CryptoKey,
    timestamp: number,
  ): Promise<CryptoKey> {
    const tsSalt = await sha256(enc(String(timestamp)));
    return subtle().deriveKey(
      {
        name: "HKDF",
        salt: tsSalt as unknown as BufferSource,
        info: enc("FCP-MSG-v1"),
        hash: "SHA-256",
      },
      chatKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }


  //  Session bootstrap (convenience) 
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
