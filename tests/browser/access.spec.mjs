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
test("Üyeliksiz izleyici hesabı oluşturulmaz; tüm yazma, yedek ve yönetim erişimi engellenir", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "İZLEYİCİ OLARAK DEVAM ET", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E-FOOTBALL LİGİ", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "AYARLAR", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Şifre değiştir" }),
  ).toHaveCount(0);
  const state = await (await page.request.get("/api/bootstrap")).json();
  expect(state.user.isGuest).toBe(true);
  expect(state.user.id).toBe(0);
  expect(state.users).toEqual([]);
  expect(state.logs).toEqual([]);
  expect(state.roles).toEqual([]);
  expect(JSON.stringify(state)).not.toContain("passwordHash");
  for (const url of ["/api/export", "/api/backup"])
    expect((await page.request.get(url)).status()).toBe(403);
  for (const op of [
    "player.save",
    "squad.add",
    "match.save",
    "user.save",
    "password",
  ])
    expect(
      (
        await page.request.post("/api/action", { data: { op, payload: {} } })
      ).status(),
    ).toBe(403);
  await page.goto("/#catalog");
  await expect(
    page.getByRole("button", { name: "PESDB'DE ARA", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".transfer-bar")).toHaveCount(0);
  await page.goto("/#players");
  await expect(
    page.getByRole("heading", { name: "Bu ekran için yetkiniz bulunmuyor." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ÜYE GİRİŞİ", exact: true }).click();
  await expect(page.getByRole("button", { name: "GİRİŞ YAP" })).toBeVisible();
});
test("Lig yöneticisi yalnızca atanmış ligde oyuncu, skor ve transfer yönetir", async ({
  page,
}) => {
  await login(page, "web-test-lig-admin");
  const initial = await (await page.request.get("/api/bootstrap")).json();
  expect(initial.user.scope).toBe("league");
  expect(initial.user.managedLeagueId).toBe(95001);
  expect(initial.users).toEqual([]);
  const ownedTeam = initial.teams.find((t) => t.leagueId === 95001),
    targetTeam = initial.teams.find(
      (t) => t.leagueId === 95001 && t.id !== ownedTeam.id,
    ),
    otherTeam = initial.teams.find((t) => t.leagueId === 95002);
  const otherPlayer = initial.players.find((p) => p.leagueId === 95002),
    ownMatch = initial.matches.find((m) => m.leagueId === 95001),
    otherMatch = initial.matches.find((m) => m.leagueId === 95002),
    catalogId = initial.catalog[0].id;
  for (const [op, payload] of [
    ["player.delete", { id: otherPlayer.id }],
    [
      "player.save",
      { id: otherPlayer.id, leagueId: 95001, name: "Hack", team: "Hack" },
    ],
    ["squad.add", { teamId: otherTeam.id, ids: [catalogId] }],
    ["match.save", { id: otherMatch.id, homeGoals: 4, awayGoals: 0 }],
    ["role.save", { name: "Bypass", permissions: ["TUMU"] }],
    ["user.save", { id: 90003, username: "web-test-lig-admin", role: "Admin" }],
  ])
    expect(
      (
        await page.request.post("/api/action", { data: { op, payload } })
      ).status(),
    ).toBe(403);
  expect(
    (await page.request.get(`/api/matches/${otherMatch.id}/squad`)).status(),
  ).toBe(403);
  await page.goto("/#players");
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page
    .getByRole("button", { name: "OYUNCU KAYDET", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("LİG", { exact: true }).locator("option"),
  ).toHaveCount(1);
  await dialog.getByLabel("OYUNCU ADI", { exact: true }).fill("Lig Admin Yeni");
  await dialog
    .getByLabel("TAKIM ADI", { exact: true })
    .fill("Lig Admin Yeni Takım");
  await dialog.getByRole("button", { name: "KAYDET", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(13);
  const added = (
    await (await page.request.get("/api/bootstrap")).json()
  ).players.find((p) => p.name === "Lig Admin Yeni");
  expect(added.leagueId).toBe(95001);
  expect(
    (
      await page.request.post("/api/action", {
        data: { op: "player.delete", payload: { id: added.id } },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.post("/api/action", {
        data: {
          op: "match.save",
          payload: { id: ownMatch.id, homeGoals: 2, awayGoals: 0, events: [] },
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.post("/api/action", {
        data: {
          op: "squad.add",
          payload: { teamId: ownedTeam.id, ids: [catalogId] },
        },
      })
    ).ok(),
  ).toBeTruthy();
  const refreshed = await (await page.request.get("/api/bootstrap")).json(),
    squad = refreshed.squads.find(
      (k) =>
        k.leagueId === 95001 &&
        k.team === ownedTeam.name &&
        k.catalogId === catalogId,
    );
  expect(
    (
      await page.request.post("/api/action", {
        data: {
          op: "squad.transfer",
          payload: { id: squad.id, teamId: otherTeam.id },
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/action", {
        data: {
          op: "squad.transfer",
          payload: { id: squad.id, teamId: targetTeam.id },
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/#catalog");
  await page.reload();
  await expect(page.getByLabel("Hedef takım").locator("option")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "PESDB'DE ARA", exact: true }),
  ).toHaveCount(0);
  await page.goto("/#matches");
  await expect(page.locator("tbody tr")).toHaveCount(
    initial.matches.filter((m) => m.leagueId === 95001).length,
  );
});
test("Admin rol listesinde Kullanici yoktur; kullanıcıya lig ataması yapılabilir", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#roles");
  await expect(
    page.getByRole("heading", { name: "Kullanici", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "LİG ADMİNİ", exact: true }),
  ).toBeVisible();
  await page.goto("/#users");
  const row = page
    .locator("tbody tr")
    .filter({ hasText: "web-test-lig-admin" });
  await row.getByRole("button", { name: "DÜZENLE", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("YETKİLİ LİG", { exact: true }).selectOption("95002");
  await dialog.getByRole("button", { name: "KAYDET", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText("UEFA TEST LİGİ 2");
  const state = await (await page.request.get("/api/bootstrap")).json();
  expect(
    state.users.find((u) => u.username === "web-test-lig-admin")
      .managedLeagueId,
  ).toBe(95002);
});
