import { test, expect } from "@playwright/test";

test("Kupa arşivi tamamlananları ayırır; devam eden kupa yoksa arşiv kendiliğinden açılır", async ({
  page,
}) => {
  await login(page);
  const source = await (await page.request.get("/api/bootstrap")).json();
  let cups = [
    { ...source.cups[0], id: 800001, stage: "YARI FINAL" },
    { ...source.cups[0], id: 800002, stage: "TAMAMLANDI" },
  ];
  const leagues = [
    ...source.leagues,
    {
      id: 800001,
      name: "Devam Eden Test Kupası",
      status: "Aktif",
      type: "Kupa",
      season: "1.SEZON",
    },
    {
      id: 800002,
      name: "Arşiv Test Kupası",
      type: "Kupa",
      season: "1.SEZON",
      status: "Aktif",
    },
  ];
  await page.route("**/api/bootstrap", (route) =>
    route.fulfill({ json: { ...source, cups, leagues } }),
  );
  await page.goto("/#cups");
  await page.reload();
  const select = page.getByLabel("KUPA SEÇİMİ", { exact: true });
  await expect(
    page.getByRole("button", { name: "DEVAM EDEN KUPALAR (1)", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(select).toHaveValue("800001");
  await expect(select.locator("option")).toHaveCount(1);
  await expect(select.locator('option[value="800002"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "KUPA ARŞİVİ (1)", exact: true })
    .click();
  await expect(select).toHaveValue("800002");
  await expect(select.locator('option[value="800001"]')).toHaveCount(0);
  await expect(page.locator(".cups-page .toolbar .badge")).toHaveText(
    "TAMAMLANDI",
  );
  cups = cups.map((c) => ({ ...c, stage: "TAMAMLANDI" }));
  await page.reload();
  await expect(
    page.getByRole("button", { name: "KUPA ARŞİVİ (2)", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(select.locator("option")).toHaveCount(2);
  await expect(page.locator(".cups-page .toolbar .badge")).toHaveText(
    "TAMAMLANDI",
  );
  cups = [];
  await page.reload();
  await expect(select).toBeDisabled();
  await expect(
    page.getByText("Henüz oluşturulmuş bir kupa bulunmuyor.", { exact: true }),
  ).toBeVisible();
});
async function login(page, username = "web-test-admin") {
  await page.goto("/");
  await page.getByLabel("KULLANICI ADI", { exact: true }).fill(username);
  await page.getByLabel("ŞİFRE", { exact: true }).fill("Test-228-Only");
  await page.getByRole("button", { name: "GİRİŞ YAP" }).click();
  await expect(
    page.getByRole("heading", { name: "E-FOOTBALL LİGİ", exact: true }),
  ).toBeVisible();
}
test("Ayarlar içinde kupa oluşturulur, kura çekilir ve yönetilir; Kupalar yalnızca gösterir", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#settings");
  await page.getByRole("button", { name: "KUPA OLUŞTUR", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", {
      name: "KUPA OLUŞTUR VE KURA ÇEK",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#settings$/);
  await dialog
    .getByLabel("KUPA ADI", { exact: true })
    .fill("Ayarlar Kura Testi");
  await dialog.getByRole("radio", { name: /^UEFA TEST LİGİ 1/ }).check();
  await dialog
    .getByRole("button", { name: "KUPAYI OLUŞTUR VE KURA ÇEK", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "Kupa oluşturuldu ve kura çekildi.",
  );
  await expect(page).toHaveURL(/#settings$/);
  await expect(
    dialog.getByRole("heading", { name: "KUPA YÖNETİMİ", exact: true }),
  ).toBeVisible();
  let data = await (await page.request.get("/api/bootstrap")).json();
  const id = data.leagues.find((l) => l.name === "Ayarlar Kura Testi").id;
  expect(data.participants.filter((p) => p.cupId === id)).toHaveLength(12);
  expect(data.matches.filter((m) => m.leagueId === id).length).toBeGreaterThan(
    0,
  );
  await dialog
    .getByLabel("KUPA ADI", { exact: true })
    .fill("Ayarlar Kura Testi Güncel");
  await dialog
    .getByRole("button", { name: "KUPA BİLGİLERİNİ KAYDET", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "Kupa bilgileri kaydedildi.",
  );
  await expect(page).toHaveURL(/#settings$/);
  await page.screenshot({
    path: "test-results/settings-cup-manager.png",
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Pencereyi kapat" }).click();
  await page.goto("/#cups");
  await page
    .getByLabel("KUPA SEÇİMİ", { exact: true })
    .selectOption(String(id));
  await expect(
    page.getByRole("button", {
      name: /KUPA OLUŞTUR|KUPAYI SİL|Kupayı düzenle|SONRAKİ TURU OLUŞTUR/i,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".cups-page tbody tr")).toHaveCount(12);
  await page.goto("/#settings");
  await page.getByRole("button", { name: "KUPA OLUŞTUR", exact: true }).click();
  await dialog.getByRole("button", { name: /^KAYITLI KUPALAR/ }).click();
  await dialog
    .getByLabel("YÖNETİLECEK KUPA", { exact: true })
    .selectOption(String(id));
  await expect(dialog.getByLabel("KUPA ADI", { exact: true })).toHaveValue(
    "Ayarlar Kura Testi Güncel",
  );
  await dialog.getByRole("button", { name: "KUPAYI SİL", exact: true }).click();
  await dialog
    .getByRole("button", { name: "SİLMEYİ ONAYLA", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("Kupa silindi.");
  data = await (await page.request.get("/api/bootstrap")).json();
  expect(data.cups.some((c) => c.id === id)).toBe(false);
  await expect(page).toHaveURL(/#settings$/);
});
test("Gruplu UEFA kupası Ayarlar penceresinde kontenjanla oluşturulur", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#settings");
  await page.getByRole("button", { name: "KUPA OLUŞTUR", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("KUPA FORMATI", { exact: true })
    .selectOption("group");
  await dialog.getByLabel("ŞAMPİYONA", { exact: true }).selectOption("europa");
  await dialog.getByLabel("SEZON", { exact: true }).fill("AYARLAR UEFA TEST");
  for (let n = 1; n <= 4; n++)
    await dialog
      .getByRole("checkbox", { name: new RegExp(`^UEFA TEST LİGİ ${n}`) })
      .check();
  await expect(dialog.locator(".qualification-preview li")).toHaveCount(16);
  await dialog
    .getByRole("button", { name: "KUPAYI OLUŞTUR VE KURA ÇEK", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "Kupa oluşturuldu ve kura çekildi.",
  );
  await expect(page).toHaveURL(/#settings$/);
  const data = await (await page.request.get("/api/bootstrap")).json(),
    cup = data.cups.find((c) => c.season === "AYARLAR UEFA TEST");
  expect(cup.competition).toBe("europa");
  expect(cup.quota).toBe(5);
  expect(data.participants.filter((p) => p.cupId === cup.id)).toHaveLength(16);
  expect(data.matches.filter((m) => m.leagueId === cup.id)).toHaveLength(24);
});
test("Lig Admini kupa yönetimini açamaz; kupa görünümü salt okunur kalır", async ({
  page,
}) => {
  await login(page, "web-test-lig-admin");
  await page.goto("/#settings");
  await expect(
    page.getByRole("button", { name: "KUPA OLUŞTUR", exact: true }),
  ).toBeDisabled();
  await page.goto("/#cups");
  await expect(
    page.getByRole("heading", { name: "KUPALAR", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /KUPA OLUŞTUR|KUPAYI SİL|SONRAKİ TURU OLUŞTUR/i,
    }),
  ).toHaveCount(0);
});
