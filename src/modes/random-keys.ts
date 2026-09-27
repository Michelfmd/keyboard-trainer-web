import { TypingMode } from "./base";
import type { InputEvent } from "../core/events";

export class RandomKeysMode extends TypingMode {
  readonly name = "random_keys";
  readonly label = "Random Keys";
  override readonly showKeyboard = true;

  constructor(count: number = 40, rng?: () => number) {
    super(count, rng);
  }

  protected generateTarget(): string {
    const result: string[] = [];
    const asciiLowercase = "abcdefghijklmnopqrstuvwxyz";

    for (let i = 0; i < this.count; i++) {
      let choices = asciiLowercase;
      if (result.length > 0) {
        const lastChar = result[result.length - 1];
        if (lastChar) {
          choices = choices.replace(lastChar, "");
        }
      }
      const choiceArray = choices.split("");
      result.push(this.rng.choice(choiceArray));
    }

    return result.join("");
  }

  protected shouldAdvance(event: InputEvent): boolean {
    return event.correct;
  }
}