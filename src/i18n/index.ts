import { en } from "./en";
import { es } from "./es";
export function locale(language: unknown) {
  return language === "es" ? es : en;
}
