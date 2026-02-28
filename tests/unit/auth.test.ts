import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock constants before importing auth
vi.mock('../../src/constants.js', () => ({
  API_KEYS: ['wwmcp_testkey123', 'wwmcp_secondkey'],
  API_KEY_PREFIX: 'wwmcp_',
  RATE_LIMIT: 3, // low limit for testing
}));

import { authMiddleware } from '../../src/auth.js';

function createMockReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

function createMockRes(): Partial<Response> & { statusCode: number; body: unknown } {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}

describe('authMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('returns 401 when no Authorization header', () => {
    const req = createMockReq();
    const res = createMockRes();
    authMiddleware(req as Request, res as Response, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer', () => {
    const req = createMockReq('Basic abc123');
    const res = createMockRes();
    authMiddleware(req as Request, res as Response, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token lacks wwmcp_ prefix', () => {
    const req = createMockReq('Bearer badprefix_key');
    const res = createMockRes();
    authMiddleware(req as Request, res as Response, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is not in API_KEYS list', () => {
    const req = createMockReq('Bearer wwmcp_unknownkey');
    const res = createMockRes();
    authMiddleware(req as Request, res as Response, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for a valid API key', () => {
    const req = createMockReq('Bearer wwmcp_testkey123');
    const res = createMockRes();
    authMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('returns 429 after exceeding rate limit', () => {
    // Rate limit is mocked to 3
    for (let i = 0; i < 3; i++) {
      const req = createMockReq('Bearer wwmcp_secondkey');
      const res = createMockRes();
      authMiddleware(req as Request, res as Response, next);
      expect(res.statusCode).toBe(200);
    }

    const req = createMockReq('Bearer wwmcp_secondkey');
    const res = createMockRes();
    authMiddleware(req as Request, res as Response, next);
    expect(res.statusCode).toBe(429);
  });
});
