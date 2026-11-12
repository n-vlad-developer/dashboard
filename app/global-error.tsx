"use client";
import { Q1ErrorScreen } from "@/components/feedback/Q1ErrorScreen";
import "@fontsource-variable/manrope";
export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="ru">
      <head>
        <title>Q1 — Не удалось открыть кабинет</title>
        <link rel="icon" href="/brand/q1-icon.svg" />
      </head>
      <body style={{ margin: 0, fontFamily: "Manrope Variable, sans-serif" }}>
        <Q1ErrorScreen
          code="500"
          title="Не удалось открыть кабинет"
          description="Повторите загрузку страницы или вернитесь на главную."
          onRetry={retry}
        />
      </body>
    </html>
  );
}
