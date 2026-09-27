"use client";
import { useEffect, useRef, useState } from "react";
import { KeyboardController } from "../input/keyboard-controller";
import { LaptopChordMode } from "../modes/laptop-chord";
import type { PracticeController } from "./practice";
import { tone } from "./sound";
import {
  serializeSession,
  saveSession,
  type StoredSession,
} from "../storage/sessions";

// Owns browser effects; all progression and metrics remain in the existing modes.
export function usePractice(c: PracticeController, soundEnabled: boolean) {
  const [, render] = useState(0);
  const [resetMessage, setResetMessage] = useState(false);
  const [saved, setSaved] = useState<boolean | null>(null);
  const record = useRef<StoredSession | null>(null);
  const surface = useRef<HTMLElement>(null);
  const mode = c.mode;
  const sound = useRef(soundEnabled);
  sound.current = soundEnabled;
  const refresh = () => render((value) => value + 1);
  useEffect(() => {
    if (c.status !== "practice") return;
    surface.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    setResetMessage(false);
    const input = new KeyboardController();
    const update = (key: string, down: boolean) => {
      const events = mode.session.events.length;
      const errors = mode instanceof LaptopChordMode ? mode.errorCount : 0;
      if (down) c.down(key);
      else c.up(key);
      if (
        mode.session.events.length > events ||
        (mode instanceof LaptopChordMode && mode.errorCount > errors)
      ) {
        const event = mode.session.events.at(-1);
        const correct =
          mode.session.events.length > events && event
            ? "correct" in event
              ? event.correct
              : event.practiced
            : false;
        tone(correct, sound.current);
      }
      setResetMessage(false);
      refresh();
      if (c.status !== "practice") input.deactivate();
    };
    input.setKeyDownHandler(({ key }) => update(key, true));
    input.setKeyUpHandler(({ key }) => update(key, false));
    input.setReleaseAllHandler(() => {
      c.resetInput();
      setResetMessage(true);
      refresh();
    });
    input.activate();
    const timer = window.setInterval(refresh, 100);
    return () => {
      input.deactivate();
      clearInterval(timer);
    };
  }, [c, mode, c.status]);
  useEffect(() => {
    if (c.status === "results" && !record.current) {
      record.current = serializeSession(c);
      void saveSession(record.current).then(setSaved);
    }
  }, [c, c.status]);
  useEffect(() => {
    if (c.status !== "practice") {
      surface.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }, [c.status]);
  function retrySave() {
    if (!record.current) return;
    setSaved(null);
    void saveSession(record.current).then(setSaved);
  }
  return { surface, refresh, resetMessage, saved, retrySave };
}
