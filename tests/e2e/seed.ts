import type { APIRequestContext } from '@playwright/test';
import { ADMIN } from './helpers';

export const API = process.env.E2E_API_URL ?? 'http://localhost:4030';

/** Log in to the API as the admin and return a bearer token. */
export async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/api/v1/auth/login`, {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  return (await res.json()).accessToken;
}

/** Create a throw-away API key with ingest scopes and return the raw key. */
export async function createIngestKey(request: APIRequestContext): Promise<string> {
  const token = await adminToken(request);
  const res = await request.post(`${API}/api/v1/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `e2e-${Date.now()}`, scopes: ['events:write', 'scans:write'] },
  });
  return (await res.json()).key;
}

export async function ingest(request: APIRequestContext, key: string, events: object[]) {
  for (let i = 0; i < events.length; i += 500) {
    const res = await request.post(`${API}/api/v1/ingest/events`, {
      headers: { 'X-API-Key': key },
      data: { events: events.slice(i, i + 500) },
    });
    if (!res.ok()) throw new Error(`ingest failed: ${res.status()} ${await res.text()}`);
  }
}
