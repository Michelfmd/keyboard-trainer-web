export type RandomSource = () => number;

export function createRandomSource(): RandomSource {
  return Math.random;
}

export class DeterministicRandom {
  private seed: number;

  constructor(seed: number = 0) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  random(): number {
    return this.next();
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }
}

export function createDeterministicRandom(seed: number): RandomSource {
  const dr = new DeterministicRandom(seed);
  return () => dr.next();
}

export class Shuffler {
  private rng: RandomSource;

  constructor(rng: RandomSource = Math.random) {
    this.rng = rng;
  }

  shuffle<T>(array: readonly T[]): T[] {
    const result: T[] = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const temp = result[i];
      result[i] = result[j]!;
      result[j] = temp!;
    }
    return result;
  }

  choice<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot choose from empty array");
    }
    const index = Math.floor(this.rng() * array.length);
    return array[index]!;
  }

  randint(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }
}