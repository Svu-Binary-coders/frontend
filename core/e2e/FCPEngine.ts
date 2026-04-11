// High-level wrapper around FlexCipher — use this in your UI components.
// Translates human-readable options (isForwarded, isBlur, isViewOnce) into
// bitwise FCP flags and calls pack/unpack on your behalf.

import { FlexCipher, PackOptions } from "./FlexCipher";
import { FCPFlags, hasFlag } from "./types";

// ── encryptMessage params ──────────────────────────────────────────────────
export interface EncryptMessageParams {
  text: string;
  type: "text" | "image" | "file";
  chatId: string;
  chatKey: CryptoKey;
  signingKey: CryptoKey;
  options?: {
    isForwarded?: boolean;
    isBlur?: boolean;
    isViewOnce?: boolean;
    conditions?: string;
  };
}

// ── decryptMessage result ──────────────────────────────────────────────────
export interface DecryptMessageResult {
  text: string;
  flags: {
    isForwarded: boolean;
    isBlur: boolean;
    isViewOnce: boolean;
  };
  conditions: string;
  timestamp: number;
  ttlSeconds: number | null;
}

export class FCPEngine {
  /**
   * Encrypt a message and return the wire envelope string.
   *
   * @example
   * const envelope = await FCPEngine.encryptMessage({
   *   text:       "Secret message!",
   *   type:       "text",
   *   chatId:     currentChatId,
   *   chatKey:    myChatKey,
   *   signingKey: mySigKey,
   *   options: {
   *     isForwarded: false,
   *     isBlur:      true,
   *     isViewOnce:  false,
   *     conditions:  "NONE",
   *   },
   * });
   * socket.emit("chat_message", { content: envelope });
   */
  static async encryptMessage(params: EncryptMessageParams): Promise<string> {
    const { text, type, chatId, chatKey, signingKey, options = {} } = params;

    // ── Base flag by payload type ─────────────────────────────────────────
    let flags: number;
    if (type === "image") flags = FCPFlags.IMG;
    else if (type === "file") flags = FCPFlags.FILE;
    else flags = FCPFlags.TXT;
    if (options.isForwarded)
      flags = FlexCipher.buildFlags(flags, FCPFlags.FORWARDED);
    if (options.isBlur) flags = FlexCipher.buildFlags(flags, FCPFlags.BLUR);
    if (options.isViewOnce) flags = FlexCipher.buildFlags(flags, FCPFlags.BURN);

    return FlexCipher.packMessage({
      payload: { t: text },
      chatKey,
      signingKey,
      chatId,
      flags,
      conditions: options.conditions ?? "NONE",
      // isViewOnce মানে BURN — seen করার 10 সেকেন্ড পর auto-delete
      ttlSeconds: options.isViewOnce ? 10 : undefined,
    });
  }

  /**
   * Decrypt an incoming envelope and return a structured result.
   *
   * Throws if signature is invalid (tampered message) or conditions
   * are not met (GEO/TIME lock).
   *
   * @example
   * socket.on("receive_message", async (data) => {
   *   try {
   *     const result = await FCPEngine.decryptMessage(
   *       data.content,
   *       myChatKey,
   *       peerSigningKey
   *     );
   *
   *     if (result.flags.isBlur)      applyBlur(result.text);
   *     if (result.flags.isForwarded) can not forward();
   *     if (result.flags.isViewOnce)  startBurnTimer(result.ttlSeconds);
   *
   *   } catch (err) {
   *     console.error("Tampered or locked message:", err);
   *   }
   * });
   */
  static async decryptMessage(
    envelope: string,
    chatKey: CryptoKey,
    signingKey: CryptoKey,
    duressPin?: string,
  ): Promise<DecryptMessageResult> {
    // Throws on sig failure, condition failure, or wrong key — never silently fails
    const result = await FlexCipher.unpackMessage({
      envelope,
      chatKey,
      signingKey,
      duressPin,
    });

    return {
      text: result.payload.t,
      flags: {
        isForwarded: hasFlag(result.flags, FCPFlags.FORWARDED),
        isBlur: hasFlag(result.flags, FCPFlags.BLUR),
        isViewOnce: hasFlag(result.flags, FCPFlags.BURN),
      },
      conditions: result.conditions,
      timestamp: result.timestamp,
      ttlSeconds: result.ttlSeconds,
    };
  }
}
