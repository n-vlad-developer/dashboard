import {
  resources,
  venues,
  names,
  shifts,
  jobs,
  schema,
} from "./demo-fixtures";
import type { Rec } from "./client";

type Store = Record<string, Record<string, Rec[]>>;
let store: Store | undefined;
const KEY = "q1-demo-v9-2";
function database(): Store {
  if (store) return store;
  try {
    store = JSON.parse(sessionStorage.getItem(KEY) || "null") || undefined;
  } catch {
    /* Private browsing. */
  }
  if (!store)
    store = Object.fromEntries(
      venues.map((venue) => [
        venue.id,
        structuredClone({
          ...resources,
          jobs,
          reports: [],
          calls: [],
          shifts,
        }),
      ]),
    );
  return store!;
}
function persist() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* In-memory fallback. */
  }
}
const ok = (body: unknown, status = 200) => Response.json(body, { status });
const fail = (detail: string, status = 400) => ok({ detail }, status);
const day = (offset: number) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

function callsFor(url: URL, venueId: number): Rec[] {
  const start = url.searchParams.get("start") || day(-7),
    end = url.searchParams.get("end") || day(0);
  const length = Math.min(
    365,
    Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86400000)),
  );
  return Array.from({ length }, (_, i) =>
    Array.from(
      {
        length:
          18 +
          (((Math.floor(Date.parse(start) / 86400000) + i) * 17 + venueId) %
            33),
      },
      (_, n) => {
        const created =
          Date.parse(start) +
          i * 86400000 +
          (4 + (n % 14)) * 3600000 +
          n * 17000;
        const accepted = n % 6 !== 0;
        return {
          id: Math.floor(created / 86400000) * 100 + n,
          created_at: new Date(created).toISOString(),
          accepted_at: accepted
            ? new Date(created + (45 + (n % 9) * 12) * 1000).toISOString()
            : null,
          closed_at: n % 5 ? new Date(created + 600000).toISOString() : null,
          status: [
            "closed",
            "arrived",
            "closed",
            "auto_closed",
            "created",
            "expired",
          ][n % 6],
          was_expired: n % 7 === 0,
          staff_id: 11 + (n % 5),
          accepted_by: accepted
            ? { id: 11 + (n % 5), full_name: names[n % 5] }
            : null,
          table_id: 1 + (n % 8),
          hall_id: n % 8 > 4 ? 2 : 1,
          category_id: [10, 11, 20, 30][n % 4],
          source: n % 4 ? "button" : "app",
          shift_id: 110 + (n % 5),
          history_complete: true,
        };
      },
    ),
  )
    .flat()
    .filter((row) => matches(row, url));
}
function matches(row: Rec, url: URL) {
  return (
    [
      "staff_id",
      "hall_id",
      "table_id",
      "category_id",
      "source",
      "status",
    ].every(
      (key) =>
        !url.searchParams.get(key) ||
        String(row[key]) === url.searchParams.get(key),
    ) &&
    (!url.searchParams.get("expired") ||
      String(row.was_expired) === url.searchParams.get("expired"))
  );
}
function metrics(rows: Rec[]) {
  const accepted = rows.filter((x) => x.accepted_at),
    expired = rows.filter((x) => x.was_expired),
    closed = rows.filter((x) => x.closed_at);
  const reaction = accepted.length
    ? accepted.reduce(
        (sum, x) =>
          sum + (Date.parse(x.accepted_at) - Date.parse(x.created_at)) / 1000,
        0,
      ) / accepted.length
    : null;
  return {
    calls_total: rows.length,
    calls_arrived: accepted.length,
    calls_expired: expired.length,
    calls_closed: closed.length,
    calls_manual_closed: closed.filter((x) => x.status !== "auto_closed")
      .length,
    calls_auto_closed: closed.filter((x) => x.status === "auto_closed").length,
    calls_open: rows.length - closed.length,
    reaction_avg_seconds: reaction,
    arrived_percent: rows.length ? (accepted.length / rows.length) * 100 : null,
    expired_percent: rows.length ? (expired.length / rows.length) * 100 : null,
    staff_hours: 40,
    calls_per_staff_hour: rows.length / 40,
    sla_met_percent: 92,
    service_avg_seconds: 420,
    resolution_avg_seconds: 510,
    direct_closed: 0,
  };
}
export function analytics(url: URL, venueId: number): Rec {
  const start = url.searchParams.get("start") || day(-7),
    end = url.searchParams.get("end") || day(0),
    granularity = url.searchParams.get("granularity") || "day";
  const rows = callsFor(url, venueId),
    length = Math.min(
      365,
      Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86400000)),
    );
  const series = Array.from(
    { length: granularity === "half_hour" ? Math.min(length, 7) * 48 : length },
    (_, i) => {
      const time =
          Date.parse(start) +
          i * (granularity === "half_hour" ? 1800000 : 86400000),
        endTime = time + (granularity === "half_hour" ? 1800000 : 86400000);
      const bucket = rows.filter(
        (x) =>
          Date.parse(x.created_at) >= time &&
          Date.parse(x.created_at) < endTime,
      );
      return {
        date:
          granularity === "day"
            ? new Date(time).toISOString().slice(0, 10)
            : undefined,
        start: new Date(time).toISOString(),
        state: "ready",
        observed: true,
        metrics: metrics(bucket),
        guest: { noncancelled_amount: String(68000 + i * 8100) },
      };
    },
  );
  const group = (field: string, items: Rec[]) =>
    items.map((item) => ({
      ...item,
      ...metrics(rows.filter((x) => x[field] === item.id)),
    }));
  return {
    schema_version: 3,
    calculation_version: 9,
    venue: venues.find((x) => x.id === venueId),
    period: { start, end_exclusive: end, granularity },
    filters: Object.fromEntries(
      [...url.searchParams].filter(([key]) =>
        [
          "staff_id",
          "hall_id",
          "table_id",
          "category_id",
          "source",
          "status",
          "expired",
        ].includes(key),
      ),
    ),
    freshness: {
      ready: true,
      complete: true,
      expected_days: length,
      available_days: length,
      missing_days: [],
      message: "Синтетические снимки",
      generated_at: new Date().toISOString(),
    },
    summary: metrics(rows),
    series,
    staff_activity: group(
      "staff_id",
      names.map((name, i) => ({
        id: 11 + i,
        name,
        role: "waiter",
        reaction_median_seconds: 65 + i * 8,
        reaction_p90_seconds: 130 + i * 10,
        rating_score: 96 - i * 3,
        rank_in_role: i + 1,
      })),
    ),
    tables: group(
      "table_id",
      Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: `Стол ${i + 1}`,
        hall_name: i > 4 ? "Терраса" : "Основной зал",
      })),
    ),
    categories: group("category_id", [
      { id: 10, name: "Официант" },
      { id: 11, name: "Счёт" },
      { id: 20, name: "Помощь" },
      { id: 30, name: "Другое" },
    ]),
    guest: {
      sessions: 483,
      bill_requests: 120,
      orders: 147,
      noncancelled_orders: 139,
      noncancelled_amount: "786540.00",
      average_order_amount: "5658.56",
      languages: [
        { lang: "ru", count: 359 },
        { lang: "kk", count: 89 },
        { lang: "en", count: 35 },
      ],
      products: [
        {
          id: 101,
          name: "Паста с белыми грибами",
          quantity: 34,
          amount: "144500.00",
        },
      ],
    },
    complaints: {
      total: 9,
      reasons: [
        { name: "Долгое ожидание", count: 5 },
        { name: "Качество блюда", count: 4 },
      ],
    },
    orders: {
      opened: 188,
      paid_closed_count: 155,
      paid_closed_amount: "963200.00",
    },
    climate: {
      temperature: { count: 128, avg: 23.6, min: 21.1, max: 25.4 },
      humidity: { count: 128, avg: 44.1, min: 39, max: 51 },
    },
    quality: { invalid_reactions: 0, open_shifts: 2 },
    comparison: { comparable: false },
    notes: ["Все данные синтетические"],
  };
}
export async function demoRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const url = new URL(path, "https://demo.invalid/"),
    parts = url.pathname.split("/").filter(Boolean),
    method = options.method || "GET";
  if (parts[0] === "me")
    return ok({
      id: 1,
      full_name: "Демо-администратор",
      email: "demo@example.test",
      venues,
    });
  const [, vid, resource, id, action] = parts,
    data = database()[vid];
  if (!data) return fail("Заведение недоступно", 404);
  if (resource === "schema") return ok(schema);
  if (resource === "analytics") {
    if (id === "filters")
      return ok({
        staff: names.map((name, i) => ({ id: 11 + i, name })),
        halls: [
          { id: 1, name: "Основной зал" },
          { id: 2, name: "Терраса" },
        ],
        tables: Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          name: `Стол ${i + 1}`,
        })),
        categories: [
          { id: 10, name: "Официант" },
          { id: 11, name: "Счёт" },
          { id: 20, name: "Помощь" },
          { id: 30, name: "Другое" },
        ],
        sources: [
          { id: "button", name: "QR-кнопка" },
          { id: "app", name: "Приложение" },
        ],
      });
    if (id === "health")
      return ok({
        status: "ok",
        ready: true,
        last_success_at: new Date().toISOString(),
      });
    if (id === "export") {
      const { exportDemo } = await import("./demo-export");
      return exportDemo(
        analytics(url, Number(vid)),
        url.searchParams.get("file_format") || "json",
      );
    }
    return ok(analytics(url, Number(vid)));
  }
  if (!data[resource]) return fail("Не найдено", 404);
  let body: Rec = {};
  if (options.body instanceof FormData) {
    for (const [key, value] of options.body) {
      if (value instanceof File) {
        const bytes = new Uint8Array(await value.arrayBuffer());
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 8192)
          binary += String.fromCharCode(
            ...bytes.subarray(offset, offset + 8192),
          );
        body[key] = `data:${value.type};base64,${btoa(binary)}`;
      } else {
        try {
          body[key] = JSON.parse(value);
        } catch {
          body[key] = value;
        }
      }
    }
  } else if (typeof options.body === "string") {
    try {
      body = JSON.parse(options.body);
    } catch {
      return fail("Неверный JSON");
    }
  }
  if (
    method === "POST" &&
    (resource === "reports" || resource === "jobs" || action === "translate")
  ) {
    const job = {
      id: Date.now(),
      kind: action === "translate" ? "translation" : "reports",
      status: "completed",
      phase: "completed",
      processed: 1,
      total: 1,
      created_at: new Date().toISOString(),
      scheduled_for: new Date().toISOString(),
      error: null,
    };
    data.jobs.unshift(job);
    if (resource === "reports") {
      const n = Math.min(
        365,
        Math.max(
          0,
          Math.round(
            (Date.parse(body.end) - Date.parse(body.start)) / 86400000,
          ) + 1,
        ),
      );
      for (let i = 0; i < n; i++) {
        const date = new Date(Date.parse(body.start) + i * 86400000)
          .toISOString()
          .slice(0, 10);
        data.reports = data.reports.filter((x) => x.date !== date);
        data.reports.unshift({
          id: Date.now() + i,
          date,
          calculation_version: 9,
          calculated_at: new Date().toISOString(),
          payload: {
            summary: metrics(
              callsFor(
                new URL(
                  `https://demo.invalid/?start=${date}&end=${new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10)}`,
                ),
                Number(vid),
              ),
            ),
          },
        });
      }
    }
    if (action === "translate")
      for (const row of [...data.items, ...data.categories].filter(
        (x) => x.menu === Number(id),
      )) {
        row.name_en ||= `Demo · ${row.name_ru}`;
        row.name_kk ||= `Демо · ${row.name_ru}`;
        row.updated_at = new Date().toISOString();
      }
    persist();
    return ok(job, 201);
  }
  if (method === "POST" || method === "PATCH") {
    const fields = (schema as Rec)[resource];
    if (!fields) return fail("Ресурс только для чтения", 405);
    const values = Object.fromEntries(
      Object.entries(body).filter(
        ([key]) => Object.hasOwn(fields, key) && !fields[key].read_only,
      ),
    );
    const old = data[resource].find((x) => x.id === Number(id));
    if (method === "PATCH" && !old) return fail("Не найдено", 404);
    if (old && new Headers(options.headers).get("If-Match") !== old.updated_at)
      return fail("Запись уже изменена. Обновите её.", 409);
    const record = {
      ...(old || { id: Date.now(), is_active: true }),
      ...values,
      updated_at: new Date().toISOString(),
    };
    if (old) Object.assign(old, record);
    else data[resource].unshift(record);
    persist();
    return ok(record, old ? 200 : 201);
  }
  if (resource === "calls" && id) {
    const time = Math.floor(Number(id) / 100) * 86400000;
    url.searchParams.set("start", new Date(time).toISOString().slice(0, 10));
    url.searchParams.set(
      "end",
      new Date(time + 86400000).toISOString().slice(0, 10),
    );
  }
  let rows = resource === "calls" ? callsFor(url, Number(vid)) : data[resource];
  if (resource === "reports" && !rows.length)
    rows = Array.from({ length: 7 }, (_, i) => ({
      id: 701 + i,
      date: day(-i - 1),
      calculation_version: 9,
      calculated_at: new Date().toISOString(),
      payload: { summary: { calls_total: 37 + i } },
    }));
  if (resource === "shifts")
    rows = rows.map((x) => ({
      ...x,
      opened_at: day(-1) + "T04:00:00Z",
      closed_at: x.closed_at ? day(-1) + "T14:00:00Z" : null,
    }));
  if (id)
    return rows.find((x) => x.id === Number(id))
      ? ok(rows.find((x) => x.id === Number(id)))
      : fail("Не найдено", 404);
  for (const key of ["menu", "category", "menu_item", "group", "staff_id"])
    if (url.searchParams.get(key))
      rows = rows.filter((x) => String(x[key]) === url.searchParams.get(key));
  if (resource === "shifts")
    rows = rows.filter(
      (x) =>
        (!url.searchParams.get("start") ||
          x.opened_at >= url.searchParams.get("start")!) &&
        (!url.searchParams.get("end") ||
          x.opened_at < url.searchParams.get("end")!),
    );
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1),
    offset = (page - 1) * 50;
  return ok({
    count: rows.length,
    next: offset + 50 < rows.length ? "next" : null,
    previous: page > 1 ? "previous" : null,
    results: rows.slice(offset, offset + 50),
  });
}
