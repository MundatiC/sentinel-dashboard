import type { APIRequestContext } from '@playwright/test';
import { ADMIN } from './helpers';

export const API = process.env.E2E_API_URL ?? 'http://localhost:4030';

/** Log in to the API as the admin and return a bearer token. */
async function adminToken(request: APIRequestContext): Promise<string> {
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

export async function ingestScan(request: APIRequestContext, key: string, scan: object) {
  const res = await request.post(`${API}/api/v1/ingest/scans`, {
    headers: { 'X-API-Key': key },
    data: scan,
  });
  if (!res.ok()) throw new Error(`scan ingest failed: ${res.status()} ${await res.text()}`);
  return (await res.json()) as { id: string };
}

/** A random documentation-range IP, so each test run raises its own alert. */
export function uniqueIp() {
  return `192.0.2.${Math.floor(Math.random() * 250) + 2}`;
}

/** Self-registration creates a VIEWER (the API never lets a client choose its own role). Needs ALLOW_REGISTRATION=true. */
export async function createViewer(request: APIRequestContext) {
  const email = `viewer-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
  const password = 'a-long-viewer-password-1';
  const res = await request.post(`${API}/api/v1/auth/register`, { data: { email, password } });
  if (!res.ok())
    throw new Error(
      `register failed: ${res.status()} (start the API with ALLOW_REGISTRATION=true)`,
    );
  return { email, password };
}
