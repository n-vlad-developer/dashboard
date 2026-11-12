"use client";
import { Q1ErrorScreen } from "@/components/feedback/Q1ErrorScreen";
export default function ErrorPage({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <Q1ErrorScreen
      code="!"
      title="Не удалось открыть кабинет"
      description="Попробуйте ещё раз. Если ошибка повторится, вернитесь немного позже."
      onRetry={retry}
    />
  );
}
