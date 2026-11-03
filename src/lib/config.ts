// Where the BROWSER reaches sentinel-api. NEXT_PUBLIC_* values are compiled into the bundle and
// visible to everyone, so this is only ever a URL, never a secret.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
);
export const API_BASE = `${API_URL}/api/v1`;
