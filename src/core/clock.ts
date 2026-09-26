export type Clock = () => number;

export function createClock(): Clock {
  return () => performance.now() / 1000;
}

export function createFakeClock(): { clock: Clock; advance: (seconds: number) => void; now: number } {
  let now = 0;
  return {
    clock: () => now,
    advance: (seconds: number) => {
      now += seconds;
    },
    get now(): number {
      return now;
    },
    set now(value: number) {
      now = value;
    },
  };
}