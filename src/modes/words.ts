import { TypingMode } from "./base";
import type { Session } from "../core/session";
import type { InputEvent } from "../core/events";
import { WORD_LISTS, type Language } from "../data/words";

export type Difficulty = "easy" | "medium" | "hard";

export class WordsMode extends TypingMode {
  readonly name = "words";
  readonly label: string;
  readonly language: Language;
  readonly difficulty: Difficulty;

  constructor(
    count: number = 20,
    rng?: () => number,
    options: { difficulty?: Difficulty; language?: Language } = {},
  ) {
    const difficulty = options.difficulty ?? "hard";
    const language = options.language ?? "en";

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      throw new Error("Unknown difficulty");
    }
    if (!WORD_LISTS[language]) {
      throw new Error("Unknown language");
    }

    super(count, rng);
    this.language = language;
    this.difficulty = difficulty;
    this.label = `Words / ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
  }

  protected generateTarget(): string {
    let wordCount = this.count;
    if (this.difficulty === "easy") {
      wordCount = this.rng.randint(1, 2);
    } else if (this.difficulty === "medium") {
      wordCount = this.rng.randint(3, 4);
    }

    const words = WORD_LISTS[this.language] as unknown as string[];
    const result: string[] = [];

    while (result.length < wordCount) {
      const batch = this.rng.shuffle(words);
      if (result.length > 0 && batch[0] === result[result.length - 1]) {
        if (batch.length > 1) {
          const first = batch[0];
          const second = batch[1];
          if (first && second) {
            batch[0] = second;
            batch[1] = first;
          }
        }
      }
      const needed = wordCount - result.length;
      result.push(...batch.slice(0, needed));
    }

    return result.join(" ");
  }

  protected shouldAdvance(_event: InputEvent): boolean {
    return true;
  }
}