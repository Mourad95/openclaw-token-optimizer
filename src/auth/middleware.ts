// middleware.ts — Express authentication middleware

import { Request, Response, NextFunction } from 'express';
import { AuthConfig, authenticateRequest } from './auth';

// Express middleware factory
export const authenticateMiddleware = (config: AuthConfig = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKeyHeader = config.apiKeyHeader || 'x-api-key';
    const apiKey = req.headers[apiKeyHeader] as string;
    const authHeader = req.headers.authorization;
    
    let jwtToken: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      jwtToken = authHeader.substring(7);
    }
    
    const result = authenticateRequest(apiKey, jwtToken, config);
    
    if (!result.valid) {
      return res.status(401).json({
        error: 'Authentication required',
        message: result.error
      });
    }
    
    // Attach auth info to the request
    (req as any).auth = {
      authenticated: true,
      payload: result.payload
    };
    
    next();
  };
};

// Role guard middleware
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth;
    
    if (!auth || !auth.authenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (auth.payload?.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};