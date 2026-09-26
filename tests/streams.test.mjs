import test from "node:test";
import assert from "node:assert/strict";
import { execute } from "../server/domain.mjs";
const admin = {
  id: 1,
  username: "Admin",
  role: "Admin",
  permissions: ["TUMU"],
};
function state() {
  return {
    leagues: [
      { id: 1, name: "Lig A", season: "1.SEZON", type: "Lig" },
      { id: 2, name: "Lig B", season: "1.SEZON", type: "Lig" },
      { id: 3, name: "Kupa", season: "1.SEZON", type: "Kupa" },
    ],
    players: [
      {
        id: 1,
        leagueId: 1,
        name: "Ev oyuncu",
        team: "Ev Takımı",
        active: false,
      },
      {
        id: 2,
        leagueId: 1,
        name: "Dep oyuncu",
        team: "Dep Takımı",
        active: true,
      },
    ],
    teams: [],
    participants: [
      { cupId: 3, name: "Ev oyuncu", team: "Ev Takımı", leagueId: 1 },
      { cupId: 3, name: "Konuk oyuncu", team: "Konuk Takımı", leagueId: 2 },
    ],
    matches: [
      {
        id: 101,
        leagueId: 1,
        home: "Ev oyuncu",
        away: "Dep oyuncu",
        date: "2030-06-01",
        week: 1,
        status: "Planlandı",
        stage: "LIG",
      },
      { id: 201, leagueId: 2, home: "Başka ev", away: "Başka dep" },
      { id: 301, leagueId: 3, home: "Ev oyuncu", away: "Konuk oyuncu" },
      { id: 302, leagueId: 3, home: "Ev oyuncu", away: "BAY" },
    ],
    streams: [],
    logs: [],
  };
}
const payload = {
  leagueId: 1,
  matchId: 101,
  date: "2030-06-02",
  time: "22:30",
  url: "https://example.com/yayin",
  active: true,
};
test("Yayın tarafları elle gönderilen bilgilerden değil fikstürden türetilir; diğer seçimler korunur", () => {
  const s = state();
  execute(s, admin, "stream.save", {
    ...payload,
    home: "Sahte",
    away: "Sahte",
    homeTeam: "Sahte",
  });
  assert.deepEqual(s.streams[0], {
    id: 1,
    matchId: 101,
    fixtureSeason: "1.SEZON",
    leagueId: 1,
    league: "Lig A",
    home: "Ev oyuncu",
    away: "Dep oyuncu",
    homeTeam: "Ev Takımı",
    awayTeam: "Dep Takımı",
    date: "2030-06-02",
    time: "22:30",
    url: "https://example.com/yayin",
    active: true,
  });
});
test("Maç seçmeden, başka lig maçıyla veya BAY eşleşmesiyle yeni yayın oluşturulamaz", () => {
  const s = state();
  for (const p of [
    { ...payload, matchId: "" },
    { ...payload, matchId: 201 },
    { ...payload, matchId: 999 },
    { ...payload, leagueId: 3, matchId: 302 },
    { ...payload, matchId: "existing" },
  ])
    assert.throws(() => execute(s, admin, "stream.save", p));
  assert.equal(s.streams.length, 0);
});
test("Kupa maçı seçilince takımlar kupa katılımcılarından bulunur", () => {
  const s = state();
  execute(s, admin, "stream.save", { ...payload, leagueId: 3, matchId: 301 });
  assert.equal(s.streams[0].awayTeam, "Konuk Takımı");
  assert.equal(s.streams[0].leagueId, 3);
});
test("Fikstürü arşivlenmiş eski yayın düzenlenebilir; taraflar korunur", () => {
  const s = state();
  s.streams = [
    {
      id: 8,
      leagueId: 1,
      home: "Eski ev",
      away: "Eski dep",
      homeTeam: "Eski Ev Takımı",
      awayTeam: "Eski Dep Takımı",
      date: "2026-09-05",
      time: "21:00",
    },
  ];
  execute(s, admin, "stream.save", {
    ...payload,
    id: 8,
    matchId: "existing",
    home: "Sahte",
    active: false,
  });
  assert.equal(s.streams[0].home, "Eski ev");
  assert.equal(s.streams[0].active, false);
  assert.equal(s.streams[0].date, payload.date);
  assert.throws(() =>
    execute(s, admin, "stream.save", {
      ...payload,
      id: 8,
      matchId: "existing",
      leagueId: 2,
    }),
  );
});
test("Yeni sezonda yeniden kullanılan maç kimliği eski yayına yanlış eşleşme yapmaz", () => {
  const s = state();
  s.streams = [
    {
      id: 8,
      leagueId: 1,
      matchId: 101,
      fixtureSeason: "0.SEZON",
      home: "Eski ev",
      away: "Eski dep",
      homeTeam: "Eski Ev Takımı",
      awayTeam: "Eski Dep Takımı",
    },
  ];
  execute(s, admin, "stream.save", { ...payload, id: 8, matchId: "existing" });
  assert.equal(s.streams[0].home, "Eski ev");
  assert.equal(s.streams[0].fixtureSeason, "0.SEZON");
});
test("Lig yöneticisi maç kimliği üzerinden başka lige yayın ekleyemez", () => {
  const s = state(),
    user = {
      id: 2,
      username: "Lig admini",
      role: "LİG ADMİNİ",
      scope: "league",
      managedLeagueId: 1,
      permissions: ["YAYIN.DUZENLE"],
    };
  assert.throws(
    () => execute(s, user, "stream.save", { ...payload, matchId: 201 }),
    (e) => e.status === 403,
  );
  execute(s, user, "stream.save", payload);
  assert.equal(s.streams[0].matchId, 101);
});
