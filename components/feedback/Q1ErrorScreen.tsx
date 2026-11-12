"use client";
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react";

import "./q1-error.css";
import { ErrorCat } from "./ErrorCat";

const words = {
  ru: {
    title: "А где страница?",
    text: "Мы тоже заглянули под колпак. Пусто. Проверьте ссылку или вернитесь на главную.",
    home: "На главную",
    back: "Назад",
    retry: "Попробовать снова",
    mark: "СВЯЗЬ С МОМЕНТОМ",
    foot: "Все возможности в одном QR",
  },
  kk: {
    title: "Ал бет қайда?",
    text: "Бұл бет табылмады. Сілтеме өзгерген болуы мүмкін — артқа оралыңыз немесе басты бетті ашыңыз.",
    home: "Басты бетке",
    back: "Артқа",
    retry: "Қайта көру",
    mark: "СӘТПЕН БАЙЛАНЫС",
    foot: "Барлық мүмкіндік бір QR-да",
  },
  en: {
    title: "Where did the page go?",
    text: "We checked under the lid too. Nothing. Check the link or head back home.",
    home: "Home page",
    back: "Go back",
    retry: "Try again",
    mark: "CONNECTED TO THE MOMENT",
    foot: "Every possibility. One QR.",
  },
};
export function Q1ErrorScreen({
  code = "404",
  title,
  description,
  onRetry,
  busy = false,
  actionText,
}: {
  code?: string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  busy?: boolean;
  actionText?: string;
}) {
  const lang = "ru";
  const t = words[lang];
  return (
    <section className="q1-error" lang={lang} aria-labelledby="q1-error-title">
      <div className="q1-error-grain" aria-hidden="true" />
      <a className="q1-error-brand" href="/" aria-label="Q1 by MindTech">
        <img src="/brand/q1-icon.svg" width={52} height={52} alt="Q1" />
        <span>by MindTech</span>
      </a>
      <div className="q1-error-content">
        <div className="q1-error-scene">
          <span className="q1-error-number">{code}</span>
          <ErrorCat />
        </div>
        <div className="q1-error-copy">
          <h1 id="q1-error-title">{title || t.title}</h1>
          <p className="q1-error-description">{description || t.text}</p>
          <div className="q1-error-actions">
            {onRetry ? (
              <button
                disabled={busy}
                onClick={onRetry}
                className="q1-error-primary"
              >
                <RefreshCw
                  size={18}
                  className={busy ? "q1-error-spinning" : ""}
                />
                {actionText || t.retry}
              </button>
            ) : (
              <a href="/" className="q1-error-primary">
                {t.home}
                <ArrowUpRight size={20} />
              </a>
            )}
            <button
              className="q1-error-secondary"
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else window.location.assign("/");
              }}
            >
              <ArrowLeft size={18} />
              {t.back}
            </button>
          </div>
        </div>
      </div>
      <p className="q1-error-footer">
        Q1 <span>·</span> {t.foot}
      </p>
    </section>
  );
}
