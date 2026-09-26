import { describe, it, expect } from "vitest";
import { createChord, STANDARD_TUNING } from "../src/core/chords";

describe("Chord", () => {
  it("valid chord created successfully", () => {
    const chord = createChord(
      "Em",
      "E minor",
      "easy",
      [0, 2, 2, 0, 0, 0],
      [0, 2, 3, 0, 0, 0],
      "e-minor",
    );
    expect(chord.name).toBe("Em");
    expect(chord.fullName).toBe("E minor");
    expect(chord.difficulty).toBe("easy");
    expect(chord.frets).toEqual([0, 2, 2, 0, 0, 0]);
    expect(chord.fingers).toEqual([0, 2, 3, 0, 0, 0]);
    expect(chord.barre).toBeNull();
  });

  it("chord with barre created successfully", () => {
    const chord = createChord(
      "F",
      "F major",
      "hard",
      [1, 3, 3, 2, 1, 1],
      [1, 3, 4, 2, 1, 1],
      "f-major",
      [1, 6, 1],
    );
    expect(chord.barre).toEqual([1, 6, 1]);
  });

  it("invalid difficulty throws", () => {
    expect(() =>
      createChord("bad", "bad", "unknown" as "easy" | "medium" | "hard", [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], ""),
    ).toThrow("Unknown chord difficulty");
  });

  it("invalid frets length throws", () => {
    expect(() =>
      createChord("bad", "bad", "easy", [0], [0], ""),
    ).toThrow("A guitar voicing must describe six strings");
  });

  it("invalid fret or fingering throws", () => {
    expect(() =>
      createChord("bad", "bad", "easy", [0, 0, 0, 0, 0, -1], [0, 0, 0, 0, 0, 0], ""),
    ).toThrow("Invalid fret or fingering");
    expect(() =>
      createChord("bad", "bad", "easy", [0, 0, 0, 0, 0, 5], [0, 0, 0, 0, 0, 5], ""),
    ).toThrow("Invalid fret or fingering");
  });

  it("invalid barre throws", () => {
    expect(() =>
      createChord("bad", "bad", "easy", [1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1], "", [0, 6, 1]),
    ).toThrow("Invalid barre");
    expect(() =>
      createChord("bad", "bad", "easy", [0, 1, 1, 1, 1, 1], [0, 1, 1, 1, 1, 1], "", [1, 6, 1]),
    ).toThrow("Barre crosses an open or muted string");
  });

  it("midi notes calculated correctly", () => {
    const chord = createChord(
      "Em",
      "E minor",
      "easy",
      [0, 2, 2, 0, 0, 0],
      [0, 2, 3, 0, 0, 0],
      "e-minor",
    );
    const expectedNotes = [
      STANDARD_TUNING[0] + 0,
      STANDARD_TUNING[1] + 2,
      STANDARD_TUNING[2] + 2,
      STANDARD_TUNING[3] + 0,
      STANDARD_TUNING[4] + 0,
      STANDARD_TUNING[5] + 0,
    ];
    expect(chord.midiNotes).toEqual(expectedNotes);
  });

  it("midi notes exclude muted strings", () => {
    const chord = createChord(
      "Am",
      "A minor",
      "easy",
      [null, 0, 2, 2, 1, 0],
      [null, 0, 2, 3, 1, 0],
      "a-minor",
    );
    expect(chord.midiNotes).toHaveLength(5);
    expect(chord.midiNotes).toEqual([
      STANDARD_TUNING[1] + 0,
      STANDARD_TUNING[2] + 2,
      STANDARD_TUNING[3] + 2,
      STANDARD_TUNING[4] + 1,
      STANDARD_TUNING[5] + 0,
    ]);
  });

  it("standard tuning is correct", () => {
    expect(STANDARD_TUNING).toEqual([40, 45, 50, 55, 59, 64]);
  });
});