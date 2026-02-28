import type { Request, Response, NextFunction } from 'express';
import { API_KEYS, API_KEY_PREFIX, RATE_LIMIT } from './constants.js';

const rateCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  let entry = rateCounts.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
    rateCounts.set(key, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (!token.startsWith(API_KEY_PREFIX)) {
    res.status(401).json({ error: 'Invalid API key format' });
    return;
  }

  if (!API_KEYS.includes(token)) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  if (!checkRateLimit(token)) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 100 requests per minute.' });
    return;
  }

  next();
}
