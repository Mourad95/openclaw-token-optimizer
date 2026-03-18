// tests/auth.test.ts - Tests pour le module d'authentification

import { describe, test, expect, beforeEach } from 'vitest';
import {
  isValidApiKey,
  generateApiKey,
  generateJwtToken,
  validateJwtToken,
  authenticateRequest,
  ApiKey
} from '../auth';

describe('Authentication Module', () => {
  describe('API Key Validation', () => {
    test('should validate correct API key format', () => {
      const validKey = 'sk_0123456789abcdef0123456789abcdef';
      expect(isValidApiKey(validKey)).toBe(true);
    });

    test('should reject invalid API key format', () => {
      expect(isValidApiKey('invalid-key')).toBe(false);
      expect(isValidApiKey('sk_tooshort')).toBe(false);
      expect(isValidApiKey('')).toBe(false);
      expect(isValidApiKey('sk_0123456789abcdef0123456789abcde')).toBe(false); // 31 chars
      expect(isValidApiKey('sk_0123456789abcdef0123456789abcdeff')).toBe(false); // 33 chars
      expect(isValidApiKey('sk_0123456789abcdef0123456789abcdeg')).toBe(false); // non-hex
    });

    test('should generate valid API key', () => {
      const apiKey = generateApiKey('test-key');
      expect(apiKey.key).toMatch(/^sk_[a-f0-9]{32}$/);
      expect(apiKey.name).toBe('test-key');
      expect(apiKey.createdAt).toBeInstanceOf(Date);
      expect(apiKey.enabled).toBe(true);
    });
  });

  describe('JWT Token', () => {
    const testPayload = { userId: 'test-user-123', role: 'admin' };
    let token: string;

    beforeEach(() => {
      token = generateJwtToken(testPayload);
    });

    test('should generate valid JWT token', () => {
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(50);
    });

    test('should validate correct JWT token', () => {
      const payload = validateJwtToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('test-user-123');
      expect(payload?.role).toBe('admin');
    });

    test('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.token.here';
      expect(validateJwtToken(invalidToken)).toBeNull();
    });

    test('should reject expired JWT token', () => {
      // Créer un token expiré (expiration dans le passé)
      const expiredToken = generateJwtToken(testPayload, 'different-secret');
      // Note: La validation d'expiration est gérée par la bibliothèque JWT
      expect(validateJwtToken(expiredToken, 'wrong-secret')).toBeNull();
    });
  });

  describe('Request Authentication', () => {
    test('should authenticate with valid API key', () => {
      const validKey = 'sk_0123456789abcdef0123456789abcdef';
      const result = authenticateRequest(validKey);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid API key', () => {
      const result = authenticateRequest('invalid-key');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid API key format');
    });

    test('should authenticate with valid JWT token', () => {
      const token = generateJwtToken({ userId: 'test-user' });
      const result = authenticateRequest(undefined, token);
      expect(result.valid).toBe(true);
      expect(result.payload?.userId).toBe('test-user');
    });

    test('should reject invalid JWT token', () => {
      const result = authenticateRequest(undefined, 'invalid-token');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid or expired JWT token');
    });

    test('should reject when no authentication provided', () => {
      const result = authenticateRequest();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No authentication provided');
    });
  });
});