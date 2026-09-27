import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});
describe("optional Web Audio feedback", () => {
  it("does not construct an audio context when sound is disabled", async () => {
    const Audio = vi.fn();
    vi.stubGlobal("AudioContext", Audio);
    const { tone } = await import("../src/application/sound");
    tone(true, false);
    expect(Audio).not.toHaveBeenCalled();
  });
  it("uses distinct lightweight tones and reuses one context", async () => {
    const oscillator = {
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
    const Audio = vi.fn(function () {
      return {
        currentTime: 0,
        destination: {},
        resume: () => Promise.resolve(),
        createOscillator: () => oscillator,
        createGain: () => gain,
      };
    });
    vi.stubGlobal("AudioContext", Audio);
    const { tone } = await import("../src/application/sound");
    tone(true, true);
    expect(oscillator.frequency.value).toBe(660);
    tone(false, true);
    expect(oscillator.frequency.value).toBe(180);
    expect(Audio).toHaveBeenCalledOnce();
    expect(oscillator.stop).toHaveBeenCalledTimes(2);
  });
  it("never interrupts practice when browser audio is unavailable", async () => {
    vi.stubGlobal(
      "AudioContext",
      vi.fn(() => {
        throw new Error("Unavailable");
      }),
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { tone } = await import("../src/application/sound");
    expect(() => tone(true, true)).not.toThrow();
  });
});
