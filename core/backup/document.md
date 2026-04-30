# BackupManager Documentation

## Overview

BackupManager is a cryptographic key management system for a chat application that enables secure backup and recovery of encryption keys using recovery phrases and master keys. It implements AES-GCM encryption with PBKDF2 key derivation.

## Architecture

### Key Components

1. **BackupKey**: A 256-bit AES key derived from a 24-word recovery phrase
2. **MasterKey**: A user's PIN-derived key used to encrypt the BackupKey
3. **ChatKey**: Per-conversation encryption keys derived from the BackupKey
4. **Recovery Phrase**: A 24-word mnemonic that deterministically recovers the BackupKey

### Key Derivation

- The BackupKey is derived from the recovery phrase using PBKDF2 with a fixed salt and 100,000 iterations.
- The MasterKey is derived from the user's PIN using PBKDF2 with a unique salt
- ChatKeys are derived from the BackupKey using a unique conversation ID as salt.

### Encryption

read main documnentation for more details on encryption and decryption processes, including how keys are stored and managed securely.

