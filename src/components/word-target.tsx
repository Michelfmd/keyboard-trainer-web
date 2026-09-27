import { useLayoutEffect, useRef } from "react";
import type { WordsMode } from "../modes/words";
export function WordTarget({ mode }: { mode: WordsMode }) {
  const current = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = current.current;
    const container = element?.closest(".word-target");
    if (!element || !container) return;
    const target = element.getBoundingClientRect();
    const visible = container.getBoundingClientRect();
    if (target.bottom > visible.bottom || target.top < visible.top)
      element.scrollIntoView({ block: "nearest" });
  }, [mode.position]);
  let offset = 0;
  const words = mode.getFullTarget().split(" ");
  return (
    <div className="word-target" aria-label={mode.getFullTarget()}>
      {words.map((word, wordIndex) => {
        const start = offset;
        offset += word.length + 1;
        return (
          <span className="target-word" key={wordIndex}>
            {[...(word + (wordIndex < words.length - 1 ? " " : ""))].map(
              (char, i) => {
                const index = start + i;
                const event = mode.session.events[index];
                const active = index === mode.position;
                return (
                  <span
                    key={i}
                    ref={active ? current : undefined}
                    aria-current={active ? "step" : undefined}
                    className={
                      active
                        ? "current-character"
                        : event
                          ? event.correct
                            ? "completed-character"
                            : "wrong-character"
                          : ""
                    }
                  >
                    {char}
                  </span>
                );
              },
            )}
          </span>
        );
      })}
    </div>
  );
}
