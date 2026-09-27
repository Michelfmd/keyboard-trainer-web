import { describe, it, expect, beforeEach } from "vitest";
import { RandomKeysMode } from "../src/modes/random-keys";
import { createDeterministicRandom } from "../src/core/random";

describe("RandomKeysMode", () => {
  let rng: () => number;
  let mode: RandomKeysMode;

  beforeEach(() => {
    rng = createDeterministicRandom(42);
  });

  it("creates with default options", () => {
    mode = new RandomKeysMode(40, rng);
    expect(mode.name).toBe("random_keys");
    expect(mode.label).toBe("Random Keys");
    expect(mode.showKeyboard).toBe(true);
    expect(mode.count).toBe(40);
  });

  it("generates target of correct length", () => {
    mode = new RandomKeysMode(10, rng);
    mode.start();
    expect(mode.getFullTarget().length).toBe(10);
  });

  it("handles correct input and advances", () => {
    mode = new RandomKeysMode(5, rng);
    mode.start();
    const target = mode.getFullTarget();
    expect(target.length).toBe(5);

    const event = mode.handleInput(target.charAt(0));
    expect(event).not.toBeNull();
    expect(event!.correct).toBe(true);
    expect(mode.position).toBe(1);
  });

  it("handles incorrect input but does not advance", () => {
    mode = new RandomKeysMode(5, rng);
    mode.start();
    const target = mode.getFullTarget();
    const wrongKey = target.charAt(0) === "a" ? "b" : "a";

    const event = mode.handleInput(wrongKey);
    expect(event).not.toBeNull();
    expect(event!.correct).toBe(false);
    expect(mode.position).toBe(0);
  });

  it("completes after all correct characters typed", () => {
    mode = new RandomKeysMode(3, rng);
    mode.start();
    const target = mode.getFullTarget();

    for (const char of target) {
      mode.handleInput(char);
    }

    expect(mode.isFinished).toBe(true);
    expect(mode.session.endedAt).not.toBeNull();
  });

  it("avoids immediate repeated target keys", () => {
    mode = new RandomKeysMode(20, rng);
    mode.start();
    const target = mode.getFullTarget();
    for (let i = 1; i < target.length; i++) {
      expect(target[i]).not.toBe(target[i - 1]);
    }
  });

  it("deterministic generation with same seed", () => {
    const rng1 = createDeterministicRandom(123);
    const rng2 = createDeterministicRandom(123);
    const mode1 = new RandomKeysMode(10, rng1);
    const mode2 = new RandomKeysMode(10, rng2);
    mode1.start();
    mode2.start();
    expect(mode1.getFullTarget()).toBe(mode2.getFullTarget());
  });

  it("ignores non-printable keys", () => {
    mode = new RandomKeysMode(5, rng);
    mode.start();
    const controlEvent = mode.handleInput("Control");
    expect(controlEvent).toBeNull();
  });

  it("resets correctly", () => {
    mode = new RandomKeysMode(5, rng);
    mode.start();
    const target = mode.getFullTarget();
    mode.handleInput(target.charAt(0));
    expect(mode.position).toBe(1);

    mode.reset();
    expect(mode.position).toBe(0);
    expect(mode.getFullTarget()).not.toBe(target);
  });
});