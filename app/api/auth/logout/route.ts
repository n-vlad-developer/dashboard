import { NextResponse } from "next/server";
import { backend } from "@/lib/server";
import { clearSession, readSession } from "@/lib/session";
export async function POST() {
  const session = await readSession();
  if (session?.access && !session.demo) {
    try {
      await backend("auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: session.refresh }),
      });
    } catch {}
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
