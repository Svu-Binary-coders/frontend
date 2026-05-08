import { SessionManager, KeyManager } from "@/core/e2e";
import { useSessionStore } from "@/stores/sessionStore";
import api from "@/lib/axios";

const SENDER_KEY_PREFIX = "grp_sender:";

async function ensureKeys() {
  let { privateKey, signingKey } = useSessionStore.getState();

  if (!privateKey || !signingKey) {
    try {
      const activeKeys = await KeyManager.loadActiveKeys();
      if (activeKeys) {
        privateKey = activeKeys.privateKey;
        signingKey = activeKeys.signingKey;
        useSessionStore.getState().setSession({
          userId: activeKeys.userId || "",
          privateKey: activeKeys.privateKey,
          signingKey: activeKeys.signingKey,
          backupKey: null,
          needPin: false,
        });
      }
    } catch (error) {
      console.error("Failed to load keys:", error);
    }
  }

  return { privateKey, signingKey };
}
const safeUint8Array = (length: number): Uint8Array<ArrayBuffer> => {
  const buf = new ArrayBuffer(length);
  const arr = new Uint8Array(buf);
  crypto.getRandomValues(arr);
  return arr;
};

const toSafeUint8Array = (data: Uint8Array): Uint8Array<ArrayBuffer> => {
  const buf = new ArrayBuffer(data.length);
  new Uint8Array(buf).set(data);
  return new Uint8Array(buf);
};

// db operations — IndexDB or localStorage (dev only)
const dbSave = async (key: string, value: unknown) => {
  // await KeyManager.saveToIndexDB(key, value);
  localStorage.setItem(key, JSON.stringify(value));
};

const dbGet = async (key: string) => {
  // return await KeyManager.getFromIndexDB(key);

  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
};

const saveMyChainKey = async (
  chatId: string,
  chainKey: Uint8Array<ArrayBuffer>,
  counter: number,
) => {
  await dbSave(`${SENDER_KEY_PREFIX}${chatId}:my`, {
    chainKey: Array.from(chainKey),
    counter,
  });
};

const saveSenderChainKey = async (
  chatId: string,
  senderId: string,
  chainKey: Uint8Array<ArrayBuffer>,
  counter: number,
) => {
  await dbSave(`${SENDER_KEY_PREFIX}${chatId}:${senderId}`, {
    chainKey: Array.from(chainKey),
    counter,
  });
};

const getMyChainKey = async (chatId: string) => {
  const data = await dbGet(`${SENDER_KEY_PREFIX}${chatId}:my`);
  if (!data) return null;
  return {
    chainKey: toSafeUint8Array(new Uint8Array(data.chainKey)),
    counter: data.counter as number,
  };
};

const getSenderChainKey = async (chatId: string, senderId: string) => {
  const data = await dbGet(`${SENDER_KEY_PREFIX}${chatId}:${senderId}`);
  if (!data) return null;
  return {
    chainKey: toSafeUint8Array(new Uint8Array(data.chainKey)),
    counter: data.counter as number,
  };
};

const deriveMessageKey = async (
  chainKey: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> => {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    chainKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    new TextEncoder().encode("msg"),
  );
  return crypto.subtle.importKey(
    "raw",
    toSafeUint8Array(new Uint8Array(sig)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
};

const advanceChainKey = async (
  chainKey: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> => {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    chainKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    new TextEncoder().encode("next"),
  );
  return toSafeUint8Array(new Uint8Array(sig));
};

const encryptChainKeyForMember = async (
  chainKey: Uint8Array<ArrayBuffer>,
  memberPublicKeyB64: string,
  myPrivateKey: CryptoKey,
  chatId: string,
): Promise<string> => {
  const { getChatKey } = await SessionManager.bootstrapSession(
    myPrivateKey,
    memberPublicKeyB64,
  );
  const sharedKey = await getChatKey(`${chatId}:grp-key-exchange`);
  const iv = safeUint8Array(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    chainKey,
  );

  const combined = toSafeUint8Array(
    new Uint8Array([...iv, ...new Uint8Array(encrypted)]),
  );
  return btoa(String.fromCharCode(...combined));
};

const decryptChainKeyFromSender = async (
  encryptedBase64: string,
  senderPublicKeyB64: string,
  myPrivateKey: CryptoKey,
  chatId: string,
): Promise<Uint8Array<ArrayBuffer>> => {
  const { getChatKey } = await SessionManager.bootstrapSession(
    myPrivateKey,
    senderPublicKeyB64,
  );

  const sharedKey = await getChatKey(`${chatId}:grp-key-exchange`);

  const combined = toSafeUint8Array(
    Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0)),
  );
  const iv = combined.slice(0, 12) as Uint8Array<ArrayBuffer>;
  const data = combined.slice(12) as Uint8Array<ArrayBuffer>;

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    data,
  );

  return toSafeUint8Array(new Uint8Array(decrypted));
};

// ─────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────

export const initGroupSenderKey = async (
  chatId: string,
  myId: string,
  memberPublicKeys: { userId: string; publicKey: string }[],
) => {
  const { privateKey } = await ensureKeys();
  if (!privateKey) throw new Error("Private key not found");

  const chainKey = safeUint8Array(32);
  await saveMyChainKey(chatId, chainKey, 0);

  const encryptedKeys = await Promise.all(
    memberPublicKeys
      .filter((m) => m.userId !== myId)
      .map(async ({ userId, publicKey }) => ({
        recipientId: userId,
        encryptedChainKey: await encryptChainKeyForMember(
          chainKey,
          publicKey,
          privateKey,
          chatId,
        ),
      })),
  );

  await api.post(`/groups/${chatId}/sender-key`, { encryptedKeys });
};


export const loadGroupSenderKeys = async (
  chatId: string,
  senderPublicKeys: Map<string, string>,
) => {
  const { privateKey } = await ensureKeys();
  if (!privateKey) throw new Error("Private key not found");

  const { data } = await api.get(`/groups/${chatId}/sender-keys`);

  await Promise.all(
    data.senderKeys.map(
      async ({
        senderId,
        encryptedChainKey,
      }: {
        senderId: string;
        encryptedChainKey: string;
      }) => {
        try {
          const senderPublicKey = senderPublicKeys.get(senderId);
          if (!senderPublicKey) return;

          const chainKey = await decryptChainKeyFromSender(
            encryptedChainKey,
            senderPublicKey,
            privateKey,
            chatId,
          );

          await saveSenderChainKey(chatId, senderId, chainKey, 0);
        } catch (err) {
          console.error(`Sender key load failed for ${senderId}:`, err);
        }
      },
    ),
  );
};

// Group message encrypt
export const encryptGroupMessage = async (
  content: string,
  chatId: string,
  myId: string,
): Promise<string> => {
  const state = await getMyChainKey(chatId);
  if (!state) throw new Error("No sender key — call initGroupSenderKey first");

  const { chainKey, counter } = state;
  const messageKey = await deriveMessageKey(chainKey);

  const iv = safeUint8Array(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    messageKey,
    new TextEncoder().encode(content),
  );

  const combined = toSafeUint8Array(
    new Uint8Array([...iv, ...new Uint8Array(encrypted)]),
  );
  const base64 = btoa(String.fromCharCode(...combined));

  const nextChainKey = await advanceChainKey(chainKey);
  await saveMyChainKey(chatId, nextChainKey, counter + 1);

  return `grp_${myId}_c${counter}:${base64}`;
};

// Group message decrypt
export const decryptGroupMessage = async (
  encryptedContent: string,
  chatId: string,
): Promise<string> => {
  if (!encryptedContent.startsWith("grp_")) return encryptedContent;

  const match = encryptedContent.match(/^grp_(.+)_c(\d+):(.+)$/);
  if (!match) return "🔒 [Encrypted Message]";

  const senderId = match[1];
  const msgCounter = parseInt(match[2]);
  const base64 = match[3];

  const state = await getSenderChainKey(chatId, senderId);
  if (!state) return "🔒 [Encrypted Message]";

  let { chainKey, counter } = state;

  // out-of-order handle
  while (counter < msgCounter) {
    chainKey = await advanceChainKey(chainKey);
    counter++;
  }

  const messageKey = await deriveMessageKey(chainKey);

  try {
    const combined = toSafeUint8Array(
      Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
    );
    const iv = combined.slice(0, 12) as Uint8Array<ArrayBuffer>;
    const data = combined.slice(12) as Uint8Array<ArrayBuffer>;

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      messageKey,
      data,
    );

    const nextChainKey = await advanceChainKey(chainKey);
    await saveSenderChainKey(chatId, senderId, nextChainKey, counter + 1);

    return new TextDecoder().decode(decrypted);
  } catch {
    return "🔒 [Encrypted Message]";
  }
};

// Member add/remove ,  rotation
export const rotateGroupSenderKey = async (
  chatId: string,
  myId: string,
  newMemberPublicKeys: { userId: string; publicKey: string }[],
) => {
  const { privateKey } = await ensureKeys();
  if (!privateKey) throw new Error("Private key not found");

  const newChainKey = safeUint8Array(32);
  await saveMyChainKey(chatId, newChainKey, 0);

  const encryptedKeys = await Promise.all(
    newMemberPublicKeys
      .filter((m) => m.userId !== myId)
      .map(async ({ userId, publicKey }) => ({
        recipientId: userId,
        encryptedChainKey: await encryptChainKeyForMember(
          newChainKey,
          publicKey,
          privateKey,
          chatId,
        ),
      })),
  );

  await api.post(`/groups/${chatId}/sender-key`, { encryptedKeys });
};

export const isGroupEncrypted = (content: string): boolean =>
  typeof content === "string" && content.startsWith("grp_");
