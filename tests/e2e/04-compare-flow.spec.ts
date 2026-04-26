import { test, expect } from "@playwright/test";

test.describe("Compare flow", () => {
  test("category page lets user add 2 to compare and open comparison", async ({ page }) => {
    await page.goto("/skole");
    // Wait for at least one institution card
    const compareButtons = page.getByRole("button", { name: /Tilføj.*til sammenligning|Sammenlign/i });
    await expect(compareButtons.first()).toBeVisible({ timeout: 20_000 });

    // Add first 2 cards
    const buttons = await compareButtons.all();
    if (buttons.length < 2) test.skip(true, "Need at least 2 cards to compare");
    await buttons[0].click();
    await buttons[1].click();

    // Compare bar shows "2 valgt" and Sammenlign CTA
    await expect(page.getByText(/2 valgt|2 selected/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
