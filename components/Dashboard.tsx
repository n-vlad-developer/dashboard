"use client";
import DateField from "./DateField";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCcw,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, prettyError } from "@/lib/client";
import type { Rec } from "@/lib/client";
import AnalyticsFilters, { EMPTY_FILTERS } from "./AnalyticsFilters";
import type { CallFilters } from "./AnalyticsFilters";
import Q1Loader, { useInitialSplash } from "./Q1Loader";
import { Q1ErrorScreen } from "./feedback/Q1ErrorScreen";
import { request } from "@/lib/client";
import Sidebar from "./layout/DashboardSidebar";
import { AnalyticsDetail, Overview } from "./AnalyticsPanels";
import MenuManager from "./MenuManager";
import HistoryPanels from "./HistoryPanels";
import ReportsJobs from "./ReportsJobs";

export type Section =
  "overview" | "analytics" | "menu" | "calls" | "shifts" | "reports" | "jobs";
export type NavItem = {
  key: Section;
  label: string;
  icon: LucideIcon;
  permission?: "analytics" | "menu";
};
const navigation: NavItem[] = [
  {
    key: "overview",
    label: "Обзор",
    icon: LayoutDashboard,
    permission: "analytics",
  },
  {
    key: "analytics",
    label: "Аналитика",
    icon: BarChart3,
    permission: "analytics",
  },
  { key: "menu", label: "Меню и блюда", icon: BookOpen, permission: "menu" },
  {
    key: "calls",
    label: "История вызовов",
    icon: BellRing,
    permission: "analytics",
  },
  {
    key: "shifts",
    label: "Смены и команда",
    icon: UsersRound,
    permission: "analytics",
  },
  {
    key: "reports",
    label: "Отчёты",
    icon: FileBarChart2,
    permission: "analytics",
  },
  { key: "jobs", label: "Фоновые задания", icon: Activity },
];

const titles: Record<Section, { title: string; sub: string }> = {
  overview: {
    title: "Пульс вашего ресторана",
    sub: "Вся работа заведения в одном пространстве",
  },
  analytics: {
    title: "Аналитика обслуживания",
    sub: "Реальные показатели, динамика и прозрачные метрики",
  },
  menu: { title: "Меню и блюда", sub: "Управляйте тем, что видят ваши гости" },
  calls: {
    title: "История вызовов",
    sub: "Все обращения и время реакции сотрудников",
  },
  shifts: {
    title: "Смены и команда",
    sub: "Рабочее время и принятые обращения",
  },
  reports: {
    title: "Отчёты",
    sub: "Рассчитанные дни и пересчёт выбранного периода",
  },
  jobs: {
    title: "Фоновые задания",
    sub: "Переводы, отчёты и состояние обработки",
  },
};

const periods = [
  { days: 7, label: "7 дней" },
  { days: 14, label: "14 дней" },
  { days: 30, label: "30 дней" },
];

/* =========================================
   HELPERS
   ========================================= */

function venueDate(timeZone?: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value || "01";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function daysRange(days: number, timeZone?: string) {
  const end = venueDate(timeZone);
  return { start: shiftDay(end, -days), end };
}

function dateDistance(start: string, end: string) {
  return (
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
    86400000
  );
}

function exportFilename(disposition: string | null, format: string) {
  const encoded = disposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  const plain = disposition?.match(/filename\s*=\s*"?([^";]+)"?/i);
  let filename = `q1-analytics.${format}`;

  try {
    if (encoded) filename = decodeURIComponent(encoded[1]);
    else if (plain) filename = plain[1];
  } catch {
    /* fallback */
  }

  return (
    filename.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/^\.+/, "") ||
    `q1-analytics.${format}`
  );
}

/* =========================================
   VENUE SWITCHER
   ========================================= */

function AnalyticsSkeleton() {
  return (
    <div className="skeleton-wrap">
      <div className="skeleton-cards">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton-card" />
        ))}
      </div>
      <div className="skeleton-panels">
        <div />
        <div />
      </div>
    </div>
  );
}

/* =========================================
   DASHBOARD — API V9.3
   ========================================= */

export default function Dashboard({ demo = false }: { demo?: boolean }) {
  const [me, setMe] = useState<Rec | null>(null),
    [venueId, setVenueId] = useState<number | null>(null),
    [section, setSection] = useState<Section>("overview");
  const [report, setReport] = useState<Rec | null>(null),
    [range, setRange] = useState(() => daysRange(7)),
    [granularity, setGranularity] = useState("day");
  const [loading, setLoading] = useState(true),
    [reportLoading, setReportLoading] = useState(true),
    [error, setError] = useState("");
  const splash = useInitialSplash(loading);
  const [menuOpen, setMenuOpen] = useState(false),
    [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<CallFilters>({ ...EMPTY_FILTERS }),
    [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState("");

  const venues = useMemo(() => (me?.venues || []) as Rec[], [me]);
  const venue = venues.find((item) => Number(item.id) === venueId);
  const perms = venue?.permissions || {};
  const allowed = useMemo(
    () =>
      navigation.filter((item) =>
        item.key === "jobs"
          ? Boolean(perms.analytics || perms.translation)
          : !item.permission || Boolean(perms[item.permission]),
      ),
    [perms.analytics, perms.translation, perms.menu],
  );
  const timeZone =
    typeof venue?.timezone === "string" ? venue.timezone : undefined;
  const currentTitle = titles[section];

  const query = useMemo(() => {
    const params = new URLSearchParams({ ...range, granularity });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [range.start, range.end, granularity, filters]);

  const dayCount = dateDistance(range.start, range.end);
  const validPeriod =
    Number.isInteger(dayCount) &&
    dayCount >= 1 &&
    dayCount <= 365 &&
    range.start >= shiftDay(venueDate(timeZone), -365) &&
    range.end <= shiftDay(venueDate(timeZone), 1);
  const validGranularity = granularity !== "half_hour" || dayCount <= 7;

  useEffect(() => {
    let active = true;
    api<Rec>("me")
      .then((data) => {
        if (!active) return;
        const first = data.venues?.[0];
        setMe(data);
        setVenueId(first?.id == null ? null : Number(first.id));
        setRange(daysRange(7, first?.timezone));
        setLoading(false);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause?.status === 401) {
          void fetch("/api/auth/logout", { method: "POST" }).finally(() =>
            window.location.replace("/"),
          );
          return;
        }
        setError(prettyError(cause));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (venue && !allowed.some((item) => item.key === section))
      setSection(allowed[0]?.key || "menu");
  }, [venue, allowed, section]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!venueId || !perms.analytics || !validPeriod || !validGranularity) {
      setReport(null);
      setReportLoading(false);
      return;
    }

    let active = true;
    setReportLoading(true);
    setError("");

    api<Rec>(`venues/${venueId}/analytics?${query}`)
      .then((data) => {
        if (!active) return;
        if (
          Number(data.schema_version) !== 3 ||
          Number(data.calculation_version) !== 9
        ) {
          throw new Error(
            `Сервер отдаёт аналитику v${data.calculation_version ?? "?"}, требуется v9.`,
          );
        }
        setReport(data);
        setReportLoading(false);
      })
      .catch((cause) => {
        if (active) {
          setReport(null);
          setError(prettyError(cause));
          setReportLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    venueId,
    perms.analytics,
    validPeriod,
    validGranularity,
    query,
    refreshKey,
  ]);

  async function download(format: "xlsx" | "csv" | "json") {
    if (!venueId || !validPeriod || !validGranularity) return;
    setExporting(true);
    setExportError("");

    try {
      const params = new URLSearchParams(query);
      params.set("file_format", format);
      const response = await request(
        `venues/${venueId}/analytics/export?${params}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const raw = await response.text();
        let message = raw;
        try {
          message = JSON.parse(raw)?.detail || raw;
        } catch {
          /* Text error */
        }
        throw new Error(
          response.status === 409
            ? "Экспорт пока недоступен: есть неподготовленные дни. Закажите пересчёт в «Отчётах»."
            : `Экспорт: ${message || response.status}`,
        );
      }

      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = exportFilename(
        response.headers.get("Content-Disposition"),
        format,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (cause) {
      setExportError(prettyError(cause));
    } finally {
      setExporting(false);
    }
  }

  function navigate(value: Section) {
    setSection(value);
    setMenuOpen(false);
  }
  function chooseVenue(id: number) {
    const target = venues.find((item) => Number(item.id) === id);
    if (!target) return;
    setVenueId(id);
    setRange(
      daysRange(
        7,
        typeof target.timezone === "string" ? target.timezone : undefined,
      ),
    );
    setGranularity("day");
    setFilters({ ...EMPTY_FILTERS });
    setReport(null);
    setReportLoading(true);
    setMenuOpen(false);
  }
  function setDays(days: number) {
    setRange(daysRange(days, timeZone));
    setGranularity("day");
  }
  async function logout() {
    if (demo) {
      window.location.assign("/");
      return;
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.replace("/");
    }
  }

  const content = !me ? (
    loading ? null : (
      <Q1ErrorScreen
        code="!"
        title="Не удалось загрузить профиль"
        description={error}
        onRetry={() => window.location.reload()}
      />
    )
  ) : (
    <div className="dashboard-shell q1-shell">
      <Sidebar
        me={me}
        venues={venues}
        venueId={venueId}
        allowed={allowed}
        current={section}
        open={menuOpen}
        chooseVenue={chooseVenue}
        navigate={navigate}
        logout={logout}
        close={() => setMenuOpen(false)}
      />
      {menuOpen && (
        <button
          type="button"
          className="mobile-scrim q1-mobile-scrim"
          aria-label="Закрыть меню"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="dashboard-main">
        <header className="topbar q1-topbar q1-topbar-clean">
          <div className="topbar-left q1-topbar-heading">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Открыть меню"
              aria-expanded={menuOpen}
              aria-controls="q1-sidebar"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <nav className="q1-breadcrumb" aria-label="Текущий раздел">
              <span className="q1-breadcrumb-home">Q1 Кабинет</span>
              <span className="q1-breadcrumb-divider">/</span>
              <strong className="q1-breadcrumb-current" key={section}>
                {navigation.find((item) => item.key === section)?.label}
              </strong>
            </nav>
          </div>
        </header>

        <div className="main-body page-enter" key={section}>
          <div className="page-top">
            <div>
              <div className="page-kicker">
                <span className="page-kicker-dot" /> Q1 WORKSPACE{" "}
                <span className="page-kicker-line" />{" "}
                {venue?.name || "Заведение"}
              </div>
              <h1>{currentTitle.title}</h1>
              <p>{currentTitle.sub}</p>
            </div>
            <div className="page-top-actions">
              {(section === "overview" || section === "analytics") && (
                <button
                  type="button"
                  className="icon-outline"
                  title="Обновить данные"
                  onClick={() => setRefreshKey((value) => value + 1)}
                >
                  <RefreshCcw size={18} />
                </button>
              )}
              {section === "overview" &&
                allowed.some((item) => item.key === "analytics") && (
                  <button
                    type="button"
                    className="primary-btn action-btn"
                    onClick={() => navigate("analytics")}
                  >
                    Вся аналитика <ArrowUpRight size={18} />
                  </button>
                )}
            </div>
          </div>

          {demo && (
            <div className="demo-strip">
              <Sparkles size={15} /> Демо-режим · Синтетические данные.
              Изменения сохраняются в этой вкладке.
            </div>
          )}

          {(section === "overview" || section === "analytics") && (
            <div className="filter-toolbar">
              <div className="filter-caption">
                <CalendarDays size={18} />
                <b>Период анализа</b>
              </div>
              <div className="period-pills">
                {periods.map((option) => {
                  const p = daysRange(option.days, timeZone);
                  return (
                    <button
                      type="button"
                      key={option.days}
                      className={
                        p.start === range.start && p.end === range.end
                          ? "selected"
                          : ""
                      }
                      onClick={() => setDays(option.days)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="date-ranges">
                <DateField
                  aria-label="Начало периода"
                  value={range.start}
                  onChange={(event) =>
                    event.target.value &&
                    setRange((old) => ({ ...old, start: event.target.value }))
                  }
                />
                <span>—</span>
                <DateField
                  aria-label="Конец периода (исключительно)"
                  value={range.end}
                  onChange={(event) =>
                    event.target.value &&
                    setRange((old) => ({ ...old, end: event.target.value }))
                  }
                />
              </div>
              {section === "analytics" && (
                <select
                  className="grain-select"
                  aria-label="Детализация"
                  value={granularity}
                  onChange={(event) => setGranularity(event.target.value)}
                >
                  <option value="day">По дням</option>
                  <option value="half_hour" disabled={dayCount > 7}>
                    По полчаса
                  </option>
                </select>
              )}
            </div>
          )}

          {(section === "overview" || section === "analytics") &&
            !validPeriod && (
              <div className="alert alert-warning">
                Период: 1–365 дней, не раньше чем 365 дней назад. Конец — не
                позже завтрашнего дня по времени заведения.
              </div>
            )}
          {(section === "overview" || section === "analytics") &&
            !validGranularity && (
              <div className="alert alert-warning">
                Для получасовой детализации выберите максимум 7 дней.
              </div>
            )}

          {section === "analytics" && (
            <AnalyticsFilters
              venueId={venueId}
              filters={filters}
              onChange={setFilters}
              onExport={download}
              exporting={exporting}
              refreshKey={refreshKey}
            />
          )}
          {exportError && (
            <div className="alert alert-error" role="alert">
              {exportError}
              <button
                type="button"
                onClick={() => setExportError("")}
                aria-label="Закрыть ошибку"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="alert alert-error error-space">
              {error}
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Закрыть сообщение"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {section === "overview" &&
            (reportLoading ? (
              <AnalyticsSkeleton />
            ) : (
              <Overview
                report={report}
                onNavigate={(value) => navigate(value as Section)}
              />
            ))}
          {section === "analytics" &&
            (reportLoading ? (
              <AnalyticsSkeleton />
            ) : (
              <AnalyticsDetail report={report} />
            ))}
          {section === "menu" && (
            <MenuManager
              venueId={venueId}
              permissions={perms}
              refreshKey={refreshKey}
            />
          )}
          {(section === "calls" || section === "shifts") && (
            <HistoryPanels
              key={`${section}-${venueId}`}
              section={section}
              venueId={venueId}
              refreshKey={refreshKey}
              timeZone={timeZone}
            />
          )}
          {(section === "reports" || section === "jobs") && (
            <ReportsJobs
              key={`${section}-${venueId}`}
              section={section}
              venueId={venueId}
              refreshKey={refreshKey}
              timeZone={timeZone}
            />
          )}
        </div>

        <footer className="app-footer">
          <span>Q1 by MindTech · © 2026</span>
          <span>Все возможности в одном QR</span>
        </footer>
      </main>
    </div>
  );
  return (
    <>
      {splash.visible && (
        <Q1Loader leaving={splash.leaving} playing={splash.playing} />
      )}
      <div inert={splash.visible} aria-hidden={splash.visible || undefined}>
        {content}
      </div>
    </>
  );
}
