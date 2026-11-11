"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, BarChart3, BellRing, BookOpen, CalendarDays, CheckCircle2, Clock3, LayoutDashboard, ShieldCheck, Sparkles, TrendingUp, UsersRound, Zap } from "lucide-react";

type Period = 7 | 14 | 30;
const SERIES: Record<Period, number[]> = {
  7: [22, 31, 29, 38, 44, 40, 44],
  14: [18, 22, 27, 19, 32, 28, 36, 29, 33, 40, 31, 42, 39, 45],
  30: [19, 21, 17, 25, 30, 27, 33, 24, 29, 35, 32, 28, 37, 40, 34, 39, 43, 38, 45, 41, 36, 49, 44, 51, 46, 43, 55, 49, 53, 58]
};
const TEAM = [
  { name: "Сотрудник А", role: "Официант", count: 67, reaction: "1:12", target: "94%", color: "mint" },
  { name: "Сотрудник Б", role: "Официант", count: 59, reaction: "1:28", target: "91%", color: "purple" },
  { name: "Сотрудник В", role: "Администратор", count: 42, reaction: "1:36", target: "88%", color: "orange" }
];

function ActivityChart({ values }: { values: number[] }) {
  const maximum = Math.max(...values, 1) * 1.15;
  const pairs = values.map((value, index) => [18 + index * 964 / Math.max(values.length - 1, 1), 182 - value / maximum * 143]);
  const line = pairs.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L982,200 L18,200 Z`;
  return <svg className="q1-demo-chart" viewBox="0 0 1000 210" role="img" aria-label="Пример динамики обращений по выбранному периоду"><defs><linearGradient id="q1-demo-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7565f7" stopOpacity=".23"/><stop offset="1" stopColor="#7565f7" stopOpacity="0"/></linearGradient></defs>
    {[40, 90, 140, 190].map(y => <line key={y} x1="18" x2="982" y1={y} y2={y} stroke="#eaeaf4" strokeDasharray="5 8"/>)}
    <path d={area} fill="url(#q1-demo-area)"/><path d={line} fill="none" stroke="#7565f7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    {pairs.filter((_, index) => index % Math.max(1, Math.floor(values.length / 7)) === 0 || index === values.length - 1).map(([x, y], index) => <circle key={index} cx={x} cy={y} r="5.5" fill="#fff" stroke="#7565f7" strokeWidth="3"/>)}
  </svg>;
}

export default function DemoPage() {
  const [period, setPeriod] = useState<Period>(7);
  const series = SERIES[period];
  const total = useMemo(() => series.reduce((sum, value) => sum + value, 0), [series]);
  const accepted = Math.round(total * .927), overdue = Math.round(total * .052), closed = Math.round(total * .91);

  return <div className="q1-demo-shell">
    <aside className="q1-demo-sidebar"><div className="q1-demo-logo"><Image src="/q1-logo.png" alt="Q1" width={49} height={49}/><span><strong>Mind<span>Tech</span></strong><small>DEMO WORKSPACE</small></span></div>
      <div className="q1-demo-sidelabel">ДЕМОНСТРАЦИЯ</div><a className="q1-demo-sideitem active" href="#demo-overview"><LayoutDashboard size={18}/> Обзор аналитики <span className="q1-demo-active-dot"/></a><a className="q1-demo-sideitem" href="#demo-team"><UsersRound size={18}/> Команда</a>
      <div className="q1-demo-sidelabel q1-demo-tools-label">ВОЗМОЖНОСТИ Q1</div><div className="q1-demo-feature"><BellRing size={17}/> Вызовы</div><div className="q1-demo-feature"><BookOpen size={17}/> QR-меню</div><div className="q1-demo-feature"><Activity size={17}/> Отчёты</div>
      <div className="q1-demo-side-bottom"><div><Sparkles size={20}/><strong>Только пример</strong><p>Все цифры и сотрудники на этом экране вымышлены.</p></div><Link href="/"><ArrowLeft size={16}/> Войти в Q1</Link></div>
    </aside>

    <div className="q1-demo-main"><header className="q1-demo-topbar"><span>Q1 Кабинет <b>/</b> <strong>Пример аналитики</strong></span><Link href="/" className="q1-demo-toplink"><ArrowLeft size={16}/> Назад ко входу</Link></header>
      <main className="q1-demo-content" id="demo-overview">
        <div className="q1-demo-banner"><span><Sparkles size={17}/> ДЕМОНСТРАЦИЯ</span><p>Это интерактивный пример интерфейса. Данные не относятся к реальному ресторану и не загружаются с API.</p></div>
        <div className="q1-demo-heading"><div><div className="q1-demo-kicker"><span/> Q1 WORKSPACE <i/> ОБЗОР</div><h1>Пульс вашего <em>ресторана.</em></h1><p>Как выглядит аналитика обслуживания в Q1.</p></div><div className="q1-demo-heading-mark"><TrendingUp size={26}/></div></div>
        <div className="q1-demo-filter"><div><CalendarDays size={19}/><b>Период аналитики</b></div><div className="q1-demo-periods">{([7, 14, 30] as const).map(days => <button key={days} type="button" aria-pressed={period === days} className={period === days ? "active" : ""} onClick={() => setPeriod(days)}>{days} дней</button>)}</div><span className="q1-demo-filter-hint">Синтетические данные</span></div>

        <div className="q1-demo-kpis"><div className="q1-demo-kpi"><span className="q1-demo-kpi-icon purple"><BellRing size={20}/></span><small>Всего обращений</small><strong>{total.toLocaleString("ru-RU")}</strong><span>За выбранный период</span></div>
          <div className="q1-demo-kpi"><span className="q1-demo-kpi-icon green"><Clock3 size={20}/></span><small>Среднее принятие</small><strong>1:24</strong><span>Пример среднего времени</span></div>
          <div className="q1-demo-kpi"><span className="q1-demo-kpi-icon blue"><CheckCircle2 size={20}/></span><small>Принято</small><strong>{accepted}</strong><span>{Math.round(accepted / total * 100)}% обращений</span></div>
          <div className="q1-demo-kpi"><span className="q1-demo-kpi-icon amber"><Zap size={20}/></span><small>Были просрочены</small><strong>{overdue}</strong><span>Просрочка может пересекаться со статусами</span></div></div>

        <div className="q1-demo-panels"><section className="q1-demo-panel q1-demo-trend"><div className="q1-demo-panel-head"><div><span>ДИНАМИКА</span><h2>Активность гостей</h2><p>Созданные обращения по дням</p></div><span className="q1-demo-panel-icon"><BarChart3 size={20}/></span></div><ActivityChart values={series}/><div className="q1-demo-axis"><span>Начало периода</span><span>Конец периода</span></div></section>
          <section className="q1-demo-panel q1-demo-structure"><div className="q1-demo-panel-head"><div><span>ОБРАЩЕНИЯ</span><h2>Состояния вызовов</h2><p>Пример распределения</p></div><span className="q1-demo-panel-icon"><Activity size={20}/></span></div>
            <div className="q1-demo-donut" style={{ background: `conic-gradient(#7968f8 0 ${accepted / total * 100}%, #c8ff9e ${accepted / total * 100}% 100%)` }}><div><strong>{Math.round(accepted / total * 100)}%</strong><small>принято</small></div></div>
            <div className="q1-demo-legend"><span><i className="violet"/> С принятием <b>{accepted}</b></span><span><i className="lime"/> Без принятия <b>{total - accepted}</b></span><span><i className="gray"/> Закрыто* <b>{closed}</b></span></div><p className="q1-demo-legend-note">*Закрытые вызовы могут пересекаться с принятыми.</p>
          </section></div>

        <section className="q1-demo-panel q1-demo-team" id="demo-team"><div className="q1-demo-panel-head"><div><span>КОМАНДА</span><h2>Работа сотрудников</h2><p>Вымышленные данные для примера таблицы</p></div><span className="q1-demo-panel-icon"><UsersRound size={20}/></span></div><div className="q1-demo-table-wrap"><table><thead><tr><th>Сотрудник</th><th>Роль</th><th>Принято / обработано</th><th>Средняя реакция</th><th>В пределах цели</th></tr></thead><tbody>{TEAM.map((person, index) => <tr key={person.name}><td><div className="q1-demo-person"><span className={`q1-demo-avatar ${person.color}`}>{index + 1}</span><b>{person.name}</b></div></td><td>{person.role}</td><td><strong>{person.count}</strong></td><td>{person.reaction}</td><td><span className="q1-demo-target">{person.target}</span></td></tr>)}</tbody></table></div></section>
        <footer className="q1-demo-foot"><p><ShieldCheck size={17}/> Демонстрация не использует реальную учётную запись, JWT или данные заведения.</p><Link href="/">Перейти ко входу <ArrowRight size={16}/></Link></footer>
      </main>
    </div>
  </div>;
}
