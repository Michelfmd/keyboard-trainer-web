import { KeyboardLayout } from "../core/keyboard-layout";
import { useApp } from "./app-provider";
const layout = new KeyboardLayout();
export function VisualKeyboard({
  expected,
  pressed,
  feedback,
}: {
  expected: readonly string[];
  pressed: ReadonlySet<string>;
  feedback: string | null;
}) {
  const { t } = useApp();
  const targets = expected.map((key) => layout.normalize(key));
  const active = [...pressed].map((key) => layout.normalize(key));
  const finger =
    expected.length === 1
      ? layout.positions.get(layout.normalize(expected[0]!))?.finger
      : undefined;
  return (
    <div className="keyboard-panel">
      <div className="keyboard" aria-label={t.keyboardLayout}>
        {KeyboardLayout.rows.map((row, index) => (
          <div
            className="key-row"
            key={row}
            style={{ paddingLeft: `${KeyboardLayout.offsets[index]! * 5}%` }}
          >
            {[...row].map((key) => (
              <span
                key={key}
                className={`key ${key === " " ? "space-key" : ""} ${targets.includes(key) ? "expected-key" : ""} ${active.includes(key) ? `pressed-key ${feedback ?? ""}` : ""}`}
              >
                <span>{key === " " ? t.space : key.toUpperCase()}</span>
                {targets.includes(key) && <small aria-hidden="true">●</small>}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="keyboard-caption">
        <span>{t.keyboardLayout}</span>
        {finger && (
          <span>
            {t.finger}: {t.fingers[finger as keyof typeof t.fingers]}
          </span>
        )}
      </div>
    </div>
  );
}
