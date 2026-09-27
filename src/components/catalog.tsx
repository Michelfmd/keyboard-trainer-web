"use client";
import Link from "next/link";
import { useApp } from "./app-provider";
export function Catalog({
  activity,
  home = false,
}: {
  activity?: "keyboard" | "guitar";
  home?: boolean;
}) {
  const { t } = useApp();
  return (
    <>
      <div className="eyebrow">
        {home ? "KEYBOARD TRAINER / 01" : t.practice}
      </div>
      <h1>{home ? t.hero : activity ? t[activity] : t.choose}</h1>
      <p className="lead">
        {home ? t.intro : activity ? t[`${activity}Description`] : t.intro}
      </p>
      <div className="activity-grid">
        {!activity ? (
          <>
            <Link className="activity-card" href="/practice/keyboard">
              <div className="card-symbol" aria-hidden="true">
                ⌨
              </div>
              <span className="eyebrow">
                01 / {t.words} + {t.random}
              </span>
              <h2>
                {t.keyboard}
                <span aria-hidden="true">↗</span>
              </h2>
              <p>{t.keyboardDescription}</p>
            </Link>
            <Link className="activity-card" href="/practice/guitar">
              <div className="card-symbol strings" aria-hidden="true">
                ≋
              </div>
              <span className="eyebrow">02 / {t.manual}</span>
              <h2>
                {t.guitar}
                <span aria-hidden="true">↗</span>
              </h2>
              <p>{t.guitarDescription}</p>
            </Link>
          </>
        ) : (
          (activity === "keyboard"
            ? (["words", "random"] as const)
            : (["manual", "laptop"] as const)
          ).map((exercise, index) => (
            <Link
              key={exercise}
              className="activity-card"
              href={`/practice/${activity}/${exercise}`}
            >
              <span className="eyebrow">
                0{index + 1} / {t[activity]}
              </span>
              <h2>
                {t[exercise]}
                <span aria-hidden="true">↗</span>
              </h2>
              <p>{t[`${exercise}Description`]}</p>
              <span className="text-link">{t.configure} →</span>
            </Link>
          ))
        )}
      </div>
      <div className="quiet-note">
        <span aria-hidden="true">↳</span> {t.physical}
      </div>
    </>
  );
}
