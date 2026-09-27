# Application verification — 2026-09-26

## Scope and architecture

Completed the web application on the existing Next.js 14 / React 18 / TypeScript engine without new runtime dependencies or a UI framework. Preserved the existing worktree's engine and tests. Added a React-independent practice controller and an application hook for browser effects, with reusable presentation components and route pages.

Engine/input integration changes:

- Printable input accepts Unicode characters, including the existing Spanish word dataset's accents and ñ. Control characters remain excluded.
- Laptop mode exposes its existing fret/key map and a defensive active-key snapshot for presentation; simultaneous-key rules remain in the mode.
- Browser input ignores modifier shortcuts, composition events, and interactive controls; practice spaces cannot scroll the page, while Tab navigation is preserved.

## Routes and components

Routes: `/`, `/practice`, `/practice/keyboard`, `/practice/keyboard/words`, `/practice/keyboard/random`, `/practice/guitar`, `/practice/guitar/manual`, `/practice/guitar/laptop`, `/statistics`, `/settings`, `/about`, plus not-found and application error handling.

Components: application provider/navigation, activity catalog, configuration/practice/results views, word target, visual keyboard, local SVG guitar diagram, metric grid, settings, statistics/history, and About. Results remain within each exercise route. Repeat creates a fresh controller while preserving exercise configuration.

## Data and preferences

Versioned IndexedDB session records contain exercise configuration, completion date, duration, partial status, and structured attempt outcomes/timing. Actual typed keys are not saved. Writes are confirmed on transaction completion and can be retried after failure. Invalid records are skipped; unavailable storage does not prevent practice.

Versioned localStorage preferences include English/Spanish, Hard word count, random length, chord count, Reduce Motion, and optional Web Audio feedback. Numeric values are integers from 1 through 200. Statistics reconstruct engine sessions and use the original metric calculators, separating typing, manual guitar, and laptop changes.

## Quality gates

| Gate | Baseline | Final |
| --- | --- | --- |
| Vitest | 100 tests passing | **126 tests passing in 11 files** |
| TypeScript strict | Pass | **Pass** |
| ESLint | Pass | **Pass, no warnings** |
| Production build | Pass | **Pass; all application routes prerendered** |

The 26 added tests cover settings validation and corruption, locale selection, controller completion/cancellation/manual finish, random error retention, Spanish character completion, laptop resets/aliases/release gating, session serialization, invalid/unavailable history, activity-separated aggregation, browser shortcut/control filtering, and optional audio behavior/failure.

Vitest emits its existing Vite CJS API deprecation notice. No test configuration or compiler checks were weakened.

## Browser verification

Verified locally in Chromium with agent-browser and the reusable `scripts/browser-smoke.mjs` CDP driver. Key input used browser key events, not direct calls to engine objects. The dev server used port 3001 because another local service occupied port 3000. No deployment was performed.

| Flow / behavior | Result |
| --- | --- |
| Home → Keyboard → Words → Results | Pass |
| Home → Keyboard → Random Keys → Results | Pass |
| Random incorrect input retains target | Pass |
| Home → Guitar → Manual Practice → Results | Pass; practiced and skipped |
| Home → Guitar → Laptop Chords → Results | Pass; simultaneous down/up events |
| Laptop key held → actual second tab → return | Pass; visual/logical keys reset, next shapes complete |
| Results → Repeat | Pass |
| Escape cancellation; cancelled session excluded from history | Pass |
| Backspace and Ctrl+A do not alter exercise progress | Pass |
| Results → Statistics | Pass |
| Completed sessions → reload → saved history | Pass |
| Settings language/count/Reduce Motion → reload | Pass |
| Corrupt settings → safe defaults | Pass |
| Corrupt IndexedDB entry → notice and remaining valid history | Pass |
| Unavailable IndexedDB → usable Results → Retry saving | Pass |
| Mobile Home / Settings / active laptop practice at 390px | Pass; no horizontal overflow |
| Browser uncaught page errors | None reported |

Visual checks covered Home, desktop laptop practice including F/Bm barres, and mobile practice. Corrected SVG text fill after visual review and ensured new practice starts at the top of the page without focus-induced scrolling.

Axe checks on Home and active laptop practice reported **zero automated violations**. The scanner marked symbol/SVG-text contrast as needing manual review; readable explicit SVG fill was verified visually. Semantic controls, labeled inputs, visible focus, skip navigation, text/symbol feedback, diagram descriptions, and system/application reduced-motion handling are present. This is not a claim of comprehensive assistive-technology certification.

## Python differences and limitations

- Added durable local history and preferences, responsive navigation, and synthesized correct/error feedback. No system-player guitar strum or lesson buttons.
- Cancel explicitly discards the session. Manual guitar offers a separate Finish & save action for partial sessions.
- Physical keyboard use is recommended. Full IME/touch-keyboard composition is not implemented; laptop rollover limits remain hardware-dependent.
- No microphone verification, accounts, cloud backup, analytics, backend, or active-session restoration after reload.
- Browser storage may be unavailable or evicted. No export/import or migration beyond schema version 1 is implemented.
- Verification used Chromium; broader browser and screen-reader coverage remains future work.

Potential technical debt: history aggregation currently reads all stored records, so very large histories may benefit from cursor-based reads and incremental summaries. Future schema revisions will require explicit migrations. The smoke driver uses Chromium CDP and is an optional verification utility rather than a cross-browser test runner.

Development server and temporary test browsers were stopped after verification. Release and deployment work were not started.
