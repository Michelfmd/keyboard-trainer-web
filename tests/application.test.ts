import { describe, expect, it, vi } from "vitest";
import {
  defaults,
  parseSettings,
  validateSettings,
} from "../src/application/settings";
import { locale } from "../src/i18n";
import { PracticeController, type Exercise } from "../src/application/practice";
import { WordsMode, LaptopChordMode } from "../src/modes";
import {
  deserializeSession,
  serializeSession,
  sessionMetrics,
  loadSessions,
  saveSession,
} from "../src/storage/sessions";
import { CHORDS } from "../src/data/chords";
import { createDeterministicRandom } from "../src/core/random";
const controller = (exercise: Exercise, count = 1) =>
  new PracticeController(
    { exercise, count, language: "en", difficulty: "easy" },
    createDeterministicRandom(42),
  );
describe("application settings and locales", () => {
  it("handles malformed, old, and missing settings", () => {
    for (const raw of [null, "{", "null", "[]", '{"version":2}'])
      expect(parseSettings(raw)).toEqual(defaults);
  });
  it("validates each field without losing valid preferences", () => {
    expect(
      validateSettings({
        ...defaults,
        language: "es",
        chordCount: 201,
        hardWordCount: 1.2,
        randomLength: 0,
        sound: true,
      }),
    ).toEqual({ ...defaults, language: "es", sound: true });
  });
  it("accepts desktop-compatible count boundaries", () => {
    for (const n of [1, 200])
      expect(validateSettings({ ...defaults, chordCount: n }).chordCount).toBe(
        n,
      );
  });
  it("selects centralized locales with a safe fallback", () => {
    expect(locale("es").home).toBe("Inicio");
    expect(locale("fr")).toEqual(locale("en"));
    expect(Object.keys(locale("es"))).toEqual(Object.keys(locale("en")));
  });
});
describe("practice integration", () => {
  it("transitions words into results using engine outcomes, including errors", () => {
    const c = controller("words");
    const m = c.mode as WordsMode;
    c.down("Backspace");
    expect(m.position).toBe(0);
    for (const key of m.getFullTarget()) c.down(key === "x" ? "y" : "x");
    expect(c.status).toBe("results");
    expect(sessionMetrics([serializeSession(c)]).typing.accuracy).toBe(0);
  });
  it("keeps random target on errors and completes on correct input", () => {
    const c = controller("random");
    const target = c.mode.getTarget() as string;
    c.down(target === "x" ? "y" : "x");
    expect(c.mode.position).toBe(0);
    expect(c.feedback).toBe("incorrect");
    c.down(target);
    expect(c.status).toBe("results");
    expect(sessionMetrics([serializeSession(c)]).typing.totalInputs).toBe(2);
  });
  it("cancels without saving a session or accepting further input", () => {
    const c = controller("words");
    c.down("a");
    c.down("Escape");
    expect(c.status).toBe("cancelled");
    expect(() => serializeSession(c)).toThrow();
    const n = c.mode.session.events.length;
    c.down("a");
    expect(c.mode.session.events.length).toBe(n);
  });
  it("records manual practiced and skipped without musical accuracy", () => {
    const c = controller("manual", 2);
    c.manual(false);
    c.manual(true);
    expect(c.status).toBe("results");
    const m = sessionMetrics([serializeSession(c)]).manual;
    expect(m.practiced).toBe(1);
    expect(m.skipped).toBe(1);
    expect(m).not.toHaveProperty("accuracy");
  });
  it("can finish a reviewed manual session early", () => {
    const c = controller("manual", 20);
    c.manual(false);
    c.finish();
    const stored = serializeSession(c);
    expect(stored.partial).toBe(true);
    expect(stored.attempts).toHaveLength(1);
  });
  it("finishing an untouched manual session cancels it", () => {
    const c = controller("manual");
    c.finish();
    expect(c.status).toBe("cancelled");
  });
  it("completes laptop chords through the mode and resets after focus loss", () => {
    const c = controller("laptop", 2);
    const m = c.mode as LaptopChordMode;
    const keys = [...m.expectedKeys];
    c.down(keys[0]!);
    expect(c.pressed.size).toBe(1);
    c.resetInput();
    expect(c.pressed.size).toBe(0);
    expect(m.activeKeys.size).toBe(0);
    for (const key of keys) c.down(key);
    expect(m.waitingForRelease).toBe(true);
    c.resetInput();
    expect(m.waitingForRelease).toBe(false);
    for (const key of m.expectedKeys) c.down(key);
    expect(c.status).toBe("results");
    expect(sessionMetrics([serializeSession(c)]).laptop.completed).toBe(2);
  });
  it("preserves errors, aliases, and release gating in laptop mode", () => {
    const c = controller("laptop", 2);
    const m = c.mode as LaptopChordMode;
    const keys = [...m.expectedKeys];
    const wrong = [..."qweryuasdfghzxcvbn123456"].find(
      (k) => !m.expectedKeys.has(k),
    )!;
    c.down(wrong);
    for (const key of keys) c.down(key === "y" ? "t" : key);
    c.up(wrong);
    expect(m.position).toBe(1);
    expect(m.session.events[0]?.correct).toBe(false);
    for (const key of keys) c.down(key);
    expect(m.position).toBe(1);
    for (const key of keys) c.up(key);
    for (const key of m.expectedKeys) c.down(key);
    expect(c.status).toBe("results");
  });
  it("rejects invalid exercise counts", () => {
    expect(() => controller("words", Infinity)).toThrow();
    expect(() => controller("words", 0)).toThrow();
  });
  it("accepts Spanish accented characters from the actual dataset", () => {
    const c = new PracticeController(
      { exercise: "words", difficulty: "hard", language: "es", count: 60 },
      createDeterministicRandom(1),
    );
    const m = c.mode as WordsMode;
    expect(m.getFullTarget()).toMatch(/[áéíóúñ]/);
    for (const key of m.getFullTarget()) c.down(key);
    expect(c.status).toBe("results");
    expect(sessionMetrics([serializeSession(c)]).typing.accuracy).toBe(100);
  });
});
describe("versioned history and statistics", () => {
  it("round trips structured records without recording typed keys", () => {
    const c = controller("random");
    c.down(c.mode.getTarget() as string);
    const record = serializeSession(c);
    expect(deserializeSession(JSON.parse(JSON.stringify(record)))).toEqual(
      record,
    );
    expect(JSON.stringify(record)).not.toContain("pressedKey");
    expect(record.version).toBe(1);
  });
  it("rejects corrupt entries", () => {
    const c = controller("manual");
    c.manual(false);
    const record = serializeSession(c);
    for (const value of [
      null,
      {},
      { ...record, version: 2 },
      { ...record, elapsed: NaN },
      { ...record, date: "invalid" },
      {
        ...record,
        attempts: [{ chord: "H", responseTime: 0, practiced: true }],
      },
      { ...record, attempts: [null] },
    ])
      expect(deserializeSession(value)).toBeNull();
  });
  it("aggregates real sessions by activity through engine metrics", () => {
    const a = controller("random");
    a.down(a.mode.getTarget() as string);
    const b = controller("manual");
    b.manual(false);
    const records = [serializeSession(a), serializeSession(b)];
    records[0]!.elapsed = 2;
    records[1]!.elapsed = 10;
    const m = sessionMetrics(records);
    expect(m.typing.totalInputs).toBe(1);
    expect(m.typing.wordsPerMinute).toBe(6);
    expect(m.manual.practiced).toBe(1);
    expect(m.laptop.completed).toBe(0);
  });
  it("counts unique practiced chords across sessions, not sums of unique counts", () => {
    const a = controller("manual");
    a.manual(false);
    const r = serializeSession(a);
    expect(
      sessionMetrics([r, { ...r, id: "another" }]).manual.uniqueChords,
    ).toBe(1);
  });
  it("survives unavailable IndexedDB", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect((await loadSessions()).unavailable).toBe(true);
    const c = controller("manual");
    c.manual(false);
    expect(await saveSession(serializeSession(c))).toBe(false);
    warn.mockRestore();
  });
  it("all chord shapes fit the locally rendered four-fret diagram", () => {
    expect(CHORDS).toHaveLength(10);
    for (const chord of CHORDS) {
      expect(chord.frets).toHaveLength(6);
      expect(chord.frets.every((f) => f === null || (f >= 0 && f <= 4))).toBe(
        true,
      );
    }
  });
});
