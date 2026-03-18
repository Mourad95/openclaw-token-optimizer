// key-management.ts - Gestion des clés API

import { ApiKey } from './auth';

export interface KeyStore {
  [keyId: string]: ApiKey;
}

export class KeyManager {
  private store: KeyStore = {};

  constructor() {}

  // Générer une nouvelle clé API
  generateKey(name: string): ApiKey {
    const { generateApiKey } = require('./auth');
    const apiKey = generateApiKey(name);
    
    this.store[apiKey.key] = apiKey;
    return apiKey;
  }

  // Valider une clé API
  validateKey(apiKey: string): boolean {
    const key = this.store[apiKey];
    if (!key) return false;
    if (!key.enabled) return false;
    
    // Mettre à jour la date d'utilisation
    key.lastUsed = new Date();
    return true;
  }

  // Révoquer une clé API
  revokeKey(apiKey: string): boolean {
    const key = this.store[apiKey];
    if (!key) return false;
    
    key.enabled = false;
    return true;
  }

  // Réactiver une clé API
  enableKey(apiKey: string): boolean {
    const key = this.store[apiKey];
    if (!key) return false;
    
    key.enabled = true;
    return true;
  }

  // Lister toutes les clés
  listKeys(): ApiKey[] {
    return Object.values(this.store);
  }

  // Lister les clés actives
  listActiveKeys(): ApiKey[] {
    return Object.values(this.store).filter(key => key.enabled);
  }

  // Lister les clés révoquées
  listRevokedKeys(): ApiKey[] {
    return Object.values(this.store).filter(key => !key.enabled);
  }

  // Supprimer une clé
  deleteKey(apiKey: string): boolean {
    if (!this.store[apiKey]) return false;
    
    delete this.store[apiKey];
    return true;
  }

  // Nettoyer les clés expirées (optionnel)
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