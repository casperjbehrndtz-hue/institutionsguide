import { test, expect } from "@playwright/test";

test.describe("Landing flow", () => {
  test("hero renders and shows national top 5", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Find den bedste institution/i })).toBeVisible();

    // National top 5 panel for Folkeskoler appears (default category)
    await expect(page.getByRole("heading", { name: /Danmarks 5 bedste/i })).toBeVisible({ timeout: 15_000 });
  });

  test("category toggle switches to Vuggestuer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Vuggestuer" }).click();
    await expect(page.getByRole("heading", { name: /Danmarks 5 bedste vuggestuer/i })).toBeVisible({ timeout: 15_000 });
  });

  test("trust bar shows official sources", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Officiel data fra")).toBeVisible();
    await expect(page.getByText("Børne- og Undervisningsministeriet")).toBeVisible();
  });
});
