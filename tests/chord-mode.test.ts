import { describe, it, expect, beforeEach } from "vitest";
import { ChordMode } from "../src/modes/chord";
import { CHORDS } from "../src/data/chords";
import { createDeterministicRandom } from "../src/core/random";
import { createFakeClock } from "../src/core/clock";
import { createChordSession } from "../src/core/session";

describe("ChordMode", () => {
  let rng: () => number;
  let clock: { clock: () => number; advance: (seconds: number) => void; now: number };
  let mode: ChordMode;

  beforeEach(() => {
    rng = createDeterministicRandom(42);
    clock = createFakeClock();
  });

  it("creates with default options", () => {
    mode = new ChordMode(20, rng);
    expect(mode.name).toBe("chords");
    expect(mode.label).toBe("Guitar chords");
    expect(mode.difficulty).toBe("easy");
    expect(mode.count).toBe(20);
  });

  it("creates with specified difficulty", () => {
    mode = new ChordMode(10, rng, { difficulty: "medium" });
    expect(mode.difficulty).toBe("medium");
  });

  it("creates with hard difficulty", () => {
    mode = new ChordMode(5, rng, { difficulty: "hard" });
    expect(mode.difficulty).toBe("hard");
  });

  it("throws on unknown difficulty", () => {
    expect(() => new ChordMode(10, rng, { difficulty: "unknown" as "easy" | "medium" | "hard" })).toThrow("Unknown chord difficulty");
  });

  it("starts and gets target chord", () => {
    mode = new ChordMode(5, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    const target = mode.getTarget();
    expect(target).not.toBeNull();
    expect(["Em", "E", "Am"]).toContain(target!.name);
    expect(mode.position).toBe(0);
    expect(mode.progress).toBe(0);
  });

  it("filters chords by difficulty", () => {
    mode = new ChordMode(20, rng, { difficulty: "medium" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    const target = mode.getTarget();
    expect(target).not.toBeNull();
    expect(["A", "D", "Dm", "C", "G"]).toContain(target!.name);
  });

  it("marks practiced and advances", () => {
    mode = new ChordMode(3, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    const firstTarget = mode.getTarget()!.name;

    const event = mode.markPracticed();
    expect(event).not.toBeNull();
    expect(event!.practiced).toBe(true);
    expect(event!.expectedChord.name).toBe(firstTarget);
    expect(event!.targetIndex).toBe(0);
    expect(event!.assessment.source).toBe("manual");
    expect(event!.assessment.correct).toBeNull();
    expect(mode.position).toBe(1);
    expect(mode.progress).toBeCloseTo(1 / 3);
  });

  it("skips and advances without practicing", () => {
    mode = new ChordMode(3, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    const firstTarget = mode.getTarget()!.name;

    const event = mode.skip();
    expect(event).not.toBeNull();
    expect(event!.practiced).toBe(false);
    expect(event!.expectedChord.name).toBe(firstTarget);
    expect(mode.position).toBe(1);
  });

  it("submits assessment with custom source", () => {
    mode = new ChordMode(3, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    const firstTarget = mode.getTarget()!.name;

    const event = mode.submitAssessment({ source: "microphone", correct: true });
    expect(event).not.toBeNull();
    expect(event!.assessment.source).toBe("microphone");
    expect(event!.assessment.correct).toBe(true);
  });

  it("avoids consecutive repeated chords", () => {
    mode = new ChordMode(10, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    const targets: string[] = [];
    for (let i = 0; i < 10; i++) {
      targets.push(mode.getTarget()!.name);
      mode.markPracticed();
    }
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).not.toBe(targets[i - 1]);
    }
  });

  it("measures response time correctly", () => {
    mode = new ChordMode(3, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    clock.advance(5);
    const event = mode.markPracticed();
    expect(event!.responseTime).toBe(5);
  });

  it("finishes after count chords", () => {
    mode = new ChordMode(2, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    mode.markPracticed();
    expect(mode.isFinished).toBe(false);
    mode.markPracticed();
    expect(mode.isFinished).toBe(true);
    expect(mode.session.endedAt).not.toBeNull();
  });

  it("returns null when finished", () => {
    mode = new ChordMode(1, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    mode.markPracticed();
    expect(mode.getTarget()).toBeNull();
    expect(mode.markPracticed()).toBeNull();
    expect(mode.skip()).toBeNull();
  });

  it("returns null if session finished", () => {
    mode = new ChordMode(1, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    mode.markPracticed();
    mode.session.finish();
    expect(mode.markPracticed()).toBeNull();
  });

  it("reset clears state", () => {
    mode = new ChordMode(3, rng, { difficulty: "easy" });
    const session = createChordSession("chords", clock.clock);
    mode.start(session);
    mode.markPracticed();
    const posAfter = mode.position;
    mode.reset();
    expect(mode.position).toBe(0);
    expect(mode.getTarget()).not.toBeNull();
  });

  it("deterministic with same seed", () => {
    const rng1 = createDeterministicRandom(999);
    const rng2 = createDeterministicRandom(999);
    const clock1 = createFakeClock();
    const clock2 = createFakeClock();
    const mode1 = new ChordMode(5, rng1, { difficulty: "easy" });
    const mode2 = new ChordMode(5, rng2, { difficulty: "easy" });
    mode1.start(createChordSession("chords", clock1.clock));
    mode2.start(createChordSession("chords", clock2.clock));
    expect(mode1.getTarget()!.name).toBe(mode2.getTarget()!.name);
  });
});