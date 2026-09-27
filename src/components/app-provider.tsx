"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  defaults,
  parseSettings,
  settingsKey,
  validateSettings,
  type Settings,
} from "../application/settings";
import { locale } from "../i18n";
const Context = createContext({
  settings: defaults,
  ready: false,
  update: (_settings: Settings): boolean => false,
});
export function useApp() {
  const app = useContext(Context);
  return { ...app, t: locale(app.settings.language) };
}
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(defaults);
  const [ready, setReady] = useState(false);
  const path = usePathname();
  const t = locale(settings.language);
  useEffect(() => {
    try {
      setSettings(parseSettings(localStorage.getItem(settingsKey)));
    } catch (error) {
      console.warn("Settings unavailable", error);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.dataset.reduceMotion = String(
      settings.reduceMotion,
    );
  }, [settings.language, settings.reduceMotion]);
  function update(value: Settings) {
    const next = validateSettings(value);
    setSettings(next);
    try {
      localStorage.setItem(settingsKey, JSON.stringify(next));
      return true;
    } catch (error) {
      console.warn("Settings could not be saved", error);
      return false;
    }
  }
  return (
    <Context.Provider value={{ settings, ready, update }}>
      <a className="skip-link" href="#main">
        {t.skipContent}
      </a>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Keyboard Trainer">
          <span className="brand-icon" aria-hidden="true">
            kt
          </span>
          <span>
            Keyboard<span className="brand-light">Trainer</span>
          </span>
        </Link>
        <nav aria-label={t.practice}>
          {[
            ["/practice", t.practice],
            ["/statistics", t.statistics],
            ["/settings", t.settings],
            ["/about", t.about],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href!}
              aria-current={path.startsWith(href!) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer>
        <span>KEYBOARD TRAINER</span>
        <span>{t.local}</span>
      </footer>
    </Context.Provider>
  );
}
