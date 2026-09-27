"use client";
import Link from "next/link";
import { useApp } from "../components/app-provider";
export default function NotFound() {
  const { t } = useApp();
  return (
    <>
      <h1>404</h1>
      <p className="lead">{t.notFound}</p>
      <Link className="button primary" href="/practice">
        {t.back}
      </Link>
    </>
  );
}
