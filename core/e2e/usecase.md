# FCP — ব্যবহার গাইড (USE.md)

এই file পড়লেই বুঝবে কোথায় কোন function call করতে হবে,
কী দিতে হবে, কী ফেরত আসবে।

---

## ফাইল কোথায় আছে

```
src/core/e2e/
├── types.ts          ← সংজ্ঞা (import করো, কিছু call করতে হবে না)
├── KeyManager.ts     ← PIN / Identity key
├── SessionManager.ts ← ECDH / Chat key
├── FlexCipher.ts     ← আসল encrypt / decrypt
├── FCPEngine.ts      ← সহজ wrapper (UI থেকে এটাই ব্যবহার করো)
└── BackupManager.ts  ← Backup key lifecycle
```

---

## ধাপ ১ — Registration (একবারই)

### কোথায় call করবে
`app/register/page.tsx` — user প্রথমবার account খোলার সময়।

### কী call করবে

```ts
import { KeyManager } from "@/core/e2e/KeyManager";
import { BackupManager } from "@/core/e2e/BackupManager";

// ── ১. Identity তৈরি করো ──────────────────────────────────────────────
const identity = await KeyManager.createAndStoreIdentity(userId, pin);
// identity এর ভেতরে যা আছে:
// {
//   userId:        string   — তোমার user id
//   publicKeyB64:  string   — server এ পাঠাও (সবাই দেখতে পারবে)
//   encPrivKeyB64: string   — IndexedDB তে save হয়ে গেছে (encrypted)
//   privKeyIvB64:  string   — IndexedDB তে save হয়ে গেছে
//   saltB64:       string   — server এ save করো (public, secret না)
//   sigKeyB64:     string   — IndexedDB তে save হয়ে গেছে (encrypted)
//   sigKeyIvB64:   string
// }

// ── ২. MasterKey বানাও (BackupKey তৈরির জন্য) ─────────────────────────
const masterKey = await KeyManager.deriveMasterKey(pin, identity.saltB64);
// masterKey → CryptoKey (memory তে থাকে, কোথাও save হয় না)

// ── ৩. BackupKey + Recovery Phrase বানাও ─────────────────────────────
const { backupKey, recoveryPhrase, encBackupKey } =
  await BackupManager.createBackupKey(masterKey);
// backupKey      → CryptoKey (memory তে রাখো)
// recoveryPhrase → "apple brave cloud ..." (24 word — user কে দেখাও)
// encBackupKey   → { ctB64, ivB64 } — server এ save করো

// ── ৪. Server এ পাঠাও ─────────────────────────────────────────────────
await fetch("/api/users", {
  method: "POST",
  body: JSON.stringify({
    userId,
    publicKeyB64: identity.publicKeyB64,
    saltB64:      identity.saltB64,
    encBackupKey,              // { ctB64, ivB64 }
  }),
});
```

### কী কী server এ যাবে
| Field | কেন |
|---|---|
| `publicKeyB64` | Peer ECDH handshake এ লাগবে |
| `saltB64` | Login এ MasterKey বানাতে লাগবে |
| `encBackupKey` | Login এ BackupKey recover করতে লাগবে |

### User কে কী দেখাবে
`recoveryPhrase` — 24-word phrase modal এ দেখাও।
User লিখে রাখলে "Confirm" button active হবে।

```ts
// Phrase ঠিকমতো লিখেছে কিনা verify করো
const { valid, invalidWords } = BackupManager.verifyPhrase(userTypedPhrase);
if (!valid) alert(`ভুল word: ${invalidWords.join(", ")}`);
```

---

## ধাপ ২ — Login

### কোথায় call করবে
`app/login/page.tsx` — user PIN দিলে।

### কী call করবে

```ts
import { KeyManager }    from "@/core/e2e/KeyManager";
import { BackupManager } from "@/core/e2e/BackupManager";

// ── ১. Server থেকে user info নামাও ──────────────────────────────────
const userInfo = await fetch(`/api/users/${userId}`).then(r => r.json());
// userInfo: { saltB64, encBackupKey: { ctB64, ivB64 } }

// ── ২. Identity unlock করো (IndexedDB থেকে private key বের করে) ────
const { privateKey, signingKey } =
  await KeyManager.loadIdentity(userId, pin);
// privateKey  → CryptoKey  (ECDH — chat key বানাতে লাগবে)
// signingKey  → CryptoKey  (HMAC — message sign করতে লাগবে)
// ভুল PIN দিলে এখানেই error throw হবে → "Wrong PIN" দেখাও

// ── ৩. MasterKey বানাও ───────────────────────────────────────────────
const masterKey = await KeyManager.deriveMasterKey(pin, userInfo.saltB64);

// ── ৪. BackupKey restore করো ─────────────────────────────────────────
const backupKey = await BackupManager.restoreBackupKey(
  masterKey,
  userInfo.encBackupKey   // server থেকে আসা { ctB64, ivB64 }
);
// backupKey → CryptoKey (memory তে রাখো — Zustand)

// ── ৫. সব ChatKey restore করো ────────────────────────────────────────
const encChatKeys = await fetch(`/api/backup/chat-keys/${userId}`)
  .then(r => r.json());
// encChatKeys: [{ chatId, ctB64, ivB64 }, ...]

const chatKeyMap = await BackupManager.restoreAllChatKeys(backupKey, encChatKeys);
// chatKeyMap → Map<chatId, CryptoKey>
// এই map টা Zustand এ রাখো — chat component থেকে getChatKey(chatId) দিয়ে নেবে
```

### Zustand এ কী রাখবে
```ts
// store/sessionStore.ts
interface SessionStore {
  privateKey:   CryptoKey | null;
  signingKey:   CryptoKey | null;
  backupKey:    CryptoKey | null;
  chatKeyMap:   Map<string, CryptoKey>;
}
```

---

## ধাপ ৩ — Chat শুরু হলে (নতুন conversation)

### কোথায় call করবে
User নতুন কারো সাথে প্রথমবার chat খুললে।
WebSocket connect হওয়ার পরপরই।

### কী call করবে

```ts
import { SessionManager } from "@/core/e2e/SessionManager";
import { BackupManager }  from "@/core/e2e/BackupManager";

// ── ১. Peer এর public key আনো ─────────────────────────────────────────
const { publicKeyB64: peerPublicKeyB64 } =
  await fetch(`/api/users/${peerId}`).then(r => r.json());

// ── ২. Session bootstrap — ECDH handshake ────────────────────────────
const { getChatKey } = await SessionManager.bootstrapSession(
  privateKey,        // Zustand থেকে নাও
  peerPublicKeyB64
);

// ── ৩. ChatId বানাও (deterministic — দুজনের জন্যই same) ───────────
const chatId = await SessionManager.buildChatId(myUserId, peerId);
// chatId → "a3f9b2c1..." (hex string, 12 char)

// ── ৪. ChatKey নাও ───────────────────────────────────────────────────
const chatKey = await getChatKey(chatId);
// chatKey → CryptoKey

// ── ৫. ChatKey backup করো (প্রথমবারই শুধু) ──────────────────────────
const encChatKey = await BackupManager.backupChatKey(
  backupKey,   // Zustand থেকে নাও
  chatKey,
  chatId
);
await fetch("/api/backup/chat-keys", {
  method: "POST",
  body: JSON.stringify({ userId: myUserId, ...encChatKey }),
});

// ── ৬. ChatKey Zustand এ রাখো ────────────────────────────────────────
setChatKey(chatId, chatKey);
```

---

## ধাপ ৪ — Message পাঠানো

### কোথায় call করবে
Chat component এ Send button এ।

### কী call করবে

```ts
import { FCPEngine } from "@/core/e2e/FCPEngine";

const envelope = await FCPEngine.encryptMessage({
  text:       messageText,
  type:       "text",          // "text" | "image" | "file"
  chatId:     currentChatId,
  chatKey:    chatKey,         // Zustand থেকে getChatKey(chatId)
  signingKey: signingKey,      // Zustand থেকে
  options: {
    isForwarded: false,
    isBlur:      false,
    isViewOnce:  false,        // true হলে BURN flag — 10s পর মুছে যাবে
    conditions:  "NONE",       // বা "TIME(...)" বা "GEO(...)"
  },
});
// envelope → "v1:1:NONE:a3f9b2...:1712839200:aGVsbG8...:..." (long string)

// এই string টা WebSocket দিয়ে পাঠাও
socket.emit("chat_message", {
  to:      peerId,
  chatId:  currentChatId,
  content: envelope,
});
```

### FCPEngine.encryptMessage কী return করে
```ts
// string — এটাই wire এ যাবে
"v1:1:NONE:a3f9b2c1:1712839200000:aGVsbG8=:U2FsdGVkX1....:x9y8z7w6...."
//  ^   ^   ^         ^             ^          ^              ^             ^
// ver flag cond    chatId        timestamp    iv           cipher        sig
```

---

## ধাপ ৫ — Message পাওয়া

### কোথায় call করবে
WebSocket `on("chat_message")` handler এ।

### কী call করবে

```ts
import { FCPEngine } from "@/core/e2e/FCPEngine";

socket.on("chat_message", async (data) => {
  const { chatId, content: envelope } = data;

  // ChatKey নাও Zustand থেকে
  const chatKey = getChatKey(chatId);
  if (!chatKey) {
    console.error("ChatKey নেই — session missing");
    return;
  }

  try {
    const result = await FCPEngine.decryptMessage(
      envelope,
      chatKey,
      signingKey,    // Zustand থেকে
      duressPin      // optional — DECOY flag থাকলে
    );

    // result এর ভেতরে যা আছে:
    // {
    //   text:       "Hello!"     ← আসল message
    //   flags: {
    //     isForwarded: false,    ← UI তে "Forwarded" দেখাবে কিনা
    //     isBlur:      false,    ← CSS blur লাগাবে কিনা
    //     isViewOnce:  false,    ← BURN — দেখার পর মুছবে কিনা
    //   },
    //   conditions:  "NONE",     ← GEO/TIME condition কী ছিল
    //   timestamp:   1712839200000,
    //   ttlSeconds:  null,       ← BURN হলে কত সেকেন্ড পর মুছবে
    // }

    // UI তে render করো
    addMessage({
      id:        Date.now(),
      text:      result.text,
      chatId,
      timestamp: result.timestamp,
      isBlur:    result.flags.isBlur,
      isViewOnce: result.flags.isViewOnce,
    });

    // BURN হলে countdown শুরু করো
    if (result.flags.isViewOnce && result.ttlSeconds) {
      setTimeout(() => deleteMessage(messageId), result.ttlSeconds * 1000);
    }

  } catch (err) {
    // Signature invalid বা condition fail হলে এখানে আসবে
    console.error("Message reject হয়েছে:", err.message);
    // "⚠️ Signature invalid" বা "⏱ Time-locked until..."
  }
});
```

---

## ধাপ ৬ — PIN Change

```ts
import { KeyManager }    from "@/core/e2e/KeyManager";
import { BackupManager } from "@/core/e2e/BackupManager";

// ── ১. নতুন salt + MasterKey ─────────────────────────────────────────
const newSalt      = KeyManager.generateSalt();
const newMasterKey = await KeyManager.deriveMasterKey(newPin, newSalt);

// ── ২. BackupKey re-encrypt ───────────────────────────────────────────
const newEncBackupKey = await BackupManager.reEncryptBackupKey(
  backupKey,     // Zustand থেকে (পুরনো backupKey — same থাকে)
  newMasterKey
);

// ── ৩. Server এ update করো ───────────────────────────────────────────
await fetch("/api/users/backup-key", {
  method: "PATCH",
  body: JSON.stringify({ userId, encBackupKey: newEncBackupKey, saltB64: newSalt }),
});
// ChatKey গুলো আবার backup করতে হবে না — BackupKey same আছে
```

---

## ধাপ ৭ — PIN ভুলে গেলে

```ts
import { BackupManager } from "@/core/e2e/BackupManager";
import { KeyManager }    from "@/core/e2e/KeyManager";

// ── ১. নতুন PIN + MasterKey ──────────────────────────────────────────
const newSalt      = KeyManager.generateSalt();
const newMasterKey = await KeyManager.deriveMasterKey(newPin, newSalt);

// ── ২. Server থেকে encrypted BackupKey নামাও ──────────────────────────
const encBackupKey = await fetch(`/api/users/${userId}/backup-key`)
  .then(r => r.json());

// ── ৩. Recovery Phrase দিয়ে restore + re-encrypt ──────────────────────
const { backupKey, newEncBackupKey } = await BackupManager.recoverFromPhrase(
  recoveryPhrase,   // user এর লেখা 24-word phrase
  newMasterKey,
  encBackupKey
);

// ── ৪. Server এ update করো ───────────────────────────────────────────
await fetch("/api/users/backup-key", {
  method: "PATCH",
  body: JSON.stringify({ userId, encBackupKey: newEncBackupKey, saltB64: newSalt }),
});

// ── ৫. ChatKey গুলো restore করো ──────────────────────────────────────
const encChatKeys  = await fetch(`/api/backup/chat-keys/${userId}`).then(r => r.json());
const chatKeyMap   = await BackupManager.restoreAllChatKeys(backupKey, encChatKeys);
// Zustand এ set করো
```

---

## Conditions কীভাবে দেবে

```ts
import { FlexCipher } from "@/core/e2e/FlexCipher";

// TIME lock — 1 ঘণ্টা পরে খুলবে
const unlockAt = new Date(Date.now() + 60 * 60 * 1000);
const cond = FlexCipher.conditions.time(unlockAt);
// "TIME(1712843200000)"

// GEO lock — ঢাকা থেকে 1km এর মধ্যে থাকলে খুলবে
const cond = FlexCipher.conditions.geo(23.8103, 90.4125, 1);
// "GEO(23.8103,90.4125,1)"

// দুটো একসাথে
const cond = FlexCipher.conditions.combine(
  FlexCipher.conditions.geo(23.8103, 90.4125, 1),
  FlexCipher.conditions.time(unlockAt)
);
// "GEO(23.8103,90.4125,1);TIME(1712843200000)"

// encryptMessage এ দাও:
const envelope = await FCPEngine.encryptMessage({
  ...
  options: { conditions: cond },
});
```

---

## Error গুলো কী কী হতে পারে

| Error message | কারণ | কী করবে |
|---|---|---|
| `Identity not found` | Registration হয়নি বা IndexedDB মুছে গেছে | Re-register করাও |
| `⚠️ Signature invalid` | Message tamper হয়েছে বা ভুল signingKey | Message reject করো |
| `⏱ Time-locked until...` | TIME condition এখনো পূরণ হয়নি | UI তে lock দেখাও |
| `📍 GEO lock` | Location match হয়নি | UI তে location error দেখাও |
| `Invalid FCP envelope` | Corrupt data বা ভুল format | Drop করো |
| `DOMException: unwrapKey` | ভুল PIN দিয়ে login করেছে | "Wrong PIN" দেখাও |

---

## Quick Reference

```ts
// Registration
KeyManager.createAndStoreIdentity(userId, pin)       → StoredIdentity
KeyManager.deriveMasterKey(pin, saltB64)              → CryptoKey
BackupManager.createBackupKey(masterKey)              → { backupKey, recoveryPhrase, encBackupKey }

// Login
KeyManager.loadIdentity(userId, pin)                  → { privateKey, signingKey, identity }
BackupManager.restoreBackupKey(masterKey, encBackupKey) → CryptoKey
BackupManager.restoreAllChatKeys(backupKey, encList)  → Map<chatId, CryptoKey>

// Chat শুরু
SessionManager.bootstrapSession(privateKey, peerPubB64) → { getChatKey }
SessionManager.buildChatId(userId, peerId)            → string
BackupManager.backupChatKey(backupKey, chatKey, chatId) → EncryptedChatKey

// Message
FCPEngine.encryptMessage({ text, type, chatId, chatKey, signingKey, options }) → string
FCPEngine.decryptMessage(envelope, chatKey, signingKey) → { text, flags, timestamp, ttlSeconds }

// Conditions
FlexCipher.conditions.time(date)        → "TIME(...)"
FlexCipher.conditions.geo(lat, lng, km) → "GEO(...)"
FlexCipher.conditions.combine(...)      → "GEO(...);TIME(...)"
```