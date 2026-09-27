"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "./app-provider";
import {
  loadSessions,
  clearSessions,
  sessionMetrics,
} from "../storage/sessions";
import { MetricGrid } from "./metric-grid";
export function StatisticsScreen() {
  const { t, settings } = useApp();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadSessions>
  > | null>(null);
  const [group, setGroup] = useState<"typing" | "manual" | "laptop">("typing");
  const [confirm, setConfirm] = useState(false);
  const [limit, setLimit] = useState(20);
  useEffect(() => {
    void loadSessions().then(setData);
  }, []);
  const records =
    data?.sessions.filter((r) =>
      group === "typing"
        ? ["words", "random"].includes(r.config.exercise)
        : r.config.exercise === group,
    ) ?? [];
  const metrics = sessionMetrics(records)[group];
  return (
    <>
      <div className="eyebrow">{t.statistics}</div>
      <h1>{t.history}</h1>
      <p className="lead">{t.local}</p>
      <div className="tabs" role="group" aria-label={t.statistics}>
        {(["typing", "manual", "laptop"] as const).map((key) => (
          <button
            key={key}
            aria-pressed={group === key}
            onClick={() => {
              setGroup(key);
              setLimit(20);
            }}
          >
            {t[key]}
          </button>
        ))}
      </div>
      {!data ? (
        <p role="status">{t.loading}</p>
      ) : (
        <>
          {data.unavailable && <p role="alert">{t.unavailable}</p>}
          {data.corrupted > 0 && <p role="status">{t.corrupted}</p>}
          {records.length ? (
            <>
              <div className="eyebrow">
                {records.length} {t.sessions}
              </div>
              <MetricGrid metrics={metrics} />
              {group === "manual" && <p>{t.manualNote}</p>}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t.date}</th>
                      <th>{t.exercise}</th>
                      <th>{t.difficulty}</th>
                      <th>{t.duration}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, limit).map((r) => (
                      <tr key={r.id}>
                        <td>
                          {new Date(r.date).toLocaleString(settings.language)}
                        </td>
                        <td>
                          {t[r.config.exercise]}
                          {r.partial ? ` · ${t.partial}` : ""}
                        </td>
                        <td>{t[r.config.difficulty]}</td>
                        <td>{r.elapsed.toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {records.length > limit && (
                <button onClick={() => setLimit(limit + 20)}>+ 20</button>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h2>{t.noHistory}</h2>
              <p>{t.noHistoryDescription}</p>
              <Link className="button primary" href="/practice">
                {t.practice} →
              </Link>
            </div>
          )}
          {data.sessions.length > 0 && (
            <div className="history-actions">
              {confirm ? (
                <>
                  <p>{t.confirmClear}</p>
                  <button
                    onClick={() => {
                      void clearSessions().then(async (success) => {
                        if (success) {
                          setData(await loadSessions());
                          setConfirm(false);
                        } else setData({ ...data, unavailable: true });
                      });
                    }}
                  >
                    {t.yesClear}
                  </button>
                  <button onClick={() => setConfirm(false)}>{t.keep}</button>
                </>
              ) : (
                <button
                  className="text-button"
                  onClick={() => setConfirm(true)}
                >
                  {t.clearHistory}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
