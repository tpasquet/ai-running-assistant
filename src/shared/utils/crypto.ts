import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96 bits for GCM

/**
 * Encrypts a string with AES-256-GCM.
 * Returns "iv:authTag:ciphertext" (all hex-encoded).
 * The key must be a 64-char hex string (32 bytes).
 */
export function encrypt(value: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypts a string encrypted by `encrypt`.
 * Throws if the key is wrong or the ciphertext is tampered.
 */
export function decrypt(encoded: string, hexKey: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];
  const key = Buffer.from(hexKey, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
