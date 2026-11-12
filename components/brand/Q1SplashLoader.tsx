"use client";

import { useId } from "react";
type Locale = "ru" | "kk" | "en";
import s from "./splash.module.css";

interface Q1SplashLoaderProps {
  leaving?: boolean;
  playing?: boolean;
  locale?: Locale;
}

const text = {
  ru: { loading: "Загрузка", lines: ["Все возможности", "в одном QR"] },
  kk: { loading: "Жүктелуде", lines: ["Барлық мүмкіндік", "бір QR-кодта"] },
  en: { loading: "Loading", lines: ["Every service", "in one QR"] },
};

const Q_PATH = `M 344 476
  C 321 486 296 490 272 490
  C 144 492 43 404 43 282
  C 43 162 144 71 273 71
  C 400 69 492 158 492 279
  C 492 325 476 368 445 400
  L 383 329
  C 391 313 394 295 394 277
  C 394 211 341 163 274 163
  C 201 161 143 209 143 279
  C 142 350 198 398 274 397
  Z`;

const TAIL_PATH = "M 225 310 L 342 310 L 491 484 L 375 484 Z";

const ONE_PATH =
  "M 538 142 L 627 77 L 713 77 L 713 484 L 602 484 L 602 198 L 538 233 Z";

// Same logo assembly and timing as the supplied guest-page loader.
export function Q1SplashLoader({
  leaving = false,
  playing = true,
  locale = "ru",
}: Q1SplashLoaderProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const limeId = `q1-lime-${uid}`;
  const shineId = `q1-shine-${uid}`;
  const clipId = `q1-clip-${uid}`;
  const t = text[locale];

  return (
    <div
      data-q1-splash="true"
      data-playing={playing}
      data-leaving={leaving}
      role="status"
      aria-label={t.loading}
      aria-live="polite"
      lang={locale}
      className={s.overlay}
    >
      <div className={s.glow} aria-hidden="true" />
      <div className={s.content} aria-hidden="true">
        <svg
          width="710"
          height="459"
          viewBox="23 51 710 459"
          xmlns="http://www.w3.org/2000/svg"
          className={s.logo}
        >
          <defs>
            <linearGradient id={limeId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#cae213" />
              <stop offset="100%" stopColor="#cae213" />
            </linearGradient>
            <linearGradient id={shineId}>
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="45%" stopColor="white" stopOpacity="0" />
              <stop offset="52%" stopColor="white" stopOpacity="0.28" />
              <stop offset="62%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <clipPath id={clipId}>
              <path d={Q_PATH} />
              <path d={TAIL_PATH} />
              <path d={ONE_PATH} />
            </clipPath>
          </defs>
          <g className={s.q}>
            <path d={Q_PATH} fill="#FAFAFA" />
          </g>
          <g className={s.tail}>
            <path d={TAIL_PATH} fill={`url(#${limeId})`} />
          </g>
          <g className={s.one}>
            <path d={ONE_PATH} fill={`url(#${limeId})`} />
          </g>
          <g clipPath={`url(#${clipId})`}>
            <g className={s.shine}>
              <g transform="skewX(-18)">
                <rect
                  x="-360"
                  y="40"
                  width="340"
                  height="480"
                  fill={`url(#${shineId})`}
                />
              </g>
            </g>
          </g>
        </svg>
        <div className={s.tagline}>
          {t.lines.map((line, index) => (
            <span className={s.line} key={index}>
              {line}
            </span>
          ))}
        </div>
        <div className={s.indicator} />
      </div>
    </div>
  );
}

export default Q1SplashLoader;
