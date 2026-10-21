import { expect, test } from "@playwright/test";

test.describe("product smoke and regression QA", () => {
  test("loads the Hebrew RTL editor with the default prayer schedule", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page.locator("main.app-shell")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "יוצרים לוח זמני תפילה בדקות" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "מה יופיע השבוע?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "הורדת PNG" })).toBeEnabled({ timeout: 20_000 });

    const prayerNames = page.getByLabel("שם התפילה או האירוע");
    await expect(prayerNames.filter({ hasValue: "מנחה" }).first()).toBeVisible();
    await expect(page.getByDisplayValue("זמני תפילות ביום חול")).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
  });

  test("free-text flow populates poster content in the requested order", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "טקסט חופשי" }).click();

    const freeText = page.getByRole("textbox", { name: "כתבו את כל הפרטים במשפט או בכמה שורות" });
    await freeText.fill("כותרת הלוח: שבת מיוחדת\nמנחה 18:05\nהבדלה\nערבית 19:10");
    await page.getByRole("button", { name: "מילוי אוטומטי מהטקסט" }).click();

    await expect(page.getByDisplayValue("שבת מיוחדת")).toBeVisible();
    const values = await page.getByLabel("שם התפילה או האירוע").evaluateAll((nodes) =>
      nodes.map((node) => node.value),
    );
    expect(values).toContain("מנחה");
    expect(values).toContain("ערבית");

    const orderedValues = await page.locator(".content-item").evaluateAll((items) =>
      items.map((item) => {
        const input = item.querySelector("input[aria-label='שם התפילה או האירוע'], input[aria-label='שורה רגילה'], input[aria-label='כותרת']");
        return input?.value ?? "";
      }),
    );
    expect(orderedValues.indexOf("מנחה")).toBeLessThan(orderedValues.indexOf("הבדלה"));
    expect(orderedValues.indexOf("הבדלה")).toBeLessThan(orderedValues.indexOf("ערבית"));
  });

  test("rejects an unsupported background file", async ({ page }) => {
    await page.goto("/");
    await page.locator("#background-upload").setInputFiles({
      name: "not-an-image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("qa"),
    });
    await expect(page.getByText("אפשר לבחור תמונת PNG, JPG או WEBP.")).toBeVisible();
  });

  test("downloads a PNG poster", async ({ page }) => {
    await page.goto("/");
    const downloadButton = page.getByRole("button", { name: "הורדת PNG" });
    await expect(downloadButton).toBeEnabled({ timeout: 20_000 });

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^זמני-תפילה-\d{4}-\d{2}-\d{2}\.png$/);
  });

  test("API creates a poster link and rejects malformed product input", async ({ request }) => {
    const valid = await request.post("/api/create-poster", {
      data: {
        mainTitle: "זמני תפילה",
        items: [
          { kind: "heading", text: "יום שבת" },
          { kind: "timed", text: "שחרית", time: "07:30" },
          { kind: "text", text: "הבדלה" },
        ],
      },
    });
    expect(valid.ok()).toBeTruthy();
    const validJson = await valid.json();
    expect(validJson.preview_url).toMatch(/^https?:\/\//);
    expect(validJson.edit_url).toMatch(/^https?:\/\//);

    const malformed = await request.post("/api/create-poster", {
      headers: { "content-type": "application/json" },
      data: [],
    });
    expect(malformed.status()).toBe(400);

    const wrongType = await request.post("/api/create-poster", {
      headers: { "content-type": "text/plain" },
      data: "hello",
    });
    expect(wrongType.status()).toBe(415);
  });

  test("OpenAPI contract exposes the prayer poster operation", async ({ request }) => {
    const response = await request.get("/api/openapi");
    expect(response.ok()).toBeTruthy();
    const schema = await response.json();
    expect(schema.openapi).toBe("3.1.0");
    expect(schema.paths["/api/create-poster"].post.operationId).toBe("createPrayerPoster");
    expect(schema.components.schemas.Poster.properties.items.maxItems).toBe(60);
  });

  test("mobile layout has no horizontal product overflow", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "יוצרים לוח זמני תפילה בדקות" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await expect(page.getByRole("button", { name: "הורדת PNG" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
  });
});
