
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CalendarDays, CheckCheck, ChevronLeft, ChevronRight, CircleAlert, Clock3, Info, RefreshCcw, RotateCcw, UsersRound, X } from "lucide-react";
import { api, formatInt, formatTime, prettyError } from "@/lib/client";
import type { Paginated, Rec } from "@/lib/client";
import { displayDateTime, displayDay, displayRole, jobKinds, jobPhases, jobStatuses, percent } from "@/lib/q1-display";

type Section = "reports" | "jobs";
type Props = { section: Section; venueId: number | null; refreshKey: number; timeZone?: string };

const isReportJob = (job: Rec) => /report|recalc|analytics|rebuild/i.test(String(job.kind ?? ""));
const daysBetween = (start: string, end: string) => (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? formatInt(value) : "—";
const statusClass = (status: string) => status === "failed" ? "off" : status === "running" ? "progress" : status === "queued" ? "pending" : "on";

function venueToday(timeZone?: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const pick = (type: string) => parts.find(part => part.type === type)?.value ?? "01";
    return `${pick("year")}-${pick("month")}-${pick("day")}`;
  } catch { return new Date().toISOString().slice(0, 10); }
}

function shiftDay(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="q1-detail-pair"><dt>{label}</dt><dd>{value ?? "—"}</dd></div>;
}

/* =========================================
   REPORT DETAILS
   ========================================= */

function ReportDetails({ report, timeZone }: { report: Rec; timeZone?: string }) {
  const data: Rec = report.data && typeof report.data === "object" && !Array.isArray(report.data) ? report.data : {};
  const metrics: Rec = data.summary && typeof data.summary === "object" ? data.summary : data.metrics && typeof data.metrics === "object" ? data.metrics : {};
  const employees: Rec[] = Array.isArray(data.work) ? data.work : [];
  const labels: Record<string, string> = { summary: "Сводка", metrics: "Метрики", work: "Персонал", staff: "Сотрудники", calls: "Вызовы", guest: "Гостевые действия", orders: "Заказы", complaints: "Жалобы", climate: "Климат", quality: "Качество данных", tables: "Столы", categories: "Категории", sources: "Источники", series: "Динамика" };

  return <>
    <div className="q1-detail-hero"><span className="q1-detail-state on"><CheckCheck size={14}/> Расчёт готов</span><strong>{displayDay(report.day)}</strong><span>Снимок аналитики версии {report.version ?? "—"}</span></div>

    <section className="q1-detail-section"><h3>Информация об отчёте</h3><dl className="q1-detail-grid">
      <Pair label="Отчёт" value={`#${report.id}`}/><Pair label="Вызовы за день" value={number(report.calls_total ?? metrics.calls_total)}/>
      <Pair label="Подготовлен" value={displayDateTime(report.calculated_at, timeZone)}/><Pair label="Версия расчётов" value={`v${report.version ?? "—"}`}/>
    </dl></section>

    {(metrics.calls_arrived != null || metrics.calls_closed != null || metrics.calls_expired != null) && <section className="q1-detail-section"><h3>Вызовы и реакции</h3><div className="q1-detail-stats">
      <div><span>Принято</span><b>{number(metrics.calls_arrived)}</b></div><div><span>Закрыто</span><b>{number(metrics.calls_closed)}</b></div>
      <div><span>Были просрочены</span><b>{number(metrics.calls_expired)}</b></div><div><span>Среднее принятие</span><b>{formatTime(metrics.reaction_avg_seconds)}</b></div>
    </div></section>}

    {employees.length > 0 && <section className="q1-detail-section"><h3>Сотрудники в снимке <span className="q1-section-count">{employees.length}</span></h3><div className="q1-report-people">
      {employees.map((person, i) => <div key={person.id ?? i}><span className="q1-person-avatar"><UsersRound size={17}/></span><div><b>{person.name || `Сотрудник #${person.id ?? i + 1}`}</b><small>{displayRole(person.role)}</small></div><span className="q1-person-side">{Array.isArray(person.slots) ? `${person.slots.length} врем. интервалов` : ""}</span></div>)}
    </div><p className="q1-detail-footnote">Временные интервалы не приравниваются автоматически к вызовам или часам.</p></section>}

    {Object.keys(data).length > 0 && <section className="q1-detail-section"><h3>Разделы сохранённого отчёта</h3><div className="q1-report-sections">
      {Object.entries(data).filter(([key]) => key !== "work").map(([key, value]) => <div key={key}><span>{labels[key] || key.replaceAll("_", " ")}</span><b>{Array.isArray(value) ? `${value.length} записей` : value && typeof value === "object" ? "Подготовлено" : typeof value === "number" ? formatInt(value) : value == null ? "—" : "Есть данные"}</b></div>)}
    </div></section>}

    <p className="q1-detail-footnote">Это ночной снимок, а не онлайн-статистика. Динамика и экспорт доступны в разделе «Аналитика».</p>
  </>;
}

/* =========================================
   JOB DETAILS
   ========================================= */

function JobDetails({ job, retry, busy, timeZone }: { job: Rec; retry: (job: Rec) => void; busy: boolean; timeZone?: string }) {
  const params: Rec = job.params && typeof job.params === "object" ? job.params : {};
  const progress = percent(job.progress_percent ?? (job.total ? Number(job.processed || 0) / Number(job.total) * 100 : 0));

  return <>
    <div className="q1-detail-hero"><span className={`q1-detail-state ${statusClass(job.status)}`}>{jobStatuses[job.status] || job.status || "—"}</span><strong>{jobKinds[job.kind] || "Задание"} #{job.id}</strong><span>{job.system_job ? "Системное задание" : "Задание кабинета"}</span></div>

    <section className="q1-detail-section"><h3>Ход выполнения</h3><div className="q1-job-progress-card"><div><b>{jobPhases[job.phase] || job.phase || "Ожидание"}</b><strong>{Math.round(progress)}%</strong></div><div className="q1-human-progress"><span style={{ width: `${progress}%` }}/></div><small>{number(job.processed)} из {number(job.total)} подготовленных дней</small></div>
      {job.status === "queued" && <div className="q1-inline-note"><Clock3 size={17}/> Задание ждёт ночного окна. Отсутствие прогресса пока нормально.</div>}
      {job.stalled && <div className="q1-inline-warning">После назначенного времени долго нет прогресса. Это ещё не означает остановку worker.</div>}
      {job.error && <div className="q1-inline-warning"><CircleAlert size={17}/>{String(job.error)}</div>}
    </section>

    <section className="q1-detail-section"><h3>Расписание и состояние</h3><dl className="q1-detail-grid">
      <Pair label="Запланировано" value={displayDateTime(job.scheduled_for, timeZone)}/><Pair label="Создано" value={displayDateTime(job.created_at, timeZone)}/>
      <Pair label="Обновлено" value={displayDateTime(job.updated_at, timeZone)}/><Pair label="Этап" value={jobPhases[job.phase] || job.phase || "—"}/>
      <Pair label="Тип" value={jobKinds[job.kind] || job.kind || "—"}/><Pair label="Задание" value={`#${job.id}`}/>
    </dl></section>

    {(params.start || params.end) && <section className="q1-detail-section"><h3>Диапазон пересчёта</h3><dl className="q1-detail-grid"><Pair label="Начало (включительно)" value={displayDay(params.start)}/><Pair label="Конец (включительно)" value={displayDay(params.end)}/></dl></section>}

    {job.status === "failed" && isReportJob(job) && <button className="primary-btn q1-retry-job" disabled={busy} onClick={() => retry(job)}><RotateCcw size={17}/>{busy ? "Создаём повтор…" : "Повторить пересчёт"}</button>}
    <p className="q1-detail-footnote">100% подготовленных дней ещё не означает завершение смен и периодов. Ожидайте статус «Завершено».</p>
  </>;
}

/* =========================================
   DRAWER — FIXED POSITION VIA PORTAL
   ========================================= */

function DetailDrawer({ title, label, onClose, children }: { title: string; label: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="drawer-mask q1-human-mask" style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", justifyContent: "flex-end", alignItems: "stretch", height: "100dvh", overflow: "hidden", background: "rgba(14,17,35,.52)" }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="edit-drawer q1-human-drawer" role="dialog" aria-modal="true" aria-label={title} style={{ position: "relative", inset: "auto", display: "flex", flexDirection: "column", width: "min(620px,100vw)", height: "100dvh", maxHeight: "100dvh", minHeight: 0, margin: 0, overflow: "hidden", borderRadius: "20px 0 0 20px" }}>
        <div className="drawer-header" style={{ flexShrink: 0 }}><div><span className="eyebrow">{label}</span><h2>{title}</h2></div><button type="button" className="icon-outline" onClick={onClose} aria-label="Закрыть"><X size={20}/></button></div>
        <div className="drawer-body" style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>{children}</div>
      </aside>
    </div>, document.body
  );
}

/* =========================================
   MAIN COMPONENT
   ========================================= */

export default function ReportsJobs({ section, venueId, refreshKey, timeZone }: Props) {
  const [start, setStart] = useState(() => shiftDay(venueToday(timeZone), -7)), [end, setEnd] = useState(() => shiftDay(venueToday(timeZone), -1));
  const [rows, setRows] = useState<Rec[]>([]), [count, setCount] = useState(0), [page, setPage] = useState(1), [loadedPage, setLoadedPage] = useState("");
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Rec | null>(null), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState("");
  const [health, setHealth] = useState<Rec | null>(null), [reloadIndex, setReloadIndex] = useState(0), detailRequest = useRef(0);
  const pageKey = `${venueId}/${section}/${page}`, hasRows = loadedPage === pageKey;

  const load = useCallback(async (signal: AbortSignal) => {
    if (!venueId) return;
    try {
      const response = await api<Paginated>(`venues/${venueId}/${section}?page=${page}`, { signal });
      if (signal.aborted) return;
      setRows(response.results || []); setCount(response.count || 0); setLoadedPage(pageKey); setError("");
    } catch (e) { if (!signal.aborted) setError(prettyError(e)); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [venueId, section, page, pageKey]);

  useEffect(() => { const controller = new AbortController(); setLoading(true); void load(controller.signal); return () => controller.abort(); }, [load, refreshKey, reloadIndex]);
  useEffect(() => { setPage(1); setSelected(null); }, [section, venueId]);
  useEffect(() => { if (!venueId) return; let active = true; api<Rec>(`venues/${venueId}/analytics/health`).then(x => { if (active) setHealth(x); }).catch(() => { if (active) setHealth(null); }); return () => { active = false; }; }, [venueId, refreshKey, reloadIndex]);
  useEffect(() => { if (section !== "jobs" || !rows.some(job => job.status === "running")) return; const id = window.setInterval(() => { if (document.visibilityState === "visible") setReloadIndex(x => x + 1); }, 5000); return () => clearInterval(id); }, [section, rows]);
  useEffect(() => { if (!selected) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); }; window.addEventListener("keydown", handleKey); return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", handleKey); }; }, [selected?.id]);

  async function open(row: Rec) {
    if (!venueId) return;
    const id = ++detailRequest.current; setSelected(row); setDetailLoading(true); setDetailError("");
    try { const full = await api<Rec>(`venues/${venueId}/${section}/${row.id}`); if (id === detailRequest.current) setSelected(full); }
    catch (e) { if (id === detailRequest.current) setDetailError(`Подробности не полностью загружены: ${prettyError(e)}`); }
    finally { if (id === detailRequest.current) setDetailLoading(false); }
  }

  function close() { ++detailRequest.current; setSelected(null); setDetailError(""); setDetailLoading(false); }

  async function recalc() {
    if (!venueId) return;
    const days = daysBetween(start, end);
    if (!Number.isInteger(days) || days < 1 || days > 366 || end > venueToday(timeZone)) { setError("Диапазон — от 1 до 366 дней. Обе даты включаются, будущие дни недоступны."); return; }
    setBusy(true); setError(""); setNotice("");
    try { const job = await api<Rec>(`venues/${venueId}/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start, end }) }); setNotice(`Пересчёт #${job.id} поставлен в очередь. ${job.scheduled_for ? `Плановый запуск: ${displayDateTime(job.scheduled_for, timeZone)}.` : "Выполнение в ночное окно."}`); setReloadIndex(x => x + 1); }
    catch (e) { setError(prettyError(e)); }
    finally { setBusy(false); }
  }

  async function retry(job: Rec) {
    if (!venueId || job.status !== "failed" || !isReportJob(job)) return;
    setBusy(true); setDetailError("");
    try { const fresh = await api<Rec>(`venues/${venueId}/jobs/${job.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); setNotice(`Создан пересчёт #${fresh.id}; запуск по расписанию.`); close(); setReloadIndex(x => x + 1); }
    catch (e) { setDetailError(prettyError(e)); }
    finally { setBusy(false); }
  }

  return <div className="reports-section q1-human-reports">
    {section === "reports" && <div className="panel recalc-panel q1-recalc-card"><div className="recalc-head"><div className="recalc-icon"><CalendarDays size={24}/></div><div><span className="eyebrow">АНАЛИТИКА V9</span><h3>Подготовить статистику за период</h3><p>Расчёт запускается ночью. Обе выбранные даты включаются.</p></div></div><div className="recalc-form">
      <label>С даты<input type="date" value={start} onChange={e => setStart(e.target.value)}/></label><label>По дату<input type="date" value={end} onChange={e => setEnd(e.target.value)}/></label>
      <button type="button" className="primary-btn" disabled={busy || process.env.NEXT_PUBLIC_DEMO_MODE === "true"} onClick={() => void recalc()}><RefreshCcw size={17}/>{busy ? "Создаём…" : "Запланировать"}</button>
    </div></div>}

    {health && <div className="q1-night-health panel"><Clock3 size={19}/><div><b>Ночные снимки аналитики</b><span>{typeof health.message === "string" ? health.message : "Текущая очередь в отчётах не отображается."}</span></div><span className="q1-night-badge">API v9</span></div>}
    {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Закрыть"><X size={16}/></button></div>}
    {error && <div className="alert alert-error" role="alert">{error}</div>}

    <div className="panel q1-list-panel"><div className="menu-table-header"><div><span className="eyebrow">{section === "reports" ? "СНИМКИ ДАННЫХ" : "ОБРАБОТКА"}</span><h3>{section === "reports" ? "Суточные отчёты" : "Фоновые задания"}</h3><p>{hasRows ? `${formatInt(count)} записей` : "Загружаем данные…"}</p></div><button type="button" className="small-outline" disabled={loading} onClick={() => setReloadIndex(x => x + 1)}><RefreshCcw size={16}/> Обновить</button></div>
      <div className="table-scroll"><table className="q1-human-table"><thead>{section === "reports" ? <tr><th>Дата</th><th>Вызовы</th><th>Версия</th><th>Подготовлен</th><th></th></tr> : <tr><th>Задание</th><th>Статус</th><th>Этап и прогресс</th><th>Запланировано</th><th></th></tr>}</thead><tbody>
        {!hasRows && !error ? Array.from({ length: 5 }, (_, i) => <tr key={i} className="q1-skeleton-table-row"><td colSpan={5}><span/></td></tr>) : hasRows && rows.map(row => section === "reports"
          ? <tr key={row.id} className="q1-openable-row" onClick={() => void open(row)}><td><b>{displayDay(row.day)}</b><small className="table-sub">Отчёт #{row.id}</small></td><td>{number(row.calls_total)}</td><td><span className="q1-version-tag">v{row.version ?? "—"}</span></td><td>{displayDateTime(row.calculated_at, timeZone)}</td><td><button type="button" className="row-action" title="Открыть отчёт" onClick={e => { e.stopPropagation(); void open(row); }}><ArrowRight size={17}/></button></td></tr>
          : <tr key={row.id} className="q1-openable-row" onClick={() => void open(row)}><td><b>{jobKinds[row.kind] || "Задание"} #{row.id}</b>{row.system_job && <small className="table-sub">Системное</small>}</td><td><span className={`status-pill ${statusClass(row.status)}`}><i/>{jobStatuses[row.status] || row.status || "—"}</span>{row.stalled && <small className="table-sub q1-warn-text">Нет прогресса после срока</small>}</td><td><div className="q1-progress-cell"><div className="q1-human-progress"><span style={{ width: `${percent(row.progress_percent ?? (row.total ? Number(row.processed || 0) / Number(row.total) * 100 : 0))}%` }}/></div><small>{jobPhases[row.phase] || row.phase || "Ожидание"} · {row.processed ?? 0} / {row.total ?? "—"}</small></div></td><td>{displayDateTime(row.scheduled_for, timeZone)}</td><td><button type="button" className="row-action" title="Открыть задание" onClick={e => { e.stopPropagation(); void open(row); }}><ArrowRight size={17}/></button></td></tr>)}
        {hasRows && rows.length === 0 && <tr><td colSpan={5} className="empty-table">Пока нет записей</td></tr>}
      </tbody></table></div><div className="pagination"><span>Страница {page} · {hasRows ? `${rows.length} из ${count}` : "Загрузка…"}</span><div><button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}><ChevronLeft size={18}/></button><button type="button" disabled={page * 50 >= count || loading} onClick={() => setPage(p => p + 1)}><ChevronRight size={18}/></button></div></div></div>

    <div className="important-note"><Info size={18}/><span>{section === "jobs" ? "Ожидание ночного запуска — нормальное состояние. 100% обработки не означает завершение до статуса «Завершено»." : "Отчёт показывает завершённый календарный день и состояние на момент ночного расчёта."}</span></div>

    {selected && <DetailDrawer title={`${section === "reports" ? "Отчёт" : "Задание"} #${selected.id}`} label={section === "reports" ? "СУТОЧНЫЙ ОТЧЁТ" : "ФОНОВОЕ ЗАДАНИЕ"} onClose={close}>
      {detailLoading && <div className="q1-drawer-updating"><Clock3 size={15}/> Загружаем сведения…</div>}
      {detailError && <div className="q1-inline-warning">{detailError}</div>}
      {section === "reports" ? <ReportDetails report={selected} timeZone={timeZone}/> : <JobDetails job={selected} retry={job => void retry(job)} busy={busy} timeZone={timeZone}/>}
    </DetailDrawer>}
  </div>;
}
