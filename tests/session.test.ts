import { describe, it, expect, beforeEach } from "vitest";
import { createInputSession } from "../src/core/session";

describe("Session", () => {
  let now: number;
  let clock: () => number;
  let session: ReturnType<typeof createInputSession>;

  beforeEach(() => {
    now = 0;
    clock = () => now;
    session = createInputSession("words", clock);
  });

  it("empty session has zero elapsed time", () => {
    expect(session.elapsedTime).toBe(0);
  });

  it("start initializes session", () => {
    session.start();
    expect(session.startedAt).toBe(0);
    expect(session.endedAt).toBeNull();
    expect(session.events).toHaveLength(0);
  });

  it("finish freezes duration", () => {
    session.start();
    now = 10;
    session.finish();
    now = 20;
    session.finish();
    expect(session.elapsedTime).toBe(10);
  });

  it("invalid recording before start throws", () => {
    expect(() => session.record("a", "a")).toThrow("Session must be active");
  });

  it("invalid recording after finish throws", () => {
    session.start();
    session.finish();
    expect(() => session.record("a", "a")).toThrow("Session must be active");
  });

  it("restart clears events and time", () => {
    session.start();
    session.record("a", "b");
    session.finish();
    now = 10;
    session.start();
    expect(session.events).toHaveLength(0);
    expect(session.elapsedTime).toBe(0);
    expect(session.endedAt).toBeNull();
  });

  it("response time calculated correctly", () => {
    session.start();
    now = 1.0;
    const first = session.record("a", "a");
    now = 3.0;
    const second = session.record("b", "x");
    now = 4.0;
    session.record(" ", " ");
    expect(first.responseTime).toBe(1);
    expect(second.responseTime).toBe(2);
  });

  it("first response time calculated from session start", () => {
    session.start();
    now = 1.5;
    const event = session.record("a", "a");
    expect(event.responseTime).toBe(1.5);
  });
});