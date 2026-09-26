import { test, expect } from "@playwright/test";
import { fixtureParticipant } from "../../shared/rules.mjs";
test("Yayın ekleme fikstürden tarafları alır; lig değişimi seçimi sıfırlar ve diğer alanlar korunur", async ({
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
  const data = await (await page.request.get("/api/bootstrap")).json();
  const match = data.matches.find((m) => m.leagueId === 95001),
    otherLeague = 95002;
  await page.goto("/#streams");
  await page.getByRole("button", { name: "YAYIN EKLE", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Lig / kupa seçimi")
    .selectOption(String(match.leagueId));
  await expect(
    dialog.locator('select[name="home"], select[name="away"]'),
  ).toHaveCount(0);
  const select = dialog.getByLabel("FİKSTÜRDEN MAÇ SEÇ", { exact: true });
  await select.selectOption(String(match.id));
  await expect(dialog.locator(".stream-fixture-preview")).toContainText(
    fixtureParticipant(data, match, "home").team,
  );
  await expect(dialog.locator(".stream-fixture-preview")).toContainText(
    fixtureParticipant(data, match, "away").team,
  );
  await expect(dialog.getByLabel("TARİH", { exact: true })).toHaveValue(
    match.date,
  );
  await dialog
    .getByLabel("Lig / kupa seçimi")
    .selectOption(String(otherLeague));
  await expect(select).toHaveValue("");
  await expect(select.locator(`option[value="${match.id}"]`)).toHaveCount(0);
  await dialog
    .getByLabel("Lig / kupa seçimi")
    .selectOption(String(match.leagueId));
  await select.selectOption(String(match.id));
  await dialog.getByLabel("TARİH", { exact: true }).fill("2030-06-03");
  await dialog.getByLabel("SAAT", { exact: true }).fill("20:45");
  await dialog
    .getByLabel("YAYIN BAĞLANTISI", { exact: true })
    .fill("https://example.com/fixture-selection");
  await dialog.getByRole("checkbox", { name: "Aktif yayın" }).uncheck();
  await dialog.getByRole("button", { name: "KAYDET", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const saved = (
    await (await page.request.get("/api/bootstrap")).json()
  ).streams.find((s) => s.url === "https://example.com/fixture-selection");
  expect(saved.matchId).toBe(match.id);
  expect(saved.home).toBe(match.home);
  expect(saved.away).toBe(match.away);
  expect(saved.date).toBe("2030-06-03");
  expect(saved.time).toBe("20:45");
  expect(saved.active).toBe(false);
  await page
    .locator(".stream-list .panel")
    .filter({
      has: page.locator('a[href="https://example.com/fixture-selection"]'),
    })
    .getByTitle("Yayını düzenle")
    .click();
  await expect(select).toHaveValue(String(match.id));
  await expect(dialog.getByLabel("TARİH", { exact: true })).toHaveValue(
    "2030-06-03",
  );
  await expect(
    dialog.getByRole("checkbox", { name: "Aktif yayın" }),
  ).not.toBeChecked();
});
