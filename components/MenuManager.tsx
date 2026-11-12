"use client";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";
import ResponsiveTable from "./ResponsiveTable";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ImagePlus,
  Languages,
  LockKeyhole,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  api,
  ApiError,
  formatInt,
  money,
  prettyError,
  type Paginated,
  type Rec,
} from "@/lib/client";

// ── Настройки, ресурсы и поля API ───────────────────────────────
const RESOURCES = [
  { key: "menus", label: "Меню" },
  { key: "categories", label: "Категории" },
  { key: "items", label: "Блюда и позиции" },
  { key: "modifier-groups", label: "Группы добавок" },
  { key: "modifiers", label: "Добавки" },
] as const;
type Resource = (typeof RESOURCES)[number]["key"];
type Field = {
  type: string;
  label?: string;
  required?: boolean;
  read_only?: boolean;
  help_text?: string;
  max_length?: number;
  choices?: { value: string | number; display_name: string }[];
};
type Schema = Record<string, Record<string, Field>>;
type MenuManagerProps = {
  venueId: number | null;
  permissions: Rec;
  refreshKey: number;
};
type ListData = { key: string; items: Rec[]; count: number };
type TableColumn = { key: string; label: string };
const RESOURCE_NAMES: Record<Resource, string> = {
  menus: "меню",
  categories: "категорию",
  items: "блюдо",
  "modifier-groups": "группу добавок",
  modifiers: "добавку",
};
const PARENT_FIELDS = new Set(["menu", "menu_item", "group"]);
const PAGE_SIZE = 50;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// ── Подписи таблиц и преобразование полей ────────────────────
function getColumns(resource: Resource): TableColumn[] {
  switch (resource) {
    case "menus":
      return [
        { key: "name", label: "Название" },
        { key: "currency", label: "Валюта" },
        { key: "source", label: "Источник" },
      ];
    case "categories":
      return [
        { key: "name_ru", label: "Название" },
        { key: "name_kk", label: "KZ" },
        { key: "name_en", label: "EN" },
      ];
    case "items":
      return [
        { key: "name_ru", label: "Позиция" },
        { key: "price", label: "Цена" },
        { key: "kind", label: "Тип" },
      ];
    case "modifier-groups":
      return [
        { key: "name_ru", label: "Группа" },
        { key: "menu_item", label: "Блюдо ID" },
        { key: "max_select", label: "Макс. выбор" },
      ];
    case "modifiers":
      return [
        { key: "name_ru", label: "Добавка" },
        { key: "price", label: "Цена" },
        { key: "group", label: "Группа ID" },
      ];
  }
}
function recordTitle(resource: Resource, record: Rec): string {
  const value =
    resource === "menus" ? record.name : record.name_ru || record.name_en;
  return String(value || `#${record.id}`);
}
function displayCell(record: Rec, column: TableColumn): string {
  if (column.key === "price") {
    return money(record.price, record.currency || undefined);
  }
  if (column.key === "kind")
    return (
      (
        {
          dish: "Блюдо",
          drink: "Напиток",
          service: "Услуга",
          modifier: "Добавка",
          other: "Другое",
        } as Record<string, string>
      )[record.kind] || String(record.kind || "—")
    );
  const value = record[column.key];
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}
function fieldToInput(value: unknown, field: Field): string {
  if (value === null || value === undefined) return "";
  if (field.type === "field" && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function fieldToApi(value: unknown, field: Field): unknown {
  if (field.type === "decimal") {
    return value === "" || value == null ? null : String(value);
  }
  if (field.type === "integer") {
    if (value === "" || value == null) return null;
    const number = Number(value);
    if (!Number.isInteger(number)) throw new Error("Введите целое число");
    return number;
  }
  if (field.type === "choice" && field.choices) {
    if (value === "") return null;
    return (
      field.choices.find((choice) => String(choice.value) === String(value))
        ?.value ?? value
    );
  }
  if (field.type === "field" && typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    if (/^\d+$/.test(text)) return Number(text);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return value;
}

// ── Состояние интерфейса ─────────────────────────────────────
export default function MenuManager({
  venueId,
  permissions,
  refreshKey,
}: MenuManagerProps) {
  const [resource, setResource] = useState<Resource>("items");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [schema, setSchema] = useState<Schema>({});
  const [schemaError, setSchemaError] = useState("");
  const [menus, setMenus] = useState<Rec[]>([]);
  const [listData, setListData] = useState<ListData>({
    key: "",
    items: [],
    count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<Rec | null>(null);
  const [creating, setCreating] = useState(false);
  const [editDraft, setEditDraft] = useState<Rec>({});
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [upload, setUpload] = useState<File | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [translateBusy, setTranslateBusy] = useState(false);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const translationKeyRef = useRef<string | null>(null);
  const base = venueId == null ? "" : `venues/${venueId}`;
  const listKey = `${venueId ?? "none"}:${resource}:${page}`;
  const hasCurrentPage = listData.key === listKey;
  const rows = hasCurrentPage ? listData.items : [];
  const count = hasCurrentPage ? listData.count : 0;
  const fields = schema[resource] || {};
  const columns = getColumns(resource);
  const drawerOpen = creating || selected !== null;
  useDialogFocus(drawerOpen, ".menu-editor-drawer", closeDrawer);
  const writableFields = useMemo(() => {
    return Object.entries(fields).filter(([, field]) => !field.read_only);
  }, [fields]);
  const visibleRows = useMemo(() => {
    if (!hasCurrentPage) return [];
    const query = search.trim().toLocaleLowerCase("ru-RU");
    if (!query) return rows;
    return rows.filter((row) =>
      JSON.stringify(row).toLocaleLowerCase("ru-RU").includes(query),
    );
  }, [hasCurrentPage, rows, search]);

  // Загрузка схемы, меню и текущей страницы
  const loadMenus = useCallback(async () => {
    if (!base) return;
    try {
      const result = await api<Paginated>(`${base}/menus?page=1`);
      setMenus(result.results || []);
    } catch {}
  }, [base]);
  useEffect(() => {
    let cancelled = false;
    if (!base) {
      return;
    }
    setSchema({});
    setSchemaError("");
    setMenus([]);
    setSelectedMenu(null);
    translationKeyRef.current = null;
    void api<Schema>(`${base}/schema`)
      .then((result) => {
        if (!cancelled) setSchema(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) setSchemaError(prettyError(error));
      });
    void api<Paginated>(`${base}/menus?page=1`)
      .then((result) => {
        if (!cancelled) setMenus(result.results || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [base, refreshKey]);
  const fetchList = useCallback(async () => {
    if (!base) return;
    const requestId = ++listRequestRef.current;
    const currentKey = `${venueId}:${resource}:${page}`;
    setLoading(true);
    setListError("");
    try {
      const result = await api<Paginated>(`${base}/${resource}?page=${page}`);
      if (requestId !== listRequestRef.current) return;
      setListData({
        key: currentKey,
        items: result.results || [],
        count: result.count || 0,
      });
    } catch (error) {
      if (requestId !== listRequestRef.current) return;
      setListError(prettyError(error));
    } finally {
      if (requestId === listRequestRef.current) {
        setLoading(false);
      }
    }
  }, [base, page, resource, venueId]);
  useEffect(() => {
    void fetchList();
    return () => {
      listRequestRef.current += 1;
    };
  }, [fetchList, refreshKey]);

  // Навигация и редактор записей
  function switchTab(nextResource: Resource) {
    if (nextResource === resource) return;
    setResource(nextResource);
    setPage(1);
    setSearch("");
    setListError("");
    setActionError("");
    closeDrawer();
  }
  function closeDrawer() {
    detailRequestRef.current += 1;
    setSelected(null);
    setCreating(false);
    setEditDraft({});
    setChanged(new Set());
    setUpload(null);
    setEditorError("");
    setConflict(false);
    setLoadingDetails(false);
  }
  async function openEditor(record: Rec | null) {
    const requestId = ++detailRequestRef.current;
    setSelected(record);
    setCreating(record === null);
    setEditDraft(record ? { ...record } : {});
    setChanged(new Set());
    setUpload(null);
    setEditorError("");
    setConflict(false);
    setLoadingDetails(record !== null);
    if (!record || !base) return;
    try {
      const full = await api<Rec>(`${base}/${resource}/${record.id}`);
      if (requestId !== detailRequestRef.current) return;
      setSelected(full);
      setEditDraft(full);
    } catch (error) {
      if (requestId !== detailRequestRef.current) return;
      setEditorError(prettyError(error));
    } finally {
      if (requestId === detailRequestRef.current) {
        setLoadingDetails(false);
      }
    }
  }
  function setValue(key: string, value: unknown) {
    setEditDraft((previous) => ({ ...previous, [key]: value }));
    setChanged((previous) => new Set(previous).add(key));
  }
  function selectImage(file: File | null) {
    if (!file) {
      setUpload(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setEditorError("Допустимы только изображения JPEG, PNG и WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setEditorError("Максимальный размер изображения — 10 МБ.");
      return;
    }
    setUpload(file);
    setEditorError("");
    setChanged((previous) => {
      const next = new Set(previous);
      next.delete("image");
      return next;
    });
  }

  // Создание / PATCH с If-Match и файлами
  async function save() {
    if (!base || saving || loadingDetails) return;
    setSaving(true);
    setEditorError("");
    setConflict(false);
    try {
      if (creating) {
        const missing = writableFields.find(([key, field]) => {
          if (!field.required || field.type === "image upload") return false;
          const value = editDraft[key];
          return value === undefined || value === null || value === "";
        });
        if (missing) {
          throw new Error(
            `Заполните обязательное поле «${missing[1].label || missing[0]}».`,
          );
        }
      }
      const keys = [...changed].filter((key) => {
        const field = fields[key];
        return Boolean(
          field && !field.read_only && (creating || !PARENT_FIELDS.has(key)),
        );
      });
      if (keys.length === 0 && !upload) {
        throw new Error("Нет изменений для сохранения.");
      }
      const values: Rec = {};
      for (const key of keys) {
        values[key] = fieldToApi(editDraft[key], fields[key]);
      }
      const headers: Record<string, string> = {};
      let body: BodyInit;
      if (upload) {
        const form = new FormData();
        for (const [key, value] of Object.entries(values)) {
          if (key === "image") continue;
          form.append(
            key,
            value == null
              ? ""
              : typeof value === "object"
                ? JSON.stringify(value)
                : String(value),
          );
        }
        form.append("image", upload);
        body = form;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(values);
      }
      if (!creating) {
        if (!selected?.updated_at) {
          throw new Error(
            "Нет версии updated_at. Обновите запись и повторите.",
          );
        }
        headers["If-Match"] = String(selected.updated_at);
      }
      const path = creating
        ? `${base}/${resource}`
        : `${base}/${resource}/${selected!.id}`;
      await api<Rec>(path, {
        method: creating ? "POST" : "PATCH",
        headers,
        body,
      });
      setToast(creating ? "Запись успешно создана" : "Изменения сохранены");
      closeDrawer();
      void fetchList();
      if (resource === "menus") void loadMenus();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setConflict(true);
      }
      setEditorError(prettyError(error));
    } finally {
      setSaving(false);
    }
  }
  async function reloadObject() {
    if (!selected || !base) return;
    const requestId = ++detailRequestRef.current;
    setLoadingDetails(true);
    setEditorError("");
    try {
      const full = await api<Rec>(`${base}/${resource}/${selected.id}`);
      if (requestId !== detailRequestRef.current) return;
      setSelected(full);
      setEditDraft(full);
      setChanged(new Set());
      setUpload(null);
      setConflict(false);
    } catch (error) {
      if (requestId === detailRequestRef.current) {
        setEditorError(prettyError(error));
      }
    } finally {
      if (requestId === detailRequestRef.current) {
        setLoadingDetails(false);
      }
    }
  }

  // AI-перевод с Idempotency-Key
  async function translate() {
    if (!base || !selectedMenu || translateBusy) return;
    setTranslateBusy(true);
    setActionError("");
    const storageKey = `q1_translate_${venueId}_${selectedMenu}`;
    try {
      const key =
        translationKeyRef.current ||
        sessionStorage.getItem(storageKey) ||
        crypto.randomUUID().replace(/-/g, "");
      translationKeyRef.current = key;
      sessionStorage.setItem(storageKey, key);
      const job = await api<Rec>(`${base}/menus/${selectedMenu}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: "{}",
      });
      setToast(`Задание перевода #${job.id} · ${job.status}`);
      sessionStorage.removeItem(storageKey);
      translationKeyRef.current = null;
    } catch (error) {
      setActionError(prettyError(error));
    } finally {
      setTranslateBusy(false);
    }
  }

  // ── JSX: каталог, AI-перевод, редактор ─────────────────────
  // Разметка: каталог, AI-перевод и боковой редактор
  return (
    <div className="menu-manager">
      <div className="menu-intro panel">
        <div className="menu-intro-icon">
          <Sparkles size={26} />
        </div>
        <div>
          <span className="eyebrow">Q1 DIGITAL MENU</span>
          <h3>Ваше меню — всегда актуально</h3>
          <p>
            Всё для гостевого QR-меню: цены, доступность, языки и рекомендации.
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          disabled={!base || !schema[resource]}
          onClick={() => void openEditor(null)}
        >
          <Plus size={18} /> Добавить {RESOURCE_NAMES[resource]}
        </button>
      </div>
      <div className="menu-tabs" role="tablist" aria-label="Разделы меню">
        {RESOURCES.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={resource === entry.key}
            className={resource === entry.key ? "active" : ""}
            onClick={() => switchTab(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="panel menu-content">
        <div className="menu-table-header">
          <div>
            <span className="eyebrow">КАТАЛОГ</span>
            <h3>{RESOURCES.find((entry) => entry.key === resource)?.label}</h3>
            <p>
              Всего записей: {hasCurrentPage ? formatInt(count) : "…"}
              {loading && hasCurrentPage ? " · Обновляем…" : ""}
            </p>
          </div>
          <div className="menu-tools">
            <label className="searchbox">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск на странице…"
              />
            </label>
            <button
              type="button"
              className="icon-outline"
              title="Обновить"
              aria-label="Обновить список"
              disabled={loading || !base}
              onClick={() => void fetchList()}
            >
              <RefreshCcw size={17} />
            </button>
          </div>
        </div>
        {schemaError && (
          <div className="alert alert-error">Схема: {schemaError}</div>
        )}
        {listError && <div className="alert alert-error">{listError}</div>}
        {actionError && <div className="alert alert-error">{actionError}</div>}
        {toast && (
          <div className="alert alert-success" role="status">
            {toast}
            <button
              type="button"
              onClick={() => setToast("")}
              aria-label="Скрыть"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="table-scroll" aria-busy={loading}>
          <ResponsiveTable className="menu-table">
            <thead>
              <tr>
                <th>ID</th>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Статус</th>
                <th aria-label="Действия" />
              </tr>
            </thead>
            <tbody key={listKey}>
              {!hasCurrentPage && !listError
                ? Array.from({ length: 4 }, (_, index) => (
                    <tr key={`skeleton-${index}`} className="menu-skeleton-row">
                      <td colSpan={6}>
                        <div
                          className="menu-skeleton-content"
                          aria-hidden="true"
                        >
                          {Array.from({ length: 6 }, (_, i) => (
                            <span key={i} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                : visibleRows.map((row) => (
                    <tr
                      key={`${resource}-${row.id}`}
                      className="clickable-row menu-data-row"
                      onClick={() => void openEditor(row)}
                    >
                      <td className="table-muted">#{row.id}</td>
                      {columns.map((column, index) => (
                        <td key={column.key}>
                          {index === 0 ? (
                            <div className="item-primary">
                              <span className="item-tile">
                                {resource === "items"
                                  ? "◈"
                                  : resource === "menus"
                                    ? "▣"
                                    : "✦"}
                              </span>
                              <b>{displayCell(row, column)}</b>
                            </div>
                          ) : (
                            displayCell(row, column)
                          )}
                        </td>
                      ))}
                      <td>
                        <span
                          className={`status-pill ${row.is_active === false || row.is_available === false ? "off" : "on"}`}
                        >
                          <i />
                          {row.is_active === false
                            ? "Выключено"
                            : row.is_available === false
                              ? "Стоп-лист"
                              : "Активно"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="row-action"
                          title="Редактировать"
                          aria-label={`Редактировать ${recordTitle(resource, row)}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void openEditor(row);
                          }}
                        >
                          <ArrowRight size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
              {hasCurrentPage && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-table">
                    {search
                      ? "По вашему запросу ничего не найдено"
                      : "Записей пока нет"}
                  </td>
                </tr>
              )}
              {!hasCurrentPage && !!listError && (
                <tr>
                  <td colSpan={6} className="empty-table">
                    Не удалось загрузить записи. Повторите обновление.
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </div>
        <div className="pagination">
          <span>
            Страница {page} ·{" "}
            {hasCurrentPage ? `${rows.length} из ${count}` : "загрузка"}
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Предыдущая страница"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={!hasCurrentPage || page * PAGE_SIZE >= count || loading}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Следующая страница"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      {Boolean(permissions.translation) && (
        <div className="translate-panel panel">
          <span className="translate-visual">
            <Languages size={28} />
          </span>
          <div>
            <span className="eyebrow">AI-ПЕРЕВОД</span>
            <h3>Одно меню. Три языка.</h3>
            <p>
              Заполняем только пустые поля RU / KZ / EN. Готовые переводы не
              меняем.
            </p>
          </div>
          <div className="translate-actions">
            <select
              aria-label="Выберите меню для перевода"
              value={selectedMenu ?? ""}
              disabled={translateBusy}
              onChange={(event) => {
                setSelectedMenu(Number(event.target.value) || null);
                translationKeyRef.current = null;
              }}
            >
              <option value="">Выбрать меню</option>
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="primary-btn"
              disabled={!selectedMenu || translateBusy}
              onClick={() => void translate()}
            >
              <Sparkles size={17} />
              {translateBusy ? "Создаём…" : "Перевести пустые поля"}
            </button>
          </div>
        </div>
      )}
      {drawerOpen &&
        createPortal(
          <div
            className="drawer-mask"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving)
                closeDrawer();
            }}
          >
            <aside
              className="edit-drawer menu-editor-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={creating ? "Добавление" : "Редактирование"}
            >
              <div className="drawer-header">
                <div>
                  <span className="eyebrow">
                    {creating ? "НОВАЯ ЗАПИСЬ" : `ID #${selected?.id}`}
                  </span>
                  <h2>
                    {creating
                      ? `Добавить ${RESOURCE_NAMES[resource]}`
                      : recordTitle(resource, selected!)}
                  </h2>
                </div>
                <button
                  type="button"
                  className="icon-outline"
                  disabled={saving}
                  onClick={closeDrawer}
                  aria-label="Закрыть редактор"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="drawer-body">
                {selected?.source && selected.source !== "manual" && (
                  <div className="alert alert-warning">
                    <LockKeyhole size={17} />
                    Меню получено из внешней системы. Редактирование может быть
                    запрещено, а изменения — перезаписаны синхронизацией.
                  </div>
                )}
                {loadingDetails && (
                  <div className="empty-mini">Загружаем запись…</div>
                )}
                <div
                  style={
                    loadingDetails
                      ? { opacity: 0.5, pointerEvents: "none" }
                      : undefined
                  }
                >
                  {writableFields.map(([key, field]) => {
                    const isParentLocked = !creating && PARENT_FIELDS.has(key);
                    return (
                      <div className="form-field" key={key}>
                        <label htmlFor={`menu-field-${key}`}>
                          {field.label || key}
                          {field.required && (
                            <span className="required"> *</span>
                          )}
                          {isParentLocked && (
                            <span className="read-only-hint">
                              {" "}
                              · связь не переносится
                            </span>
                          )}
                        </label>
                        {field.type === "boolean" ? (
                          <label className="switch-field">
                            <input
                              id={`menu-field-${key}`}
                              type="checkbox"
                              checked={Boolean(editDraft[key])}
                              disabled={isParentLocked || loadingDetails}
                              onChange={(event) =>
                                setValue(key, event.target.checked)
                              }
                            />
                            <span>
                              {editDraft[key] ? "Включено" : "Выключено"}
                            </span>
                          </label>
                        ) : field.type === "choice" && field.choices?.length ? (
                          <select
                            id={`menu-field-${key}`}
                            value={fieldToInput(editDraft[key], field)}
                            disabled={isParentLocked || loadingDetails}
                            onChange={(event) =>
                              setValue(key, event.target.value)
                            }
                          >
                            <option value="">— Не выбрано —</option>
                            {field.choices.map((choice) => (
                              <option
                                key={String(choice.value)}
                                value={choice.value}
                              >
                                {choice.display_name}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "image upload" ? (
                          <div className="image-upload">
                            <ImagePlus size={22} />
                            <input
                              id={`menu-field-${key}`}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              disabled={loadingDetails}
                              onChange={(event) =>
                                selectImage(event.target.files?.[0] || null)
                              }
                            />
                            {upload && (
                              <small>
                                {upload.name} ·{" "}
                                {(upload.size / 1024 / 1024).toFixed(1)} МБ
                              </small>
                            )}
                            <span>JPEG, PNG, WEBP · до 10 МБ</span>
                            {!creating && (
                              <button
                                type="button"
                                className="small-outline"
                                disabled={loadingDetails}
                                onClick={() => {
                                  setUpload(null);
                                  setValue(key, null);
                                }}
                              >
                                Удалить изображение
                              </button>
                            )}
                          </div>
                        ) : field.type === "field" ||
                          key.startsWith("description_") ? (
                          <textarea
                            id={`menu-field-${key}`}
                            rows={key.startsWith("description_") ? 3 : 2}
                            value={fieldToInput(editDraft[key], field)}
                            disabled={isParentLocked || loadingDetails}
                            placeholder={
                              field.type === "field"
                                ? "ID или JSON по схеме API"
                                : ""
                            }
                            onChange={(event) =>
                              setValue(key, event.target.value)
                            }
                          />
                        ) : (
                          <input
                            id={`menu-field-${key}`}
                            type={
                              field.type === "integer" ||
                              field.type === "decimal"
                                ? "number"
                                : "text"
                            }
                            step={
                              field.type === "decimal"
                                ? "0.01"
                                : field.type === "integer"
                                  ? "1"
                                  : undefined
                            }
                            maxLength={field.max_length}
                            value={fieldToInput(editDraft[key], field)}
                            disabled={isParentLocked || loadingDetails}
                            onChange={(event) =>
                              setValue(key, event.target.value)
                            }
                          />
                        )}
                        {field.help_text && (
                          <small className="field-help">
                            {field.help_text}
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>
                {Object.keys(fields).length === 0 && (
                  <div className="empty-mini">Ожидаем схему полей от API.</div>
                )}
                {conflict && (
                  <div className="alert alert-warning">
                    <CircleAlert size={18} />
                    Запись была изменена другим пользователем. Перезагрузка
                    сбросит несохранённые правки — чужие изменения не
                    перезаписываем.
                    <button type="button" onClick={() => void reloadObject()}>
                      Загрузить новую версию
                    </button>
                  </div>
                )}
                {editorError && (
                  <div className="alert alert-error" role="alert">
                    {editorError}
                  </div>
                )}
                <div className="drawer-note">
                  Изменения появятся в меню после сохранения. Чтобы временно
                  убрать позицию, отключите её доступность.
                </div>
              </div>
              <div className="drawer-footer">
                <button
                  type="button"
                  className="small-outline"
                  disabled={saving}
                  onClick={closeDrawer}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={
                    saving ||
                    loadingDetails ||
                    !Object.keys(fields).length ||
                    conflict
                  }
                  onClick={() => void save()}
                >
                  {saving
                    ? "Сохранение…"
                    : creating
                      ? "Создать"
                      : "Сохранить изменения"}
                  <Check size={17} />
                </button>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </div>
  );
}
