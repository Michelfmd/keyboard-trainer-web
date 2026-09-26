import { describe, it, expect, beforeEach } from "vitest";
import { KeyboardLayout } from "../src/core/keyboard-layout";
import type { InputEvent } from "../src/core/events";

describe("KeyboardLayout", () => {
  let layout: KeyboardLayout;

  beforeEach(() => {
    layout = new KeyboardLayout();
  });

  it("neighboring keys detected correctly", () => {
    expect(layout.areNeighbors("f", "g")).toBe(true);
    expect(layout.areNeighbors("f", "r")).toBe(true);
    expect(layout.areNeighbors("a", "p")).toBe(false);
    expect(layout.areNeighbors("f", "f")).toBe(false);
  });

  it("unknown key returns null distance", () => {
    expect(layout.distance("f", "Return")).toBeNull();
    expect(layout.areNeighbors("f", "Return")).toBe(false);
  });

  it("physical key normalization works", () => {
    expect(layout.normalize("F")).toBe("f");
    expect(layout.normalize("!")).toBe("1");
    expect(layout.areNeighbors("F", "G")).toBe(true);
  });

  it("required rows present", () => {
    const required = new Set("1234567890qwertyuiopasdfghjklzxcvbnm ");
    for (const key of required) {
      expect(layout.positions.has(key)).toBe(true);
    }
  });

  it("expected finger errors calculated correctly", () => {
    const events: InputEvent[] = [
      { expectedKey: "f", pressedKey: "g", correct: false, timestamp: 1, responseTime: 1, mode: "random_keys" },
      { expectedKey: "f", pressedKey: "f", correct: true, timestamp: 2, responseTime: 1, mode: "random_keys" },
      { expectedKey: " ", pressedKey: "x", correct: false, timestamp: 3, responseTime: 1, mode: "words" },
    ];
    const errors = layout.fingerErrors(events);
    expect(errors.get("left index")).toBe(1);
    expect(errors.get("thumb")).toBe(1);
    expect(errors.size).toBe(2);
  });
});