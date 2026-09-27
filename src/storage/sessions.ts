import { CHORDS } from "../data/chords";
import {
  createInputSession,
  createChordSession,
  createLaptopChordSession,
} from "../core/session";
import { calculateMetrics } from "../core/metrics";
import { calculateChordMetrics } from "../core/chord-metrics";
import { calculateLaptopChordMetrics } from "../core/laptop-chord-metrics";
import { ChordMode, LaptopChordMode } from "../modes";
import type {
  PracticeController,
  PracticeConfig,
} from "../application/practice";
export interface StoredAttempt {
  responseTime: number;
  correct?: boolean;
  expectedKey?: string;
  chord?: string;
  practiced?: boolean;
  errors?: number;
}
export interface StoredSession {
  version: 1;
  id: string;
  date: string;
  config: PracticeConfig;
  elapsed: number;
  partial: boolean;
  attempts: StoredAttempt[];
}
export function serializeSession(
  controller: PracticeController,
): StoredSession {
  if (controller.status !== "results")
    throw new Error("Only finished sessions can be saved");
  const mode = controller.mode;
  const attempts: StoredAttempt[] = mode.session.events.map((event) => {
    if ("expectedKey" in event)
      return {
        responseTime: event.responseTime,
        expectedKey: event.expectedKey,
        correct: event.correct,
      };
    if ("practiced" in event)
      return {
        responseTime: event.responseTime,
        chord: event.expectedChord.name,
        practiced: event.practiced,
      };
    return {
      responseTime: event.responseTime,
      chord: event.expectedChord.name,
      correct: event.correct,
      errors: event.errorCount,
    };
  });
  return {
    version: 1,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    config: { ...controller.config },
    elapsed: mode.session.elapsedTime,
    partial: !mode.isFinished,
    attempts,
  };
}
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
export function deserializeSession(value: unknown): StoredSession | null {
  if (!value || typeof value !== "object") return null;
  const v = value as StoredSession;
  if (
    v.version !== 1 ||
    typeof v.id !== "string" ||
    !v.id ||
    typeof v.date !== "string" ||
    !Number.isFinite(Date.parse(v.date)) ||
    !finite(v.elapsed) ||
    typeof v.partial !== "boolean"
  )
    return null;
  const c = v.config;
  if (
    !c ||
    !["words", "random", "manual", "laptop"].includes(c.exercise) ||
    !["easy", "medium", "hard"].includes(c.difficulty) ||
    !["en", "es"].includes(c.language) ||
    !Number.isInteger(c.count) ||
    c.count < 1 ||
    c.count > 200
  )
    return null;
  if (
    !Array.isArray(v.attempts) ||
    !v.attempts.length ||
    v.attempts.length > 100000
  )
    return null;
  for (const a of v.attempts) {
    if (!a || !finite(a.responseTime)) return null;
    if (c.exercise === "words" || c.exercise === "random") {
      if (
        typeof a.correct !== "boolean" ||
        typeof a.expectedKey !== "string" ||
        a.expectedKey.length !== 1
      )
        return null;
    } else {
      if (!CHORDS.some((chord) => chord.name === a.chord)) return null;
      if (c.exercise === "manual" && typeof a.practiced !== "boolean")
        return null;
      if (
        c.exercise === "laptop" &&
        (typeof a.correct !== "boolean" ||
          !finite(a.errors) ||
          !Number.isInteger(a.errors) ||
          a.correct !== (a.errors === 0))
      )
        return null;
    }
  }
  return v;
}
// Restore only the structured fields consumed by the engine's metric calculators.
// Actual pressed keys are deliberately not stored.
export function sessionMetrics(records: readonly StoredSession[]) {
  const typing = [];
  const manual = [];
  const laptop = [];
  for (const record of records) {
    let now = 0;
    const clock = () => now;
    const kind = record.config.exercise;
    if (kind === "words" || kind === "random") {
      const session = createInputSession(kind, clock);
      session.start();
      for (const a of record.attempts)
        session.addEvent({
          expectedKey: a.expectedKey!,
          pressedKey: "",
          correct: a.correct!,
          responseTime: a.responseTime,
          timestamp: 0,
          mode: kind,
        });
      now = record.elapsed;
      session.finish();
      typing.push(session);
    } else if (kind === "manual") {
      const session = createChordSession(kind, clock);
      session.start();
      record.attempts.forEach((a, index) =>
        session.addEvent({
          expectedChord: CHORDS.find((c) => c.name === a.chord)!,
          targetIndex: index,
          practiced: a.practiced!,
          assessment: { source: "manual", correct: null },
          responseTime: a.responseTime,
          timestamp: 0,
          mode: kind,
        }),
      );
      now = record.elapsed;
      session.finish();
      manual.push(session);
    } else {
      const session = createLaptopChordSession(kind, clock);
      session.start();
      for (const a of record.attempts)
        session.addEvent({
          expectedChord: CHORDS.find((c) => c.name === a.chord)!,
          expectedKeys: new Set(),
          correct: a.correct!,
          errorCount: a.errors!,
          responseTime: a.responseTime,
          timestamp: 0,
          mode: kind,
        });
      now = record.elapsed;
      session.finish();
      laptop.push(session);
    }
  }
  return {
    typing: calculateMetrics(typing),
    manual: calculateChordMetrics(manual),
    laptop: calculateLaptopChordMetrics(laptop),
  };
}
export function liveMetrics(controller: PracticeController) {
  const m = controller.mode;
  if (m instanceof ChordMode) return calculateChordMetrics([m.session]);
  if (m instanceof LaptopChordMode)
    return calculateLaptopChordMetrics([m.session]);
  return calculateMetrics([m.session]);
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open("keyboard-trainer", 1);
    let abandoned = false;
    const timeout = setTimeout(() => {
      abandoned = true;
      reject(new Error("Storage open timed out"));
    }, 4000);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("sessions"))
        request.result.createObjectStore("sessions", { keyPath: "id" });
    };
    request.onsuccess = () => {
      clearTimeout(timeout);
      if (abandoned) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => {
      clearTimeout(timeout);
      reject(request.error);
    };
    request.onblocked = () => {
      abandoned = true;
      clearTimeout(timeout);
      reject(new Error("Storage is blocked by another tab"));
    };
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("sessions", mode);
      const request = action(tx.objectStore("sessions"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted"));
    });
  } finally {
    db.close();
  }
}
export async function saveSession(session: StoredSession): Promise<boolean> {
  try {
    if (!deserializeSession(session)) throw new Error("Invalid session");
    await transaction("readwrite", (store) => store.put(session));
    return true;
  } catch (error) {
    console.warn("Session could not be saved locally", error);
    return false;
  }
}
export async function loadSessions(): Promise<{
  sessions: StoredSession[];
  unavailable: boolean;
  corrupted: number;
}> {
  try {
    const raw: unknown[] = await transaction("readonly", (store) =>
      store.getAll(),
    );
    const sessions = raw
      .map(deserializeSession)
      .filter((v): v is StoredSession => v !== null)
      .sort((a, b) => b.date.localeCompare(a.date));
    return {
      sessions,
      unavailable: false,
      corrupted: raw.length - sessions.length,
    };
  } catch (error) {
    console.warn("Local history unavailable", error);
    return { sessions: [], unavailable: true, corrupted: 0 };
  }
}
export async function clearSessions(): Promise<boolean> {
  try {
    await transaction("readwrite", (store) => store.clear());
    return true;
  } catch (error) {
    console.warn("History could not be cleared", error);
    return false;
  }
}
