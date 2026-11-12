import { test, expect } from "@playwright/test";
test("complete splash and readable full-width Windows menu", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const seen = new Set<Element>();
    Object.assign(window, { splashMounts: seen });
    new MutationObserver(() => {
      document
        .querySelectorAll("[data-q1-splash]")
        .forEach((el) => seen.add(el));
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/demo", { waitUntil: "domcontentloaded" });
  const splash = page.locator("[data-q1-splash]");
  await expect(splash).toBeVisible();
  await expect(splash).toHaveAttribute("data-playing", "true");
  // The dashboard is already mounted behind the overlay, not on its exit frame.
  await expect(page.locator(".dashboard-shell")).toBeAttached();
  await expect(page.locator(".dashboard-shell").locator("..")).toHaveAttribute(
    "inert",
    "",
  );
  const started = Date.now();
  await page.waitForTimeout(900);
  await expect(splash).toBeVisible();
  await expect(splash).toHaveCount(0, { timeout: 10000 });
  expect(Date.now() - started).toBeGreaterThan(1500);
  await page.getByRole("button", { name: "Меню и блюда", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Синонимы", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("tab")).toHaveCount(5);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { splashMounts: Set<Element> }).splashMounts.size,
    ),
  ).toBe(1);
  await expect(splash).toHaveCount(0);
  const sizes = await page.locator(".menu-table").evaluate((el) => ({
    table: el.getBoundingClientRect().width,
    container: el.parentElement!.getBoundingClientRect().width,
    font: parseFloat(getComputedStyle(el.querySelector("td")!).fontSize),
  }));
  expect(sizes.table).toBeGreaterThan(sizes.container * 0.97);
  expect(sizes.font).toBeGreaterThanOrEqual(14);
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-menu-windows.png`,
    fullPage: true,
  });
});
test("report retry, Q1 error page and social metadata", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Фоновые задания", exact: true })
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "#122" })
    .getByRole("button", { name: "Открыть задание" })
    .click();
  await page
    .getByRole("button", { name: "Повторить пересчёт", exact: true })
    .click();
  await expect(page.getByText(/Пересчёт #\d+ завершён\./)).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /q1-social-v1.png$/,
  );
  await expect(
    page.locator('link[rel="icon"][type="image/svg+xml"]'),
  ).toHaveAttribute("href", "/brand/q1-icon.svg");
  await page.goto("/page-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "А где страница?" }),
  ).toBeVisible();
  await expect(page.locator(".q1-error-cat")).toBeVisible();
});
const sections = [
  "Обзор",
  "Аналитика",
  "Меню и блюда",
  "История вызовов",
  "Смены и команда",
  "Отчёты",
  "Фоновые задания",
];
test("responsive sections, shared dates and no real API requests", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [],
    requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/api/q1/")) requests.push(r.url());
  });
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Пульс вашего ресторана",
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of sections) {
      if (width <= 800)
        await page
          .getByRole("button", { name: "Открыть меню", exact: true })
          .click();
      await page
        .getByRole("navigation", { name: "Разделы кабинета" })
        .getByRole("button", { name, exact: true })
        .click();
      await expect(page.locator(".q1-breadcrumb-current")).toHaveText(name);
      await expect(page.locator(".alert-error")).toHaveCount(0);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      ).toBeTruthy();
    }
  }
  await page.getByRole("button", { name: "Обзор", exact: true }).click();
  await page.getByRole("button", { name: "Открыть календарь" }).first().click();
  await expect(page.getByRole("dialog", { name: "Выбор даты" })).toBeVisible();
  await page.getByRole("button", { name: "Предыдущий месяц" }).click();
  await page.getByRole("dialog", { name: "Выбор даты" }).press("Escape");
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-desktop.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});
test("demo editor persists and mobile cards expose all actions", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await page.getByRole("button", { name: "Меню и блюда", exact: true }).click();
  await page
    .getByRole("button", { name: "Добавить блюдо", exact: true })
    .click();
  await page.getByLabel("Меню *", { exact: true }).fill("12");
  await page
    .getByLabel("Название (RU) *", { exact: true })
    .fill("Тестовый салат");
  await page.getByLabel("Цена", { exact: true }).fill("2500");
  await page.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Запись успешно создана");
  await page.reload();
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await page.getByRole("button", { name: "Меню и блюда", exact: true }).click();
  await page
    .getByRole("button", { name: "Редактировать Тестовый салат", exact: true })
    .click();
  await expect(page.getByLabel("Цена", { exact: true })).toHaveValue("2500");
  await page.getByLabel("Цена", { exact: true }).fill("2700");
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Изменения сохранены");
  expect(
    await page
      .locator(".responsive-table tbody td")
      .first()
      .evaluate((el) => getComputedStyle(el, "::before").display),
  ).not.toBe("none");
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-mobile.png`,
    fullPage: true,
  });
});
