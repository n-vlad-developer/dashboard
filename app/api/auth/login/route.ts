import { boundedBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { backend, error, jsonUpstream } from "@/lib/server";
import { assertSessionConfigured } from "@/lib/session";

// API v9.3: сначала создаётся запрос подтверждения.
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = JSON.parse(
      new TextDecoder().decode(await boundedBody(request, 16384)),
    );
  } catch {
    return error("Неверный формат запроса", 400);
  }

  if (!body || typeof body !== "object") {
    return error("Введите email и пароль", 400);
  }

  const values = body as Record<string, unknown>;
  const email = typeof values.email === "string" ? values.email.trim() : "";
  const password = typeof values.password === "string" ? values.password : "";

  if (!email || !password || email.length > 254) {
    return error("Введите email и пароль", 400);
  }

  try {
    assertSessionConfigured();
  } catch {
    return error(
      "Вход временно недоступен: на сервере не настроено сохранение сессии. Обратитесь к администратору.",
      503,
    );
  }

  try {
    const upstream = await backend("auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (upstream.status !== 202) {
      if (!upstream.ok) return jsonUpstream(upstream);
      return error("Сервер входа ещё не обновлён до API v9.3", 502);
    }

    const payload: unknown = await upstream.json();
    const data =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};

    if (
      typeof data.challenge_id !== "string" ||
      !data.challenge_id.trim() ||
      data.requires_email_code !== true
    ) {
      return error("API не вернул запрос подтверждения входа", 502);
    }

    const expiresIn =
      typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
        ? data.expires_in
        : 600;

    return NextResponse.json(
      {
        requires_email_code: true,
        challenge_id: data.challenge_id,
        expires_in: Math.max(1, Math.min(expiresIn, 600)),
      },
      {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (cause) {
    console.error(
      "[Q1 AUTH /login]",
      cause instanceof Error ? cause.message : "network error",
    );
    return error("Не удалось связаться с Q1 API", 502);
  }
}
