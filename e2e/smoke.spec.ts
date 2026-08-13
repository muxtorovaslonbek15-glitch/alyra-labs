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

  test("lab loads Wear chooser by default", async ({ page }) => {
    await page.goto("/lab");
    await expect(page.getByText("Alyra Labs").first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole("button", { name: /^Wear$/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("Which compact?")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Try to make your own Alyra/i }),
    ).toBeVisible();
  });

  test("place beaker and open chemicals", async ({ page }) => {
    await page.goto("/lab?audience=composer");
    await expect(
      page.getByRole("button", { name: "Oils", exact: true }),
    ).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("button", { name: "Equipment", exact: true }).click();
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
    await page.goto("/lab?audience=composer");
    await expect(page.getByText("Alyra Labs").first()).toBeVisible({
      timeout: 45_000,
    });
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("button", { name: "Perfume Atelier" }).click();
    await expect(
      page.getByRole("heading", { name: /inspired scents/i }),
    ).toBeVisible();
    await expect(page.getByText(/educational recreations/i)).toBeVisible();
  });
});
