import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../crypto.js";

describe("crypto", () => {
  it("encrypts and decrypts a value", () => {
    const key = "0".repeat(64); // 32 bytes hex
    const value = "my-secret-token";

    const encrypted = encrypt(value, key);
    const decrypted = decrypt(encrypted, key);

    expect(decrypted).toBe(value);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const key = "0".repeat(64);
    const value = "same-input";

    const enc1 = encrypt(value, key);
    const enc2 = encrypt(value, key);

    expect(enc1).not.toBe(enc2);
  });

  it("throws on wrong key", () => {
    const key = "0".repeat(64);
    const wrongKey = "f".repeat(64);
    const encrypted = encrypt("secret", key);

    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it("throws on tampered ciphertext", () => {
    const key = "0".repeat(64);
    const encrypted = encrypt("secret", key);
    const tampered = encrypted.slice(0, -4) + "0000";

    expect(() => decrypt(tampered, key)).toThrow();
  });
});
