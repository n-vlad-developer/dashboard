import { NextRequest, NextResponse } from "next/server";
import { clearSession, readSession, saveSession } from "@/lib/session";
import { backend, DEMO, error, jsonUpstream } from "@/lib/server";
import { mock } from "@/lib/mock";

type Method = "GET" | "POST" | "PATCH";
type Context = { params: Promise<{ path: string[] }> };
const MENU = /^(menus|categories|items|modifier-groups|modifiers|synonyms)$/;
const MENU_OBJECT = /^(menus|categories|items|modifier-groups|modifiers|synonyms)\/\d+$/;
const READONLY = /^(calls|shifts|reports|jobs)(?:\/\d+)?$/;
const ANALYTICS = /^analytics(?:\/(?:filters|export|health))?$/;

function permitted(path: string, method: Method): boolean {
  if (path === "me") return method === "GET";
  const match = /^venues\/(\d+)\/(.+)$/.exec(path);
  if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) < 1) return false;
  const resource = match[2];
  if (resource === "schema") return method === "GET";
  if (ANALYTICS.test(resource)) return method === "GET";
  if (resource === "reports") return method === "GET" || method === "POST";
  if (/^jobs\/\d+$/.test(resource)) return method === "GET" || method === "POST";
  if (READONLY.test(resource)) return method === "GET";
  if (/^menus\/\d+\/translate$/.test(resource)) return method === "POST";
  if (MENU.test(resource)) return method === "GET" || method === "POST";
  if (MENU_OBJECT.test(resource)) return method === "GET" || method === "PATCH";
  return false;
}

function demoResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function downloadResponse(response: Response) {
  // CSV / XLSX должны оставаться файлами. Не вызываем jsonUpstream() для успешного экспорта.
  const headers = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
  const disposition = response.headers.get("Content-Disposition");
  if (disposition) headers.set("Content-Disposition", disposition);
  return new NextResponse(response.body, { status: response.status, headers });
}

async function proxy(request: NextRequest, context: Context, method: Method) {
  const { path: segments } = await context.params;
  const path = segments.join("/");
  if (!permitted(path, method)) return error("Недопустимый путь или метод API", 404);
  const session = await readSession();
  if (!session) return error("Требуется вход", 401);

  const url = new URL(request.url);
  if (session.demo) {
    if (!DEMO) { await clearSession(); return error("Демо отключено. Войдите с настоящим аккаунтом.", 401); }
    const result = mock(segments, url, method);
    return demoResponse(result.body, result.status);
  }
  if (!session.access || !session.refresh) return error("Требуется вход", 401);

  const headers = new Headers();
  const type = request.headers.get("content-type");
  const match = request.headers.get("if-match");
  const idempotency = request.headers.get("idempotency-key");
  if (type) headers.set("Content-Type", type);
  if (match) headers.set("If-Match", match);
  if (idempotency) headers.set("Idempotency-Key", idempotency);

  const options: RequestInit = { method, headers, cache: "no-store" };
  if (method !== "GET") options.body = await request.arrayBuffer();
  const upstreamPath = path + url.search;
  const send = (access: string) => { headers.set("Authorization", `Bearer ${access}`); return backend(upstreamPath, options); };

  try {
    let response = await send(session.access);
    if (response.status === 401) {
      const refresh = await backend("auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh: session.refresh }) });
      if (!refresh.ok) { await clearSession(); return error("Сессия истекла. Войдите повторно.", 401); }
      const renewed = await refresh.json();
      if (typeof renewed.access !== "string") return error("Не удалось обновить сессию", 401);
      await saveSession({ ...session, access: renewed.access });
      response = await send(renewed.access);
      if (response.status === 401) {
  await clearSession();
  return error("Сессия отозвана. Войдите повторно.", 401);
}
    }
    if (method === "GET" && /\/analytics\/export$/.test(path) && response.ok) return downloadResponse(response);
    return jsonUpstream(response);
  } catch (cause) {
    console.error("[Q1 API PROXY]", cause);
    return error("Не удалось связаться с Q1 API", 502);
  }
}

export const GET = (request: NextRequest, ctx: Context) => proxy(request, ctx, "GET");
export const POST = (request: NextRequest, ctx: Context) => proxy(request, ctx, "POST");
export const PATCH = (request: NextRequest, ctx: Context) => proxy(request, ctx, "PATCH");
