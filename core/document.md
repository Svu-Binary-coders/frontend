<!-- Document of Flex Chat Protocol (FCP) -->
<!-- ========================= FLEX CHAT PROTOCOL ========================= -->

# Flex Chat Protocol (FCP)

## Overview

**Project Name**: FlexChat
**Protocol Name**: Flex Chat Protocol (FCP)
**Version**: 1.0.0
**Authors**: Binary Coder Team
**Core Technologies**: Web Crypto API (`window.crypto.subtle`)

## Introduction

FCP is a custom, highly secure, hybrid End-to-End Encryption protocol designed for modern chat applications. It bypasses traditional loop-based key rotation vulnerabilities (like DoS attacks) by using O(1) HKDF key derivation. It features encrypted metadata, smart condition-based decryption (GEO, TIME), and advanced privacy flags.

---

## 1. File Structure Architecture

The core cryptographic logic is organized inside the `core/e2e/` directory, utilizing the Strategy Pattern for future scalability.

```
src/
└── core/
    └── e2e/
        ├── index.ts                 # Entry point for FCP
        ├── types.ts                 # Interfaces for Flags, Conditions, and Payloads
        ├── KeyManager.ts            # PIN → Master Key & ECDH Identity Keys
        ├── SessionManager.ts        # Root Shared Key & HKDF Message Keys
        ├── ProtocolHandler.ts       # Handlers for specific versions (v1, v2)
        └── FlexCipher.ts            # Main wrapper to Pack/Unpack messages
```

---

## 2. Key Derivation Chain

FCP uses a strict 4-step chaining logic to ensure maximum security. Keys are never reused indefinitely.

1. **Master Key (PBKDF2):** Derived from the user's PIN (using 100,000 iterations). This key is used **ONLY** to lock/unlock the local Private Key securely inside `IndexedDB`.
2. **Identity KeyPair (ECDH P-384):** The user's primary Public/Private key pair for identity verification.
3. **Root Shared Key:** Created by merging the Sender's Private Key and the Receiver's Public Key.
4. **Message Key (HKDF):** Generated instantly before sending a message:  
   `Message_Key = HKDF(Root Shared Key + Current Timestamp)`  
   _Benefit:_ Ensures O(1) performance, immune to "Max Skip" server lag, and natively handles out-of-order messages.

##  2. Key Derivation Chain & Process Flow
FCP uses a strict chaining logic to ensure maximum security. Keys are dynamically generated at different phases of the user journey.

###  Phase 1: Local Device Setup (Login/Registration)
When the user enters their PIN, it generates a Master Key used purely for local storage protection.

[ User PIN ]
      │
      ▼ (PBKDF2 - 100,000 Iterations)
[ Master Key ] ──────(Locks/Unlocks)─────▶ [ Identity Private Key (ECDH) ]


###  Phase 2: Session Initialization (Key Agreement)
When User A wants to chat with User B, their Identity Keys are mathematically combined.
```
User A (Sender)                          User B (Receiver)
    │                                          │
    ├─ Identity Private Key                    ├─ Identity Public Key
    │         │                                │         │
    └─────────┼────────────(ECDH P-384)───────┼─────────┘
              │                                │
              └────────────────┬───────────────┘
                               ▼
                    [ Root Shared Key ]
                    (Session Key for A↔B)
```


###  Phase 3: Per-Message Encryption (O(1) Ratchet)
Right before sending a message, a fresh, single-use key is generated. This prevents DoS attacks and handles out-of-order messages flawlessly.
```
[ Root Shared Key ]  +  [ Current Timestamp (e.g., 1712839200) ]
      │                       │
      └───────────┐  ┌────────┘
                  ▼  ▼ (HKDF / SHA-256)
     [ Single-Use Message Key ]
                  │
                  ▼ (AES-GCM Encryption)
        [ Encrypted CipherText ]

```
---

## 3. Payload Architecture (The Envelope)

Encrypted messages are transmitted and stored as a single, colon-separated string. This saves bandwidth, prevents JSON parsing overhead, and prevents DB-level metadata leakage.

**Format Pattern:**
`Version : Flags : Conditions : Base64(IV) : Base64(CipherText) : Base64(Signature)`

**Real-world Example:**
`v1:IMG,BURN:GEO(23.81,90.41):a1b2c3d4...:U2FsdGVk...:x9y8z7w6...`

---

## 4. Advanced Flags & Smart Locks (Encrypted Metadata)

Metadata is attached to the envelope but heavily dictates the decryption rules on the client's side.

### A. Payload Types (Hybrid Approach)

`TXT`: Standard E2E text message.
`IMG` / `FILE`: Hybrid Encryption. Heavy media files are uploaded unencrypted to cloud storage (e.g., Cloudinary), but their **URLs are tightly encrypted within the CipherText**.

### B. Privacy Superpowers (Flags)

`BURN`: View-once message. The client automatically wipes the message from local DB upon closing the chat view.
`BIOMETRIC`: Requires local WebAuthn (Fingerprint/FaceID) authorization before decrypting and rendering the message on the screen.
`DECOY`: Plausible Deniability. If the user enters a "Duress PIN" under threat, it decrypts a benign dummy message instead of the actual sensitive message.

### C. Smart Conditions

Decryption is strictly blocked unless the receiver's environment meets specific real-world criteria:
`GEO(lat, lng, radius)`: The receiver's `navigator.geolocation` must fall within the specified radius.
`TIME(Future_Timestamp)`: Time-capsule encryption. The client prevents decryption until the local clock surpasses this timestamp.
`TTL(Seconds)`: Self-destruct timer triggered immediately after the first successful decryption.

---

##  5. Core Cryptographic Stack

FCP relies purely on native browser APIs to maintain zero dependencies and maximum performance.

| Operation             | Algorithm | Specs                          |
| :-------------------- | :-------- | :----------------------------- |
| **Key Agreement**     | `ECDH`    | Curve: P-384                   |
| **PIN Derivation**    | `PBKDF2`  | SHA-256, 100k Iterations       |
| **Per-Message Key**   | `HKDF`    | SHA-256                        |
| **Encryption**        | `AES-GCM` | 256-bit (Fast & Authenticated) |
| **Digital Signature** | `HMAC`    | SHA-256                        |

---




_Powered by Binary Coder_
