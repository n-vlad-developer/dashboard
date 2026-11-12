"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Filter, RefreshCcw, X } from "lucide-react";
import { api, prettyError } from "@/lib/client";
import type { Rec } from "@/lib/client";

export type CallFilters = {
  staff_id: string;
  hall_id: string;
  table_id: string;
  category_id: string;
  source: string;
  status: string;
  expired: string;
};
export const EMPTY_FILTERS: CallFilters = {
  staff_id: "",
  hall_id: "",
  table_id: "",
  category_id: "",
  source: "",
  status: "",
  expired: "",
};
const FILTER_GROUPS = [
  {
    key: "staff_id",
    title: "Сотрудник",
    response: ["staff", "staff_members", "employees"],
  },
  { key: "hall_id", title: "Зал", response: ["halls"] },
  { key: "table_id", title: "Стол", response: ["tables"] },
  {
    key: "category_id",
    title: "Категория",
    response: ["categories", "call_categories"],
  },
  { key: "source", title: "Источник", response: ["sources"] },
] as const;
const STATUSES = [
  { value: "created", label: "Ожидает" },
  { value: "arrived", label: "Принят" },
  { value: "closed", label: "Закрыт" },
  { value: "auto_closed", label: "Закрыт системой" },
  { value: "expired", label: "Просрочен" },
];

type Props = {
  venueId: number | null;
  filters: CallFilters;
  onChange: (filters: CallFilters) => void;
  onExport: (format: "xlsx" | "csv" | "json") => Promise<void>;
  exporting: boolean;
  refreshKey: number;
};
function optionRows(raw: unknown): { value: string; label: string }[] {
  const entries = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Rec).results)
      ? (raw as Rec).results
      : [];
  return entries
    .map((item: unknown) => {
      if (typeof item === "string" || typeof item === "number")
        return { value: String(item), label: String(item) };
      const rec = item as Rec;
      const id = rec.id ?? rec.value ?? rec.pk ?? rec.source ?? rec.code;
      return {
        value: String(id ?? ""),
        label: String(
          rec.name ??
            rec.full_name ??
            rec.label ??
            rec.title ??
            rec.display_name ??
            rec.code ??
            id ??
            "",
        ),
      };
    })
    .filter((item: { value: string; label: string }) => Boolean(item.value));
}

export default function AnalyticsFilters({
  venueId,
  filters,
  onChange,
  onExport,
  exporting,
  refreshKey,
}: Props) {
  const [options, setOptions] = useState<Rec>({}),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [fileFormat, setFileFormat] = useState<"xlsx" | "csv" | "json">("xlsx");
  const active = useMemo(() => Object.values(filters).some(Boolean), [filters]);

  useEffect(() => {
    if (!venueId) {
      setOptions({});
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    api<Rec>(`venues/${venueId}/analytics/filters`)
      .then((data) => {
        if (alive) setOptions(data.filters || data);
      })
      .catch((cause) => {
        if (alive) {
          setOptions({});
          setError(prettyError(cause));
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [venueId, refreshKey]);

  function change(key: keyof CallFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }
  return (
    <div className="panel q1-analytics-filters">
      <div className="q1-filters-header">
        <div>
          <span className="eyebrow">
            <Filter size={13} /> ТОЧНАЯ АНАЛИТИКА
          </span>
          <h3>Фильтры обращений</h3>
          <p>
            Отбор вызовов и сотрудников. Заказы, гости, жалобы и климат — по
            всему заведению.
          </p>
        </div>
        <div className="q1-export-controls">
          <select
            aria-label="Формат экспорта"
            value={fileFormat}
            onChange={(event) =>
              setFileFormat(event.target.value as "xlsx" | "csv" | "json")
            }
          >
            <option value="xlsx">Excel XLSX</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          <button
            type="button"
            className="primary-btn"
            disabled={exporting || !venueId}
            onClick={() => void onExport(fileFormat)}
          >
            <Download size={16} />
            {exporting ? "Экспорт…" : "Скачать"}
          </button>
        </div>
      </div>
      <div className="q1-filters-grid">
        {FILTER_GROUPS.map((group) => {
          const source = group.response
            .map((key) => options[key])
            .find((value) => value !== undefined);
          const choices = optionRows(source);
          return (
            <label key={group.key}>
              <span>{group.title}</span>
              <select
                value={filters[group.key]}
                onChange={(event) => change(group.key, event.target.value)}
                disabled={loading || !!error}
              >
                <option value="">Все</option>
                {choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
        <label>
          <span>Статус</span>
          <select
            value={filters.status}
            onChange={(event) => change("status", event.target.value)}
          >
            <option value="">Все</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Была просрочка</span>
          <select
            value={filters.expired}
            onChange={(event) => change("expired", event.target.value)}
          >
            <option value="">Любые</option>
            <option value="true">Да</option>
            <option value="false">Нет</option>
          </select>
        </label>
      </div>
      <div className="q1-filters-footer">
        <span>
          {loading
            ? "Загрузка справочников…"
            : error
              ? `Справочники фильтров не загрузились: ${error}`
              : "Категория выбирается по ID записи, не по бизнес-коду."}
        </span>
        {active && (
          <button
            type="button"
            className="small-outline"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
          >
            <X size={14} /> Сбросить фильтры
          </button>
        )}
        {!loading && !error && (
          <span className="q1-filter-ready">
            <RefreshCcw size={13} /> Снимки v9
          </span>
        )}
      </div>
    </div>
  );
}
