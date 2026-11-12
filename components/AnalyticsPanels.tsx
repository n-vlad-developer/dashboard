"use client";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CheckCheck,
  CircleHelp,
  Clock3,
  Coffee,
  CreditCard,
  Globe2,
  HeartPulse,
  Hourglass,
  Info,
  LayoutGrid,
  MousePointer2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  formatInt,
  formatNum,
  formatTime,
  formatHours,
  formatDateTime,
  money,
  Rec,
} from "@/lib/client";
import { cleanHallName, cleanTableName, displayRole } from "../lib/q1-display";

function LinePlot({
  series,
  value,
  title,
}: {
  series: Rec[];
  value: (x: Rec) => number | null;
  title?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const data = series.map((x, i) => {
    const v = x.state === "missing" || x.observed === false ? null : value(x);
    return { i, v: v !== null && Number.isFinite(v) ? v : null, x };
  });
  const nums = data
    .map((x) => x.v)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const max = Math.max(1, ...nums) * 1.22;
  const px = (i: number) =>
    data.length < 2 ? 50 : 50 + i * (820 / (data.length - 1));
  const py = (v: number) => 218 - (v / max) * 179;
  const segments: string[] = [];
  let current = "";
  data.forEach((x) => {
    if (x.v === null) {
      if (current) segments.push(current);
      current = "";
    } else
      current += `${current ? " L" : "M"}${px(x.i).toFixed(2)} ${py(x.v).toFixed(2)}`;
  });
  if (current) segments.push(current);
  const indexLabels =
    data.length > 10
      ? data.filter(
          (_, i) =>
            i % Math.max(1, Math.floor(data.length / 7)) === 0 ||
            i === data.length - 1,
        )
      : data;
  return (
    <div className="chart-shell">
      <svg
        viewBox="0 0 920 280"
        role="img"
        aria-label={title || "График"}
        className="line-svg"
        preserveAspectRatio="none"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="50"
              x2="880"
              y1={40 + i * 44.5}
              y2={40 + i * 44.5}
              stroke="#edf0f3"
              strokeDasharray="4 6"
            />
            <text
              x="39"
              y={44 + i * 44.5}
              textAnchor="end"
              fill="#a0a8b5"
              fontSize="12"
            >
              {formatNum((max * (4 - i)) / 4, 0)}
            </text>
          </g>
        ))}
        {data.map((x) =>
          x.v === null ? (
            <rect
              key={x.i}
              x={px(x.i) - 6}
              y="40"
              width="12"
              height="178"
              rx="6"
              fill="#eceef2"
              opacity=".6"
            />
          ) : null,
        )}
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="#6d5efc"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {data.map((x) =>
          x.v !== null ? (
            <g key={x.i}>
              <circle
                cx={px(x.i)}
                cy={py(x.v)}
                r={hover === x.i ? 7 : 4}
                fill="#fff"
                stroke="#7165f9"
                strokeWidth="3"
              />
              <rect
                onMouseEnter={() => setHover(x.i)}
                onMouseLeave={() => setHover(null)}
                x={px(x.i) - 16}
                y="30"
                width="32"
                height="205"
                fill="transparent"
              />
            </g>
          ) : null,
        )}
        {indexLabels.map((x) => (
          <text
            key={`t${x.i}`}
            x={px(x.i)}
            y="252"
            textAnchor="middle"
            fill="#9ba3b0"
            fontSize="12"
          >
            {x.x.date
              ? new Date(`${x.x.date}T00:00:00Z`).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })
              : x.x.start
                ? new Date(x.x.start).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
          </text>
        ))}
      </svg>
      {hover !== null && data[hover] && (
        <div className="chart-tip">
          <b>{data[hover].x.date || data[hover].x.start || "Период"}</b> ·{" "}
          {data[hover].v === null ? "Нет данных" : formatNum(data[hover].v)}
          {data[hover].x.state === "partial" ? " · неполный день" : ""}
        </div>
      )}
      <div className="chart-bottom">
        <span>
          <i className="dot purple" />
          {title || "Показатель"}
        </span>
        <span>
          <i className="dot missing" />
          Нет расчёта
        </span>
        <span>
          <i className="dot partial" />
          Неполный день
        </span>
      </div>
    </div>
  );
}
function BarRow({
  label,
  amount,
  max,
  index,
}: {
  label: string;
  amount: number;
  max: number;
  index: number;
}) {
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <b>{formatInt(amount)}</b>
      </div>
      <div className="bar-track">
        <div
          className={`bar-fill bar-fill-${index % 4}`}
          style={{
            width: `${Math.max(amount > 0 ? 3 : 0, (amount / Math.max(max, 1)) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
export function MetricCard({
  label,
  value,
  icon,
  sub,
  accent = "purple",
  info,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  accent?: string;
  info?: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span className={`metric-icon ${accent}`}>{icon}</span>
        {info && (
          <span title={info} className="metric-info">
            <CircleHelp size={16} />
          </span>
        )}
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-number">{value}</div>
      <div className="metric-sub">{sub || "За выбранный период"}</div>
    </div>
  );
}

function DataFreshness({ report }: { report: Rec | null }) {
  if (!report) return null;
  const state = report.freshness || {},
    missing = (state.missing_days || []) as string[],
    ready = state.ready === true && missing.length === 0;
  return (
    <div className={`freshness ${ready ? "" : "warning"}`} role="status">
      <span className="freshness-dot" />
      <span>
        {ready
          ? "Ночные данные подготовлены"
          : "Данные подготовлены не полностью"}
      </span>
      <span className="freshness-sep" />
      {state.available_days ?? 0} из {state.expected_days ?? 0} дней
      <span className="freshness-sep" />
      {state.message || "Источник: ночные снимки"}
      <div className="freshness-tail">
        Версия {report.calculation_version || "—"}
      </div>
      {!!missing.length && (
        <div className="q1-missing-days">
          Нет расчёта за: {missing.slice(0, 6).join(", ")}
          {missing.length > 6 ? ` и ещё ${missing.length - 6}` : ""}
        </div>
      )}
    </div>
  );
}
function EmptyAnalytics({ report }: { report: Rec | null }) {
  return (
    <div className="panel q1-empty-analytics">
      <span className="eyebrow">АНАЛИТИКА Q1</span>
      <h3>Для этого периода пока нет подготовленных снимков</h3>
      <p>
        {report?.freshness?.message ||
          "Статистика будет доступна после ночного расчёта. Можно заказать пересчёт в разделе «Отчёты»."}
      </p>
      {!!report?.freshness?.missing_days?.length && (
        <small>
          Недостающие дни:{" "}
          {report.freshness.missing_days.slice(0, 10).join(", ")}
        </small>
      )}
    </div>
  );
}
function Stats({ summary }: { summary: Rec }) {
  return (
    <div className="metrics-grid">
      <MetricCard
        label="Всего вызовов"
        value={formatInt(summary.calls_total)}
        icon={<BellRing size={20} />}
        sub="Созданы в выбранный период"
      />
      <MetricCard
        label="Среднее принятие"
        value={formatTime(summary.reaction_avg_seconds)}
        icon={<Clock3 size={20} />}
        accent="mint"
        sub="Только валидные принятия"
      />
      <MetricCard
        label="Принято"
        value={
          summary.arrived_percent == null
            ? "—"
            : `${formatNum(summary.arrived_percent)}%`
        }
        icon={<CheckCheck size={20} />}
        accent="blue"
        sub={`${formatInt(summary.calls_arrived)} вызовов с принятием`}
      />
      <MetricCard
        label="Были просрочены"
        value={formatInt(summary.calls_expired)}
        icon={<AlertTriangle size={20} />}
        accent="peach"
        sub={
          summary.expired_percent == null
            ? "Нет знаменателя"
            : `${formatNum(summary.expired_percent)}% обращений`
        }
        info="Просрочка сохраняется после принятия и закрытия"
      />
    </div>
  );
}
function StaffTable({
  report,
  preview = false,
}: {
  report: Rec;
  preview?: boolean;
}) {
  const staff = (report.staff_activity || report.staff || []) as Rec[];
  const rows = preview ? staff.slice(0, 5) : staff;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Сотрудник / роль</th>
            <th>Обработано</th>
            <th>Медиана / P90</th>
            <th>Рейтинг скорости</th>
            <th>Место в роли</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id ?? `unknown-${i}`}>
              <td>
                <b>{p.name || "Без сотрудника"}</b>
                <small className="table-sub">{displayRole(p.role)}</small>
              </td>
              <td>{formatInt(p.calls_total)}</td>
              <td>
                {formatTime(p.reaction_median_seconds)} /{" "}
                {formatTime(p.reaction_p90_seconds)}
              </td>
              <td>
                {p.rating_score == null ? "—" : `${formatNum(p.rating_score)}%`}
                {p.rating_score == null && (
                  <small className="table-sub">
                    {p.rating_mixed_policy
                      ? "Разные цели — нужен пересчёт"
                      : "Недостаточно событий"}
                  </small>
                )}
              </td>
              <td>{p.rank_in_role == null ? "—" : `№ ${p.rank_in_role}`}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="empty-table">
                Нет данных по сотрудникам
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function DataScope({ report }: { report: Rec }) {
  const filtered = Object.values(report.filters || {}).some(Boolean);
  return (
    <div className="important-note">
      <Info size={18} />
      <span>
        {filtered
          ? "Фильтры применяются к вызовам и связанным сотрудникам. Гости, заказы, жалобы и климат относятся ко всему заведению. "
          : ""}
        Сотрудники оцениваются по скорости реакции, а не по качеству
        обслуживания. Прямое закрытие не приравнивается к принятию, системное
        закрытие не доказывает обслуживание.
      </span>
    </div>
  );
}

export function Overview({
  report,
  onNavigate,
}: {
  report: Rec | null;
  onNavigate: (section: string) => void;
}) {
  if (!report) return <EmptyAnalytics report={null} />;
  return (
    <>
      <DataFreshness report={report} />
      {!report.summary ? (
        <EmptyAnalytics report={report} />
      ) : (
        <>
          <Stats summary={report.summary} />
          <div className="main-charts">
            <div className="panel trend-panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">ДИНАМИКА</span>
                  <h3>Динамика вызовов</h3>
                  <p>Созданные обращения по календарным дням</p>
                </div>
                <span className="panel-icon">
                  <TrendingUp size={21} />
                </span>
              </div>
              <LinePlot
                series={report.series || []}
                value={(x) => x.metrics?.calls_total ?? null}
                title="Вызовы гостей"
              />
            </div>
            <div className="panel distribution-panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">СТРУКТУРА</span>
                  <h3>Причины обращений</h3>
                  <p>Распределение категорий вызовов</p>
                </div>
                <span className="panel-icon">
                  <LayoutGrid size={20} />
                </span>
              </div>
              <div className="category-bars">
                {(report.categories || [])
                  .slice(0, 5)
                  .map((x: Rec, i: number) => (
                    <BarRow
                      key={x.id ?? i}
                      label={x.name || "Неизвестно"}
                      amount={x.calls_total ?? 0}
                      max={Math.max(
                        1,
                        ...(report.categories || []).map(
                          (y: Rec) => y.calls_total || 0,
                        ),
                      )}
                      index={i}
                    />
                  ))}
                {!report.categories?.length && (
                  <div className="empty-mini">Нет данных по категориям</div>
                )}
              </div>
              <button
                className="text-link"
                onClick={() => onNavigate("analytics")}
              >
                Подробная аналитика <ArrowUpRight size={17} />
              </button>
            </div>
          </div>
          <div className="quick-row">
            <div className="insight-card">
              <span className="insight-icon">
                <Users size={22} />
              </span>
              <div>
                <small>Вызовы на час персонала</small>
                <strong>
                  {report.summary.calls_per_staff_hour == null
                    ? "—"
                    : formatNum(report.summary.calls_per_staff_hour, 2)}
                </strong>
                <span>Интенсивность, не показатель качества</span>
              </div>
            </div>
            <div className="insight-card">
              <span className="insight-icon violet">
                <Hourglass size={22} />
              </span>
              <div>
                <small>Рабочее время</small>
                <strong>{formatHours(report.summary.staff_hours)}</strong>
                <span>Пересечения смен одного человека не удваиваются</span>
              </div>
            </div>
            <div className="insight-card">
              <span className="insight-icon orange">
                <CheckCheck size={22} />
              </span>
              <div>
                <small>SLA принятия</small>
                <strong>
                  {report.summary.sla_met_percent == null
                    ? "—"
                    : `${formatNum(report.summary.sla_met_percent)}%`}
                </strong>
                <span>Реакция строго быстрее сохранённого порога</span>
              </div>
            </div>
          </div>
          <div className="bottom-grid">
            <div className="panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">КОМАНДА</span>
                  <h3>Активность сотрудников</h3>
                  <p>Принятия и прямые закрытия по дате обработки</p>
                </div>
                <button
                  className="small-outline"
                  onClick={() => onNavigate("analytics")}
                >
                  Рейтинг <ArrowUpRight size={16} />
                </button>
              </div>
              <StaffTable report={report} preview />
            </div>
            <div className="panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">ГОСТИ</span>
                  <h3>Взаимодействия</h3>
                  <p>По всему заведению, независимо от фильтра вызовов</p>
                </div>
                <span className="panel-icon">
                  <Coffee size={21} />
                </span>
              </div>
              <div className="guest-stat">
                <span className="guest-stat-icon">
                  <Globe2 size={19} />
                </span>
                <span>Гостевые сессии</span>
                <b>{formatInt(report.guest?.sessions)}</b>
              </div>
              <div className="guest-stat">
                <span className="guest-stat-icon">
                  <CreditCard size={19} />
                </span>
                <span>Запросы счёта</span>
                <b>{formatInt(report.guest?.bill_requests)}</b>
              </div>
              <div className="guest-stat">
                <span className="guest-stat-icon">
                  <Coffee size={19} />
                </span>
                <span>Неотменённые заказы</span>
                <b>{formatInt(report.guest?.noncancelled_orders)}</b>
              </div>
              <div className="guest-stat">
                <span className="guest-stat-icon">
                  <HeartPulse size={19} />
                </span>
                <span>Жалобы</span>
                <b>{formatInt(report.complaints?.total)}</b>
              </div>
              <div className="panel-footnote">
                Сессии ≠ уникальные гости. Суммы заказов ≠ фискальная выручка.
              </div>
            </div>
          </div>
        </>
      )}
      <DataScope report={report} />
    </>
  );
}

export function AnalyticsDetail({ report }: { report: Rec | null }) {
  if (!report) return <EmptyAnalytics report={null} />;
  return (
    <div className="analytics-detail">
      <DataFreshness report={report} />
      {!report.summary ? (
        <EmptyAnalytics report={report} />
      ) : (
        <>
          <div className="metrics-grid three">
            <MetricCard
              label="Часы персонала"
              value={formatHours(report.summary.staff_hours)}
              icon={<Users size={20} />}
              accent="mint"
            />
            <MetricCard
              label="Закрыто вручную"
              value={formatInt(report.summary.calls_manual_closed)}
              icon={<CheckCheck size={20} />}
              accent="blue"
              sub="Без автозакрытий"
            />
            <MetricCard
              label="SLA скорости принятия"
              value={
                report.summary.sla_met_percent == null
                  ? "—"
                  : `${formatNum(report.summary.sla_met_percent)}%`
              }
              icon={<Activity size={20} />}
              info="Порог из сохранённых настроек вызовов"
            />
          </div>
          <div className="main-charts">
            <div className="panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">ДИНАМИКА</span>
                  <h3>Обращения гостей</h3>
                  <p>Пропуски данных не соединяем с нулём</p>
                </div>
                <span className="panel-icon">
                  <BarChart3 size={21} />
                </span>
              </div>
              <LinePlot
                series={report.series || []}
                value={(x) => x.metrics?.calls_total ?? null}
                title="Вызовы"
              />
            </div>
            <div className="panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">ГОСТЕВЫЕ ЗАКАЗЫ</span>
                  <h3>Сумма неотменённых</h3>
                  <p>Без автоматического обозначения валюты</p>
                </div>
                <span className="panel-icon">
                  <Wallet size={20} />
                </span>
              </div>
              <LinePlot
                series={report.series || []}
                value={(x) =>
                  x.guest?.noncancelled_amount == null
                    ? null
                    : Number(x.guest.noncancelled_amount)
                }
                title="Сумма гостевых заказов"
              />
            </div>
          </div>
          <div className="panel q1-rating-panel">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">ПЕРСОНАЛ</span>
                <h3>Рейтинг скорости обработки</h3>
                <p>
                  По ролям · низкая выборка без оценки и места · медиана и P90
                </p>
              </div>
            </div>
            <StaffTable report={report} />
          </div>
          <div className="data-grid">
            <div className="panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">ЗАЛЫ</span>
                  <h3>Столы и вызовы</h3>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Стол / зал</th>
                      <th>Вызовы</th>
                      <th>Просрочки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.tables || []).map((x: Rec, i: number) => (
                      <tr key={x.id ?? i}>
                        <td>
                          <b title={String(x.name || "")}>
                            {cleanTableName(x.name)}
                          </b>
                          <small className="table-sub">
                            {cleanHallName(x.hall_name)}
                          </small>
                        </td>
                        <td>{formatInt(x.calls_total)}</td>
                        <td>{formatInt(x.calls_expired)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">ОБСЛУЖИВАНИЕ</span>
                  <h3>Интервалы</h3>
                </div>
              </div>
              <div className="q1-duration-metrics">
                <div>
                  <span>От принятия до закрытия</span>
                  <strong>
                    {formatTime(report.summary.service_avg_seconds)}
                  </strong>
                  <small>Состояние вызова, не реальное время у стола</small>
                </div>
                <div>
                  <span>От создания до закрытия</span>
                  <strong>
                    {formatTime(report.summary.resolution_avg_seconds)}
                  </strong>
                </div>
                <div>
                  <span>Прямые закрытия</span>
                  <strong>{formatInt(report.summary.direct_closed)}</strong>
                </div>
                <div>
                  <span>Автоматические закрытия</span>
                  <strong>{formatInt(report.summary.calls_auto_closed)}</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="analytics-secondary">
            <div className="stat-panel">
              <span>
                <Coffee size={20} /> Гостевые заказы
              </span>
              <strong>{formatInt(report.guest?.noncancelled_orders)}</strong>
              <small>
                Сумма: {money(report.guest?.noncancelled_amount)} (не выручка)
              </small>
            </div>
            <div className="stat-panel">
              <span>
                <Wallet size={20} /> Локальные заказы
              </span>
              <strong>{formatInt(report.orders?.paid_closed_count)}</strong>
              <small>
                Оплаченные закрытые: {money(report.orders?.paid_closed_amount)}
              </small>
            </div>
            <div className="stat-panel">
              <span>
                <HeartPulse size={20} /> Жалобы
              </span>
              <strong>{formatInt(report.complaints?.total)}</strong>
            </div>
            <div className="stat-panel">
              <span>
                <Activity size={20} /> Климат
              </span>
              <strong>
                {report.climate?.temperature?.avg == null
                  ? "—"
                  : `${formatNum(report.climate.temperature.avg)} °C`}
              </strong>
              <small>
                Влажность:{" "}
                {report.climate?.humidity?.avg == null
                  ? "—"
                  : `${formatNum(report.climate.humidity.avg)}%`}
              </small>
            </div>
          </div>
          <div className="panel quality-panel">
            <div>
              <span className="eyebrow">ПРОЗРАЧНОСТЬ ДАННЫХ</span>
              <h3>Контроль достоверности</h3>
            </div>
            <div className="quality-chips">
              <span>
                Некорректные реакции:{" "}
                <b>{formatInt(report.quality?.invalid_reactions)}</b>
              </span>
              <span>
                Незакрытые смены:{" "}
                <b>{formatInt(report.quality?.open_shifts)}</b>
              </span>
              <span>
                Принятия без сотрудника:{" "}
                <b>{formatInt(report.quality?.calls_without_arrival_staff)}</b>
              </span>
              <span>
                Без снимка таймера:{" "}
                <b>{formatInt(report.quality?.missing_timing_snapshot)}</b>
              </span>
              <span>
                Некорректные смены:{" "}
                <b>{formatInt(report.quality?.invalid_shift_intervals)}</b>
              </span>
            </div>
          </div>
        </>
      )}
      <DataScope report={report} />
    </div>
  );
}
