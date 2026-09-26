import type { InputEvent } from "./events";

export interface KeyPosition {
  readonly x: number;
  readonly y: number;
  readonly finger: string;
}

export class KeyboardLayout {
  static readonly rows = ["1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./", " "] as const;
  static readonly offsets = [0.0, 0.25, 0.5, 1.0, 3.0] as const;
  static readonly fingers = [
    "left pinky",
    "left ring",
    "left middle",
    "left index",
    "left index",
    "right index",
    "right index",
    "right middle",
    "right ring",
    "right pinky",
  ] as const;
  static readonly shifted: ReadonlyMap<string, string> = new Map([
    ["!", "1"],
    ["@", "2"],
    ["#", "3"],
    ["$", "4"],
    ["%", "5"],
    ["^", "6"],
    ["&", "7"],
    ["*", "8"],
    ["(", "9"],
    [")", "0"],
    ["_", "-"],
    ["+", "="],
    ["{", "["],
    ["}", "]"],
    ["|", "\\"],
    [":", ";"],
    ["\"", "'"],
    ["<", ","],
    [">", "."],
    ["?", "/"],
  ]);

  readonly positions: ReadonlyMap<string, KeyPosition>;

  constructor() {
    const positions = new Map<string, KeyPosition>();
    const rows = KeyboardLayout.rows;
    const offsets = KeyboardLayout.offsets;
    const fingers = KeyboardLayout.fingers;
    for (let row = 0; row < rows.length; row++) {
      const keys = rows[row];
      if (!keys) continue;
      const offset = offsets[row];
      if (offset === undefined) continue;
      for (let column = 0; column < keys.length; column++) {
        const key = keys.charAt(column);
        const fingerIndex = Math.min(column, 9);
        const finger = key === " " ? "thumb" : fingers[fingerIndex];
        if (finger === undefined) continue;
        positions.set(key, {
          x: offset + column,
          y: row,
          finger,
        });
      }
    }
    this.positions = positions;
  }

  normalize(key: string): string {
    return KeyboardLayout.shifted.get(key) ?? key.toLowerCase();
  }

  distance(first: string, second: string): number | null {
    const a = this.positions.get(this.normalize(first));
    const b = this.positions.get(this.normalize(second));
    if (!a || !b) {
      return null;
    }
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  areNeighbors(first: string, second: string): boolean {
    const distance = this.distance(first, second);
    return distance !== null && distance > 0 && distance <= 1.3;
  }

  fingerErrors(events: readonly InputEvent[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const event of events) {
      const position = this.positions.get(this.normalize(event.expectedKey));
      if (!event.correct && position) {
        counts.set(position.finger, (counts.get(position.finger) ?? 0) + 1);
      }
    }
    return counts;
  }
}