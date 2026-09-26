import type { Session } from "./session";
import type { ChordAttempt } from "./events";

export interface ChordMetrics {
  readonly practiced: number;
  readonly skipped: number;
  readonly uniqueChords: number;
  readonly elapsedTime: number;
}

export function calculateChordMetrics(
  sessions: readonly Session<ChordAttempt>[],
): ChordMetrics {
  const allEvents: ChordAttempt[] = [];
  for (const session of sessions) {
    allEvents.push(...session.events);
  }

  return {
    practiced: allEvents.filter((e) => e.practiced).length,
    skipped: allEvents.filter((e) => !e.practiced).length,
    uniqueChords: new Set(
      allEvents.filter((e) => e.practiced).map((e) => e.expectedChord.name),
    ).size,
    elapsedTime: sessions.reduce((sum, s) => sum + s.elapsedTime, 0),
  };
}