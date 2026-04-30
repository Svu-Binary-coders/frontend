# Core E2E Documentation

This folder contains the end-to-end cryptography layer used by the chat application.

## Purpose

The code in `core/e2e` is responsible for:

- creating and storing user keys
- deriving shared chat keys
- encrypting messages
- decrypting messages
- applying message rules like:
  - forwarded
  - blur
  - view-once
  - time lock
  - geo lock
  - decoy / duress PIN

---

## Folder Overview

### `types.ts`

Defines the shared data structures and constants.

#### Main exports

- `FCPVersion`
- `FCPFlags`
- `hasFlag()`
- `FCPEnvelope`
- `FCPPayload`
- `FCPUnpackResult`
- `StoredIdentity`

#### What it does

This file describes:

- supported encryption versions
- bitwise message flags
- payload shape inside encrypted messages
- envelope format used over the wire
- stored identity format in IndexedDB

---

### `KeyManager.ts`

Handles key generation, wrapping, storage, and loading.

#### Main responsibilities

- derive a master key from a PIN
- generate identity key pairs
- generate signing keys
- wrap and unwrap keys using the master key
- save and load identity data from IndexedDB
- manage active session keys

#### Key flow

1. User enters PIN
2. `deriveMasterKey()` creates a secure master key
3. Identity and signing keys are generated
4. Private keys are wrapped with the master key
5. Wrapped keys are stored in IndexedDB
6. Later, the keys can be loaded back with the same PIN

#### Storage

Uses IndexedDB database:

- database name: `FlexChatKeysDB`
- object store: `store`

---

### `SessionManager.ts`

Creates shared session keys between two users.

#### Main responsibilities

- derive a root key using ECDH
- derive chat keys from the root key
- derive message keys from chat keys
- bootstrap a session from a peer public key

#### Key hierarchy

1. **Root Key**
   - derived from your private key and peer public key
2. **Chat Key**
   - derived from root key and `chatId`
3. **Message Key**
   - derived from chat key and message timestamp

#### Why this matters

This design isolates each chat and each message with its own derived key.

---

### `FlexCipher.ts`

Implements the actual message packing and unpacking logic.

#### Main responsibilities

- encrypt payloads into wire envelopes
- decrypt envelopes back into payloads
- verify signatures
- apply conditions
- handle decoy payloads
- support padding for version `V4`

#### Envelope format

The wire format is:

```text
version:flags:conditions:chatId:timestamp:iv:ciphertext:signature
```

#### Packing process

1. Build the payload
2. Add optional TTL or decoy data
3. Encrypt the payload with a derived message key
4. Sign the encrypted data with HMAC
5. Return the final envelope string

#### Unpacking process

1. Parse envelope parts
2. Validate version and fields
3. Check conditions
4. Verify signature
5. Decrypt payload
6. Apply decoy logic if needed
7. Return the final unpacked result

#### Supported conditions

- `TIME(...)`
- `GEO(...)`
- combined conditions with `;`

---

### `FCPEngine.ts`

High-level wrapper for UI components.

#### Main responsibilities

- convert simple options into flags
- call `FlexCipher.packMessage()`
- call `FlexCipher.unpackMessage()`
- return UI-friendly result objects

#### Why it exists

This file makes the crypto layer easier to use from the frontend.

Instead of handling flags directly, UI code can use:

- `isForwarded`
- `isBlur`
- `isViewOnce`

#### Example flow

- `encryptMessage()`
  - sets flags
  - increments forward count
  - adds TTL for view-once messages
- `decryptMessage()`
  - reads payload
  - returns flags and metadata in a simple format

---

## How It Works

## 1. User setup

A user creates an identity with a PIN.

The system then:

- generates a master key from the PIN
- creates an ECDH identity key pair
- creates an HMAC signing key
- stores encrypted private data in IndexedDB

---

## 2. Session setup

Two users exchange public keys.

Then:

- ECDH derives a shared root key
- the root key derives a chat key
- the chat key derives per-message keys

This keeps each chat isolated.

---

## 3. Message encryption

When sending a message:

- the app builds a payload
- applies message flags
- encrypts the payload with AES-GCM
- signs the envelope with HMAC
- sends the final string

---

## 4. Message decryption

When receiving a message:

- the app checks conditions
- verifies signature integrity
- derives the correct message key
- decrypts the ciphertext
- returns the text and metadata

If the message is tampered with or locked by condition, an error is thrown.

---

## 5. Special message behaviors

### Forwarded

Marks a message as forwarded and increases the forward count.

### Blur

Marks the message for blurred preview in UI.

### View-once

Adds TTL support and marks the message to burn after reading.

### Geo lock

Message can only be opened at a specific location.

### Time lock

Message can only be opened after a specific time.

### Decoy / duress PIN

A hidden decoy payload can be shown if the correct duress PIN is entered.

---

## Data Flow Summary

```text
PIN
    -> Master Key
        -> Wrapped Identity Keys in IndexedDB

Private Key + Peer Public Key
    -> Root Key
        -> Chat Key
            -> Message Key
                -> Encrypted Envelope
```

---

## Main Files

- `types.ts`
- `KeyManager.ts`
- `SessionManager.ts`
- `FlexCipher.ts`
- `FCPEngine.ts`

---

## Notes

- All cryptographic operations use Web Crypto API
- Keys are intended to stay non-extractable where possible
- Message verification fails if data is modified
- The wrapper classes are designed for frontend use

---

## Recommended Usage

- Use `KeyManager` for registration and login
- Use `SessionManager` for chat setup
- Use `FCPEngine` in UI code
- Use `FlexCipher` only for lower-level control
