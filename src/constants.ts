import 'dotenv/config';

export const RENDERER_URL = process.env.RENDERER_URL || 'http://localhost:3000';
export const RENDER_ENDPOINT = '/render-api';
export const RENDER_TIMEOUT_MS = 30_000;
export const PORT = parseInt(process.env.PORT || '3001', 10);
