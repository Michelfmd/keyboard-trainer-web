import type { Chord } from "../core/chords";
import { useApp } from "./app-provider";
export function GuitarDiagram({ chord }: { chord: Chord }) {
  const { t } = useApp();
  return (
    <figure className="guitar-diagram">
      <svg
        viewBox="0 0 280 310"
        role="img"
        aria-label={`${chord.name}: ${chord.frets.map((f, i) => `${t.string} ${6 - i}, ${f === null ? t.muted : f === 0 ? t.open : `${t.fret} ${f}, ${t.fingerNumber} ${chord.fingers[i]}`}`).join("; ")}`}
      >
        {[0, 1, 2, 3, 4].map((f) => (
          <g key={f}>
            <line
              x1="45"
              x2="235"
              y1={60 + f * 46}
              y2={60 + f * 46}
              stroke="currentColor"
              strokeWidth={f === 0 ? 5 : 1}
            />
            {f > 0 && (
              <text x="20" y={40 + f * 46}>
                {f}
              </text>
            )}
          </g>
        ))}
        {chord.frets.map((f, i) => (
          <g key={i}>
            <line
              x1={45 + i * 38}
              x2={45 + i * 38}
              y1="60"
              y2="244"
              stroke="currentColor"
              strokeWidth={2 - i * 0.2}
            />
            <text x={45 + i * 38} y="35" textAnchor="middle">
              {f === null ? "X" : f === 0 ? "O" : ""}
            </text>
            <text x={45 + i * 38} y="275" textAnchor="middle">
              {6 - i}
            </text>
          </g>
        ))}
        {chord.barre && (
          <line
            x1={45 + (6 - chord.barre[1]) * 38}
            x2={45 + (6 - chord.barre[2]) * 38}
            y1={37 + chord.barre[0] * 46}
            y2={37 + chord.barre[0] * 46}
            stroke="var(--accent)"
            strokeWidth="25"
            strokeLinecap="round"
          />
        )}
        {chord.frets.map((f, i) =>
          f !== null && f > 0 ? (
            <g key={i}>
              <circle
                cx={45 + i * 38}
                cy={37 + f * 46}
                r="14"
                fill="var(--accent)"
              />
              <text
                x={45 + i * 38}
                y={42 + f * 46}
                textAnchor="middle"
                fill="var(--bg)"
                fontWeight="700"
              >
                {chord.fingers[i]}
              </text>
            </g>
          ) : null,
        )}
      </svg>
      <figcaption>{t.diagramHelp}</figcaption>
    </figure>
  );
}
