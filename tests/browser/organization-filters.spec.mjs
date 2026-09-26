import { test, expect } from "@playwright/test";
test("Ayarlar dışı filtreler pasif kayıtları gizler; yönetim seçimleri pasif kayıtları korur", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("KULLANICI ADI", { exact: true })
    .fill("web-test-admin");
  await page.getByLabel("ŞİFRE", { exact: true }).fill("Test-228-Only");
  await page.getByRole("button", { name: "GİRİŞ YAP" }).click();
  await expect(
    page.getByRole("heading", { name: "E-FOOTBALL LİGİ", exact: true }),
  ).toBeVisible();
  const source = await (await page.request.get("/api/bootstrap")).json();
  const leagues = [
    {
      id: 810001,
      name: "FİLTRE AKTİF LİG",
      type: "Lig",
      status: "Aktif",
      season: "1.SEZON",
    },
    {
      id: 810002,
      name: "FİLTRE PASİF LİG",
      type: "Lig",
      status: "Pasif",
      season: "1.SEZON",
    },
    {
      id: 810003,
      name: "FİLTRE AKTİF KUPA",
      type: "Kupa",
      status: "Aktif",
      season: "1.SEZON",
    },
    {
      id: 810004,
      name: "FİLTRE PASİF KUPA",
      type: "Kupa",
      status: "Pasif",
      season: "1.SEZON",
    },
    {
      id: 810005,
      name: "AKTİF KUPA ARŞİVİ",
      type: "Kupa",
      status: "Aktif",
      season: "1.SEZON",
    },
    {
      id: 810006,
      name: "PASİF KUPA ARŞİVİ",
      type: "Kupa",
      status: "Pasif",
      season: "1.SEZON",
    },
  ];
  const cups = leagues
    .filter((l) => l.type === "Kupa")
    .map((l) => ({
      id: l.id,
      type: "LİG KUPASI - DOĞRUDAN ELEME",
      season: l.season,
      stage: l.id >= 810005 ? "TAMAMLANDI" : "YARI FINAL",
    }));
  const teams = [
    { id: 1, name: "Aktif takım", leagueId: 810001 },
    { id: 2, name: "Pasif takım", leagueId: 810002 },
  ];
  const archive = leagues
    .filter((l) => l.type === "Lig")
    .map((l) => ({
      id: l.id,
      leagueId: l.id,
      league: l.name,
      season: "0.SEZON",
      rank: 1,
      player: "Oyuncu",
      team: "Takım",
      o: 0,
      g: 0,
      b: 0,
      m: 0,
      ag: 0,
      yg: 0,
      av: 0,
      p: 0,
    }));
  await page.route("**/api/bootstrap", (route) =>
    route.fulfill({
      json: {
        ...source,
        leagues,
        cups,
        teams,
        archive,
        players: [],
        matches: [],
        participants: [],
      },
    }),
  );
  await page.reload();
  for (const route of ["home", "leagues", "teams", "catalog", "news"]) {
    await page.goto("/#" + route);
    const filter = page.getByLabel("Lig / kupa seçimi");
    await expect(filter.locator('option[value="810002"]')).toHaveCount(0);
    await expect(filter.locator('option[value="810004"]')).toHaveCount(0);
    await expect(filter.locator('option[value="810006"]')).toHaveCount(0);
    await expect(filter.locator('option[value="810001"]')).toHaveCount(1);
    if (route === "teams")
      await expect(
        page.getByLabel("TAKIM", { exact: true }).locator("option"),
      ).toHaveText(["Aktif takım"]);
    if (route === "catalog") {
      await page
        .getByRole("button", { name: "KADRO YÖNETİMİ", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog")
          .getByLabel("Lig / kupa seçimi")
          .locator('option[value="810002"]'),
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
    if (route === "news") {
      await page
        .getByRole("button", { name: "HABER EKLE", exact: true })
        .click();
      const category = page
        .getByRole("dialog")
        .getByLabel("GENEL / LİG / KUPA", { exact: true });
      await expect(category.locator('option[value="810002"]')).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
  }
  await page.goto("/#streams");
  await page.getByRole("button", { name: "YAYIN EKLE", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByLabel("Lig / kupa seçimi")
      .locator('option[value="810002"]'),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/#cups");
  let cupFilter = page.getByLabel("KUPA SEÇİMİ", { exact: true });
  await expect(cupFilter.locator("option")).toHaveCount(1);
  await expect(cupFilter).toHaveValue("810003");
  await page.getByRole("button", { name: /^KUPA ARŞİVİ/ }).click();
  await expect(cupFilter.locator("option")).toHaveCount(1);
  await expect(cupFilter).toHaveValue("810005");
  await page.goto("/#archive");
  await expect(
    page.getByLabel("LİG", { exact: true }).locator("option"),
  ).toHaveCount(1);
  await page.goto("/#fixtures");
  await expect(
    page.getByLabel("Lig / kupa seçimi").locator('option[value="810002"]'),
  ).toHaveCount(1);
  await page.goto("/#matches");
  await expect(
    page.getByLabel("Lig / kupa seçimi").locator('option[value="810004"]'),
  ).toHaveCount(1);
  await page.goto("/#settings");
  await page
    .getByRole("button", { name: "TAKIM VE MÜZE YÖNETİMİ", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Lig / kupa seçimi").locator('option[value="810002"]'),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "KUPA OLUŞTUR", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("radio", { name: /^FİLTRE PASİF LİG/ }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: /^KAYITLI KUPALAR/ }).click();
  await expect(
    dialog
      .getByLabel("YÖNETİLECEK KUPA", { exact: true })
      .locator('option[value="810004"]'),
  ).toHaveCount(1);
  await expect(
    dialog
      .getByLabel("YÖNETİLECEK KUPA", { exact: true })
      .locator('option[value="810006"]'),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.goto("/#leagues");
  for (const l of leagues) l.status = "Pasif";
  await page.getByRole("button", { name: "YENİLE", exact: true }).click();
  await expect(page.getByLabel("Lig / kupa seçimi")).toBeDisabled();
  await page.goto("/#cups");
  await expect(page.getByLabel("KUPA SEÇİMİ", { exact: true })).toBeDisabled();
  await expect(
    page.getByText("Görüntülenecek aktif kupa bulunmuyor.", { exact: true }),
  ).toBeVisible();
});
