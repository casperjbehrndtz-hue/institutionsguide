import { test, expect } from "@playwright/test";

test.describe("Kommune pages", () => {
  test("canonical kommune URL renders institutions", async ({ page }) => {
    await page.goto("/kommune/Gentofte");
    await expect(page.getByRole("heading", { name: /Gentofte/i }).first()).toBeVisible();
    // At least one institution category section (Skoler, Vuggestuer, etc.)
    const categoryHeadings = page.getByRole("heading", { level: 2 });
    await expect(categoryHeadings.first()).toBeVisible({ timeout: 15_000 });
  });

  test("slug-style URL (lowercase) resolves to same kommune", async ({ page }) => {
    await page.goto("/kommune/gentofte");
    // After client hydration the page should show Gentofte content
    await expect(page.getByRole("heading", { name: /Gentofte/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("special character kommune (Tårnby) renders", async ({ page }) => {
    await page.goto("/kommune/" + encodeURIComponent("Tårnby"));
    await expect(page.getByRole("heading", { name: /Tårnby/i }).first()).toBeVisible({ timeout: 15_000 });
  });
});
