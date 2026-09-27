import {
  WordsMode,
  RandomKeysMode,
  ChordMode,
  LaptopChordMode,
  TypingMode,
} from "../modes";
import { type Language, count } from "./settings";
export type Exercise = "words" | "random" | "manual" | "laptop";
export interface PracticeConfig {
  exercise: Exercise;
  difficulty: "easy" | "medium" | "hard";
  language: Language;
  count: number;
}
export type PracticeMode =
  WordsMode | RandomKeysMode | ChordMode | LaptopChordMode;
export class PracticeController {
  readonly mode: PracticeMode;
  status: "practice" | "results" | "cancelled" = "practice";
  feedback: "correct" | "incorrect" | null = null;
  pressed = new Set<string>();
  constructor(
    readonly config: PracticeConfig,
    rng?: () => number,
  ) {
    if (count(config.count, 0) === 0)
      throw new Error("Invalid exercise length");
    const options = {
      difficulty: config.difficulty,
      language: config.language,
    };
    switch (config.exercise) {
      case "words":
        this.mode = new WordsMode(config.count, rng, options);
        break;
      case "random":
        this.mode = new RandomKeysMode(config.count, rng);
        break;
      case "manual":
        this.mode = new ChordMode(config.count, rng, options);
        break;
      case "laptop":
        this.mode = new LaptopChordMode(config.count, rng, options);
        break;
      default:
        throw new Error("Invalid exercise");
    }
    this.mode.start();
  }
  down(key: string) {
    if (this.status !== "practice") return;
    if (key === "Escape") {
      this.cancel();
      return;
    }
    if (this.mode instanceof ChordMode) {
      if (key === "Enter") this.manual(false);
      return;
    }
    if (this.mode instanceof TypingMode) {
      const event = this.mode.handleInput(key);
      if (event) {
        this.pressed.add(key);
        this.feedback = event.correct ? "correct" : "incorrect";
      }
    } else {
      const errors = this.mode.errorCount;
      const event = this.mode.handleKeyDown(key);
      this.pressed = new Set(this.mode.activeKeys);
      if (event) this.feedback = event.correct ? "correct" : "incorrect";
      else if (this.mode.errorCount > errors) this.feedback = "incorrect";
    }
    this.complete();
  }
  up(key: string) {
    this.pressed.delete(key);
    if (this.status === "practice" && this.mode instanceof LaptopChordMode) {
      const event = this.mode.handleKeyUp(key);
      this.pressed = new Set(this.mode.activeKeys);
      if (event) this.feedback = event.correct ? "correct" : "incorrect";
      this.complete();
    }
  }
  manual(skip: boolean) {
    if (this.status !== "practice" || !(this.mode instanceof ChordMode)) return;
    if (skip) this.mode.skip();
    else this.mode.markPracticed();
    this.complete();
  }
  resetInput() {
    this.pressed.clear();
    this.feedback = null;
    if (this.mode instanceof LaptopChordMode) this.mode.clearPressedKeys();
  }
  cancel() {
    this.mode.session.finish();
    this.status = "cancelled";
    this.resetInput();
  }
  finish() {
    if (this.mode instanceof ChordMode && this.mode.session.events.length) {
      this.mode.session.finish();
      this.status = "results";
      this.resetInput();
    } else this.cancel();
  }
  private complete() {
    if (this.mode.isFinished) {
      this.status = "results";
      this.resetInput();
    }
  }
}
