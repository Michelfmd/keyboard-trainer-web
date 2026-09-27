# Keyboard Trainer Web

A local-first typing and guitar practice application built with Next.js 14, React 18, TypeScript, and standard CSS. Based on the [original Python application](https://github.com/Michelfmd/keyboard-trainer), with a web-native interface and persistent history.

## Activities

- **Words:** English or Spanish datasets; Easy (1–2 words), Medium (3–4), and configurable Hard. Every printable attempt advances, including mistakes. Backspace does not undo history.
- **Random Keys:** configurable QWERTY exercises. Incorrect attempts are recorded without advancing the target. A visual keyboard shows targets, pressed keys, and suggested fingers.
- **Guitar Practice:** locally rendered diagrams for Em, E, Am, A, D, Dm, C, G, F, and Bm. Mark practiced, skip, or finish a partial session. This is self-reported practice, not verified musical accuracy.
- **Laptop Chord Changes:** simultaneous key shapes mapped to guitar strings and frets, with engine-owned aliases, release gating, extra-key errors, and clean-change timing.

Each exercise has configuration, practice, results, repeat, and navigation to statistics. Statistics distinguish typing, manual guitar, and laptop chords and use the existing engine's metric calculators.

## Requirements and setup

Use Node.js 20.9+ (Node 22 or 24 recommended) and npm. A modern browser with IndexedDB is needed for saved history. Physical keyboards are recommended for typing and required for simultaneous laptop chords. The keyboard diagram is a US QWERTY reference, not a detection of your operating system's layout.

```bash
npm ci
npm run dev
```

Open the URL printed by Next.js (normally `http://localhost:3000`). If the port is occupied, Next.js chooses another. No environment variables, external services, or database server are required.

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

The production routes are prerendered. `npm start` serves the built site; there are no application API routes or backend data services. No deployment is required for local use.

## Navigation

- `/` — Home
- `/practice` — activity selection
- `/practice/keyboard` — Words and Random Keys
- `/practice/keyboard/words`, `/practice/keyboard/random` — configuration, practice, results
- `/practice/guitar` — manual and laptop guitar exercises
- `/practice/guitar/manual`, `/practice/guitar/laptop` — configuration, practice, results
- `/statistics`, `/settings`, `/about`

Results are part of each exercise's lifecycle, rather than a separate route. Reloading an active exercise returns to configuration; completed sessions remain in history.

## Settings, sound, and motion

English and Spanish interfaces, exercise defaults, Reduce Motion, and optional quiet Web Audio feedback are available in Settings. Counts accept integers from 1 to 200, including the desktop-compatible chord count range. Sound is off by default and never blocks practice. System `prefers-reduced-motion` and the application preference both disable transitions.

## Timing and input

Timing begins when an exercise starts and includes idle time and time away from the tab. Typing metrics, response times, chord evaluation, and progression come from the engine. Keyboard listeners are attached only during active practice. Tab navigation and native controls remain available; browser shortcuts and held-key repeats are ignored. Blur or a hidden document resets both visible and logical key state.

Escape / Cancel discards the current exercise. Manual guitar additionally offers **Finish & save** after at least one reviewed chord. Enter marks a chord practiced when the practice surface has focus; Enter on the focused results surface starts another exercise. Laptop key rollover limits depend on the physical keyboard; T and I remain aliases for Y.

## Local persistence and privacy

- IndexedDB database `keyboard-trainer`, schema version 1, stores completed and explicitly finished manual sessions in `sessions`.
- Each record has `version: 1`, an ID, date, configuration, duration, partial flag, and structured attempts (expected target, outcome, response time, and chord/error information as applicable).
- Actual typed keys and arbitrary background keystrokes are **not persisted**. There is no keystroke upload, analytics, advertising, tracking, account, or microphone access.
- Versioned settings use localStorage key `keyboard-trainer.settings`.
- Invalid settings fall back to safe defaults; unreadable history entries are skipped with a notice. Storage failures leave practice usable and show a save warning with retry on Results.
- History can be cleared from Statistics. Clearing browser/site data removes history and settings. Private browsing or storage restrictions may prevent persistence; data is not synchronized or backed up.

## Architecture

```text
src/core/         Events, sessions, metrics, keyboard geometry
src/data/         Word and chord datasets
src/modes/        Exercise targets and progression
src/input/        Browser keyboard adapter and focus reset
src/application/  Practice controller, React lifecycle hook, settings, audio
src/storage/      Versioned IndexedDB records and history reconstruction
src/i18n/         Centralized English and Spanish dictionaries
src/components/   Navigation, forms, practice views, diagrams, metrics
src/app/          App Router pages and error boundaries
```

React renders engine state. `PracticeController` delegates to existing modes; `usePractice` owns browser listeners, timer refresh, audio feedback, and results persistence. Historical structured attempts are reconstructed into sessions for the existing metric calculators. Engine integration changes are limited to Unicode printable input, exposing laptop layout/active state, and browser shortcut/control filtering.

## Verification

Vitest covers the existing engine plus settings validation, locale fallback, controller completion/cancellation/reset, structured serialization, corrupt/unavailable storage, separated statistics, and optional audio failures.

A reproducible Chromium smoke script exercises all four flows, repeat/cancellation, real key events, actual tab-switch reset, settings/history reload, and mobile overflow. It requires Node 22+ and an isolated `agent-browser` session. Do not point it at a personal browsing session: it resets that test browser's application settings and creates test history.

```bash
npx --yes agent-browser --session keyboard-trainer-smoke open http://localhost:3000
npx --yes agent-browser --session keyboard-trainer-smoke get cdp-url
node scripts/browser-smoke.mjs '<the-websocket-url>' http://localhost:3000
npx --yes agent-browser --session keyboard-trainer-smoke close
```

The browser tool is optional and is not an application dependency. See `VERIFICATION.md` for the implementation verification record.

## Differences and limitations

The web version adds persistent local history, responsive navigation, and optional synthesized correct/error tones. It does not reproduce the desktop system-player guitar strum or lesson controls. Cancel explicitly discards a manual session; use Finish & save to retain partial manual practice. The `ChordAssessment` boundary remains available for future adapters, but microphone detection is not implemented.

Full IME composition and touch-keyboard typing are not implemented; use a physical keyboard/layout capable of entering Spanish accented letters. Browser storage can be evicted, and active sessions cannot be resumed after reload. Accessibility checks and keyboard navigation were verified in Chromium; broader browser, assistive-technology, and physical keyboard rollover testing remain useful follow-up work.
