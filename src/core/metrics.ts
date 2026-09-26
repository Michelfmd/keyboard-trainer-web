import type { Session } from "./session";
import type { InputEvent } from "./events";

export interface Metrics {
  readonly totalInputs: number;
  readonly correctInputs: number;
  readonly incorrectInputs: number;
  readonly accuracy: number;
  readonly elapsedTime: number;
  readonly charactersPerMinute: number;
  readonly charactersPerSecond: number;
  readonly wordsPerMinute: number;
  readonly keysPerSecond: number;
  readonly averageResponseTime: number;
}

export function calculateMetrics(
  sessions: readonly Session<InputEvent>[],
): Metrics {
  let total = 0;
  let correct = 0;
  let elapsed = 0;
  let responseTime = 0;

  for (const session of sessions) {
    total += session.events.length;
    elapsed += session.elapsedTime;
    for (const event of session.events) {
      if (event.correct) {
        correct++;
      }
      responseTime += event.responseTime;
    }
  }

  const cps = elapsed > 0 ? correct / elapsed : 0;

  return {
    totalInputs: total,
    correctInputs: correct,
    incorrectInputs: total - correct,
    accuracy: total > 0 ? (correct / total) * 100 : 0,
    elapsedTime: elapsed,
    charactersPerMinute: cps * 60,
    charactersPerSecond: cps,
    wordsPerMinute: cps * 12,
    keysPerSecond: elapsed > 0 ? total / elapsed : 0,
    averageResponseTime: total > 0 ? responseTime / total : 0,
  };
}

export function errorCounts(events: readonly InputEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.correct) {
      counts.set(event.expectedKey, (counts.get(event.expectedKey) ?? 0) + 1);
    }
  }
  return counts;
}