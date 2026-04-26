import { test, expect } from "@playwright/test";

test.describe("InstantAnswer search", () => {
  test("typing a postnummer narrows results", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder(/postnummer eller by/i);
    await input.click();
    await input.fill("8000");
    // Dropdown shows at least one candidate
    await expect(page.getByRole("button", { name: /Aarhus C/i }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Aarhus C/i }).first().click();
    // Top results panel for the location
    await expect(page.getByRole("heading", { name: /Top \d folkeskoler i 8000/i })).toBeVisible({ timeout: 15_000 });
  });

  test("quick-pick chip selects a popular postnummer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^2100 København Ø$/ }).click();
    await expect(page.getByRole("heading", { name: /folkeskoler i 2100/i })).toBeVisible({ timeout: 15_000 });
  });

  test("X button clears selection and restores national top 5", async ({ page }) => {
    await page.goto("/?pn=8000&cat=skole");
    await expect(page.getByRole("heading", { name: /folkeskoler i 8000/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Skift område/i }).click();
    await expect(page.getByRole("heading", { name: /Danmarks 5 bedste folkeskoler/i })).toBeVisible({ timeout: 10_000 });
  });
});
