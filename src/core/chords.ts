export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64] as const;

export interface Chord {
  readonly name: string;
  readonly fullName: string;
  readonly difficulty: "easy" | "medium" | "hard";
  readonly frets: readonly (number | null)[];
  readonly fingers: readonly (number | null)[];
  readonly source: string;
  readonly barre: readonly [number, number, number] | null;
  readonly midiNotes: readonly number[];
}

export function createChord(
  name: string,
  fullName: string,
  difficulty: "easy" | "medium" | "hard",
  frets: readonly (number | null)[],
  fingers: readonly (number | null)[],
  source: string,
  barre: readonly [number, number, number] | null = null,
): Chord {
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new Error("Unknown chord difficulty");
  }
  if (frets.length !== 6 || fingers.length !== 6) {
    throw new Error("A guitar voicing must describe six strings");
  }
  for (let i = 0; i < 6; i++) {
    const fret = frets[i] ?? null;
    const finger = fingers[i] ?? null;
    if (fret === null && finger === null) {
      continue;
    }
    if (fret === 0 && finger === 0) {
      continue;
    }
    if (fret === null || fret < 1 || ![1, 2, 3, 4].includes(finger ?? -1)) {
      throw new Error("Invalid fret or fingering");
    }
  }
  if (barre !== null) {
    const [fret, first, last] = barre;
    if (!(fret > 0 && 6 >= first && first > last && last >= 1)) {
      throw new Error("Invalid barre");
    }
    const startIdx = 6 - first;
    const endIdx = 7 - last;
    for (let i = startIdx; i < endIdx; i++) {
      const value = frets[i] ?? null;
      if (value === null || value < fret) {
        throw new Error("Barre crosses an open or muted string");
      }
    }
  }

  const midiNotes: number[] = [];
  for (let i = 0; i < 6; i++) {
    const fret = frets[i] ?? null;
    const baseNote = STANDARD_TUNING[i];
    if (fret !== null && baseNote !== undefined) {
      midiNotes.push(baseNote + fret);
    }
  }

  return {
    name,
    fullName,
    difficulty,
    frets,
    fingers,
    source,
    barre,
    midiNotes,
  };
}