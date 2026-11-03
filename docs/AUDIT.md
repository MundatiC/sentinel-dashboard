# Audit: ponytail (code) and taste-skill (interface)

Two reviews of this repo, both run against the real app (a real browser, real API, real data).
Assumed load for the code review: a small team in a browser, a live alert stream, bursts of ingested events.

## Code audit (ponytail method)

| #   | Finding                                                     | Case                                                                                                                                           | Status                                                                                                                                                            |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Must fix.** The layout broke on phones                    | At 390px the fixed 256px sidebar left 134px for the page and the page scrolled sideways (measured). The brief asked for a responsive dashboard | Fixed: the navigation is a drawer below 1024px (menu button, closes on Escape / navigation, hidden from keyboard and screen readers when closed). Three e2e tests |
| 2   | **Should fix.** One refetch per alert message during bursts | An ingest batch can raise or update dozens of alerts in a second; each message re-fetched every alert view (about six queries)                 | Fixed: refreshes are coalesced into one shortly after the burst (`coalesce`, tested)                                                                              |
| 3   | **Should fix.** Nine copies of the same table header markup | Every table repeated the header cell classes; changing the look meant editing nine files                                                       | Fixed: one `Th` component and one header-row style                                                                                                                |
| 4   | **Should fix.** "1 events"                                  | The Overview alert list printed the raw count with a fixed plural                                                                              | Fixed: `plural()` helper, tested                                                                                                                                  |
| 5   | **Nice to have.** Unused dependency and helpers             | `msw` was installed and never imported; `adminToken` and `API_URL` were exported but unused (knip)                                             | Removed / un-exported                                                                                                                                             |

Checked and **not** findings: knip flags `eslint-config-next` (loaded by name through the ESLint compat layer).
The schema constants exported only for their inferred types were left alone: removing the `export` keyword buys nothing.

## Interface review (taste-skill, app-screen rules)

Measured with the skill's real-browser inspector on 12 authenticated pages at 1440px and 390px, then fixed:

| Rule                                                               | Before                                                         | Now                                                                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation recedes (accent on data, not chrome)                    | Active item was a solid teal bar; sidebar darker than the page | Neutral pill with an accent icon; sidebar on the page ground with a hairline. "New Incident" is a secondary button (one filled accent action per screen) |
| Sentence-case labels, no uppercase tracked headers, no header band | Uppercase mono labels and a filled header row on every table   | 12px grey sentence-case headers, a hairline under the header; one shared `Th`                                                                            |
| Tabular figures                                                    | 0% of figures                                                  | All figures use tabular numerals                                                                                                                         |
| Right-aligned quantities                                           | Left-aligned                                                   | Quantity columns (events, alerts) right-aligned                                                                                                          |
| Small text                                                         | 6 pages with more than 40% of text under 13px                  | Data 13px, labels 12px: warning remains only on the Overview (dense 12px sublines)                                                                       |
| KPIs are type, not tiles                                           | Four boxed cards, 36px figures                                 | One divided container, 28px figures in ink                                                                                                               |
| Charts carry little chrome and few hues                            | Five loud hues, solid grid, fat donut                          | Critical/high/medium keep their hues; low/info and "resolved" are neutral; faint dashed grid; thin ring                                                  |
| Pills: pale tint, same-hue text                                    | Saturated chips with light text                                | Pale tints                                                                                                                                               |
| No boxed icons repeated down a list                                | Four icon boxes in the incident timeline                       | Plain dot markers                                                                                                                                        |
| Edge text on phones                                                | Buttons 12-15px from the screen edge                           | Page margin 16px, compact top bar                                                                                                                        |

Deliberately **not** applied:

- **Palette.** The skill prefers true-neutral darks and a restrained accent; the Stitch design uses blue-grey surfaces and a teal accent. The palette is the approved design, so it is unchanged (a one-file swap in `design/tokens.json` if you want to try neutral darks).
- **`hero-void` and `ragged-row`** (short pages leave empty space; the incident page's side rail is shorter than the timeline). Both are normal for working screens.
- **`numeric-align`:** the cells it counts are timestamps and IP addresses, which are identifiers and stay left-aligned.
- **`font-fallback` and `placeholder-data`:** measurement artifacts. The inspector reads script-stripped snapshots (so fonts load cross-origin) and the demo login is `admin@example.com`.

Not checked: the real Stitch designs were not re-compared pixel by pixel after these changes (they now follow the skill where the two disagreed).
