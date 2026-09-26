import test from "node:test";
import assert from "node:assert/strict";
import { actor, execute } from "../server/domain.mjs";
import { permitted, canManageLeague } from "../shared/rules.mjs";
import { migrateAccessData } from "../server/migrations.mjs";
function state() {
  return {
    meta: {},
    roles: [
      { id: 1, name: "Admin", system: true },
      { id: 8, name: "LİG ADMİNİ", scope: "league", system: false },
    ],
    permissions: [
      { id: 1, role: "Admin", code: "TUMU" },
      { id: 2, role: "LİG ADMİNİ", code: "TUMU" },
    ],
    users: [
      { id: 1, username: "admin", role: "Admin", active: true },
      {
        id: 2,
        username: "lig-a",
        role: "LİG ADMİNİ",
        active: true,
        managedLeagueId: 1,
      },
    ],
    leagues: [
      { id: 1, name: "Lig A", type: "Lig", season: "1.SEZON" },
      { id: 2, name: "Lig B", type: "Lig", season: "1.SEZON" },
      { id: 3, name: "Kupa", type: "Kupa" },
    ],
    players: [
      { id: 1, leagueId: 1, name: "A", team: "Takım A", active: true },
      { id: 2, leagueId: 1, name: "B", team: "Takım B", active: true },
      { id: 3, leagueId: 2, name: "C", team: "Takım C", active: true },
    ],
    teams: [
      { id: 1, leagueId: 1, name: "Takım A", managerId: 1 },
      { id: 2, leagueId: 1, name: "Takım B", managerId: 2 },
      { id: 3, leagueId: 2, name: "Takım C", managerId: 3 },
    ],
    catalog: [
      { id: 10, name: "Golcü" },
      { id: 11, name: "Orta Saha" },
    ],
    squads: [
      { id: 1, leagueId: 1, team: "Takım A", catalogId: 10 },
      { id: 2, leagueId: 2, team: "Takım C", catalogId: 11 },
    ],
    matches: [
      {
        id: 1,
        leagueId: 1,
        home: "A",
        away: "B",
        status: "Planlandı",
        stage: "LIG",
      },
      {
        id: 2,
        leagueId: 2,
        home: "C",
        away: "D",
        status: "Planlandı",
        stage: "LIG",
      },
    ],
    news: [
      { id: 1, leagueId: 1 },
      { id: 2, leagueId: 2 },
    ],
    streams: [
      { id: 1, leagueId: 1 },
      { id: 2, leagueId: 2 },
    ],
    events: [],
    footballStats: [],
    playerStats: [],
    cups: [],
    participants: [],
    museum: [],
    archive: [],
    statsArchive: [],
    logs: [],
  };
}
test("Misafir veri değiştiremez; hesap oluşturmadan salt okunur aktör alır", () => {
  const s = state(),
    guest = actor(s, 0),
    before = structuredClone(s);
  assert.equal(guest.isGuest, true);
  assert.equal(s.users.length, 2);
  for (const op of [
    "league.save",
    "league.delete",
    "player.save",
    "player.delete",
    "player.transfer",
    "match.save",
    "fixture.generate",
    "squad.add",
    "squad.delete",
    "squad.transfer",
    "catalog.import",
    "catalog.delete",
    "team.save",
    "news.save",
    "news.delete",
    "stream.save",
    "stream.delete",
    "cup.create",
    "cup.save",
    "cup.delete",
    "cup.advance",
    "season.new",
    "user.save",
    "role.save",
    "role.delete",
    "password",
  ])
    assert.throws(
      () => execute(s, guest, op, {}),
      (e) => e.status === 403,
    );
  assert.deepEqual(s, before);
  assert.equal(permitted(guest, "KATALOG.GORUNTULE"), true);
  assert.equal(
    permitted({ ...guest, permissions: ["TUMU"] }, "AYARLAR.SKOR"),
    false,
  );
});
test("Lig yöneticisi TUMU verilse bile başka ligde kaynak veya hedef değiştiremez", () => {
  const s = state(),
    user = actor(s, 2),
    before = structuredClone(s);
  const attacks = [
    ["player.save", { id: 3, leagueId: 1, name: "Yeni", team: "Yeni" }],
    ["player.save", { id: 1, leagueId: 2, name: "A", team: "Takım A" }],
    ["player.delete", { id: 3 }],
    ["player.transfer", { ids: [1, 3], leagueId: 1 }],
    ["squad.add", { teamId: 3, ids: [10] }],
    ["squad.delete", { id: 2 }],
    ["squad.transfer", { id: 1, teamId: 3 }],
    ["squad.transfer", { id: 2, teamId: 1 }],
    ["match.save", { id: 2, homeGoals: 1, awayGoals: 0 }],
    ["team.save", { id: 3 }],
    ["fixture.generate", { leagueId: 2 }],
    ["news.save", { id: 2, leagueId: 1 }],
    ["news.delete", { id: 2 }],
    ["stream.save", { id: 2, leagueId: 1 }],
    ["stream.delete", { id: 2 }],
    ["catalog.delete", { ids: [10] }],
    ["cup.create", {}],
    ["league.delete", { id: 1 }],
    ["user.save", {}],
    ["role.save", {}],
  ];
  for (const [op, p] of attacks) {
    assert.throws(
      () => execute(s, user, op, p),
      (e) => e.status === 403,
      op,
    );
    assert.deepEqual(s, before);
  }
  assert.equal(permitted(user, "AYARLAR.KULLANICI"), false);
  assert.equal(permitted(user, "AYARLAR.LIG"), false);
});
test("Lig yöneticisi kendi liginde skor, olay, oyuncu ve takım içi transfer işlemi yapabilir", () => {
  const s = state(),
    user = actor(s, 2);
  execute(s, user, "match.save", {
    id: 1,
    homeGoals: 1,
    awayGoals: 0,
    events: [{ type: "Gol", key: "home:1" }],
  });
  assert.equal(s.footballStats[0].gol, 1);
  execute(s, user, "squad.add", { teamId: 2, ids: [11] });
  assert.ok(s.squads.some((k) => k.team === "Takım B" && k.catalogId === 11));
  execute(s, user, "squad.transfer", { id: 1, teamId: 2 });
  assert.equal(s.squads.find((k) => k.id === 1).team, "Takım B");
  execute(s, user, "squad.delete", { id: 1 });
  assert.ok(!s.squads.some((k) => k.id === 1));
  execute(s, user, "player.save", {
    leagueId: 1,
    name: "Yeni oyuncu",
    team: "Yeni takım",
  });
  const player = s.players.find((p) => p.name === "Yeni oyuncu");
  assert.equal(player.leagueId, 1);
  execute(s, user, "player.delete", { id: player.id });
  assert.ok(!s.players.some((p) => p.id === player.id));
});
test("Lig ataması hesap bazlıdır ve değiştirilince eski lig yetkisi anında kalkar", () => {
  const s = state();
  assert.equal(canManageLeague(actor(s, 2), 1), true);
  execute(s, actor(s, 1), "user.save", {
    id: 2,
    username: "lig-a",
    role: "LİG ADMİNİ",
    active: true,
    managedLeagueId: 2,
  });
  assert.equal(canManageLeague(actor(s, 2), 1), false);
  assert.equal(canManageLeague(actor(s, 2), 2), true);
  assert.throws(
    () =>
      execute(s, actor(s, 1), "user.save", {
        username: "yeni",
        password: "test1234",
        role: "LİG ADMİNİ",
        managedLeagueId: 3,
      }),
    /kupa atanamaz/,
  );
  s.users[1].managedLeagueId = null;
  assert.equal(permitted(actor(s, 2), "AYARLAR.SKOR"), false);
});
test("Kullanici rolü kaldırılır; hesaplar korunur, lig kapsamı atanır, geçiş idempotenttir", () => {
  const s = state();
  s.roles.push({ id: 2, name: "Kullanici", system: true });
  s.users.push({
    id: 3,
    username: "eski-hesap",
    role: "Kullanici",
    active: true,
    passwordHash: "korunan-hash",
  });
  assert.equal(migrateAccessData(s), true);
  assert.ok(!s.roles.some((r) => r.name === "Kullanici"));
  assert.equal(s.users.find((u) => u.id === 3).role, "İzleyici");
  assert.equal(s.users.find((u) => u.id === 3).passwordHash, "korunan-hash");
  assert.equal(s.roles.find((r) => r.id === 8).scope, "league");
  assert.equal(s.users[1].managedLeagueId, 1);
  const before = structuredClone(s);
  assert.equal(migrateAccessData(s), false);
  assert.deepEqual(s, before);
  assert.throws(
    () =>
      execute(s, actor(s, 1), "role.save", {
        name: "Kullanici",
        permissions: ["TUMU"],
      }),
    /kaldırıldı/,
  );
});
