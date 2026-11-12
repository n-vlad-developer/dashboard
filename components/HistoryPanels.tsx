"use client";
import ResponsiveTable from "./ResponsiveTable";
import DateField from "./DateField";
import { createPortal } from "react-dom";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Info,
  RefreshCcw,
  Search,
  Users2,
  X,
} from "lucide-react";
import { api, formatInt, formatTime, prettyError } from "@/lib/client";
import type { Paginated, Rec } from "@/lib/client";
import {
  callStatuses,
  displayClosedSource,
  displayDateTime,
  displayPerson,
  displayRole,
  safeValue,
} from "../lib/q1-display";

type Props = {
  section: "calls" | "shifts";
  venueId: number | null;
  refreshKey: number;
  timeZone?: string;
};
type Filters = {
  status: string;
  staff_id: string;
  start: string;
  end: string;
  hall_id: string;
  table_id: string;
  category_id: string;
  source: string;
  expired: string;
};
const EMPTY: Filters = {
  status: "",
  staff_id: "",
  start: "",
  end: "",
  hall_id: "",
  table_id: "",
  category_id: "",
  source: "",
  expired: "",
};
const optionsFrom = (raw: unknown): { id: string; label: string }[] => {
  const records = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Rec).results)
      ? (raw as Rec).results
      : [];
  return records
    .map((x: unknown) => {
      if (typeof x === "string" || typeof x === "number")
        return { id: String(x), label: String(x) };
      const rec = x as Rec,
        id = rec.id ?? rec.value ?? rec.pk ?? rec.source;
      return {
        id: String(id ?? ""),
        label: String(
          rec.name ?? rec.full_name ?? rec.label ?? rec.title ?? id ?? "",
        ),
      };
    })
    .filter((x: { id: string; label: string }) => !!x.id);
};
function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="q1-detail-pair">
      <dt>{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="q1-detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
function formatCount(value: unknown) {
  return typeof value === "number" ? formatInt(value) : "—";
}
function statusClass(status: string) {
  return status === "expired"
    ? "off"
    : status === "arrived"
      ? "progress"
      : status === "created"
        ? "pending"
        : "on";
}

function CallDetails({ row, timeZone }: { row: Rec; timeZone?: string }) {
  const timeline = [
    { label: "Создан", date: row.created_at },
    { label: "Просрочен", date: row.expired_at },
    { label: "Принят", date: row.accepted_at },
    { label: "Закрыт", date: row.closed_at },
  ]
    .filter((x) => x.date)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const roster = Array.isArray(row.staff_at_creation)
    ? row.staff_at_creation
    : Array.isArray(row.roster_snapshot)
      ? row.roster_snapshot
      : [];
  const timing =
    row.timing && typeof row.timing === "object" ? (row.timing as Rec) : {};
  return (
    <>
      <div className="q1-detail-hero">
        <span className={`q1-detail-state ${statusClass(row.status)}`}>
          {callStatuses[row.status] || row.status || "Статус не указан"}
        </span>
        <strong>Вызов #{row.id}</strong>
        <span>Информация о конкретном обращении гостя</span>
      </div>
      {row.was_expired && (
        <div className="q1-inline-warning">
          Вызов был просрочен. Принятие или закрытие не удаляет этот факт.
        </div>
      )}
      <Section title="Обращение">
        <dl className="q1-detail-grid">
          <Pair
            label="Стол"
            value={row.table_id != null ? `Стол #${row.table_id}` : "Не указан"}
          />
          <Pair
            label="Категория"
            value={
              row.category_id != null
                ? `Категория #${row.category_id}`
                : "Не указана"
            }
          />
          <Pair label="Принял" value={displayPerson(row.accepted_by)} />
          <Pair label="Закрыл" value={displayPerson(row.closed_by)} />
          <Pair
            label="Смена"
            value={row.shift_id != null ? `#${row.shift_id}` : "Не привязана"}
          />
          <Pair
            label="Просрочка"
            value={row.was_expired ? "Была" : "Не зафиксирована"}
          />
        </dl>
      </Section>
      <Section title="Хронология">
        <ol className="q1-timeline">
          {timeline.map((event, i) => (
            <li key={`${event.label}-${i}`}>
              <span className="q1-timeline-dot" />
              <div>
                <b>{event.label}</b>
                <small>{displayDateTime(event.date, timeZone)}</small>
              </div>
            </li>
          ))}
          {!timeline.length && <li>Временные отметки недоступны</li>}
        </ol>
      </Section>
      {roster.length > 0 && (
        <Section title="Сотрудники в момент создания">
          <div className="q1-people-list">
            {roster.map((person: unknown, i: number) => (
              <div key={i}>
                <Users2 size={16} />
                <span>
                  {displayPerson(person)}
                  {typeof person === "object" && person && (person as Rec).role
                    ? ` · ${displayRole((person as Rec).role)}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {Object.keys(timing).length > 0 && (
        <Section title="Сохранённые правила обработки">
          <dl className="q1-detail-grid">
            {(
              [
                ["expire_minutes", "Порог просрочки, мин"],
                ["call_expire_minutes", "Порог просрочки, мин"],
                ["auto_close_minutes", "Автозакрытие, мин"],
                ["call_auto_close_minutes", "Автозакрытие, мин"],
                ["mode", "Режим"],
              ] as const
            )
              .filter(([key]) => timing[key] != null)
              .map(([key, label]) => (
                <Pair key={key} label={label} value={safeValue(timing[key])} />
              ))}
          </dl>
        </Section>
      )}
      {row.history_complete === false && (
        <div className="q1-inline-warning">
          Старая запись: полного снимка смены и настроек нет. Отсутствующие
          данные не восстанавливаем задним числом.
        </div>
      )}
      <p className="q1-detail-footnote">
        Принятие — зафиксированное действие сотрудника, не подтверждение
        физического подхода к столу. Автозакрытие не доказывает обслуживание.
      </p>
    </>
  );
}

function ShiftDetails({ row, timeZone }: { row: Rec; timeZone?: string }) {
  return (
    <>
      <div className="q1-detail-hero">
        <span className={`q1-detail-state ${row.closed_at ? "on" : "pending"}`}>
          {row.closed_at ? "Завершена" : "Открыта"}
        </span>
        <strong>Смена #{row.id}</strong>
        <span>{row.staff_name || displayPerson(row.staff_id)}</span>
      </div>
      <Section title="Время смены">
        <dl className="q1-detail-grid">
          <Pair
            label="Начало"
            value={displayDateTime(row.opened_at, timeZone)}
          />
          <Pair
            label="Завершение"
            value={displayDateTime(row.closed_at, timeZone)}
          />
          <Pair label="Всего часов" value={formatTime(row.work_seconds)} />
          <Pair
            label="В выбранном периоде"
            value={formatTime(row.period_work_seconds)}
          />
          <Pair
            label="Способ закрытия"
            value={displayClosedSource(row.closed_source)}
          />
        </dl>
      </Section>
      <Section title="Работа с обращениями">
        <div className="q1-detail-stats">
          <div>
            <span>Принято вызовов</span>
            <b>{formatCount(row.accepted_calls)}</b>
          </div>
          <div>
            <span>Закрыто вызовов</span>
            <b>{formatCount(row.closed_calls)}</b>
          </div>
          <div>
            <span>Принято просроченных</span>
            <b>{formatCount(row.accepted_expired_calls)}</b>
          </div>
          <div>
            <span>Среднее принятие</span>
            <b>{formatTime(row.acceptance_avg_seconds)}</b>
          </div>
        </div>
      </Section>
      <Section title="Скорость реакции">
        <dl className="q1-detail-grid">
          <Pair
            label="Медиана"
            value={formatTime(row.acceptance_median_seconds)}
          />
          <Pair label="P90" value={formatTime(row.acceptance_p90_seconds)} />
          <Pair
            label="Принятий на час"
            value={
              typeof row.accepted_per_hour === "number"
                ? row.accepted_per_hour.toLocaleString("ru-RU", {
                    maximumFractionDigits: 2,
                  })
                : "—"
            }
          />
        </dl>
      </Section>
      <p className="q1-detail-footnote">
        Данные смены включают всю смену. Для корректных общих часов без
        пересечений используйте сводную аналитику, а не сумму отдельных смен.
      </p>
    </>
  );
}

export default function HistoryPanels({
  section,
  venueId,
  refreshKey,
  timeZone,
}: Props) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY }),
    [advanced, setAdvanced] = useState(false);
  const [rows, setRows] = useState<Rec[]>([]),
    [count, setCount] = useState(0),
    [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true),
    [loadedKey, setLoadedKey] = useState(""),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<Rec | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState("");
  const [dictionaries, setDictionaries] = useState<Rec>({}),
    [reloadIndex, setReloadIndex] = useState(0);
  const detailRequest = useRef(0);
  const params = useMemo(() => {
    const q = new URLSearchParams({ page: String(page) });
    Object.entries(filters).forEach(([key, value]) => {
      if (
        value &&
        (section === "calls" || ["staff_id", "start", "end"].includes(key))
      )
        q.set(key, value);
    });
    return q;
  }, [section, page, filters]);
  const requestKey = `${venueId}/${section}?${params}`,
    hasCurrentRows = loadedKey === requestKey;
  const visible = useMemo(
    () =>
      hasCurrentRows
        ? rows.filter((row) =>
            JSON.stringify(row)
              .toLocaleLowerCase("ru-RU")
              .includes(search.toLocaleLowerCase("ru-RU")),
          )
        : [],
    [rows, search, hasCurrentRows],
  );
  const activeFilters = Object.values(filters).some(Boolean);

  useEffect(() => {
    if (!venueId) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<Paginated>(`venues/${venueId}/${section}?${params}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!active) return;
        setRows(result.results || []);
        setCount(result.count || 0);
        setLoadedKey(requestKey);
      })
      .catch((cause) => {
        if (active) setError(prettyError(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [venueId, section, requestKey, refreshKey, reloadIndex]);
  useEffect(() => {
    if (!venueId) return;
    let active = true;
    api<Rec>(`venues/${venueId}/analytics/filters`)
      .then((data) => {
        if (active) setDictionaries(data.filters || data);
      })
      .catch(() => {
        if (active) setDictionaries({});
      });
    return () => {
      active = false;
    };
  }, [venueId]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected?.id]);

  function change(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }
  function reset() {
    setFilters({ ...EMPTY });
    setPage(1);
    setSearch("");
  }
  async function open(row: Rec) {
    if (!venueId) return;
    const id = ++detailRequest.current;
    setSelected(row);
    setDetailError("");
    setDetailLoading(true);
    try {
      const detailQuery = new URLSearchParams();
      if (section === "shifts") {
        if (filters.start) detailQuery.set("start", filters.start);
        if (filters.end) detailQuery.set("end", filters.end);
      }
      const full = await api<Rec>(
        `venues/${venueId}/${section}/${row.id}${detailQuery.size ? `?${detailQuery}` : ""}`,
      );
      if (id === detailRequest.current) setSelected(full);
    } catch (cause) {
      if (id === detailRequest.current)
        setDetailError(
          `Полные сведения не загрузились: ${prettyError(cause)}. Показана информация из списка.`,
        );
    } finally {
      if (id === detailRequest.current) setDetailLoading(false);
    }
  }
  function close() {
    detailRequest.current += 1;
    setSelected(null);
    setDetailError("");
    setDetailLoading(false);
  }
  function selectOptions(key: string, labels: string[], title: string) {
    const raw = labels
      .map((alias) => dictionaries[alias])
      .find((value) => value !== undefined);
    const choices = optionsFrom(raw);
    return (
      <label>
        <span>{title}</span>
        {choices.length ? (
          <select
            value={filters[key as keyof Filters]}
            onChange={(e) => change(key as keyof Filters, e.target.value)}
          >
            <option value="">Все</option>
            {choices.map((choice) => (
              <option value={choice.id} key={choice.id}>
                {choice.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            inputMode="numeric"
            placeholder="ID"
            value={filters[key as keyof Filters]}
            onChange={(e) =>
              change(key as keyof Filters, e.target.value.replace(/\D/g, ""))
            }
          />
        )}
      </label>
    );
  }

  return (
    <div className="history-section q1-human-history">
      <div className="panel q1-list-panel">
        <div className="menu-table-header">
          <div>
            <span className="eyebrow">
              {section === "calls" ? "ОБРАЩЕНИЯ" : "ПЕРСОНАЛ"}
            </span>
            <h3>{section === "calls" ? "История вызовов" : "История смен"}</h3>
            <p>
              {hasCurrentRows
                ? `Всего записей: ${formatInt(count)}`
                : "Получаем данные…"}
            </p>
          </div>
          <div className="menu-tools">
            <label className="searchbox">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск на странице…"
              />
            </label>
            <button
              type="button"
              className="icon-outline"
              title="Обновить"
              onClick={() => setReloadIndex((n) => n + 1)}
              disabled={loading}
            >
              <RefreshCcw size={17} />
            </button>
          </div>
        </div>
        <div className="q1-history-toolbar">
          <div className="q1-history-main-filters">
            {section === "calls" && (
              <label>
                <span>Статус</span>
                <select
                  value={filters.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  <option value="">Все статусы</option>
                  {Object.entries(callStatuses).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectOptions(
              "staff_id",
              ["staff", "staff_members", "employees"],
              "Сотрудник",
            )}
            <label>
              <span>С даты</span>
              <DateField
                value={filters.start}
                onChange={(e) => change("start", e.target.value)}
              />
            </label>
            <label>
              <span>До даты (не включая)</span>
              <DateField
                value={filters.end}
                onChange={(e) => change("end", e.target.value)}
              />
            </label>
            {section === "calls" && (
              <button
                type="button"
                className={`q1-filter-more ${advanced ? "active" : ""}`}
                onClick={() => setAdvanced((value) => !value)}
              >
                <Filter size={15} /> Дополнительно
              </button>
            )}
          </div>
          {section === "calls" && advanced && (
            <div className="q1-history-extra">
              {selectOptions("hall_id", ["halls"], "Зал")}
              {selectOptions("table_id", ["tables"], "Стол")}
              {selectOptions(
                "category_id",
                ["categories", "call_categories"],
                "Категория",
              )}
              <label>
                <span>Источник</span>
                <select
                  value={filters.source}
                  onChange={(e) => change("source", e.target.value)}
                >
                  <option value="">Любой</option>
                  {optionsFrom(dictionaries.sources).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Была просрочка</span>
                <select
                  value={filters.expired}
                  onChange={(e) => change("expired", e.target.value)}
                >
                  <option value="">Любая</option>
                  <option value="true">Да</option>
                  <option value="false">Нет</option>
                </select>
              </label>
            </div>
          )}
          <div className="q1-filter-bottom">
            <span>Поиск применяется к текущей странице из 50 записей</span>
            {activeFilters && (
              <button type="button" onClick={reset}>
                <X size={14} /> Сбросить фильтры
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="alert alert-error">
            Не удалось обновить историю: {error}
          </div>
        )}
        <div className="table-scroll">
          <ResponsiveTable className="q1-human-table">
            <thead>
              {section === "calls" ? (
                <tr>
                  <th>Обращение</th>
                  <th>Создано</th>
                  <th>Принято</th>
                  <th>Статус</th>
                  <th>Стол</th>
                  <th></th>
                </tr>
              ) : (
                <tr>
                  <th>Смена</th>
                  <th>Начало</th>
                  <th>Окончание</th>
                  <th>Принято</th>
                  <th>Среднее принятие</th>
                  <th></th>
                </tr>
              )}
            </thead>
            <tbody>
              {!hasCurrentRows && !error
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr className="q1-skeleton-table-row" key={i}>
                      <td colSpan={6}>
                        <span />
                      </td>
                    </tr>
                  ))
                : visible.map((row) =>
                    section === "calls" ? (
                      <tr
                        key={row.id}
                        className="q1-openable-row"
                        onClick={() => void open(row)}
                      >
                        <td>
                          <b>Вызов #{row.id}</b>
                          {row.was_expired && (
                            <small className="table-sub q1-warn-text">
                              Была просрочка
                            </small>
                          )}
                        </td>
                        <td>{displayDateTime(row.created_at, timeZone)}</td>
                        <td>{displayDateTime(row.accepted_at, timeZone)}</td>
                        <td>
                          <span
                            className={`status-pill ${statusClass(row.status)}`}
                          >
                            <i />
                            {callStatuses[row.status] || row.status || "—"}
                          </span>
                        </td>
                        <td>
                          {row.table_id != null ? `№ ${row.table_id}` : "—"}
                        </td>
                        <td>
                          <button
                            className="row-action"
                            type="button"
                            title="Открыть вызов"
                            onClick={(e) => {
                              e.stopPropagation();
                              void open(row);
                            }}
                          >
                            <ArrowRight size={17} />
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={row.id}
                        className="q1-openable-row"
                        onClick={() => void open(row)}
                      >
                        <td>
                          <b>Смена #{row.id}</b>
                          <small className="table-sub">
                            {row.staff_name || displayPerson(row.staff_id)}
                          </small>
                        </td>
                        <td>{displayDateTime(row.opened_at, timeZone)}</td>
                        <td>{displayDateTime(row.closed_at, timeZone)}</td>
                        <td>{formatCount(row.accepted_calls)}</td>
                        <td>{formatTime(row.acceptance_avg_seconds)}</td>
                        <td>
                          <button
                            className="row-action"
                            type="button"
                            title="Открыть смену"
                            onClick={(e) => {
                              e.stopPropagation();
                              void open(row);
                            }}
                          >
                            <ArrowRight size={17} />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
              {hasCurrentRows && visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-table">
                    {search
                      ? "На этой странице совпадений нет"
                      : "Записей по выбранным фильтрам нет"}
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </div>
        <div className="pagination">
          <span>
            Страница {page} ·{" "}
            {hasCurrentRows ? `${rows.length} из ${count}` : "Загрузка…"}
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={page * 50 >= count || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="important-note">
        <Info size={18} />
        <span>
          {section === "calls"
            ? "Просрочка может сохраняться после принятия или закрытия вызова. Автоматическое закрытие — не подтверждение обслуживания."
            : "Рабочие часы одной смены могут пересекаться с другими сменами сотрудника. Для общих часов используйте аналитику, где пересечения объединены."}
        </span>
      </div>
      {selected &&
        createPortal(
          <div
            className="drawer-mask q1-human-mask"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <aside
              className="edit-drawer q1-human-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={
                section === "calls"
                  ? `Вызов ${selected.id}`
                  : `Смена ${selected.id}`
              }
            >
              <div className="drawer-header">
                <div>
                  <span className="eyebrow">
                    {section === "calls"
                      ? "КАРТОЧКА ОБРАЩЕНИЯ"
                      : "КАРТОЧКА СМЕНЫ"}
                  </span>
                  <h2>
                    {section === "calls"
                      ? `Вызов #${selected.id}`
                      : `Смена #${selected.id}`}
                  </h2>
                </div>
                <button
                  type="button"
                  className="icon-outline"
                  onClick={close}
                  aria-label="Закрыть карточку"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="drawer-body">
                <div className="q1-detail-scroll">
                  {detailLoading && (
                    <div className="q1-drawer-updating">
                      <Clock3 size={15} /> Получаем подробности…
                    </div>
                  )}
                  {detailError && (
                    <div className="q1-inline-warning">{detailError}</div>
                  )}
                  {section === "calls" ? (
                    <CallDetails row={selected} timeZone={timeZone} />
                  ) : (
                    <ShiftDetails row={selected} timeZone={timeZone} />
                  )}
                </div>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </div>
  );
}
