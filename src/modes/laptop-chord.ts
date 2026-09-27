import { LaptopChordModeBase } from "./base";
import type { LaptopChordAttempt } from "../core/events";
import type { Chord } from "../core/chords";
import { CHORDS } from "../data/chords";

type Difficulty = "easy" | "medium" | "hard";

export const FRET_KEYS: Record<number, string> = {
  1: "qweryu",
  2: "asdfgh",
  3: "zxcvbn",
  4: "123456",
};

const VALID_LAPTOP_KEYS = new Set<string>("qweryu" + "asdfgh" + "zxcvbn" + "123456");
const KEY_ALIASES: Record<string, string> = { t: "y", i: "y" };

function laptopKeys(chord: Chord): ReadonlySet<string> {
  const keys = new Set<string>();

  if (chord.barre) {
    const [barreFret, barreFirst] = chord.barre;
    const fretKeys = FRET_KEYS[barreFret];
    if (fretKeys && barreFirst !== null) {
      const char = fretKeys.charAt(6 - barreFirst);
      if (char) keys.add(char);
    }
  }

  for (let index = 0; index < chord.frets.length; index++) {
    const fretValue = chord.frets[index];
    if (fretValue === null || fretValue === 0 || fretValue === undefined) {
      continue;
    }
    const fret: number = fretValue;
    const string = 6 - index;

    if (
      chord.barre !== null &&
      chord.barre[0] === fret &&
      chord.barre[1] >= string &&
      string >= chord.barre[2]
    ) {
      continue;
    }

    const fretKeys = FRET_KEYS[fret];
    if (fretKeys) {
      const char = fretKeys.charAt(index);
      if (char) keys.add(char);
    }
  }

  return Object.freeze(keys);
}

function normalizeKey(key: string): string {
  const lower = key.toLowerCase();
  return KEY_ALIASES[lower] ?? lower;
}

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export class LaptopChordMode extends LaptopChordModeBase {
  readonly name = "chord_changes";
  readonly label = "Laptop chord changes";
  readonly difficulty: Difficulty;

  constructor(
    count: number = 20,
    rng?: () => number,
    options: { difficulty?: Difficulty } = {},
  ) {
    super(count, rng);

    const difficulty = options.difficulty ?? "easy";
    const availableDifficulties = new Set(CHORDS.map((c) => c.difficulty));
    if (!availableDifficulties.has(difficulty)) {
      throw new Error("Unknown chord difficulty");
    }
    this.difficulty = difficulty;
  }

  override start(session?: import("../core/session").Session<LaptopChordAttempt>): void {
    this.position = 0;
    this.pressedKeys.clear();
    this.releasePending.clear();
    this.waitingForReleaseFlag = false;
    this._errorCount = 0;
    this._remaining = [];
    this.session = session ?? this.createSession();
    this.session.start();
    this._target = this._nextChord();
    this._targetStartedAt = this.session.startedAt ?? 0;
  }

  override getTarget(): Chord | null {
    return this._target;
  }

  get activeKeys(): ReadonlySet<string> { return new Set(this.pressedKeys); }

  override get expectedKeys(): ReadonlySet<string> {
    return this._target ? laptopKeys(this._target) : new Set();
  }

  override get isFinished(): boolean {
    return this.position >= this.count;
  }

  override get progress(): number {
    return this.position / this.count;
  }

  override handleKeyDown(key: string): LaptopChordAttempt | null {
    const normalized = normalizeKey(key);

    if (this.isFinished || !VALID_LAPTOP_KEYS.has(normalized)) {
      return null;
    }

    if (this.releasePending.has(normalized)) {
      return null;
    }

    if (this.pressedKeys.has(normalized)) {
      return null;
    }

    this.pressedKeys.add(normalized);

    if (!this.expectedKeys.has(normalized)) {
      this._errorCount += 1;
    }

    if (setsEqual(this.pressedKeys, this.expectedKeys)) {
      return this._complete();
    }

    return null;
  }

  override handleKeyUp(key: string): LaptopChordAttempt | null {
    const normalized = normalizeKey(key);

    this.pressedKeys.delete(normalized);
    this.releasePending.delete(normalized);
    this.waitingForReleaseFlag = this.releasePending.size > 0;

    if (setsEqual(this.pressedKeys, this.expectedKeys) && !this.isFinished) {
      return this._complete();
    }

    return null;
  }

  override clearPressedKeys(): void {
    this.pressedKeys.clear();
    this.releasePending.clear();
    this.waitingForReleaseFlag = false;
  }

  private _complete(): LaptopChordAttempt {
    if (this._target === null) {
      throw new Error("No target chord");
    }

    const now = this.session.clock();
    const event: LaptopChordAttempt = {
      expectedChord: this._target,
      expectedKeys: this.expectedKeys,
      responseTime: Math.max(0, now - this._targetStartedAt),
      correct: this._errorCount === 0,
      errorCount: this._errorCount,
      timestamp: now,
      mode: this.name,
    };

    this.session.addEvent(event);
    this.position += 1;

    this.releasePending = new Set(this.pressedKeys);
    this.pressedKeys.clear();
    this.waitingForReleaseFlag = this.releasePending.size > 0;
    this._errorCount = 0;

    if (this.isFinished) {
      this.session.finish();
    } else {
      this._target = this._nextChord();
      this._targetStartedAt = now;
    }

    return event;
  }

  private _nextChord(): Chord {
    if (this._remaining.length === 0) {
      this._remaining = CHORDS.filter((chord) => chord.difficulty === this.difficulty);
      if (this._target && this._remaining.length > 1) {
        const index = this._remaining.findIndex((c) => c.name === this._target!.name);
        if (index !== -1) {
          this._remaining.splice(index, 1);
        }
      }
    }

    const chord = this.rng.choice(this._remaining);
    const index = this._remaining.findIndex((c) => c.name === chord.name);
    if (index !== -1) {
      this._remaining.splice(index, 1);
    }
    return chord;
  }
}