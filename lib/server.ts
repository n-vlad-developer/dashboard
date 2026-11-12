import { NextResponse } from "next/server";
export const API_BASE = (
  process.env.Q1_API_BASE_URL || "https://api.mindtech.kz/api/dashboard"
).replace(/\/+$/g, "");
export function error(message: string, status = 400) {
  return NextResponse.json({ detail: message }, { status });
}
export async function backend(path: string, init: RequestInit = {}) {
  const [pathname, query] = path.split("?", 2);
  const upstreamUrl = `${API_BASE}/${pathname.replace(/^\/+|\/+$/g, "")}/${query ? `?${query}` : ""}`;
  return fetch(upstreamUrl, {
    cache: "no-store",
    ...init,
    redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(20000),
  });
}
export async function jsonUpstream(response: Response) {
  if (response.status >= 500)
    return error("Сервис Q1 временно недоступен. Повторите позже.", 502);
  const payload = await response.text();
  if (payload) {
    try {
      JSON.parse(payload);
    } catch {
      return error("Сервис Q1 вернул некорректный ответ", 502);
    }
  }
  return new NextResponse(payload || null, {
    status: response.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
