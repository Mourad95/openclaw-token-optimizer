// key-management.ts — API key storage helpers

import { ApiKey } from './auth';

export interface KeyStore {
  [keyId: string]: ApiKey;
}

export class KeyManager {
  private store: KeyStore = {};

  constructor() {}

  // Generate a new API key
  generateKey(name: string): ApiKey {
    const { generateApiKey } = require('./auth');
    const apiKey = generateApiKey(name);

    this.store[apiKey.key] = apiKey;
    return apiKey;
  }

  // Validate an API key
  validateKey(apiKey: string): boolean {
    const key = this.store[apiKey];
    if (!key) return false;
    if (!key.enabled) return false;

    // Update last-used timestamp
    key.lastUsed = new Date();
    return true;
  }

  // Revoke an API key
  revokeKey(apiKey: string): boolean {
    const key = this.store[apiKey];
    if (!key) return false;

    key.enabled = false;
    return true;
  }

  // Re-enable an API key
  enableKey(apiKey: string): boolean {
    const key = this.store[apiKey];
    if (!key) return false;

    key.enabled = true;
    return true;
  }

  // List all keys
  listKeys(): ApiKey[] {
    return Object.values(this.store);
  }

  // List active keys
  listActiveKeys(): ApiKey[] {
    return Object.values(this.store).filter((key) => key.enabled);
  }

  // List revoked keys
  listRevokedKeys(): ApiKey[] {
    return Object.values(this.store).filter((key) => !key.enabled);
  }

  // Delete a key
  deleteKey(apiKey: string): boolean {
    if (!this.store[apiKey]) return false;

    delete this.store[apiKey];
    return true;
  }

  // Remove expired keys (optional housekeeping)
  cleanupExpiredKeys(maxAgeDays: number = 90): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);

    let deleted = 0;
    for (const [key, data] of Object.entries(this.store)) {
      if (data.createdAt < cutoff && !data.enabled) {
        delete this.store[key];
        deleted++;
      }
    }

    return deleted;
  }
}
