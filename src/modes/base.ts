import type { Session } from "../core/session";
import type { InputEvent, SessionEvent, ChordAttempt, LaptopChordAttempt } from "../core/events";
import type { Chord } from "../core/chords";
import type { RandomSource } from "../core/random";
import { Shuffler } from "../core/random";
import { createInputSession, createChordSession, createLaptopChordSession } from "../core/session";

export type TargetType = string | Chord | null;

export interface Mode<EventT extends SessionEvent, TargetT extends TargetType = TargetType> {
  readonly name: string;
  readonly label: string;
  readonly showKeyboard: boolean;
  readonly count: number;
  readonly position: number;
  readonly session: Session<EventT>;
  readonly progress: number;
  readonly isFinished: boolean;
  readonly target: TargetT | null;
  start(session?: Session<EventT>): void;
  reset(): void;
  getTarget(): TargetT | null;
}

export abstract class BaseMode<EventT extends SessionEvent, TargetT extends TargetType> implements Mode<EventT, TargetT> {
  abstract readonly name: string;
  abstract readonly label: string;
  readonly showKeyboard: boolean = false;
  readonly count: number;
  protected rng: Shuffler;
  position = 0;
  session: Session<EventT>;

  constructor(count: number, rng?: RandomSource) {
    if (count < 1) {
      throw new Error("Count must be positive");
    }
    this.count = count;
    this.rng = new Shuffler(rng);
    this.session = this.createSession();
  }

  protected abstract createSession(): Session<EventT>;

  abstract start(session?: Session<EventT>): void;

  reset(): void {
    this.start();
  }

  abstract getTarget(): TargetT | null;

  get isFinished(): boolean {
    return this.position >= this.count;
  }

  abstract get progress(): number;

  get target(): TargetT | null {
    return this.getTarget();
  }
}

export abstract class TypingMode extends BaseMode<InputEvent, string> {
  protected _target = "";
  protected outcomes: boolean[] = [];

  constructor(count: number, rng?: RandomSource) {
    super(count, rng);
  }

  protected abstract generateTarget(): string;

  protected override createSession(): Session<InputEvent> {
    return createInputSession(this.name);
  }

  override start(session?: Session<InputEvent>): void {
    this._target = this.generateTarget();
    this.position = 0;
    this.outcomes = [];
    this.session = session ?? createInputSession(this.name);
    this.session.start();
  }

  handleInput(key: string): InputEvent | null {
    if (this.isFinished || key.length !== 1 || !this.isPrintable(key)) {
      return null;
    }
    const event = this.session.record(this.getTarget(), key);
    if (this.shouldAdvance(event)) {
      this.outcomes.push(event.correct);
      this.position += 1;
    }
    if (this.isFinished) {
      this.session.finish();
    }
    return event;
  }

  protected abstract shouldAdvance(event: InputEvent): boolean;

  override getTarget(): string {
    if (this.isFinished || this._target === "") {
      return "";
    }
    return this._target[this.position] ?? "";
  }

  getFullTarget(): string {
    return this._target;
  }

  override get isFinished(): boolean {
    return this.position >= this._target.length;
  }

  override get progress(): number {
    return this._target.length > 0 ? this.position / this._target.length : 0;
  }

  private isPrintable(key: string): boolean {
    return !/[\p{C}\p{Zl}\p{Zp}]/u.test(key);
  }
}

export abstract class ChordModeBase extends BaseMode<ChordAttempt, Chord | null> {
  protected _target: Chord | null = null;
  protected _targetStartedAt = 0;

  constructor(count: number, rng?: RandomSource) {
    super(count, rng);
  }

  protected override createSession(): Session<ChordAttempt> {
    return createChordSession(this.name);
  }
}

export abstract class LaptopChordModeBase extends BaseMode<LaptopChordAttempt, Chord | null> {
  protected _target: Chord | null = null;
  protected _targetStartedAt = 0;
  protected pressedKeys = new Set<string>();
  protected releasePending = new Set<string>();
  protected waitingForReleaseFlag = false;
  protected _errorCount = 0;
  protected _remaining: Chord[] = [];

  constructor(count: number, rng?: RandomSource) {
    super(count, rng);
  }

  protected override createSession(): Session<LaptopChordAttempt> {
    return createLaptopChordSession(this.name);
  }

  get expectedKeys(): ReadonlySet<string> {
    return new Set();
  }

  get waitingForRelease(): boolean {
    return this.waitingForReleaseFlag;
  }

  get errorCount(): number {
    return this._errorCount;
  }

  abstract handleKeyDown(key: string): LaptopChordAttempt | null;
  abstract handleKeyUp(key: string): LaptopChordAttempt | null;
  abstract clearPressedKeys(): void;
}