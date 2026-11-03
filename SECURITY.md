# Security Policy

## Reporting a vulnerability

Please **do not open a public issue**. Report privately via GitHub: **Security → Report a vulnerability**
(<https://github.com/MundatiC/sentinel-dashboard/security/advisories/new>). You will get an acknowledgement within 5 working days.
Only the latest commit on `main` is supported. Authorization and data handling live in
[sentinel-api](https://github.com/MundatiC/sentinel-api); see its [THREAT_MODEL.md](https://github.com/MundatiC/sentinel-api/blob/main/THREAT_MODEL.md) for the server side.

## What this front end does to protect itself

| Risk                          | Measure                                                                                                                                                                                                         | Where                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| XSS                           | Strict **CSP with a per-request nonce** (no `unsafe-inline` / `unsafe-eval` for scripts in production); pages are rendered per request so every script carries the nonce; no `dangerouslySetInnerHTML` anywhere | `src/middleware.ts`, `src/app/layout.tsx` |
| Stored XSS from event data    | Event messages, actors, alert titles, notes and scan text come from logs and people, so they are always rendered as text. Verified in a real browser with `<script>`/`<img onerror>` payloads                   | `tests/e2e/*.spec.ts`                     |
| Token theft                   | The access token lives **in memory only** (never localStorage/sessionStorage/readable cookies); the refresh token is the API's `httpOnly` cookie                                                                | `src/lib/api/client.ts`                   |
| Token replay / races          | One shared in-flight refresh and one retry per request; refresh tokens are single-use on the server                                                                                                             | `src/lib/api/client.ts`                   |
| Open redirect                 | `?next=` after login accepts in-app paths only                                                                                                                                                                  | `src/lib/safe-redirect.ts`                |
| Clickjacking                  | `frame-ancestors 'none'` and `X-Frame-Options: DENY`                                                                                                                                                            | `next.config.ts`, middleware              |
| Malicious links in data       | Reference links are clickable only for `http(s)` URLs and use `rel="noopener noreferrer"`                                                                                                                       | `src/components/ui/safe-link.tsx`         |
| Untrusted responses           | Every API response is validated with zod before use                                                                                                                                                             | `src/lib/api/schemas.ts`                  |
| Secrets in the bundle         | None: the only `NEXT_PUBLIC_` value is the API URL. The Stitch key is an environment secret and `.mcp.json` only references `${STITCH_API_KEY}`                                                                 | `.env.example`, `.mcp.json`               |
| One-time secrets              | A new API key lives only in a component's state: not in the URL, storage or the query cache, and it disappears when the dialog closes                                                                           | `src/features/admin/api-keys-page.tsx`    |
| Accidental destructive clicks | Revoke and delete use a two-step confirm                                                                                                                                                                        | admin pages                               |
| Supply chain                  | Lockfile + `npm ci`, `npm audit` in CI, Dependabot, no third-party CDN for fonts or icons, non-root Docker image                                                                                                | CI, `Dockerfile`                          |

**Authorization is the API's job.** Role-aware navigation and disabled buttons are a courtesy: they stop users hitting pages full of
"Forbidden" errors, and protect nothing by themselves. The end-to-end suite checks that a viewer is refused where the API refuses.

## Deployment checklist

- [ ] Serve the dashboard and the API over **HTTPS**, under the **same site** (for example `app.example.com` and `api.example.com`): the API's refresh cookie is `SameSite=Strict`.
- [ ] Set `NEXT_PUBLIC_API_URL` at **build time** (it is compiled into the bundle) and `CORS_ORIGINS` on the API to this dashboard's origin only.
- [ ] Never commit `.env` files or API keys (including the Stitch key). Rotate any key that was ever committed.
- [ ] Keep the CSP: if you add a third-party script or API host, add it to `src/middleware.ts` deliberately.

## Known limitations

- Dark theme only (the Stitch design has no light theme).
- No MFA or SSO (the mock-ups mention them; the API does not implement them, so the UI does not claim them).
- The live feed does not replay alerts missed while disconnected; views refetch on reconnect/next refresh.
- Overview "top source IPs" from the mock-up is omitted: the API has no endpoint for it.
