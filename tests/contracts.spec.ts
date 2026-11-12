import { test, expect } from "@playwright/test";
import { demoRequest } from "../lib/demo";
import { unzipSync, strFromU8 } from "fflate";
const json = async (path: string, init?: RequestInit) =>
  (await demoRequest(path, init)).json();
test("v9 data, filters, totals and half-hour buckets", async () => {
  const root = "venues/2/analytics?start=2026-11-01&end=2026-11-08";
  const all = await json(root),
    filtered = await json(root + "&staff_id=11"),
    half = await json(root + "&granularity=half_hour");
  expect(all.schema_version).toBe(3);
  expect(all.calculation_version).toBe(9);
  expect(all.summary.calls_total).toBe(
    all.series.reduce((s: number, x: any) => s + x.metrics.calls_total, 0),
  );
  expect(filtered.summary.calls_total).toBeLessThan(all.summary.calls_total);
  expect(half.series).toHaveLength(336);
  expect(half.summary.calls_total).toBe(all.summary.calls_total);
});
test("create, read, patch, conflict and venue isolation", async () => {
  const create = await json("venues/2/items", {
    method: "POST",
    body: JSON.stringify({
      menu: 12,
      name_ru: "Тестовая паста",
      price: "1234.00",
    }),
  });
  expect(create.id).toBeTruthy();
  expect((await json(`venues/2/items/${create.id}`)).name_ru).toBe(
    "Тестовая паста",
  );
  expect((await demoRequest(`venues/3/items/${create.id}`)).status).toBe(404);
  expect(
    (
      await demoRequest(`venues/2/items/${create.id}`, {
        method: "PATCH",
        headers: { "If-Match": "old" },
        body: '{"price":"10"}',
      })
    ).status,
  ).toBe(409);
  const updated = await json(`venues/2/items/${create.id}`, {
    method: "PATCH",
    headers: { "If-Match": create.updated_at },
    body: '{"price":"2345.00"}',
  });
  expect(updated.price).toBe("2345.00");
});
test("call detail keeps selected date and filters paginate", async () => {
  const calls = await json("venues/2/calls?start=2026-10-01&end=2026-10-08");
  expect(calls.results).toHaveLength(50);
  expect(calls.next).toBeTruthy();
  const row = calls.results[0],
    detail = await json(`venues/2/calls/${row.id}`);
  expect(detail.created_at).toBe(row.created_at);
  const filtered = await json("venues/2/calls?staff_id=11");
  expect(filtered.results.every((x: any) => x.staff_id === 11)).toBe(true);
});
test("reports, job details and translations", async () => {
  const job = await json("venues/2/reports", {
    method: "POST",
    body: '{"start":"2026-11-01","end":"2026-11-03"}',
  });
  expect((await json(`venues/2/jobs/${job.id}`)).status).toBe("completed");
  expect((await json("venues/2/reports")).count).toBe(3);
  expect(
    (
      await demoRequest("venues/2/menus/13/translate", {
        method: "POST",
        body: "{}",
      })
    ).status,
  ).toBe(201);
  expect((await json("venues/2/items/104")).name_kk).toBeTruthy();
});
test("exports are actual JSON, CSV and XLSX", async () => {
  const root =
    "venues/2/analytics/export?start=2026-11-01&end=2026-11-03&file_format=";
  expect((await json(root + "json")).schema_version).toBe(3);
  expect(await (await demoRequest(root + "csv")).text()).toContain(
    "2026-11-01",
  );
  const bytes = new Uint8Array(
      await (await demoRequest(root + "xlsx")).arrayBuffer(),
    ),
    files = unzipSync(bytes);
  expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain("2026-11-01");
});
test("proxy rejects foreign mutations and anonymous access", async ({
  request,
  baseURL,
}) => {
  expect(
    (
      await request.post("/api/auth/logout", {
        headers: { origin: "https://attacker.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/auth/login", {
        headers: { origin: baseURL! },
        data: {},
      })
    ).status(),
  ).toBe(400);
  expect((await request.get("/api/q1/me")).status()).toBe(401);
  expect((await request.get("/api/q1/admin")).status()).toBe(404);
  const res = await request.get("/demo");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(await res.text()).toContain("q1-social-v1.png");
});
