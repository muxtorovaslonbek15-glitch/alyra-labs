import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("Alyra Labs smoke", () => {
  test("home loads Alyra Labs brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Alyra Labs" })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole("link", { name: "Open the atelier" }).first()).toBeVisible();
  });

  test("lab loads desk chrome", async ({ page }) => {
    await page.goto("/lab");
    await expect(page.getByText("Alyra Labs").first()).toBeVisible({
      timeout: 45_000,
    });
    // IDE chrome: Tutor | Chat (Lab segment removed — desk stays canvas)
    await expect(page.getByRole("button", { name: /^Tutor$/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole("button", { name: /^Chat$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Lab$/i })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Open equipment|Equipment/i }).first(),
    ).toBeVisible();
  });

  test("place beaker and open chemicals", async ({ page }) => {
    await page.goto("/lab");
    await expect(
      page.getByRole("button", { name: "Equipment", exact: true }),
    ).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("button", { name: "+", exact: true }).first().click();
    await page.getByRole("button", { name: "Chemicals", exact: true }).click();
    await expect(
      page.getByText(/Drag onto desk|Inventory/i).first(),
    ).toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Log in$/i })).toBeVisible();
  });

  test("perfume atelier button opens catalog", async ({ page }) => {
    await page.goto("/lab");
    const perfume = page.getByRole("button", { name: "Perfume", exact: true });
    await expect(perfume).toBeVisible({
      timeout: 45_000,
    });
    await perfume.click();
    await expect(
      page.getByRole("heading", { name: /inspired scents/i }),
    ).toBeVisible();
    await expect(page.getByText(/educational recreations/i)).toBeVisible();
  });
});
