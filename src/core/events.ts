import type { Chord } from "./chords";

export interface InputEvent {
  readonly expectedKey: string;
  readonly pressedKey: string;
  readonly correct: boolean;
  readonly timestamp: number;
  readonly responseTime: number;
  readonly mode: string;
}

export interface ChordAssessment {
  readonly source: string;
  readonly correct: boolean | null;
}

export interface ChordAttempt {
  readonly expectedChord: Chord;
  readonly targetIndex: number;
  readonly practiced: boolean;
  readonly assessment: ChordAssessment;
  readonly timestamp: number;
  readonly responseTime: number;
  readonly mode: string;
}

export interface LaptopChordAttempt {
  readonly expectedChord: Chord;
  readonly expectedKeys: ReadonlySet<string>;
  readonly responseTime: number;
  readonly correct: boolean;
  readonly errorCount: number;
  readonly timestamp: number;
  readonly mode: string;
}

export type SessionEvent = InputEvent | ChordAttempt | LaptopChordAttempt;