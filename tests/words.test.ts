import { describe, it, expect, beforeEach } from "vitest";
import { WordsMode, type Difficulty } from "../src/modes/words";
import { createDeterministicRandom } from "../src/core/random";

describe("WordsMode", () => {
  let rng: () => number;
  let mode: WordsMode;

  beforeEach(() => {
    rng = createDeterministicRandom(42);
  });

  it("creates with default options", () => {
    mode = new WordsMode(20, rng);
    expect(mode.name).toBe("words");
    expect(mode.difficulty).toBe("hard");
    expect(mode.language).toBe("en");
    expect(mode.label).toBe("Words / Hard");
    expect(mode.count).toBe(20);
  });

  it("creates with easy difficulty", () => {
    mode = new WordsMode(20, rng, { difficulty: "easy" });
    expect(mode.difficulty).toBe("easy");
    expect(mode.label).toBe("Words / Easy");
  });

  it("creates with medium difficulty", () => {
    mode = new WordsMode(20, rng, { difficulty: "medium" });
    expect(mode.difficulty).toBe("medium");
    expect(mode.label).toBe("Words / Medium");
  });

  it("creates with spanish language", () => {
    mode = new WordsMode(20, rng, { language: "es" });
    expect(mode.language).toBe("es");
  });

  it("throws on unknown difficulty", () => {
    expect(() => new WordsMode(20, rng, { difficulty: "unknown" as Difficulty })).toThrow("Unknown difficulty");
  });

  it("throws on unknown language", () => {
    expect(() => new WordsMode(20, rng, { language: "fr" as "en" | "es" })).toThrow("Unknown language");
  });

  it("generates target with correct word count for easy", () => {
    mode = new WordsMode(20, rng, { difficulty: "easy" });
    mode.start();
    const words = mode.getFullTarget().split(" ");
    expect(words.length).toBeGreaterThanOrEqual(1);
    expect(words.length).toBeLessThanOrEqual(2);
  });

  it("generates target with correct word count for medium", () => {
    mode = new WordsMode(20, rng, { difficulty: "medium" });
    mode.start();
    const words = mode.getFullTarget().split(" ");
    expect(words.length).toBeGreaterThanOrEqual(3);
    expect(words.length).toBeLessThanOrEqual(4);
  });

  it("generates target with configured count for hard", () => {
    mode = new WordsMode(5, rng, { difficulty: "hard" });
    mode.start();
    const words = mode.getFullTarget().split(" ");
    expect(words.length).toBe(5);
  });

  it("handles correct input and advances", () => {
    mode = new WordsMode(3, rng, { difficulty: "hard" });
    mode.start();
    const target = mode.getFullTarget();
    expect(target.length).toBeGreaterThan(0);

    const event = mode.handleInput(target.charAt(0));
    expect(event).not.toBeNull();
    expect(event!.correct).toBe(true);
    expect(mode.position).toBe(1);
  });

  it("handles incorrect input but still advances", () => {
    mode = new WordsMode(3, rng, { difficulty: "hard" });
    mode.start();
    const target = mode.getFullTarget();
    const wrongKey = target.charAt(0) === "a" ? "b" : "a";

    const event = mode.handleInput(wrongKey);
    expect(event).not.toBeNull();
    expect(event!.correct).toBe(false);
    expect(mode.position).toBe(1);
  });

  it("completes after all characters typed", () => {
    mode = new WordsMode(2, rng, { difficulty: "hard" });
    mode.start();
    const target = mode.getFullTarget();

    for (const char of target) {
      mode.handleInput(char);
    }

    expect(mode.isFinished).toBe(true);
    expect(mode.session.endedAt).not.toBeNull();
  });

  it("deterministic generation with same seed", () => {
    const rng1 = createDeterministicRandom(123);
    const rng2 = createDeterministicRandom(123);
    const mode1 = new WordsMode(5, rng1, { difficulty: "hard" });
    const mode2 = new WordsMode(5, rng2, { difficulty: "hard" });
    mode1.start();
    mode2.start();
    expect(mode1.getFullTarget()).toBe(mode2.getFullTarget());
  });

  it("avoids immediate duplicate words", () => {
    mode = new WordsMode(10, rng, { difficulty: "hard" });
    mode.start();
    const words = mode.getFullTarget().split(" ");
    for (let i = 1; i < words.length; i++) {
      expect(words[i]).not.toBe(words[i - 1]);
    }
  });

  it("ignores non-printable keys", () => {
    mode = new WordsMode(3, rng, { difficulty: "hard" });
    mode.start();
    const event = mode.handleInput(" ");
    expect(event).not.toBeNull();
    const controlEvent = mode.handleInput("Control");
    expect(controlEvent).toBeNull();
  });

  it("resets correctly", () => {
    mode = new WordsMode(3, rng, { difficulty: "hard" });
    mode.start();
    const target = mode.getFullTarget();
    mode.handleInput(target.charAt(0));
    expect(mode.position).toBe(1);

    mode.reset();
    expect(mode.position).toBe(0);
    expect(mode.getFullTarget()).not.toBe(target);
  });
});