/** Q1 UI helpers. Only formatting: never change or recalculate backend metrics. */
export type ViewRecord = Record<string, unknown>;

export const callStatuses: Record<string, string> = {
  created: "Ожидает", arrived: "Принят", closed: "Закрыт сотрудником",
  auto_closed: "Закрыт системой", expired: "Просрочен",
};
export const jobStatuses: Record<string, string> = {
  queued: "Ожидает запуска", running: "Выполняется", completed: "Завершено", failed: "Ошибка",
};
export const jobPhases: Record<string, string> = {
  days: "Расчёт дней", shifts: "Расчёт смен", periods: "Сводные периоды", completed: "Готово",
};
export const jobKinds: Record<string, string> = {
  reports: "Пересчёт аналитики", report: "Пересчёт аналитики", translation: "AI-перевод",
  translate: "AI-перевод", menu_translation: "AI-перевод меню",
};

export function displayDateTime(value: unknown, timeZone?: string): string {
  if (!value || typeof value !== "string") return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(parsed);
  }
}

export function displayDay(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function cleanHallName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "Зал не указан";
  const name = value.trim().replace(/^\[\d+\]\s*/, "");
  const group = name.match(/^.+?\s+[–—-]\s+(.+)$/);
  return (group?.[1] || name).trim();
}

export function cleanTableName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "Стол не указан";
  const withoutCode = value.trim().replace(/\s*\(\s*csp\s*=\s*[^)]+\)/gi, "").replace(/^\[\d+\]\s*/, "");
  const suffix = withoutCode.split(/\s*\/\s*/).pop() || withoutCode;
  const match = suffix.match(/(?:^|[–—-]\s*)(стол(?:ик)?\s*№?\s*[\wА-Яа-яЁё-]+.*)$/i);
  const result = (match?.[1] || suffix).trim();
  return result.length ? result[0].toLocaleUpperCase("ru-RU") + result.slice(1) : "Стол не указан";
}

export function displayRole(value: unknown): string {
  const role = String(value ?? "").trim();
  const labels: Record<string, string> = {
    waiter: "Официант", bartender: "Бармен", manager: "Менеджер", director: "Директор",
    admin: "Администратор", cook: "Повар", chef: "Шеф-повар", hostess: "Хостес",
    cashier: "Кассир", runner: "Раннер", staff: "Сотрудник",
  };
  return labels[role.toLowerCase()] || role || "Роль не указана";
}

export function displayPerson(value: unknown): string {
  if (value == null || value === "") return "Не указан";
  if (typeof value === "number") return `Сотрудник #${value}`;
  if (typeof value === "string") return /^\d+$/.test(value) ? `Сотрудник #${value}` : value;
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as ViewRecord;
    const name = obj.full_name || obj.name || obj.display_name;
    if (typeof name === "string" && name.trim()) return name;
    if (obj.id != null) return `Сотрудник #${obj.id}`;
  }
  return "Не указан";
}

export function displayClosedSource(value: unknown): string {
  const map: Record<string, string> = { manual: "Вручную", schedule: "По расписанию", scheduled: "По расписанию", auto: "Автоматически", timeout: "По таймеру", system: "Системой" };
  return typeof value === "string" ? map[value] || value : "—";
}

export function safeValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "number" || typeof value === "string") return String(value);
  return "Данные доступны в подробностях";
}

export function percent(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}