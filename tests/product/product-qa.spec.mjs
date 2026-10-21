import { test, expect } from "@playwright/test";

function collectRuntimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

test("default poster editor is usable, RTL and render-ready", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/");

  await expect(page.locator("main.app-shell")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "יוצרים לוח זמני תפילה בדקות" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "מה יופיע השבוע?" })).toBeVisible();
  await expect(page.getByDisplayValue("זמני תפילה")).toBeVisible();
  await expect(page.getByRole("button", { name: "הורדת PNG" })).toBeEnabled({ timeout: 20_000 });

  const canvasSize = await page.locator('canvas[aria-label="תצוגה מקדימה של הלוח"]').evaluate((canvas) => ({
    width: canvas.width,
    height: canvas.height,
  }));
  expect(canvasSize.width).toBeGreaterThan(500);
  expect(canvasSize.height).toBeGreaterThan(500);

  expect(runtimeErrors, runtimeErrors.join("\n")).toEqual([]);
});

test("free-text flow creates an editable Hebrew schedule", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "טקסט חופשי" }).click();
  const textarea = page.locator("textarea");
  await textarea.fill('כותרת הלוח: זמני חג\nפרשת נח\nמנחה ערב שבת 18:30, שחרית 08:00, הבדלה.');
  await page.getByRole("button", { name: "מילוי אוטומטי מהטקסט" }).click();

  await expect(page.getByDisplayValue("זמני חג")).toBeVisible();
  await expect(page.getByDisplayValue('פרשת השבוע "נח"')).toBeVisible();
  await expect(page.locator('input[aria-label="שעה"][value="18:30"]')).toBeVisible();
  await expect(page.locator('input[aria-label="שעה"][value="08:00"]')).toBeVisible();
  await expect(page.getByDisplayValue("הבדלה")).toBeVisible();
});

test("poster API creates a shareable result that reopens in the editor", async ({ page, request }) => {
  const response = await request.post("/api/create-poster", {
    data: {
      mainTitle: "בדיקת QA",
      items: [
        { kind: "heading", text: "יום שבת" },
        { kind: "timed", text: "מנחה", time: "19:10" },
        { kind: "text", text: "הבדלה" },
      ],
    },
  });
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.preview_url).toContain("?d=");
  expect(payload.edit_url).toBe(payload.preview_url);

  await page.goto(payload.preview_url);
  await expect(page.getByDisplayValue("בדיקת QA")).toBeVisible();
  await expect(page.getByDisplayValue("יום שבת")).toBeVisible();
  await expect(page.getByDisplayValue("מנחה")).toBeVisible();
  await expect(page.locator('input[aria-label="שעה"][value="19:10"]')).toBeVisible();
});

test("invalid API inputs are rejected cleanly", async ({ request }) => {
  const wrongType = await request.post("/api/create-poster", {
    headers: { "content-type": "text/plain" },
    data: "not-json",
  });
  expect(wrongType.status()).toBe(415);

  const invalidJson = await request.fetch("/api/create-poster", {
    method: "POST",
    headers: { "content-type": "application/json" },
    data: "{",
  });
  expect(invalidJson.status()).toBe(400);
});

test("supporting routes load and navigation remains intact", async ({ page }) => {
  await page.goto("/gpt");
  await expect(page.getByRole("heading", { name: "GPT ללוחות זמני תפילה" })).toBeVisible();
  await expect(page.getByText("/api/openapi")).toBeVisible();

  await page.goto("/privacy");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("body")).toContainText("פרטיות");
});

test("mobile layout has no page-level horizontal overflow", async ({ page }, testInfo) => {
  if (!testInfo.project.name.startsWith("mobile")) return;
  await page.goto("/");
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  await expect(page.getByRole("button", { name: "הורדת PNG" })).toBeVisible();
});
