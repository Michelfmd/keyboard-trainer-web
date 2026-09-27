import { ChordModeBase } from "./base";
import type { ChordAttempt, ChordAssessment } from "../core/events";
import type { Chord } from "../core/chords";
import { CHORDS } from "../data/chords";

type Difficulty = "easy" | "medium" | "hard";

function generateChord(difficulty: Difficulty, rng: { choice: <T>(arr: readonly T[]) => T }, previous: Chord | null = null): Chord {
  const choices = CHORDS.filter((chord) => chord.difficulty === difficulty && chord.name !== previous?.name);
  if (choices.length === 0) {
    throw new Error("Unknown or empty chord difficulty");
  }
  return rng.choice(choices);
}

export class ChordMode extends ChordModeBase {
  readonly name = "chords";
  readonly label = "Guitar chords";
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

  override start(session?: import("../core/session").Session<ChordAttempt>): void {
    this.position = 0;
    this.session = session ?? this.createSession();
    this.session.start();
    this._target = generateChord(this.difficulty, this.rng);
    this._targetStartedAt = this.session.startedAt ?? 0;
  }

  override getTarget(): Chord | null {
    if (this.isFinished) {
      return null;
    }
    return this._target;
  }

  override get isFinished(): boolean {
    return this.position >= this.count;
  }

  override get progress(): number {
    return this.position / this.count;
  }

  markPracticed(): ChordAttempt | null {
    return this.submitAssessment({ source: "manual", correct: null });
  }

  skip(): ChordAttempt | null {
    return this._advance(false, { source: "manual", correct: null });
  }

  submitAssessment(assessment: ChordAssessment): ChordAttempt | null {
    return this._advance(true, assessment);
  }

  private _advance(practiced: boolean, assessment: ChordAssessment): ChordAttempt | null {
    if (this._target === null || this.isFinished || this.session.endedAt !== null) {
      return null;
    }

    const now = this.session.clock();
    const event: ChordAttempt = {
      expectedChord: this._target,
      targetIndex: this.position,
      practiced,
      assessment,
      timestamp: now,
      responseTime: Math.max(0, now - this._targetStartedAt),
      mode: this.name,
    };

    this.session.addEvent(event);
    this.position += 1;

    if (this.isFinished) {
      this.session.finish();
    } else {
      this._target = generateChord(this.difficulty, this.rng, this._target);
      this._targetStartedAt = now;
    }

    return event;
  }
}