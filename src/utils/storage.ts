import { encryptText, decryptText, EncryptedPayload } from './crypto';

export interface KafkaConnection {
  id: string;
  name: string;
  bootstrapServers: string;
  clientId?: string;
  ssl: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

const STORAGE_KEY = 'kafka_connections_v1';

/**
 * Checks if the stored connections require a master password.
 */
export function isPasswordRequired(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const payload: EncryptedPayload = JSON.parse(raw);
    return !!payload.isPasswordProtected;
  } catch (e) {
    return false;
  }
}

/**
 * Load all Kafka connections from localStorage.
 * @param masterPassword Optional master password for decryption.
 */
export async function loadConnections(masterPassword?: string): Promise<KafkaConnection[]> {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const payload: EncryptedPayload = JSON.parse(raw);
    const decrypted = await decryptText(payload, masterPassword);
    return JSON.parse(decrypted);
  } catch (error) {
    // Forward decryption error (e.g. invalid password)
    throw error;
  }
}

/**
 * Save all Kafka connections to localStorage, encrypted.
 * @param connections The connections list to save.
 * @param masterPassword Optional master password to lock the credentials.
 */
export async function saveConnections(
  connections: KafkaConnection[],
  masterPassword?: string
): Promise<void> {
  if (typeof window === 'undefined') return;
  const plaintext = JSON.stringify(connections);
  const encryptedPayload = await encryptText(plaintext, masterPassword);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedPayload));
}

/**
 * Helper to check if any connection profiles exist in storage.
 */
export function hasStoredConnections(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(STORAGE_KEY);
}
