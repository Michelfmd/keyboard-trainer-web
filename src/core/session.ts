import type { Clock } from "./clock";
import type { InputEvent, ChordAttempt, LaptopChordAttempt, SessionEvent } from "./events";

export type EventType = InputEvent | ChordAttempt | LaptopChordAttempt;

export interface Session<EventT extends EventType> {
  readonly mode: string;
  readonly events: readonly EventT[];
  readonly startedAt: number | null;
  readonly endedAt: number | null;
  readonly lastInputAt: number | null;
  readonly elapsedTime: number;
  readonly clock: Clock;
  start(): void;
  record(expectedKey: string, pressedKey: string): InputEvent;
  addEvent(event: EventT): void;
  finish(): void;
}

function createSession<EventT extends EventType>(
  mode: string,
  clock: Clock,
): Session<EventT> {
  let events: EventT[] = [];
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let lastInputAt: number | null = null;

  return {
    get mode() {
      return mode;
    },
    get events() {
      return events;
    },
    get startedAt() {
      return startedAt;
    },
    get endedAt() {
      return endedAt;
    },
    get lastInputAt() {
      return lastInputAt;
    },
    get elapsedTime(): number {
      if (startedAt === null) {
        return 0;
      }
      const end = endedAt ?? clock();
      return Math.max(0, end - startedAt);
    },
    get clock() {
      return clock;
    },
    start() {
      events = [];
      startedAt = clock();
      endedAt = null;
      lastInputAt = startedAt;
    },
    record(expectedKey: string, pressedKey: string): InputEvent {
      if (startedAt === null || endedAt !== null) {
        throw new Error("Session must be active to record input");
      }
      const now = clock();
      const previous = lastInputAt;
      const event: InputEvent = {
        expectedKey,
        pressedKey,
        correct: expectedKey === pressedKey,
        timestamp: now,
        responseTime: previous !== null ? Math.max(0, now - previous) : 0,
        mode,
      };
      events.push(event as EventT);
      lastInputAt = now;
      return event;
    },
    addEvent(event: EventT): void {
      if (startedAt === null || endedAt !== null) {
        throw new Error("Session must be active to record input");
      }
      events.push(event);
    },
    finish(): void {
      if (startedAt !== null && endedAt === null) {
        endedAt = clock();
      }
    },
  };
}

export function createInputSession(mode: string, clock: Clock = createDefaultClock()): Session<InputEvent> {
  return createSession<InputEvent>(mode, clock);
}

export function createChordSession(mode: string, clock: Clock = createDefaultClock()): Session<ChordAttempt> {
  return createSession<ChordAttempt>(mode, clock);
}

export function createLaptopChordSession(mode: string, clock: Clock = createDefaultClock()): Session<LaptopChordAttempt> {
  return createSession<LaptopChordAttempt>(mode, clock);
}

function createDefaultClock(): Clock {
  return () => performance.now() / 1000;
}