// config.ts — authentication settings

export const SECRET_KEY = process.env.AUTH_SECRET_KEY || 'default-secret-key-change-in-production';
export const API_KEY_PREFIX = 'sk_';
export const JWT_EXPIRATION = '24h';