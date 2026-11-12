import { NextRequest, NextResponse } from "next/server";
/** Fail closed for browser mutations, including login, logout and multipart uploads. */
export function proxy(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const local = new URL(request.url);
    // Next's local listener can use localhost internally while the browser uses 127.0.0.1.
    if (process.env.NODE_ENV !== "production" && request.headers.get("host"))
      local.host = request.headers.get("host")!;
    const expected = new URL(process.env.APP_ORIGIN || local.origin).origin;
    const site = request.headers.get("sec-fetch-site");
    if (
      site === "cross-site" ||
      site === "same-site" ||
      (origin ? origin !== expected : site !== "same-origin")
    )
      return NextResponse.json(
        { detail: "Недопустимый источник запроса" },
        { status: 403 },
      );
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 11 * 1024 * 1024)
      return NextResponse.json(
        { detail: "Запрос слишком большой" },
        { status: 413 },
      );
  }
  return NextResponse.next();
}
export const config = { matcher: "/api/:path*" };
