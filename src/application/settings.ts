export type Language = "en" | "es";
export interface Settings {
  version: 1;
  language: Language;
  hardWordCount: number;
  randomLength: number;
  chordCount: number;
  reduceMotion: boolean;
  sound: boolean;
}
export const defaults: Settings = {
  version: 1,
  language: "en",
  hardWordCount: 20,
  randomLength: 40,
  chordCount: 20,
  reduceMotion: false,
  sound: false,
};
export const settingsKey = "keyboard-trainer.settings";
export function count(value: unknown, fallback: number): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 200
    ? value
    : fallback;
}
export function validateSettings(value: unknown): Settings {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1
  )
    return { ...defaults };
  const v = value as Record<string, unknown>;
  return {
    version: 1,
    language: v.language === "es" ? "es" : "en",
    hardWordCount: count(v.hardWordCount, 20),
    randomLength: count(v.randomLength, 40),
    chordCount: count(v.chordCount, 20),
    reduceMotion: v.reduceMotion === true,
    sound: v.sound === true,
  };
}
export function parseSettings(raw: string | null): Settings {
  try {
    return validateSettings(JSON.parse(raw ?? "null"));
  } catch {
    return { ...defaults };
  }
}
