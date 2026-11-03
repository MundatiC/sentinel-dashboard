# Sentinel dashboard: design source of truth

Visuals come from the Stitch project **Sentinel Security Operations Dashboard** (`4350484247167907952`).
Screens are saved in `design/screens/` (HTML + PNG) and the design tokens in `design/tokens.json` (identical in all screens).

## Stitch MCP access

`.mcp.json` registers Stitch as an HTTP MCP server. The key is read from the `STITCH_API_KEY` environment variable (an
environment secret): **never commit the key.** MCP servers are read when a session starts.

## Screens used (7 of the 10 in the project)

| Page            | Stitch screen                      | Route             |
| --------------- | ---------------------------------- | ----------------- |
| Sign in         | `8db8bc91bd43472e9d852e31bf725a5f` | `/login`          |
| Overview        | `475254e6c9d143ceb60e6b8c206045e4` | `/overview`       |
| Events explorer | `e1a9fdace04b402abb07a55a015ac9ea` | `/events`         |
| Alert detail    | `489bbc292de14c0ea35fc0b5d71179b6` | `/alerts/[id]`    |
| Incident detail | `146aecf48c7a4cdfa7380dd3ea49e3af` | `/incidents/[id]` |
| Scan report     | `97ce5167423943e8a166d4945a816185` | `/scans/[id]`     |
| Admin settings  | `8268d6fe243b47b9bb35ee239d46537a` | `/admin/*`        |

Not used (duplicates): `9f43c5b6…` (scan report A: no active nav, less evidence), `c6a12c42…` (admin A: near-identical),
`6580729…` (incident B: adds forensics fields our API has no data for).

## Tokens

Material-3-style set, dark theme. Primary teal `#4fdbc8` (container `#14b8a6`), background `#101419`, surfaces
`#0a0e13 / #181c21 / #1c2025 / #262a30 / #31353b`, text `#e0e2ea`, outline `#859490`, error `#ffb4ab`.
Fonts: **Inter** (UI) and **JetBrains Mono** (ids, IPs, timestamps, code). Icons: Material Symbols Outlined.
Type scale: `headline-xl 24`, `headline-lg 20`, `headline-md 16`, `body-lg 15`, `body-default 14`, `body-dense 13`,
`label-default 12`, `code-default 13`, `code-sm 12`, `label-mono 11`. Radius: 4 / 8 / 12 px.
Severity colors (always with a text label): Critical red, High orange, Medium amber, Low blue, Info grey.

## Where the implementation deliberately differs from the mock-ups

The mock-ups contain decorative content the API cannot back. We do **not** render invented data or security claims:

- No fake status claims: "SSO enforced (MFA)", "Hardware key ready", "TLS 1.3 verified", "FIPS 140-3", "99.98% up".
- No geo/ASN, AbuseIPDB, threat-actor, "Block IP/Subnet", Slack broadcast or runbook features (no such API data/actions).
- Counts and charts come from `GET /events/stats`, `/alerts`, `/incidents`, `/scans`; missing data shows an empty state.
- The sign-in screen shows only the real API error ("Invalid credentials"), not an invented attempt counter.
- The `prod-us-east-1` selector is omitted: Sentinel is single-tenant.
- Light theme is not designed in Stitch: dark only for now.
