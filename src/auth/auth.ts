// auth.ts — authentication module for openclaw-token-optimizer

import * as jwt from 'jsonwebtoken';
import { SECRET_KEY, API_KEY_PREFIX, JWT_EXPIRATION } from './config';

export interface AuthConfig {
  apiKeyHeader?: string;
  jwtSecret?: string;
  jwtExpiration?: string;
}

export interface ApiKey {
  key: string;
  name: string;
  createdAt: Date;
  lastUsed?: Date;
  enabled: boolean;
}

export interface JwtPayload {
  userId: string;
  role?: string;
  exp?: number;
}

// Validate API key format
export const isValidApiKey = (apiKey: string): boolean => {
  if (!apiKey || typeof apiKey !== 'string') return false;
  
  // Check prefix
  if (!apiKey.startsWith(API_KEY_PREFIX)) return false;
  
  // Check length (prefix + 32 chars)
  const keyWithoutPrefix = apiKey.substring(API_KEY_PREFIX.length);
  if (keyWithoutPrefix.length !== 32) return false;
  
  // Check hex format
  return /^[a-f0-9]+$/i.test(keyWithoutPrefix);
};

// Generate an API key
export const generateApiKey = (name: string): ApiKey => {
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const key = `${API_KEY_PREFIX}${randomPart}`;
  
  return {
    key,
    name,
    createdAt: new Date(),
    enabled: true
  };
};

// Generate a JWT
export const generateJwtToken = (payload: Omit<JwtPayload, 'exp'>, secret?: string): string => {
  const jwtSecret = secret || SECRET_KEY;
  const expiration = JWT_EXPIRATION;
  
  return jwt.sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) }, // 24h
    jwtSecret
  );
};

// Validate a JWT
export const validateJwtToken = (token: string, secret?: string): JwtPayload | null => {
  try {
    const jwtSecret = secret || SECRET_KEY;
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

// Auth helper (simplified for CLI)
export const authenticateRequest = (
  apiKey?: string,
  jwtToken?: string,
  config?: AuthConfig
): { valid: boolean; error?: string; payload?: JwtPayload } => {
  
  // Validate API key
  if (apiKey) {
    if (!isValidApiKey(apiKey)) {
      return { valid: false, error: 'Invalid API key format' };
    }
    // In production, validate against a database
    return { valid: true };
  }
  
  // Validate JWT
  if (jwtToken) {
    const payload = validateJwtToken(jwtToken, config?.jwtSecret);
    if (!payload) {
      return { valid: false, error: 'Invalid or expired JWT token' };
    }
    return { valid: true, payload };
  }
  
  return { valid: false, error: 'No authentication provided' };
};