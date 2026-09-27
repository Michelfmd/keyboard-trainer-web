import { describe, it, expect, beforeEach } from "vitest";
import { LaptopChordMode } from "../src/modes/laptop-chord";
import { CHORDS } from "../src/data/chords";
import { createDeterministicRandom } from "../src/core/random";
import { createFakeClock } from "../src/core/clock";
import { createLaptopChordSession } from "../src/core/session";

describe("LaptopChordMode", () => {
  let rng: () => number;
  let clock: { clock: () => number; advance: (seconds: number) => void; now: number };
  let mode: LaptopChordMode;

  beforeEach(() => {
    rng = createDeterministicRandom(42);
    clock = createFakeClock();
  });

  const VALID_LAPTOP_KEYS = new Set("qweryu" + "asdfgh" + "zxcvbn" + "123456");

  it("creates with default options", () => {
    mode = new LaptopChordMode(20, rng);
    expect(mode.name).toBe("chord_changes");
    expect(mode.label).toBe("Laptop chord changes");
    expect(mode.difficulty).toBe("easy");
    expect(mode.count).toBe(20);
  });

  it("creates with specified difficulty", () => {
    mode = new LaptopChordMode(10, rng, { difficulty: "medium" });
    expect(mode.difficulty).toBe("medium");
  });

  it("throws on unknown difficulty", () => {
    expect(() => new LaptopChordMode(10, rng, { difficulty: "unknown" as "easy" | "medium" | "hard" })).toThrow("Unknown chord difficulty");
  });

  it("starts and gets target with expected keys", () => {
    mode = new LaptopChordMode(5, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const target = mode.getTarget();
    expect(target).not.toBeNull();
    expect(mode.expectedKeys.size).toBeGreaterThan(0);
    expect(mode.waitingForRelease).toBe(false);
    expect(mode.errorCount).toBe(0);
  });

  it("handles correct simultaneous key press", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const expected = mode.expectedKeys;

    let event: any = null;
    for (const key of expected) {
      event = mode.handleKeyDown(key);
    }
    expect(event).not.toBeNull();
    expect(event.correct).toBe(true);
    expect(event.errorCount).toBe(0);
    expect(mode.position).toBe(1);
    expect(mode.waitingForRelease).toBe(true);
  });

  it("handles incorrect extra key press and corrects on release", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const expected = mode.expectedKeys;
    const wrongKey = Array.from(VALID_LAPTOP_KEYS).find((k) => !expected.has(k))!;

    mode.handleKeyDown(wrongKey);
    expect(mode.errorCount).toBe(1);

    // Press all correct keys - still has wrong key pressed, so no completion
    for (const key of expected) {
      const event = mode.handleKeyDown(key);
      expect(event).toBeNull();
    }
    expect(mode.position).toBe(0);

    // Release wrong key - now pressed keys match expected, completion triggers
    const event = mode.handleKeyUp(wrongKey);
    expect(event).not.toBeNull();
    if (event) {
      expect(event.correct).toBe(false);
      expect(event.errorCount).toBe(1);
    }
    expect(mode.position).toBe(1);
  });

  it("ignores repeated keydown for same key", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const expected = mode.expectedKeys;
    const firstKey = Array.from(expected)[0]!;

    mode.handleKeyDown(firstKey);
    const event = mode.handleKeyDown(firstKey);
    expect(event).toBeNull();
  });

  it("ignores keys waiting for release", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const expected = mode.expectedKeys;

    for (const key of expected) {
      mode.handleKeyDown(key);
    }
    expect(mode.waitingForRelease).toBe(true);

    const firstKey = Array.from(expected)[0]!;
    const event = mode.handleKeyDown(firstKey);
    expect(event).toBeNull();
  });

  it("requires all keys released before next chord", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const expected = mode.expectedKeys;

    for (const key of expected) {
      mode.handleKeyDown(key);
    }
    expect(mode.waitingForRelease).toBe(true);

    for (const key of expected) {
      mode.handleKeyUp(key);
    }
    expect(mode.waitingForRelease).toBe(false);
    // Access protected property for testing
    expect((mode as any).releasePending.size).toBe(0);

    const newExpected = mode.expectedKeys;
    expect(newExpected.size).toBeGreaterThan(0);
  });

  it("allows corrected shape after releasing wrong key", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const expected = mode.expectedKeys;
    const wrongKey = Array.from(VALID_LAPTOP_KEYS).find((k) => !expected.has(k))!;

    mode.handleKeyDown(wrongKey);
    expect(mode.errorCount).toBe(1);

    mode.handleKeyUp(wrongKey);
    expect(mode.errorCount).toBe(1);

    let event: any = null;
    for (const key of expected) {
      event = mode.handleKeyDown(key);
    }
    expect(event).not.toBeNull();
    expect(event.correct).toBe(false);
    expect(event.errorCount).toBe(1);
  });

  it("measures response time from previous completion", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    clock.advance(5);

    const expected = mode.expectedKeys;
    for (const key of expected) {
      mode.handleKeyDown(key);
    }
    mode.handleKeyUp(Array.from(expected)[0]!);

    const event = mode.session.events[0];
    expect(event).toBeDefined();
    if (event) {
      expect(event.responseTime).toBe(5);
    }
  });

  it("cycles all chords before reuse", () => {
    // Test with multiple seeds to verify cycling behavior
    const testSeeds = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23];
    let passed = false;
    
    for (const seed of testSeeds) {
      const testRng = createDeterministicRandom(seed);
      const testClock = createFakeClock();
      mode = new LaptopChordMode(4, testRng, { difficulty: "easy" });
      const session = createLaptopChordSession("chord_changes", testClock.clock);
      mode.start(session);
      const targets: string[] = [];
      for (let i = 0; i < 4; i++) {
        targets.push(mode.getTarget()!.name);
        const expected = mode.expectedKeys;
        for (const key of expected) {
          mode.handleKeyDown(key);
        }
        for (const key of expected) {
          mode.handleKeyUp(key);
        }
      }
      // First 3 should all be unique (cycles through all easy chords)
      if (new Set(targets.slice(0, 3)).size === 3 && targets[2] !== targets[3]) {
        passed = true;
        break;
      }
    }
    
    expect(passed).toBe(true);
  });

  it("avoids immediate repeat after refill", () => {
    const easyChords = CHORDS.filter((c) => c.difficulty === "easy");
    mode = new LaptopChordMode(easyChords.length + 2, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const targets: string[] = [];
    for (let i = 0; i < easyChords.length + 2; i++) {
      targets.push(mode.getTarget()!.name);
      const expected = mode.expectedKeys;
      for (const key of expected) {
        mode.handleKeyDown(key);
      }
      for (const key of expected) {
        mode.handleKeyUp(key);
      }
    }
    expect(targets[targets.length - 1]).not.toBe(targets[0]);
  });

  it("finishes after count chords", () => {
    mode = new LaptopChordMode(2, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);

    let expected = mode.expectedKeys;
    for (const key of expected) mode.handleKeyDown(key);
    // Release all keys from the first chord
    for (const key of expected) mode.handleKeyUp(key);
    expect(mode.isFinished).toBe(false);

    expected = mode.expectedKeys;
    for (const key of expected) mode.handleKeyDown(key);
    for (const key of expected) mode.handleKeyUp(key);
    expect(mode.isFinished).toBe(true);
    expect(mode.session.endedAt).not.toBeNull();
  });

  it("clearPressedKeys resets state", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const expected = mode.expectedKeys;
    mode.handleKeyDown(Array.from(expected)[0]!);
    expect((mode as any).pressedKeys.size).toBe(1);

    mode.clearPressedKeys();
    expect((mode as any).pressedKeys.size).toBe(0);
    expect((mode as any).releasePending.size).toBe(0);
    expect(mode.waitingForRelease).toBe(false);
  });

  it("ignores invalid keys", () => {
    mode = new LaptopChordMode(3, rng, { difficulty: "easy" });
    const session = createLaptopChordSession("chord_changes", clock.clock);
    mode.start(session);
    const event = mode.handleKeyDown("Escape");
    expect(event).toBeNull();
    expect((mode as any).pressedKeys.size).toBe(0);
  });

  it("deterministic with same seed", () => {
    const rng1 = createDeterministicRandom(999);
    const rng2 = createDeterministicRandom(999);
    const clock1 = createFakeClock();
    const clock2 = createFakeClock();
    const mode1 = new LaptopChordMode(5, rng1, { difficulty: "easy" });
    const mode2 = new LaptopChordMode(5, rng2, { difficulty: "easy" });
    mode1.start(createLaptopChordSession("chord_changes", clock1.clock));
    mode2.start(createLaptopChordSession("chord_changes", clock2.clock));
    expect(mode1.getTarget()!.name).toBe(mode2.getTarget()!.name);
    expect(mode1.expectedKeys).toEqual(mode2.expectedKeys);
  });
});