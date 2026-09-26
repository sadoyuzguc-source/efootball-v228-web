import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { migrateAccessData } from "../server/migrations.mjs";
import { isLeagueRole, nextId } from "../shared/rules.mjs";
const source = new DatabaseSync(path.resolve("data/efootball.sqlite"), {
  readOnly: true,
});
const s = JSON.parse(
  source.prepare("SELECT data FROM app_state WHERE id=1").get().data,
);
source.close();
migrateAccessData(s);
// Tests always use a separate database. Production accounts and records are untouched.
process.env.DATA_DIR = path.resolve("data/e2e");
process.env.PORT = "3229";
fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
const testDb = new DatabaseSync(
  path.join(process.env.DATA_DIR, "efootball.sqlite"),
);
testDb.exec(
  "CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);",
);
for (let n = 1; n <= 4; n++) {
  const leagueId = 95000 + n;
  s.leagues.push({
    id: leagueId,
    name: `UEFA TEST LİGİ ${n}`,
    season: "UEFA TEST",
    type: "Lig",
    status: n <= 2 ? "Aktif" : "Pasif",
    format: "Tek Devre",
  });
  for (let rank = 12; rank >= 1; rank--)
    s.players.push({
      id: leagueId * 100 + rank,
      leagueId,
      name: `UEFA L${n} OYUNCU ${rank}`,
      team: `UEFA L${n} TAKIM ${rank}`,
      active: true,
    });
  let matchId = nextId(s.matches);
  for (let a = 1; a <= 12; a++)
    for (let b = a + 1; b <= 12; b++)
      s.matches.push({
        id: matchId++,
        leagueId,
        home: `UEFA L${n} OYUNCU ${a}`,
        away: `UEFA L${n} OYUNCU ${b}`,
        homeGoals: 1,
        awayGoals: 0,
        status: "Oynandı",
        stage: "LIG",
        date: "2026-01-01",
      });
}
const leagueRole = s.roles.find(isLeagueRole);
for (const [leagueId, rank] of [
  [95001, 1],
  [95001, 2],
  [95002, 1],
]) {
  const player = s.players.find(
    (p) => p.leagueId === leagueId && p.name.endsWith(`OYUNCU ${rank}`),
  );
  s.teams.push({
    id: nextId(s.teams),
    leagueId,
    name: player.team,
    manager: player.name,
    managerId: player.id,
    budget: 0,
    logo: "",
  });
}
s.users.push({
  id: 90003,
  username: "web-test-lig-admin",
  passwordHash: bcrypt.hashSync("Test-228-Only", 4),
  role: leagueRole.name,
  active: true,
  firstLogin: false,
  managedLeagueId: 95001,
});
s.users.push({
  id: 90001,
  username: "web-test-admin",
  passwordHash: bcrypt.hashSync("Test-228-Only", 4),
  role: "Admin",
  active: true,
  firstLogin: false,
});
s.users.push({
  id: 90002,
  username: "web-test-viewer",
  passwordHash: bcrypt.hashSync("Test-228-Only", 4),
  role: "TestViewer",
  active: true,
  firstLogin: false,
});
testDb
  .prepare("INSERT OR REPLACE INTO app_state(id,data,revision) VALUES(1,?,1)")
  .run(JSON.stringify(s));
testDb.close();
// Deterministic provider response, limited to this test-only process and query.
const liveFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (
    url.hostname === "www.pesdata.net" &&
    url.pathname === "/api/player/list" &&
    url.searchParams.get("searchword") === "Web Test Kart"
  ) {
    return Response.json({
      code: 1,
      data: {
        count: 2,
        list: [
          {
            playerId: 990002280001,
            playerName: "Web Test Kart A",
            position: "CF",
            overall: 91,
            Speed: 87,
            Finishing: 90,
            LowPass: 82,
            Dribbling: 86,
            Stamina: 83,
            country_id: 190,
          },
          {
            playerId: 990002280002,
            playerName: "Web Test Kart B",
            position: "AMF",
            overall: 92,
            Speed: 85,
            Finishing: 88,
            LowPass: 93,
            Dribbling: 91,
            Stamina: 85,
            country_id: 190,
          },
        ],
      },
    });
  }
  return liveFetch(input, options);
};
process.argv.push("--production");
await import("../server/index.mjs");
