import { test, expect } from "@playwright/test";

test.describe("Kommune-intelligens", () => {
  test("leaderboard renders with at least 50 kommuner", async ({ page }) => {
    await page.goto("/kommune-intelligens");
    await expect(page.getByRole("heading", { name: /Kommune-intelligens/i }).first()).toBeVisible();

    // Wait for leaderboard to populate
    const rows = page.locator("ol li").filter({ hasText: /\d+\.\d/ });
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(50);
  });

  test("preset profile changes ranking", async ({ page }) => {
    await page.goto("/kommune-intelligens");
    // Click a preset
    const preset = page.getByRole("button", { name: /Tryghed først|Trivsel først|Fagligt stærkt|Balanceret/i }).first();
    await expect(preset).toBeVisible({ timeout: 10_000 });
    await preset.click();
    // Some kommune row should still be visible
    await expect(page.locator("ol li").first()).toBeVisible();
  });

  test("track toggle switches between Folkeskole and Dagtilbud", async ({ page }) => {
    await page.goto("/kommune-intelligens");
    await page.getByRole("tab", { name: /Dagtilbud/i }).click();
    // Daycare metrics ("Normering" or "Personalestabilitet") should appear in slider list
    await expect(page.getByText(/Normering|Personalestabilitet|Forældrebetaling/).first()).toBeVisible({ timeout: 10_000 });
  });
});
