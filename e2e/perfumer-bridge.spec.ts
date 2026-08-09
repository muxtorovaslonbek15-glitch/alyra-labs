import { test, expect } from "@playwright/test";

/**
 * Token-light Perfumer + Lab bridge UI checks.
 * No chat/completions — injects sessionStorage payloads only.
 */
test.describe.configure({ mode: "serial" });

const SAMPLE_BRIDGE = {
  schemaVersion: 1 as const,
  title: "Woody rose QA bridge",
  format: "EDP" as const,
  batchGrams: 100,
  vessel: {
    equipmentId: "beaker" as const,
    autoMix: true,
    heatAttached: false,
  },
  lines: [
    {
      perfumerIngredientId: "ethanol",
      labChemicalId: "c2h5oh",
      name: "Ethanol",
      percent: 55,
      role: "solvent" as const,
      amountMl: 8,
      mapStatus: "alias" as const,
    },
    {
      perfumerIngredientId: "bergamot-oil",
      labChemicalId: "bergamot-oil",
      name: "Bergamot",
      percent: 6,
      role: "top" as const,
      amountMl: 1.2,
      mapStatus: "exact" as const,
    },
    {
      perfumerIngredientId: "hedione",
      labChemicalId: "jasmine-oil",
      name: "Hedione",
      percent: 18,
      role: "heart" as const,
      amountMl: 3.2,
      mapStatus: "proxy" as const,
    },
    {
      perfumerIngredientId: "iso-e-super",
      labChemicalId: "iso-e-super",
      name: "Iso E Super",
      percent: 12,
      role: "heart" as const,
      amountMl: 2.4,
      mapStatus: "exact" as const,
    },
  ],
  mappingReport: {
    mappedCount: 4,
    unmappedCount: 0,
    unmappedIds: [] as string[],
  },
  disclaimer: "Teaching desk demo",
};

const SAMPLE_CHAT_BRIDGE = {
  schemaVersion: 1 as const,
  source: "lab" as const,
  title: "Lab blend QA",
  bridge: SAMPLE_BRIDGE,
  structured: {
    formula: {
      type: "EDP",
      vibe: "Lab blend QA",
      formula: SAMPLE_BRIDGE.lines.map((l) => ({
        id: l.perfumerIngredientId,
        name: l.name,
        percent: l.percent,
        role: l.role,
      })),
    },
    lab_bridge: SAMPLE_BRIDGE,
  },
  assistantMessage:
    "Got your Lab blend. Say what to refine, longevity, projection, or occasion, and I will adjust from what is on the desk.",
};

test.describe("Perfumer UI + Lab bridge (no Groq)", () => {
  test("perfumer chat shell renders without sending", async ({ page }) => {
    await page.goto("/perfumer");
    await expect(page.getByText("Master Perfumer").first()).toBeVisible({
      timeout: 45_000,
    });
    // Guest: auth-gated composer (do not Send — avoids Groq)
    await expect(
      page.getByPlaceholder(/Sign in to brief|Brief me|goal|type|vibe/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /^(Send|Sign in)$/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Plan mode first|Master Perfumer for Indian makers/i),
    ).toBeVisible();
  });

  test("Open in Lab (?bridge=1) loads Plan ready — not silent pour", async ({
    page,
  }) => {
    await page.goto("/lab");
    await expect(page.getByText("Alyra Labs").first()).toBeVisible({
      timeout: 45_000,
    });

    await page.evaluate((bridge) => {
      sessionStorage.setItem("alyra.labBridge.v1", JSON.stringify(bridge));
    }, SAMPLE_BRIDGE);

    await page.goto("/lab?bridge=1");
    await expect(page.getByText(/Plan ready/i)).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByText(/Review the plan|hit Build|Woody rose QA bridge/i).first(),
    ).toBeVisible();
    // Build CTA should be available in Plan panel (desktop rail or phone sheet)
    await expect(page.getByRole("button", { name: /^Build$/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Open in Lab instant (?instant=1) hydrates desk", async ({ page }) => {
    await page.goto("/lab");
    await expect(page.getByText("Alyra Labs").first()).toBeVisible({
      timeout: 45_000,
    });
    await page.evaluate((bridge) => {
      sessionStorage.setItem("alyra.labBridge.v1", JSON.stringify(bridge));
    }, SAMPLE_BRIDGE);
    await page.goto("/lab?bridge=1&instant=1");
    await expect(page.getByText(/On your desk|Placed \d+/i)).toBeVisible({
      timeout: 45_000,
    });
  });

  test("Continue in Perfumer deep-link ingests chat bridge without API chat", async ({
    page,
  }) => {
    await page.goto("/perfumer");
    await expect(page.getByText("Master Perfumer").first()).toBeVisible({
      timeout: 45_000,
    });

    await page.evaluate((payload) => {
      sessionStorage.setItem("alyra.chatBridge.v1", JSON.stringify(payload));
    }, SAMPLE_CHAT_BRIDGE);

    await page.goto("/perfumer?fromLab=1");
    await expect(page.getByText(/Got your Lab blend/i)).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByRole("button", { name: /Open in Lab|Build/i }).first(),
    ).toBeVisible();
    await expect(page.getByText("Hedione").first()).toBeVisible();
    await expect(page.getByText("Iso E Super").first()).toBeVisible();
  });

  test("IDE Lab/Tutor/Chat tabs + phone chat affordance", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/lab");
    await expect(page.getByText("Alyra Labs").first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole("button", { name: /^Lab$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Tutor$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Chat$/i })).toBeVisible();
    await page.getByRole("button", { name: /^Chat$/i }).click();
    await expect(
      page.getByPlaceholder(/Sign in to brief|Brief me|goal|type|vibe/i),
    ).toBeVisible({ timeout: 20_000 });
    // Build appears once a plan exists; empty chat still shows Plan panel chrome
    await expect(page.getByText(/Plan|Build|brief/i).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lab");
    await expect(page.getByText("Alyra Labs").first()).toBeVisible({
      timeout: 45_000,
    });
    const chatFab = page.getByRole("button", {
      name: /Open perfume chat|Open chat and plan/i,
    });
    await expect(chatFab).toBeVisible({ timeout: 20_000 });
    await chatFab.click();
    await expect(
      page.getByPlaceholder(/Sign in to brief|Brief me|goal|type|vibe/i),
    ).toBeVisible({ timeout: 20_000 });
  });
});
