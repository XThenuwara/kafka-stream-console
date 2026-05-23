/**
 * Native WebCrypto-based AES-GCM encryption/decryption utilities.
 * Guarded for client-side execution to avoid SSR breaks.
 */

// Helper to convert string to ArrayBuffer
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== 'undefined' ? btoa(binary) : Buffer.from(buffer).toString('base64');
}

// Helper to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = typeof window !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Gets or creates a transparent persistent device-specific key.
 * Used when the user does not supply a master password.
 */
function getOrCreateDeviceKeySalt(): string {
  if (typeof window === 'undefined') return 'default-ssr-salt';
  let deviceSalt = localStorage.getItem('kafka_device_salt');
  if (!deviceSalt) {
    const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    deviceSalt = arrayBufferToBase64(saltBytes.buffer);
    localStorage.setItem('kafka_device_salt', deviceSalt);
  }
  return deviceSalt;
}

/**
 * Derives a CryptoKey from a password string using PBKDF2.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  salt: string;
  iv: string;
  isPasswordProtected: boolean;
}

/**
 * Encrypts a plaintext string.
 * @param plaintext The text to encrypt.
 * @param masterPassword Optional master password. If omitted, uses the device-specific transparent key.
 */
export async function encryptText(plaintext: string, masterPassword?: string): Promise<EncryptedPayload> {
  if (typeof window === 'undefined') {
    throw new Error('Crypto operations can only be executed in the browser.');
  }

  const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));

  // Determine password or fallback device key
  const password = masterPassword || getOrCreateDeviceKeySalt();
  const key = await deriveKey(password, saltBytes);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    key,
    textEncoder.encode(plaintext)
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    salt: arrayBufferToBase64(saltBytes.buffer),
    iv: arrayBufferToBase64(ivBytes.buffer),
    isPasswordProtected: !!masterPassword
  };
}

/**
 * Decrypts an EncryptedPayload.
 * @param payload The encrypted payload metadata.
 * @param masterPassword Optional master password. Must match the password used during encryption.
 */
export async function decryptText(payload: EncryptedPayload, masterPassword?: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Crypto operations can only be executed in the browser.');
  }

  try {
    const saltBytes = new Uint8Array(base64ToArrayBuffer(payload.salt));
    const ivBytes = new Uint8Array(base64ToArrayBuffer(payload.iv));
    const ciphertextBytes = base64ToArrayBuffer(payload.ciphertext);

    // Determine password or fallback device key
    const password = masterPassword || getOrCreateDeviceKeySalt();
    const key = await deriveKey(password, saltBytes);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      key,
      ciphertextBytes
    );

    return textDecoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error(payload.isPasswordProtected ? 'Invalid Master Password.' : 'Decryption failed.');
  }
}
