"use client";
import { useApp } from "./app-provider";
export function AboutScreen() {
  const { t } = useApp();
  return (
    <>
      <div className="eyebrow">{t.about}</div>
      <h1>Keyboard Trainer</h1>
      <p className="lead">{t.aboutText}</p>
      <div className="panel prose">
        <p>{t.privacyText}</p>
        <p>{t.manualNote}</p>
        <p>{t.physical}</p>
        <a href="https://github.com/Michelfmd/keyboard-trainer">
          Python · GitHub ↗
        </a>
      </div>
    </>
  );
}
