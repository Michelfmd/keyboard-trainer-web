"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "./app-provider";
import {
  PracticeController,
  type Exercise,
  type PracticeConfig,
} from "../application/practice";
import { usePractice } from "../application/use-practice";
import { ChordMode, LaptopChordMode, TypingMode, WordsMode } from "../modes";
import { FRET_KEYS } from "../modes/laptop-chord";
import { CHORDS } from "../data/chords";
import { tone } from "../application/sound";
import { liveMetrics } from "../storage/sessions";
import { VisualKeyboard } from "./visual-keyboard";
import { GuitarDiagram } from "./guitar-diagram";
import { MetricGrid } from "./metric-grid";
import { WordTarget } from "./word-target";
export function PracticeScreen({ exercise }: { exercise: Exercise }) {
  const { settings, ready, t } = useApp();
  const [run, setRun] = useState(0);
  const [controller, setController] = useState<PracticeController | null>(null);
  const [difficulty, setDifficulty] =
    useState<PracticeConfig["difficulty"]>("easy");
  const [language, setLanguage] = useState(settings.language);
  const [length, setLength] = useState<number | null>(null);
  const activity =
    exercise === "words" || exercise === "random" ? "keyboard" : "guitar";
  useEffect(() => setLanguage(settings.language), [settings.language]);
  const defaultCount =
    exercise === "words"
      ? settings.hardWordCount
      : exercise === "random"
        ? settings.randomLength
        : settings.chordCount;
  const config: PracticeConfig = {
    exercise,
    difficulty,
    language,
    count: length ?? defaultCount,
  };
  function startPractice(value: PracticeConfig) {
    setRun((current) => current + 1);
    setController(new PracticeController(value));
  }
  if (controller)
    return (
      <ActivePractice
        key={run}
        controller={controller}
        onExit={() => setController(null)}
        onRepeat={() => startPractice(controller.config)}
      />
    );
  return (
    <>
      <div className="breadcrumbs">
        <Link href="/practice">{t.practice}</Link>
        <span>/</span>
        <Link href={`/practice/${activity}`}>{t[activity]}</Link>
        <span>/ {t[exercise]}</span>
      </div>
      <div className="eyebrow">{t.configure}</div>
      <h1>{t[exercise]}</h1>
      <p className="lead">{t[`${exercise}Description`]}</p>
      <form
        className="configuration panel"
        onSubmit={(event) => {
          event.preventDefault();
          startPractice(config);
        }}
      >
        {exercise !== "random" && (
          <fieldset>
            <legend>{t.difficulty}</legend>
            <div className="difficulty-options">
              {(["easy", "medium", "hard"] as const).map((level) => (
                <label
                  className={difficulty === level ? "selected" : ""}
                  key={level}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={level}
                    checked={difficulty === level}
                    onChange={() => setDifficulty(level)}
                  />
                  <strong>{t[level]}</strong>
                  <small>
                    {exercise === "words"
                      ? level === "hard"
                        ? `${config.count} ${t.words.toLowerCase()}`
                        : t[`${level}Words`]
                      : CHORDS.filter((c) => c.difficulty === level)
                          .map((c) => c.name)
                          .join(" · ")}
                  </small>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="form-grid">
          {exercise === "words" && (
            <label>
              {t.language}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "es")}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
          )}
          {(exercise !== "words" || difficulty === "hard") && (
            <label>
              {exercise === "words"
                ? t.hardWordCount
                : exercise === "random"
                  ? t.randomLength
                  : t.chordCount}
              <input
                type="number"
                min="1"
                max="200"
                step="1"
                required
                value={length ?? defaultCount}
                onChange={(e) => setLength(Number(e.target.value))}
              />
              <small>{t.range}</small>
            </label>
          )}
        </div>
        <button className="primary" disabled={!ready}>
          {t.start} <span aria-hidden="true">→</span>
        </button>
      </form>
      <p className="quiet-note">{t.physical}</p>
    </>
  );
}
function ActivePractice({
  controller: c,
  onExit,
  onRepeat,
}: {
  controller: PracticeController;
  onExit: () => void;
  onRepeat: () => void;
}) {
  const { t, settings } = useApp();
  const { surface, refresh, resetMessage, saved, retrySave } = usePractice(
    c,
    settings.sound,
  );
  const mode = c.mode;
  if (c.status === "cancelled")
    return (
      <section ref={surface} tabIndex={-1}>
        <h1>{t.choose}</h1>
        <p className="lead">{t[`${c.config.exercise}Description`]}</p>
        <div className="actions">
          <button className="primary" onClick={onRepeat}>
            {t.repeat}
          </button>
          <button onClick={onExit}>{t.configure}</button>
          <Link className="button" href="/practice">
            {t.another}
          </Link>
        </div>
      </section>
    );
  if (c.status === "results")
    return (
      <section
        ref={surface}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target === e.currentTarget) onRepeat();
        }}
      >
        <div className="eyebrow">
          {t.results} / {t[c.config.exercise]}
        </div>
        <h1>{mode.isFinished ? t.complete : t.partial}</h1>
        <p className="save-status" role="status">
          {saved === null ? t.saving : saved ? t.saved : t.saveFailed}
        </p>
        {saved === false && <button onClick={retrySave}>{t.saveRetry}</button>}
        <MetricGrid metrics={liveMetrics(c)} />
        {mode instanceof ChordMode && <p>{t.manualNote}</p>}
        <div className="actions">
          <button className="primary" onClick={onRepeat}>
            {t.repeat} ↻
          </button>
          <Link className="button" href="/practice">
            {t.another}
          </Link>
          <Link className="button" href="/statistics">
            {t.statistics}
          </Link>
          <Link href="/">{t.home}</Link>
        </div>
      </section>
    );
  const chord =
    mode instanceof ChordMode || mode instanceof LaptopChordMode
      ? mode.getTarget()
      : null;
  const expected =
    mode instanceof TypingMode
      ? [mode.getTarget()]
      : mode instanceof LaptopChordMode
        ? [...mode.expectedKeys]
        : [];
  return (
    <section
      className="practice-surface"
      ref={surface}
      tabIndex={-1}
      aria-label={t[c.config.exercise]}
    >
      <h1 className="sr-only">{t[c.config.exercise]}</h1>
      <div className="practice-top">
        <div>
          <div className="eyebrow">
            {t.practice} / {t[c.config.exercise]}
          </div>
          <span>{t[c.config.difficulty]}</span>
        </div>
        <div className="timer">
          <span>{t.elapsedTime}</span>
          <strong>
            {mode.session.elapsedTime.toFixed(1)}
            <small>s</small>
          </strong>
        </div>
        <button
          onClick={() => {
            c.cancel();
            refresh();
          }}
        >
          {t.cancel}
        </button>
      </div>
      <div className="progress-label">
        <span>{t.progress}</span>
        <span>
          {mode.position} /{" "}
          {mode instanceof TypingMode
            ? mode.getFullTarget().length
            : mode.count}
        </span>
      </div>
      <progress aria-label={t.progress} value={mode.progress} max="1" />
      {mode instanceof WordsMode && <WordTarget mode={mode} />}
      {mode instanceof TypingMode && !(mode instanceof WordsMode) && (
        <div
          className="single-target"
          aria-label={`${t.expected}: ${mode.getTarget()}`}
        >
          {mode.getTarget()}
        </div>
      )}
      {mode instanceof WordsMode && (
        <p className="expected-text">
          {t.expectedCharacter}:{" "}
          <strong>
            {mode.getTarget() === " " ? t.space : mode.getTarget()}
          </strong>
        </p>
      )}
      {chord && (
        <div className="chord-practice">
          <div className="chord-card">
            <div className="chord-name">{chord.name}</div>
            <h2>{t.chordNames[chord.name as keyof typeof t.chordNames]}</h2>
            <GuitarDiagram chord={chord} />
          </div>
          <div className="chord-instructions">
            {mode instanceof LaptopChordMode ? (
              <>
                <h2>{t.expected}</h2>
                <div className="expected-combo">
                  {expected.map((key) => (
                    <kbd key={key}>{key.toUpperCase()}</kbd>
                  ))}
                </div>
                <div className="fret-grid">
                  <span>{t.fret}</span>
                  {[6, 5, 4, 3, 2, 1].map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                  {Object.entries(FRET_KEYS).map(([fret, keys]) => (
                    <div className="fret-row" key={fret}>
                      <span>{fret}</span>
                      {[...keys].map((key) => (
                        <span
                          key={key}
                          className={`key ${expected.includes(key) ? "expected-key" : ""} ${c.pressed.has(key) ? "pressed-key" : ""}`}
                        >
                          {key.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <p>{t.mappingHelp}</p>
                <p>
                  {t.pressed}:{" "}
                  <strong>
                    {[...c.pressed].join(" + ").toUpperCase() || t.none}
                  </strong>
                </p>
                <p role="status">
                  {mode.waitingForRelease
                    ? t.release
                    : mode.errorCount
                      ? `× ${t.errorState} (${mode.errorCount})`
                      : `✓ ${t.cleanState}`}
                </p>
              </>
            ) : (
              <>
                <h2>{t.ready}</h2>
                <p>{t.manualDescription}</p>
                <div className="actions">
                  <button
                    className="primary"
                    onClick={() => {
                      c.manual(false);
                      tone(true, settings.sound);
                      refresh();
                      surface.current?.focus({ preventScroll: true });
                    }}
                  >
                    {t.practicedAction}
                  </button>
                  <button
                    onClick={() => {
                      c.manual(true);
                      refresh();
                      surface.current?.focus({ preventScroll: true });
                    }}
                  >
                    {t.skip}
                  </button>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    c.finish();
                    refresh();
                  }}
                >
                  {t.finish}
                </button>
                <p className="muted">{t.manualNote}</p>
              </>
            )}
          </div>
        </div>
      )}
      <div className={`feedback-line ${c.feedback ?? ""}`} role="status">
        {resetMessage ? t.reset : c.feedback ? t[c.feedback] : "\u00a0"}
      </div>
      {mode instanceof TypingMode && (
        <VisualKeyboard
          expected={expected}
          pressed={c.pressed}
          feedback={c.feedback}
        />
      )}
      <p className="quiet-note">{t.timingNote}</p>
    </section>
  );
}
