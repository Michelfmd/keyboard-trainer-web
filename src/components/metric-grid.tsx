import { useApp } from "./app-provider";
export function MetricGrid({ metrics }: { metrics: object }) {
  const { t, settings } = useApp();
  return (
    <dl className="metric-grid">
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key}>
          <dt>{t[key as keyof typeof t] as string}</dt>
          <dd>
            {value === null
              ? "—"
              : Number(value).toLocaleString(settings.language, {
                  maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
                })}
            {key === "accuracy" ? (
              <small>%</small>
            ) : [
                "elapsedTime",
                "averageResponseTime",
                "averageChange",
                "fastestChange",
              ].includes(key) ? (
              <small>s</small>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
