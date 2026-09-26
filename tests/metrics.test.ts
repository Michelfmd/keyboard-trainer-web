import { describe, it, expect, beforeEach } from "vitest";
import { createInputSession } from "../src/core/session";
import { calculateMetrics, errorCounts } from "../src/core/metrics";

describe("Metrics", () => {
  let now: number;
  let clock: () => number;
  let session: ReturnType<typeof createInputSession>;

  beforeEach(() => {
    now = 0;
    clock = () => now;
    session = createInputSession("words", clock);
  });

  it("empty session returns zero metrics", () => {
    const metrics = calculateMetrics([session]);
    expect(metrics.totalInputs).toBe(0);
    expect(metrics.accuracy).toBe(0);
    expect(metrics.wordsPerMinute).toBe(0);
    expect(metrics.averageResponseTime).toBe(0);
  });

  it("calculates rates, accuracy and response times", () => {
    session.start();
    now = 1.0;
    session.record("a", "a");
    now = 3.0;
    session.record("b", "x");
    now = 4.0;
    session.record(" ", " ");
    now = 6.0;
    session.finish();

    const metrics = calculateMetrics([session]);
    expect(metrics.totalInputs).toBe(3);
    expect(metrics.correctInputs).toBe(2);
    expect(metrics.incorrectInputs).toBe(1);
    expect(metrics.accuracy).toBeCloseTo(200 / 3);
    expect(metrics.charactersPerMinute).toBe(20);
    expect(metrics.wordsPerMinute).toBe(4);
    expect(metrics.charactersPerSecond).toBeCloseTo(1 / 3);
    expect(metrics.keysPerSecond).toBe(0.5);
    expect(metrics.averageResponseTime).toBeCloseTo(4 / 3);
  });

  it("zero elapsed with inputs returns zero rates", () => {
    session.start();
    session.record("a", "a");
    const metrics = calculateMetrics([session]);
    expect(metrics.charactersPerMinute).toBe(0);
  });

  it("finish freezes duration for metrics", () => {
    session.start();
    now = 10;
    session.finish();
    now = 20;
    session.finish();
    const metrics = calculateMetrics([session]);
    expect(metrics.elapsedTime).toBe(10);
  });

  it("aggregate weights inputs and time and excludes gaps", () => {
    session.start();
    now = 2.0;
    session.record("a", "a");
    now = 10.0;
    session.finish();

    const second = createInputSession("random_keys", clock);
    now = 100.0;
    second.start();
    now = 103.0;
    second.record("a", "a");
    now = 107.0;
    second.record("a", "x");
    now = 112.0;
    second.record("a", "x");
    now = 130.0;
    second.finish();

    const combined = calculateMetrics([session, second]);
    expect(combined.totalInputs).toBe(4);
    expect(combined.correctInputs).toBe(2);
    expect(combined.incorrectInputs).toBe(2);
    expect(combined.elapsedTime).toBe(40);
    expect(combined.accuracy).toBe(50);
    expect(combined.charactersPerMinute).toBe(3);
    expect(combined.wordsPerMinute).toBeCloseTo(0.6);
    expect(combined.charactersPerSecond).toBeCloseTo(0.05);
    expect(combined.keysPerSecond).toBe(0.1);
    expect(combined.averageResponseTime).toBe(3.5);
  });

  it("aggregate empty history returns zero metrics", () => {
    const combined = calculateMetrics([]);
    expect(combined.totalInputs).toBe(0);
    expect(combined.accuracy).toBe(0);
  });

  it("aggregate updates when session is added", () => {
    const history: ReturnType<typeof createInputSession>[] = [];
    expect(calculateMetrics(history).totalInputs).toBe(0);
    session.start();
    session.record("a", "x");
    session.finish();
    history.push(session);
    const result = calculateMetrics(history);
    expect(result.totalInputs).toBe(1);
    expect(result.incorrectInputs).toBe(1);
    expect(result.wordsPerMinute).toBe(0);
  });

  it("error counts tracks incorrect keys", () => {
    session.start();
    session.record("a", "a");
    session.record("b", "x");
    session.record("b", "x");
    session.record("c", "c");
    const counts = errorCounts(session.events);
    expect(counts.get("b")).toBe(2);
    expect(counts.has("a")).toBe(false);
    expect(counts.has("c")).toBe(false);
  });
});