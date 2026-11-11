
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronRight, Clock3, Eye, EyeOff, LockKeyhole, MailCheck, Play, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { prettyError } from "@/lib/client";

const preview = [
  { label: "Вызовов", value: "248", change: "+12,4%" },
  { label: "Реакция", value: "1:24", change: "−8 сек" },
  { label: "Принято", value: "93%", change: "Пример" }
];

export default function LoginScreen() {
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [challengeId, setChallengeId] = useState(""), [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0), [resendAt, setResendAt] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0), [clock, setClock] = useState(0);

  const secondsLeft = Math.max(0, Math.ceil((expiresAt - clock) / 1000));
  const resendSeconds = Math.max(0, Math.ceil((resendAt - clock) / 1000));
  const canVerify = /^\d{6}$/.test(code) && secondsLeft > 0 && failedAttempts < 5;

  useEffect(() => {
    if (step !== "code") return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  /* Этап 1 — email и пароль */
  async function requestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || (step === "code" && resendSeconds > 0)) return;

    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }), cache: "no-store"
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) throw new Error("Слишком много запросов. Повторите позже — отправка ограничена сервером.");
      if (response.status === 503) throw new Error("Не удалось отправить письмо. Проверьте почту позже или обратитесь к администратору.");
      if (response.status === 401) throw new Error("Неверный email или пароль.");
      if (!response.ok) throw new Error(payload.detail || payload.error || "Не удалось отправить код.");
      if (response.status !== 202 || typeof payload.challenge_id !== "string" || !payload.challenge_id) throw new Error("Сервер не вернул подтверждение входа v9.3.");

      const now = Date.now();
      setChallengeId(payload.challenge_id); setCode(""); setFailedAttempts(0);
      setClock(now);
      setExpiresAt(now + Math.min(600, Math.max(1, Number(payload.expires_in) || 600)) * 1000);
      setResendAt(now + 60000);
      setStep("code");
    } catch (cause) { setError(prettyError(cause)); }
    finally { setBusy(false); }
  }

  /* Этап 2 — код из письма */
  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canVerify || !challengeId) return;

    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, code }), cache: "no-store"
      });

      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setFailedAttempts(n => n + 1); setCode("");
        throw new Error(failedAttempts >= 4 ? "Пять неверных попыток. Запросите новый код." : "Неверный или просроченный код. Проверьте письмо.");
      }
      if (response.status === 429) throw new Error("Слишком много попыток. Попробуйте позже.");
      if (!response.ok) throw new Error(payload.detail || payload.error || "Не удалось подтвердить код.");

      window.location.assign("/dashboard");
    } catch (cause) { setError(prettyError(cause)); setBusy(false); }
  }

  function backToCredentials() {
    setStep("credentials"); setChallengeId(""); setCode("");
    setError(""); setFailedAttempts(0);
  }

  return <main className="q1-auth-page">
    <section className="q1-auth-story" aria-label="Знакомство с Q1">
      <span className="q1-auth-orbit q1-auth-orbit-a" aria-hidden="true"/>
      <span className="q1-auth-orbit q1-auth-orbit-b" aria-hidden="true"/>

      <div className="q1-auth-story-head">
        <div className="q1-auth-brand">
          <Image src="/q1-logo.png" width={60} height={60} alt="Q1" priority/>
          <div><span className="q1-auth-brand-eyebrow">Q1 · DIGITAL EXPERIENCE</span><strong>Mind<span>Tech</span></strong><small>УМНЫЙ СЕРВИС ДЛЯ РЕСТОРАНОВ</small></div>
        </div>
        <span className="q1-auth-version">WORKSPACE / 2026</span>
      </div>

      <div className="q1-auth-story-body">
        <div className="q1-auth-chapter"><span className="q1-auth-dot"/> ПЛАТФОРМА УПРАВЛЕНИЯ Q1 <span className="q1-auth-chapter-line"/></div>
        <h1>Ваш ресторан.<br/><span>Всё под</span> <em>контролем.</em></h1>
        <p className="q1-auth-lead">Звонки, меню, команда и аналитика. Единая картина сервиса — там, где принимаются решения.</p>

        <div className="q1-auth-preview">
          <div className="q1-auth-preview-head">
            <span className="q1-auth-preview-icon"><BarChart3 size={19}/></span>
            <div><strong>Пульс заведения</strong><small>Наглядный пример аналитики</small></div>
            <span className="q1-auth-preview-tag">DEMO DATA</span>
          </div>
          <div className="q1-auth-preview-metrics">{preview.map(item =>
            <div key={item.label}><small>{item.label}</small><strong>{item.value}</strong><span>{item.change}</span></div>
          )}</div>
          <svg className="q1-auth-preview-chart" viewBox="0 0 540 126" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="q1-auth-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#c8ff9e" stopOpacity=".29"/><stop offset="1" stopColor="#c8ff9e" stopOpacity="0"/></linearGradient></defs>
            <path d="M0 102 C42 99 65 85 96 92 S152 65 190 75 S258 27 300 47 S364 64 400 35 S475 36 540 12 L540 126 L0 126 Z" fill="url(#q1-auth-chart-fill)"/>
            <path d="M0 102 C42 99 65 85 96 92 S152 65 190 75 S258 27 300 47 S364 64 400 35 S475 36 540 12" fill="none" stroke="#c8ff9e" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <div className="q1-auth-preview-foot"><span><span className="q1-auth-dot"/> Пример интерфейса Q1</span><Link href="/demo">Посмотреть демо <ArrowRight size={15}/></Link></div>
        </div>
        <div className="q1-auth-benefits"><span><CheckCircle2 size={16}/> Данные без хаоса</span><span><CheckCircle2 size={16}/> Сервис под контролем</span><span><CheckCircle2 size={16}/> Одна платформа</span></div>
      </div>
      <footer className="q1-auth-story-foot"><span>© 2026 MindTech · Q1</span><span>Меньше рутины. Больше сервиса.</span></footer>
    </section>

    <section className="q1-auth-form-side" aria-label="Вход в кабинет">
      <div className="q1-auth-form-wrap">
        <div className="q1-auth-mobile-brand"><Image src="/q1-logo.png" alt="Q1" width={46} height={46}/><strong>Mind<span>Tech</span></strong></div>
        <div className="q1-auth-secure"><ShieldCheck size={16}/> ЗАЩИЩЁННЫЙ КАБИНЕТ <span className="q1-auth-secure-v93">v9.3</span></div>
        <h2>{step === "credentials" ? <>Добро пожаловать <span>в Q1.</span></> : <>Подтвердите <span>вход.</span></>}</h2>
        <p className="q1-auth-welcome">{step === "credentials" ? "Войдите, чтобы управлять своим заведением и видеть всю картину обслуживания." : <>Мы отправили шестизначный код на <strong>{email.trim()}</strong>. Он действует 10 минут.</>}</p>

        {step === "credentials" ? <form className="q1-auth-form" onSubmit={requestCode}>
          <label htmlFor="q1-login-email">Электронная почта</label>
          <div className="q1-auth-field"><input id="q1-login-email" type="email" autoComplete="username" placeholder="name@restaurant.kz" value={email} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} required/></div>
          <div className="q1-auth-password-label"><label htmlFor="q1-login-password">Пароль</label><LockKeyhole size={15}/></div>
          <div className="q1-auth-field q1-auth-field-password"><input id="q1-login-password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Введите пароль" value={password} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} required/><button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={visible}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div>
          {error && <div className="q1-auth-error" role="alert">{error}</div>}
          <button className="q1-auth-login-button" type="submit" disabled={busy}>{busy ? "Отправляем код…" : "Продолжить по email"}<ArrowRight size={19}/></button>
        </form> : <form className="q1-auth-form q1-verify-form" onSubmit={verifyCode}>
          <div className="q1-verify-notice"><span className="q1-verify-mail-icon"><MailCheck size={22}/></span><span><strong>Проверьте входящие</strong><small>Введите код из письма MindTech. Начальные нули сохраняются.</small></span></div>
          <label htmlFor="q1-login-code">Код подтверждения</label>
          <div className="q1-verify-input-wrap"><input id="q1-login-code" className="q1-verify-input" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} autoFocus placeholder="000000" value={code} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} aria-describedby="q1-verify-expiry"/></div>
          <div className="q1-verify-meta" id="q1-verify-expiry"><span><Clock3 size={15}/> {secondsLeft > 0 ? `Код действует ещё ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : "Срок действия кода истёк"}</span><span>Попыток: {Math.max(0, 5 - failedAttempts)}</span></div>
          {error && <div className="q1-auth-error" role="alert">{error}</div>}
          <button className="q1-auth-login-button" type="submit" disabled={busy || !canVerify}>{busy ? "Проверяем…" : "Подтвердить и войти"}<ArrowRight size={19}/></button>
          <div className="q1-verify-actions"><button type="button" className="q1-verify-back" onClick={backToCredentials}><ArrowLeft size={16}/> Изменить email</button><button type="button" className="q1-verify-resend" disabled={busy || resendSeconds > 0} onClick={() => void requestCode()}><RotateCcw size={15}/>{resendSeconds > 0 ? `Новый код через ${resendSeconds} с` : "Отправить новый код"}</button></div>
        </form>}

        <div className="q1-auth-divider"><span>ИЛИ ПОСМОТРИТЕ ВОЗМОЖНОСТИ</span></div>
        <div className="q1-auth-demo-block"><div className="q1-auth-demo-art"><Sparkles size={21}/></div><div><strong>Познакомьтесь с Q1</strong><p>Пример аналитики, графиков и метрик. Без входа и регистрации.</p></div><Link href="/demo" aria-label="Открыть демонстрационную аналитику Q1"><Play size={17} fill="currentColor"/><span>Демо</span><ChevronRight size={16}/></Link></div>
        <div className="q1-auth-safety"><ShieldCheck size={17}/><span>Демо содержит только вымышленные показатели. Реальные данные доступны только после входа.</span></div>
      </div>
      <div className="q1-auth-right-foot">Q1 BY MINDTECH <span>✦</span> MADE FOR HOSPITALITY</div>
    </section>
  </main>;
}
