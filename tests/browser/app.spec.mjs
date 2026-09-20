import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { standings, winner } from "../../shared/rules.mjs";

test("PESDB aramasından seçilen kartlar yerel listeye eklenir ve kalıcıdır", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#catalog");
  await page.getByPlaceholder("Futbolcu adı veya kulüp…").fill("Web Test Kart");
  await page.getByRole("button", { name: "PESDB'DE ARA", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("PESDB / PESDATA ÜZERİNDE FUTBOLCU ARA", { exact: true }),
  ).toHaveValue("Web Test Kart");
  await expect(
    dialog.getByRole("button", { name: /KARTI YEREL LİSTEYE EKLE/ }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "PESDB'DE ARA", exact: true })
    .click();
  await expect(dialog.locator(".online-player strong")).toHaveText([
    "Web Test Kart A",
    "Web Test Kart B",
  ]);
  for (const checkbox of await dialog.getByRole("checkbox").all())
    await checkbox.check();
  await dialog
    .getByRole("button", { name: "2 KARTI YEREL LİSTEYE EKLE", exact: true })
    .click();
  await expect(dialog.getByText("Yerel listede", { exact: true })).toHaveCount(
    2,
  );
  for (const checkbox of await dialog.getByRole("checkbox").all())
    await expect(checkbox).toBeDisabled();
  await dialog
    .getByRole("button", { name: "YEREL LİSTEYE DÖN", exact: true })
    .click();
  await expect(page.locator(".catalog-table .row-link")).toHaveText([
    "Web Test Kart A",
    "Web Test Kart B",
  ]);
  await page.reload();
  await page.getByPlaceholder("Futbolcu adı veya kulüp…").fill("Web Test Kart");
  await expect(page.locator(".catalog-table .row-link")).toHaveText([
    "Web Test Kart A",
    "Web Test Kart B",
  ]);
});

test("Geçmiş yayınlar arşivlenir ve gece yarısında ana sayfadan otomatik kalkar", async ({
  page,
}) => {
  await login(page);
  const snapshot = await (await page.request.get("/api/bootstrap")).json();
  const league = snapshot.leagues.find(
    (l) =>
      l.type === "Lig" &&
      snapshot.players.filter((p) => p.active && p.leagueId === l.id).length >=
        2,
  );
  const players = snapshot.players.filter(
    (p) => p.active && p.leagueId === league.id,
  );
  for (const [label, date] of [
    ["past", "2030-05-31"],
    ["today", "2030-06-01"],
    ["future", "2030-06-02"],
  ]) {
    const response = await page.request.post("/api/action", {
      data: {
        op: "stream.save",
        payload: {
          leagueId: league.id,
          home: players[0].name,
          away: players[1].name,
          date,
          time: "21:00",
          url: `https://example.com/archive-test-${label}`,
          active: true,
        },
      },
    });
    expect(response.ok()).toBeTruthy();
  }
  await page.clock.install({ time: new Date("2030-06-01T20:59:50Z") });
  await page.goto("/#streams");
  await page.reload();
  await expect(
    page.locator('.stream-list a[href$="archive-test-today"]'),
  ).toBeVisible();
  await expect(
    page.locator('.stream-list a[href$="archive-test-future"]'),
  ).toBeVisible();
  await expect(
    page.locator('.stream-list a[href$="archive-test-past"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /YAYIN ARŞİVİ/ }).click();
  await expect(
    page.locator('.stream-list a[href$="archive-test-past"]'),
  ).toBeVisible();
  await expect(
    page.locator('.stream-list a[href$="archive-test-today"]'),
  ).toHaveCount(0);
  await page.goto("/#home");
  await expect(
    page.locator('.stream-panel a[href$="archive-test-today"]'),
  ).toBeVisible();
  await expect(
    page.locator('.stream-panel a[href$="archive-test-past"]'),
  ).toHaveCount(0);
  await page.clock.fastForward(11000);
  await expect(
    page.locator('.stream-panel a[href$="archive-test-today"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('.stream-panel a[href$="archive-test-future"]'),
  ).toBeVisible();
  await page.goto("/#streams");
  await page.getByRole("button", { name: /YAYIN ARŞİVİ/ }).click();
  await expect(
    page.locator('.stream-list a[href$="archive-test-today"]'),
  ).toBeVisible();
  await expect(
    page.locator('.stream-list a[href$="archive-test-future"]'),
  ).toHaveCount(0);
});

test("Genel, lig ve kupa haberleri ana menüde ve haber listesinde birbirine karışmaz", async ({
  page,
}) => {
  await login(page);
  const initial = await (await page.request.get("/api/bootstrap")).json();
  const leagueIds = initial.leagues
    .filter((l) => l.type === "Lig")
    .slice(0, 2)
    .map((l) => l.id);
  const cupId = initial.leagues.find((l) => l.type === "Kupa").id;
  const scopes = [0, ...leagueIds, cupId];
  for (const leagueId of scopes) {
    const response = await page.request.post("/api/action", {
      data: {
        op: "news.save",
        payload: {
          title: `Filtre kontrol ${leagueId}`,
          body: "Yalnızca kendi kategorisinde görünmeli.",
          leagueId,
          active: true,
          image: "",
        },
      },
    });
    expect(response.ok()).toBeTruthy();
  }
  const snapshot = await (await page.request.get("/api/bootstrap")).json();
  await page.goto("/#news");
  await page.reload();
  for (const leagueId of scopes) {
    await page.getByLabel("Lig / kupa seçimi").selectOption(String(leagueId));
    const expected = snapshot.news
      .filter((n) => Number(n.leagueId || 0) === leagueId)
      .reverse()
      .map((n) => n.title);
    await expect(page.locator(".news-card h2")).toHaveText(expected);
  }
  await page.getByRole("button", { name: "HABER EKLE", exact: true }).click();
  const category = page
    .getByRole("dialog")
    .getByLabel("GENEL / LİG / KUPA", { exact: true });
  await expect(category.locator('option[value="0"]')).toHaveText("GENEL");
  await expect(category).toHaveValue(String(cupId));
  await page.keyboard.press("Escape");
  await page.clock.install();
  await page.goto("/#home");
  for (const leagueId of scopes) {
    await page.getByLabel("Lig / kupa seçimi").selectOption(String(leagueId));
    const expected = snapshot.news
      .filter((n) => n.active && Number(n.leagueId || 0) === leagueId)
      .map((n) => n.title);
    await expect(page.locator(".news-dots button")).toHaveCount(
      expected.length,
    );
    for (const title of expected) {
      await expect(page.locator(".news-hero h2")).toHaveText(title);
      await page
        .getByRole("button", { name: "Sonraki haber", exact: true })
        .click();
    }
  }
  const general = snapshot.news.filter(
    (n) => n.active && Number(n.leagueId || 0) === 0,
  );
  await page.getByLabel("Lig / kupa seçimi").selectOption("0");
  await expect(page.locator(".news-hero h2")).toHaveText(general[0].title);
  await page.clock.fastForward(6000);
  await expect(page.locator(".news-hero h2")).toHaveText(general[1].title);
  await page
    .getByRole("button", { name: "Otomatik haber geçişini durdur" })
    .click();
  await page.clock.fastForward(12000);
  await expect(page.locator(".news-hero h2")).toHaveText(general[1].title);
  await page
    .getByRole("button", { name: "Otomatik haber geçişini başlat" })
    .click();
  await page.clock.fastForward(6000);
  await expect(page.locator(".news-hero h2")).toHaveText(
    general[2 % general.length].title,
  );
  await page.locator(".news-hero").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.clock.fastForward(12000);
  await page.keyboard.press("Escape");
  await expect(page.locator(".news-hero h2")).toHaveText(
    general[2 % general.length].title,
  );
  await page.clock.fastForward(6000);
  await expect(page.locator(".news-hero h2")).toHaveText(
    general[3 % general.length].title,
  );
});
async function login(page, name = "web-test-admin") {
  await page.goto("/");
  await page.getByLabel("KULLANICI ADI", { exact: true }).fill(name);
  await page.getByLabel("ŞİFRE", { exact: true }).fill("Test-228-Only");
  await page.getByRole("button", { name: "GİRİŞ YAP" }).click();
  await expect(
    page.getByRole("heading", { name: "E-FOOTBALL LİGİ", exact: true }),
  ).toBeVisible();
}
test("Excel verileriyle giriş, gerçek lig/kupa sonuçları, tüm ekranlar ve mobil görünüm", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const liveData = await (await page.request.get("/api/bootstrap")).json();
  await expect(page.locator(".metric strong").first()).toHaveText(
    String(liveData.players.filter((p) => p.active).length),
  );
  await expect(
    page.getByLabel("Lig / kupa seçimi").locator("option:checked"),
  ).toHaveText("GENEL");
  await expect(
    page
      .locator(".nav-group-bottom")
      .getByRole("button", { name: "AYARLAR", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".nav-group-top .nav-button")).toHaveCount(4);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "LİGLER", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "LİGLER", exact: true }),
  ).toBeVisible();
  const selectedLeague = Number(
    await page.getByLabel("Lig / kupa seçimi").inputValue(),
  );
  const leader = standings(
    liveData.players.filter((p) => p.leagueId === selectedLeague),
    liveData.matches.filter((m) => m.leagueId === selectedLeague),
  )[0];
  await expect(page.locator("tr.leader")).toContainText(leader.player);
  await expect(page.locator('tr.leader td.left strong')).toHaveText(leader.team || '—');
  await expect(page.locator('tr.leader td.left .cell-sub')).toHaveText(leader.player);
  await expect(page.locator("tr.leader .points")).toHaveText(String(leader.p));
  const leaguePanel = await page
    .locator(".league-layout > .panel")
    .boundingBox();
  const rankings = await page.locator(".ranking-stack > .panel").all();
  const goalPanel = await rankings[0].boundingBox(),
    assistPanel = await rankings[1].boundingBox();
  const backBar = await page.locator(".leagues-page > .back-bar").boundingBox();
  expect(Math.abs(goalPanel.height - assistPanel.height)).toBeLessThan(2);
  expect(
    Math.abs(
      leaguePanel.y + leaguePanel.height - assistPanel.y - assistPanel.height,
    ),
  ).toBeLessThan(2);
  expect(backBar.y - (leaguePanel.y + leaguePanel.height)).toBeLessThanOrEqual(
    22,
  );
  await page.screenshot({
    path: "test-results/leagues-expanded.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "KUPALAR", exact: true }).click();
  const cupMatches = liveData.matches.filter(
    (m) => m.leagueId === liveData.cups[0].id,
  );
  const final = cupMatches.find((m) => m.stage === "FINAL");
  await expect(page.locator(".champion-card")).toContainText(
    (final && winner(final)) || "Şampiyon bekleniyor",
  );
  await expect(page.locator(".bracket-game")).toHaveCount(
    cupMatches.filter((m) =>
      ["SON 16", "CEYREK FINAL", "YARI FINAL", "FINAL"].includes(m.stage),
    ).length,
  );
  await expect(page.locator(".bracket-round > h3")).toHaveText([
    "SON 16",
    "ÇEYREK FİNAL",
    "YARI FİNAL",
    "FİNAL",
    "ŞAMPİYON",
  ]);
  for (const [index, count] of [8, 4, 2, 1].entries())
    await expect(
      page.locator(".bracket-round").nth(index).locator(".bracket-cell"),
    ).toHaveCount(count);
  const bracket = await page.locator(".bracket").boundingBox();
  expect(bracket.height).toBeLessThan(500);
  await page.screenshot({
    path: "test-results/cup-compact-last16.png",
    fullPage: true,
  });
  for (const [route, heading] of [
    ["teams", "TAKIMLAR VE KADROLAR"],
    ["catalog", "PESDB KATALOĞU"],
    ["news", "HABERLER"],
    ["streams", "CANLI YAYIN"],
    ["settings", "AYARLAR"],
    ["manage-leagues", "LİG YÖNETİMİ"],
    ["players", "OYUNCU YÖNETİMİ"],
    ["fixtures", "FİKSTÜR OLUŞTUR"],
    ["matches", "MAÇ SONUCU GİR"],
    ["users", "KULLANICI YÖNETİMİ"],
    ["roles", "ROLLER VE YETKİLER"],
    ["logs", "SİSTEM HAREKETLERİ"],
    ["archive", "SEZON ARŞİVİ"],
  ]) {
    await page.goto("/#" + route);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    if (route === "catalog") {
      for (const viewport of [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1440, height: 1000 },
      ]) {
        await page.setViewportSize(viewport);
        await expect(
          page.locator(".catalog-page > .back-bar"),
        ).toBeInViewport();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight + 1,
          ),
        ).toBeTruthy();
        const table = page.getByRole("region", {
          name: "Kaydırılabilir futbolcu listesi",
        });
        const panel = await page.locator(".catalog-layout").boundingBox();
        const footer = await page
          .locator(".catalog-page > .back-bar")
          .boundingBox();
        expect(panel.y + panel.height).toBeLessThanOrEqual(footer.y);
        await table.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        await table.evaluate((el) => {
          el.scrollTop = 0;
        });
      }
      const attributes = await page
        .locator(".catalog-page .attribute-grid > div")
        .all();
      for (let i = 1; i < attributes.length; i++) {
        const above = await attributes[i - 1].boundingBox(),
          below = await attributes[i].boundingBox();
        expect(Math.abs(above.x - below.x)).toBeLessThan(1);
        expect(below.y).toBeGreaterThanOrEqual(above.y + above.height);
      }
      await page.screenshot({
        path: "test-results/catalog-fitted.png",
        fullPage: true,
      });
    }
    if (route === "teams") {
      await expect(page.locator(".sidebar")).not.toBeVisible();
      await expect(
        page.getByRole("table", { name: "Takım kadrosu ve istatistikleri" }),
      ).toBeVisible();
      await expect(page.locator(".teams-museum-cell")).toHaveCount(5);
      await expect(page.locator(".teams-logo-stage img")).toBeVisible();
      const left = await page.locator(".teams-roster-table").boundingBox(),
        right = await page.locator(".teams-logo-stage").boundingBox();
      expect(left.x + left.width).toBeLessThan(right.x);
      await page.screenshot({
        path: "test-results/teams-reference-layout.png",
        fullPage: true,
      });
      const snapshot = await (await page.request.get("/api/bootstrap")).json();
      const roster = snapshot.squads.find(
        (k) =>
          snapshot.teams.some(
            (t) => t.name === k.team && t.leagueId === k.leagueId,
          ) && snapshot.catalog.some((c) => c.id === k.catalogId),
      );
      const rosterTeam = snapshot.teams.find(
        (t) => t.name === roster.team && t.leagueId === roster.leagueId,
      );
      const card = snapshot.catalog.find((c) => c.id === roster.catalogId);
      await page
        .getByLabel("Lig / kupa seçimi")
        .selectOption(String(rosterTeam.leagueId));
      await page
        .getByLabel("TAKIM", { exact: true })
        .selectOption(String(rosterTeam.id));
      const cardButton = page.getByRole("button", {
        name: `${card.name} kartını aç`,
        exact: true,
      });
      await expect(cardButton.locator(".teams-player-thumbnail")).toBeVisible();
      await cardButton.click();
      await expect(
        page
          .getByRole("dialog")
          .getByRole("heading", { name: card.name, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("dialog").locator(".squad-card-preview"),
      ).toBeVisible();
      for (const attribute of [
        "pass",
        "shoot",
        "speed",
        "dribble",
        "stamina",
        "rating",
      ]) {
        const stat = page
          .getByRole("dialog")
          .locator(`[data-attribute="${attribute}"]`);
        await expect(stat).toBeVisible();
        await expect(stat.locator("strong")).toHaveText(
          card[attribute] == null ? "—" : String(card[attribute]),
        );
      }
      await page.screenshot({
        path: "test-results/player-card-attributes.png",
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(cardButton).toBeFocused();
      await cardButton.locator(".teams-player-thumbnail").click();
      await expect(
        page.getByRole("dialog").locator(".squad-card-preview"),
      ).toBeVisible();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Pencereyi kapat" })
        .click();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#home");
  await expect(
    page.getByRole("heading", { name: "E-FOOTBALL LİGİ", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.goto("/#teams");
  await expect(
    page.getByRole("heading", { name: "TAKIMLAR VE KADROLAR", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/teams-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("Oyuncu ve lig oluşturma, çift devre fikstür, skor, kalıcı kayıt ve koruma", async ({
  page,
}) => {
  await login(page);
  await page.goto("/#manage-leagues");
  await page.getByRole("button", { name: "LİG OLUŞTUR", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("LİG ADI", { exact: true }).fill("WEB TEST LİGİ");
  await dialog.getByRole("button", { name: "KAYDET", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  for (const name of ["Web Alfa", "Web Beta"]) {
    await page.goto("/#players");
    await page
      .getByRole("button", { name: "OYUNCU KAYDET", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("OYUNCU ADI", { exact: true }).fill(name);
    await dialog.getByLabel("TAKIM ADI", { exact: true }).fill(name + " SK");
    await dialog
      .getByLabel("LİG", { exact: true })
      .selectOption({ label: "WEB TEST LİGİ" });
    await dialog.getByRole("button", { name: "KAYDET", exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page.goto("/#fixtures");
  await page
    .getByLabel("Lig / kupa seçimi")
    .selectOption({ label: "WEB TEST LİGİ | 1.SEZON" });
  await page
    .getByRole("button", { name: "FİKSTÜR OLUŞTUR", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ONAYLA" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.goto("/#matches");
  await page
    .getByLabel("Lig / kupa seçimi")
    .selectOption({ label: "WEB TEST LİGİ | 1.SEZON" });
  await page.getByRole("button", { name: "SONUÇ GİR" }).first().click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ev sahibi golü", { exact: true }).fill("2");
  await dialog.getByLabel("Deplasman golü", { exact: true }).fill("1");
  await dialog
    .getByRole("button", { name: "SONUCU VE OLAYLARI KAYDET" })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".score").first()).toHaveText("2 – 1");
  await page.reload();
  await page
    .getByLabel("Lig / kupa seçimi")
    .selectOption({ label: "WEB TEST LİGİ | 1.SEZON" });
  await expect(page.locator(".score").first()).toHaveText("2 – 1");
  await page.goto("/#fixtures");
  await page
    .getByLabel("Lig / kupa seçimi")
    .selectOption({ label: "WEB TEST LİGİ | 1.SEZON" });
  await page
    .getByRole("button", { name: "FİKSTÜR OLUŞTUR", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ONAYLA" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Oynanmış maç",
  );
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
});
test("Yetkisiz hesap API üzerinden yazamaz; oturumsuz veri erişimi engellenir", async ({
  page,
  request,
}) => {
  const res = await request.get("/api/bootstrap");
  expect(res.status()).toBe(401);
  await login(page, "web-test-viewer");
  await expect(
    page.getByRole("button", { name: "AYARLAR", exact: true }),
  ).toBeDisabled();
  const response = await page.request.post("/api/action", {
    data: { op: "league.delete", payload: { id: 6 } },
  });
  expect(response.status()).toBe(403);
  const bootstrap = await page.request.get("/api/bootstrap");
  const body = await bootstrap.json();
  expect(body.users).toEqual([]);
  expect(body.logs).toEqual([]);
  expect(JSON.stringify(body)).not.toContain("passwordHash");
});
test("Haber kaydı, Excel dışa aktarımı ve web yedeğini geri yükleme", async ({
  page,
}) => {
  await login(page);
  const before = await (await page.request.get("/api/backup")).json();
  await page.goto("/#news");
  await page.getByRole("button", { name: "HABER EKLE", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("BAŞLIK", { exact: true }).fill("Web test haberi");
  await dialog
    .getByLabel("HABER METNİ", { exact: true })
    .fill("Kalıcı haber kaydı ve yedekleme testi.");
  await dialog.getByRole("button", { name: "KAYDET", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Web test haberi" }),
  ).toBeVisible();
  const exported = await page.request.get("/api/export");
  expect(exported.ok()).toBeTruthy();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await exported.body());
  expect(wb.getWorksheet("DATA_Haberler").rowCount).toBe(
    before.state.news.length + 2,
  );
  expect(wb.getWorksheet("DATA_Maclar")).toBeTruthy();
  const restored = await page.request.post("/api/restore", { data: before });
  expect(restored.ok()).toBeTruthy();
  expect((await page.request.get("/api/bootstrap")).status()).toBe(401);
  await login(page);
  await page.goto("/#news");
  await expect(
    page.getByRole("heading", { name: "Web test haberi" }),
  ).toHaveCount(0);
});
test("Yeni kullanıcı ilk girişte şifresini belirler ve yeni şifreyle tekrar giriş yapar", async ({
  page,
}) => {
  await login(page);
  const response = await page.request.post("/api/action", {
    data: {
      op: "user.save",
      payload: {
        username: "test-first-login",
        password: "Initial-228",
        role: "Kullanici",
        active: true,
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  await page.getByRole("button", { name: "ÇIKIŞ", exact: true }).click();
  await page
    .getByLabel("KULLANICI ADI", { exact: true })
    .fill("test-first-login");
  await page.getByLabel("ŞİFRE", { exact: true }).fill("Initial-228");
  await page.getByRole("button", { name: "GİRİŞ YAP" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "ŞİFRENİ BELİRLE" }),
  ).toBeVisible();
  await dialog
    .getByLabel("MEVCUT / GEÇİCİ ŞİFRE", { exact: true })
    .fill("Initial-228");
  await dialog.getByLabel("YENİ ŞİFRE", { exact: true }).fill("Updated-228");
  await dialog
    .getByLabel("YENİ ŞİFRE TEKRAR", { exact: true })
    .fill("Updated-228");
  await dialog.getByRole("button", { name: "KAYDET", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "ÇIKIŞ", exact: true }).click();
  await page
    .getByLabel("KULLANICI ADI", { exact: true })
    .fill("test-first-login");
  await page.getByLabel("ŞİFRE", { exact: true }).fill("Updated-228");
  await page.getByRole("button", { name: "GİRİŞ YAP" }).click();
  await expect(
    page.getByRole("heading", { name: "E-FOOTBALL LİGİ", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
