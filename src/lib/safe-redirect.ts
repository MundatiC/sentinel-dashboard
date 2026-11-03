// After login we send the user back to where they came from (?next=/alerts/123).
// That value comes from the URL, so an attacker can craft it: "?next=https://evil.example" would be an
// "open redirect" that makes our login page a launchpad for phishing. Only plain in-app paths are allowed.
export function safeNextPath(value: string | null | undefined, fallback = '/overview'): string {
  if (!value) return fallback;
  // must start with a single "/" and must not be protocol-relative ("//evil.example") or use backslashes
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  // reject anything with control characters or an embedded scheme/host trick
  if (/[\u0000-\u001f]/.test(value) || /^\/[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;
  if (value.startsWith('/login')) return fallback; // never loop back into the login page
  return value;
}
