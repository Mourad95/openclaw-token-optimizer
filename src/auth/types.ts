// types.ts

export interface Key {
  id: string;
  value: string;
  createdAt: number;
  expiresAt: number;
  revoked: boolean;
}

export interface AuthConfig {
  apiKeyHeader: string;
  jwtSecret: string;
  jwtExpiration: string;
}