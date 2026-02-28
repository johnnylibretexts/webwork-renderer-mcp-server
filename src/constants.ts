import 'dotenv/config';

export const RENDERER_URL = process.env.RENDERER_URL || 'http://localhost:3000';
export const RENDER_ENDPOINT = '/render-api';
export const RATE_LIMIT = 100; // requests per minute per key
export const RENDER_TIMEOUT_MS = 30_000;
export const API_KEY_PREFIX = 'wwmcp_';
export const PORT = parseInt(process.env.PORT || '3001', 10);
export const API_KEYS = (process.env.API_KEYS || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);
