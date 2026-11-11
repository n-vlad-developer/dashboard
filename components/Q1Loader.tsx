
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, RefreshCcw, ShieldCheck } from "lucide-react";

type Props = { ready?: boolean };

export default function Q1Loader({ ready = false }: Props) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return <main className={`q1-intro ${ready ? "is-ready" : ""}`} aria-busy={!ready}>
    <div className="q1-intro-grid" aria-hidden="true"/>
    <div className="q1-intro-light q1-intro-light--lime" aria-hidden="true"/>
    <div className="q1-intro-light q1-intro-light--violet" aria-hidden="true"/>

    <header className="q1-intro-top">
      <div className="q1-intro-brand"><Image src="/q1-logo.png" alt="Q1" width={46} height={46} priority/><div><strong>Mind<span>Tech</span></strong><small>Q1 WORKSPACE</small></div></div>
      <span className="q1-intro-security"><ShieldCheck size={14}/> ЗАЩИЩЁННОЕ СОЕДИНЕНИЕ</span>
    </header>

    <section className="q1-intro-content" aria-label="Загрузка кабинета Q1">
      <div className="q1-intro-emblem" aria-hidden="true">
        <span className="q1-intro-ring q1-intro-ring--outer"/>
        <span className="q1-intro-ring q1-intro-ring--inner"/>
        <span className="q1-intro-emblem-light"/>
        <span className="q1-intro-logo"><Image src="/q1-logo.png" alt="" width={104} height={104} priority/></span>
        <span className="q1-intro-star q1-intro-star--one">✦</span>
        <span className="q1-intro-star q1-intro-star--two">✧</span>
      </div>

      <span className="q1-intro-eyebrow"><i/> Q1 DIGITAL EXPERIENCE <i/></span>
      <h1>Ваш кабинет<span>.</span> Почти готов.</h1>
      <p>Рабочее пространство ресторана — в одном месте.</p>

      <div className="q1-intro-loading" role="status" aria-live="polite">
        <div className="q1-intro-loading-top">
          <span>{ready ? "Данные получены" : "Подключаем кабинет"}</span>
          {ready ? <Check size={16}/> : <span className="q1-intro-loading-pulse" aria-hidden="true"/>}
        </div>
        <div className="q1-intro-track" aria-hidden="true"><span/></div>
        <small>{ready ? "Открываем рабочее пространство…" : "Загружаем доступные заведения и настройки"}</small>
      </div>

      {slow && !ready && <div className="q1-intro-slow">
        <span>Соединение занимает больше обычного.</span>
        <button type="button" onClick={() => window.location.reload()}><RefreshCcw size={14}/> Обновить страницу</button>
      </div>}
    </section>

    <footer className="q1-intro-bottom"><span>© 2026 MINDTECH · Q1</span><span>МЕНЮ <i/> СЕРВИС <i/> АНАЛИТИКА</span></footer>
  </main>;
}
