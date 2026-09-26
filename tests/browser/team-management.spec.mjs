import { test, expect } from "@playwright/test";
async function login(page, username = "web-test-admin") {
  await page.goto("/");
  await page.getByLabel("KULLANICI ADI", { exact: true }).fill(username);
  await page.getByLabel("ŞİFRE", { exact: true }).fill("Test-228-Only");
  await page.getByRole("button", { name: "GİRİŞ YAP" }).click();
  await expect(
    page.getByRole("heading", { name: "E-FOOTBALL LİGİ", exact: true }),
  ).toBeVisible();
}
test("Müze Ayarlar içinde düzenlenir; Takımlar sayfası yalnızca görüntüler", async ({
  page,
}) => {
  await login(page);
  const data = await (await page.request.get("/api/bootstrap")).json();
  const team = data.teams.find((t) =>
    data.leagues.some((l) => l.id === t.leagueId && l.type === "Lig"),
  );
  await page.goto("/#settings");
  await page
    .getByRole("button", { name: "TAKIM VE MÜZE YÖNETİMİ", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", {
      name: "TAKIM VE MÜZE YÖNETİMİ",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#settings$/);
  await dialog
    .getByLabel("Lig / kupa seçimi")
    .selectOption(String(team.leagueId));
  await dialog
    .getByLabel("TAKIM", { exact: true })
    .selectOption(String(team.id));
  const fields = [
    ["league", "LİG ŞAMPİYONLUĞU", 2],
    ["cup", "LİG KUPASI", 3],
    ["champions", "UEFA ŞAMPİYONLAR LİGİ", 4],
    ["europa", "UEFA AVRUPA LİGİ", 5],
    ["conference", "UEFA KONFERANS LİGİ", 6],
  ];
  for (const [key, label, value] of fields) {
    await dialog.getByLabel(label, { exact: true }).fill(String(value));
    await expect(dialog.locator(`[data-trophy="${key}"] strong`)).toHaveText(
      String(value),
    );
  }
  await dialog.getByLabel("BÜTÇE", { exact: true }).fill("12345");
  await dialog
    .getByRole("button", { name: "TAKIM VE MÜZEYİ KAYDET", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "Takım ve müze bilgileri kaydedildi.",
  );
  await expect(page).toHaveURL(/#settings$/);
  const saved = await (await page.request.get("/api/bootstrap")).json();
  const museum = saved.museum.find(
    (m) => m.leagueId === team.leagueId && m.team === team.name,
  );
  for (const [key, , value] of fields) expect(museum[key]).toBe(value);
  expect(saved.teams.find((t) => t.id === team.id).budget).toBe(12345);
  await page.screenshot({
    path: "test-results/settings-museum-editor.png",
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Pencereyi kapat" }).click();
  await expect(page).toHaveURL(/#settings$/);
  await page.goto("/#teams");
  await page.reload();
  await page
    .getByLabel("Lig / kupa seçimi")
    .selectOption(String(team.leagueId));
  await page.getByLabel("TAKIM", { exact: true }).selectOption(String(team.id));
  for (const [key, , value] of fields)
    await expect(
      page.getByTestId("team-museum").locator(`[data-trophy="${key}"] strong`),
    ).toHaveText(String(value));
  await expect(
    page.getByRole("button", {
      name: /düzenle|transfer et|kadrodan çıkar|KATALOGDAN FUTBOLCU EKLE/i,
    }),
  ).toHaveCount(0);
});
test("Lig Admini ayarlar penceresinde sadece kendi kadrosunu yönetir ve müze sayılarını değiştiremez", async ({
  page,
}) => {
  await login(page, "web-test-lig-admin");
  await page.goto("/#settings");
  await page
    .getByRole("button", { name: "TAKIM VE MÜZE YÖNETİMİ", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(page).toHaveURL(/#settings$/);
  await expect(
    dialog.getByRole("button", { name: "TAKIM VE MÜZE", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByLabel("Lig / kupa seçimi").locator("option"),
  ).toHaveCount(2);
  await expect(
    dialog.getByLabel("TAKIM", { exact: true }).locator("option"),
  ).toHaveCount(2);
  const data = await (await page.request.get("/api/bootstrap")).json();
  const team = data.teams.find((t) => t.leagueId === data.user.managedLeagueId);
  await dialog
    .getByLabel("TAKIM", { exact: true })
    .selectOption(String(team.id));
  const card = data.catalog.find(
    (c) =>
      !data.squads.some(
        (k) =>
          k.catalogId === c.id &&
          k.leagueId === team.leagueId &&
          k.team === team.name,
      ),
  );
  await dialog
    .getByLabel("KATALOGDA FUTBOLCU ARA", { exact: true })
    .fill(card.name);
  await dialog
    .getByLabel("KADROYA EKLENECEK KART", { exact: true })
    .selectOption(String(card.id));
  await dialog
    .getByRole("button", { name: "KADROYA EKLE", exact: true })
    .click();
  await expect(
    dialog.locator("tbody tr").filter({ hasText: card.name }),
  ).toHaveCount(1);
  await expect(page).toHaveURL(/#settings$/);
  await dialog
    .getByRole("button", { name: `${card.name} kadrodan çıkar`, exact: true })
    .click();
  await expect(
    dialog.locator("tbody tr").filter({ hasText: card.name }),
  ).toHaveCount(0);
});
