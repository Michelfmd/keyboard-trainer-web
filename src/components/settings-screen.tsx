"use client";
import { useEffect, useState } from "react";
import { useApp } from "./app-provider";
export function SettingsScreen() {
  const { settings, update, t, ready } = useApp();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => setDraft(settings), [settings]);
  return (
    <>
      <div className="eyebrow">{t.settings}</div>
      <h1>{t.preferences}</h1>
      <p className="lead">{t.preferencesDescription}</p>
      <form
        className="panel settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(update(draft));
        }}
      >
        <label>
          {t.interfaceLanguage}
          <select
            value={draft.language}
            onChange={(e) =>
              setDraft({ ...draft, language: e.target.value as "en" | "es" })
            }
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        <div className="form-grid">
          {(["hardWordCount", "randomLength", "chordCount"] as const).map(
            (key) => (
              <label key={key}>
                {t[key]}
                <input
                  type="number"
                  min="1"
                  max="200"
                  step="1"
                  required
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ),
          )}
        </div>
        <p className="muted">{t.range}</p>
        <fieldset>
          <legend>{t.feedback}</legend>
          {(["reduceMotion", "sound"] as const).map((key) => (
            <label className="toggle" key={key}>
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: e.target.checked })
                }
              />
              {t[key]}
            </label>
          ))}
        </fieldset>
        <button disabled={!ready} className="primary">
          {t.saveSettings}
        </button>
        <p role="status">
          {saved === null ? "" : saved ? t.settingsSaved : t.settingsFailed}
        </p>
      </form>
    </>
  );
}
