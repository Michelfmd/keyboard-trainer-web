"use client";
import { useEffect } from "react";
import { useApp } from "../components/app-provider";
export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const { t } = useApp();
  useEffect(() => console.error("Application error", error), [error]);
  return (
    <>
      <h1>{t.errorTitle}</h1>
      <p>{t.errorDescription}</p>
      <button onClick={reset}>{t.retry}</button>
    </>
  );
}
