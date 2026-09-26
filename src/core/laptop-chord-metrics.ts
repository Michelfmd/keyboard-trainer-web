import type { Session } from "./session";
import type { LaptopChordAttempt } from "./events";

export interface LaptopChordMetrics {
  readonly completed: number;
  readonly clean: number;
  readonly errors: number;
  readonly averageChange: number;
  readonly fastestChange: number | null;
  readonly elapsedTime: number;
  readonly accuracy: number;
}

export function calculateLaptopChordMetrics(
  sessions: readonly Session<LaptopChordAttempt>[],
): LaptopChordMetrics {
  const allEvents: LaptopChordAttempt[] = [];
  for (const session of sessions) {
    allEvents.push(...session.events);
  }

  const times = allEvents.map((e) => e.responseTime);
  const completed = allEvents.length;
  const clean = allEvents.filter((e) => e.correct).length;
  const errors = allEvents.reduce((sum, e) => sum + e.errorCount, 0);

  return {
    completed,
    clean,
    errors,
    averageChange: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    fastestChange: times.length > 0 ? Math.min(...times) : null,
    elapsedTime: sessions.reduce((sum, s) => sum + s.elapsedTime, 0),
    get accuracy(): number {
      return completed > 0 ? (clean / completed) * 100 : 0;
    },
  };
}