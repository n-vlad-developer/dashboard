
import { NextRequest, NextResponse } from "next/server";
import { backend, error, jsonUpstream } from "@/lib/server";
import { saveSession } from "@/lib/session";

// JWT сохраняем только после успешного подтверждения.
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return error("Неверный формат запроса", 400);
  }

  if (!body || typeof body !== "object") {
    return error("Нужны код и запрос подтверждения", 400);
  }

  const values = body as Record<string, unknown>;
  const challengeId = typeof values.challenge_id === "string"
    ? values.challenge_id.trim() : "";
  const code = values.code;

  if (!challengeId ||
      challengeId.length > 256 ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code)) {
    return error("Введите шестизначный код из письма", 400);
  }

  try {
    const upstream = await backend("auth/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge_id: challengeId, code })
    });

    if (!upstream.ok) return jsonUpstream(upstream);

    const payload: unknown = await upstream.json();
    const data = payload && typeof payload === "object"
      ? payload as Record<string, unknown> : {};

    if (typeof data.access !== "string" || !data.access ||
        typeof data.refresh !== "string" || !data.refresh) {
      return error("Сервер подтвердил код, но не вернул токены", 502);
    }

    await saveSession({
      access: data.access,
      refresh: data.refresh
    });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (cause) {
    console.error("[Q1 AUTH /verify]", cause instanceof Error ? cause.message : "network error");
    return error("Не удалось завершить авторизацию", 502);
  }
}
