import ExcelJS from "exceljs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { saveInitial, loadState, db, dataDir } from "../server/store.mjs";

const source = process.argv[2] || "M:\\eFootball_Lig_Yonetim_Sistemi_v228.xlsm";
if (loadState()) {
  console.error("Bu bağımsız projenin veritabanı zaten dolu; değiştirilmedi.");
  process.exit(1);
}
const bytes = await fs.readFile(source),
  wb = new ExcelJS.Workbook();
await wb.xlsx.load(bytes);
const value = (c) => {
  const v = c.value;
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === "object")
    return v.result ?? v.richText?.map((x) => x.text).join("") ?? v.text ?? "";
  return v ?? "";
};
const rows = (name) => {
  const result = [];
  wb.getWorksheet(name)?.eachRow((r, n) => {
    if (n > 1 && r.getCell(1).value !== null)
      result.push(
        Array.from({ length: Math.max(24, r.cellCount) }, (_, i) =>
          value(r.getCell(i + 1)),
        ),
      );
  });
  return result;
};
const n = (v) => Number(v) || 0,
  yes = (v) => ["evet", "1", "true"].includes(String(v).toLowerCase());
const date = (v) =>
  typeof v === "number"
    ? new Date(Math.round((v - 25569) * 86400000)).toISOString()
    : String(v || "");
const text = (v) =>
  String(v ?? "")
    .replaceAll("PlanlandÄ±", "Planlandı")
    .replaceAll("OynandÄ±", "Oynandı");
const missingAssets = [];
await fs.mkdir(path.resolve("public/uploads"), { recursive: true });
await fs.mkdir(path.resolve("public/themes"), { recursive: true });
async function media(v) {
  if (!v) return "";
  if (/^https?:\/\//.test(v)) return v;
  try {
    const data = await fs.readFile(v);
    const name =
      crypto.createHash("sha256").update(data).digest("hex").slice(0, 20) +
      path.extname(v);
    await fs.writeFile(path.resolve("public/uploads", name), data);
    return "/uploads/" + name;
  } catch {
    missingAssets.push(String(v));
    return "";
  }
}
const s = {
  meta: {
    source: path.basename(source),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    importedAt: new Date().toISOString(),
    missingAssets,
  },
  settings: rows("DATA_Ayarlar"),
};
s.leagues = rows("DATA_Ligler").map((r) => ({
  id: n(r[0]),
  name: r[1],
  season: r[2],
  format: r[3],
  status: r[4],
  createdAt: date(r[5]),
  type: r[6] || "Lig",
}));
s.players = rows("DATA_Oyuncular").map((r) => ({
  id: n(r[0]),
  leagueId: n(r[1]),
  name: r[2],
  team: r[3],
  active: yes(r[4]),
}));
s.teams = await Promise.all(
  rows("DATA_Takimlar").map(async (r) => ({
    id: n(r[0]),
    leagueId: n(r[1]),
    name: r[2],
    managerId: n(r[3]),
    manager: r[4],
    budget: n(r[5]),
    logo: await media(r[6]),
  })),
);
s.catalog = rows("DATA_PESDB").map((r) => ({
  id: n(r[0]),
  name: r[1],
  position: r[2],
  club: r[3],
  nation: r[4],
  rating: n(r[5]),
  speed: n(r[6]),
  shoot: n(r[7]),
  pass: n(r[8]),
  dribble: n(r[9]),
  detail: r[10],
  stamina: n(r[11]),
  image: /^https?:\/\//.test(r[12]) ? r[12] : "",
  pesdataId: text(r[13]),
  playerId: text(r[19]),
}));
s.squads = rows("DATA_Kadrolar").map((r) => ({
  id: n(r[0]),
  leagueId: n(r[1]),
  team: r[2],
  catalogId: n(r[3]),
  createdAt: date(r[4]),
}));
s.matches = rows("DATA_Maclar").map((r) => ({
  id: n(r[0]),
  leagueId: n(r[1]),
  week: r[2],
  home: r[3],
  homeGoals: r[4] === "" ? null : n(r[4]),
  awayGoals: r[5] === "" ? null : n(r[5]),
  away: r[6],
  date: date(r[7]).slice(0, 10),
  status: text(r[8]),
  stage: r[9],
}));
s.events = rows("DATA_MacOlaylari").map((r) => ({
  id: n(r[0]),
  matchId: n(r[1]),
  leagueId: n(r[2]),
  type: r[3],
  catalogId: n(r[4]),
  player: r[5],
  assistId: n(r[6]),
  assist: r[7],
}));
s.footballStats = rows("DATA_FutbolcuIstatistik").map((r) => ({
  id: n(r[0]),
  leagueId: n(r[1]),
  catalogId: n(r[2]),
  gol: n(r[3]),
  asist: n(r[4]),
  sari: n(r[5]),
  kirmizi: n(r[6]),
}));
s.playerStats = rows("DATA_Istatistik");
s.cups = rows("DATA_KupaAyarlar").map((r) => ({
  id: n(r[0]),
  type: r[1],
  season: r[2],
  quota: n(r[3]),
  groups: n(r[4]),
  groupSize: n(r[5]),
  stage: r[6],
  round: n(r[7]),
  museumMarker: r[8],
  direct: [],
}));
s.participants = rows("DATA_KupaKatilimcilari").map((r) => ({
  id: n(r[0]),
  cupId: n(r[1]),
  leagueId: n(r[2]),
  playerId: n(r[3]),
  name: r[4],
  team: r[5],
  group: r[6],
  draw: n(r[7]),
  status: r[8],
}));
s.museum = rows("DATA_TakimMuze").map((r) => ({
  id: n(r[0]),
  leagueId: n(r[1]),
  team: r[2],
  league: n(r[3]),
  cup: n(r[4]),
  champions: n(r[5]),
  europa: n(r[6]),
  conference: n(r[7]),
  updatedAt: date(r[8]),
}));
s.archive = rows("DATA_SezonArsiv").map((r) => ({
  id: n(r[0]),
  leagueId: n(r[1]),
  league: r[2],
  season: r[3],
  rank: n(r[4]),
  playerId: n(r[5]),
  player: r[6],
  team: r[7],
  o: n(r[8]),
  g: n(r[9]),
  b: n(r[10]),
  m: n(r[11]),
  ag: n(r[12]),
  yg: n(r[13]),
  av: n(r[14]),
  p: n(r[15]),
  date: date(r[16]),
}));
s.statsArchive = rows("DATA_SezonIstatistikArsiv").map((r) => ({
  id: n(r[0]),
  leagueId: n(r[1]),
  league: r[2],
  season: r[3],
  name: r[4],
  gol: n(r[5]),
  asist: n(r[6]),
  rank: n(r[7]),
  date: date(r[8]),
}));
s.news = await Promise.all(
  rows("DATA_Haberler").map(async (r) => ({
    id: n(r[0]),
    title: r[1],
    body: r[2],
    image: await media(r[3]),
    date: date(r[4]),
    active: yes(r[5]),
    leagueId: n(r[6]),
  })),
);
s.streams = rows("DATA_CanliYayin").map((r) => ({
  id: n(r[0]),
  leagueId: n(r[1]),
  league: r[2],
  home: r[3],
  homeTeam: r[4],
  away: r[5],
  awayTeam: r[6],
  date: date(r[7]).slice(0, 10),
  time:
    typeof r[8] === "string" && r[8].includes("T")
      ? r[8].slice(11, 16)
      : text(r[8]),
  url: r[9],
  active: yes(r[10]),
  createdAt: date(r[11]),
}));
s.roles = rows("DATA_Roller").map((r) => ({
  id: n(r[0]),
  name: r[1],
  description: r[2],
  system: yes(r[3]),
}));
s.permissions = rows("DATA_RolYetkileri").map((r) => ({
  id: n(r[0]),
  role: r[1],
  code: r[2],
  description: r[3],
}));
s.users = await Promise.all(
  rows("DATA_Kullanicilar").map(async (r) => {
    const encoded = text(r[2]);
    let password = encoded;
    if (/^(?:[0-9A-Fa-f]{4})+$/.test(encoded))
      password = encoded
        .match(/.{4}/g)
        .map((x) => String.fromCharCode(parseInt(x, 16) ^ 1729))
        .join("");
    return {
      id: n(r[0]),
      username: r[1],
      passwordHash: encoded.startsWith("$2")
        ? encoded
        : await bcrypt.hash(password, 12),
      role: r[3],
      active: yes(r[4]),
      createdAt: date(r[5]),
      firstLogin: yes(r[6]),
      playerId: n(r[7]),
      updatedAt: date(r[8]),
    };
  }),
);
s.logs = rows("DATA_Hareketler").map((r) => ({
  id: n(r[0]),
  date: date(r[1]),
  username: r[2],
  role: r[3],
  action: r[4],
  module: r[5],
  description: r[6],
  reference: r[7],
}));
for (const r of rows("DATA_TEMA")) {
  const data = r.slice(1).join("");
  if (data.startsWith("/9j/"))
    await fs.writeFile(
      path.resolve("public/themes", text(r[0]) + ".jpg"),
      Buffer.from(data, "base64"),
    );
}
// Retain every original cell in a private file, including fields not used by the UI.
const original = wb.worksheets.map((w) => ({
  name: w.name,
  rows: Array.from({ length: w.rowCount }, (_, i) => w.getRow(i + 1).values),
}));
await fs.writeFile(
  path.join(dataDir, "source-sheets.json"),
  JSON.stringify(original),
);
await fs.writeFile(
  path.join(dataDir, "import-report.json"),
  JSON.stringify(
    {
      source: s.meta,
      counts: Object.fromEntries(
        Object.entries(s)
          .filter(([, v]) => Array.isArray(v))
          .map(([k, v]) => [k, v.length]),
      ),
      missingAssets,
    },
    null,
    2,
  ),
);
saveInitial(s);
db.close();
await import("./prepare-nationalities.mjs");
console.log(
  "Aktarım tamamlandı:",
  s.leagues.length,
  "lig/kupa,",
  s.players.length,
  "oyuncu,",
  s.catalog.length,
  "katalog kartı,",
  s.matches.length,
  "maç.",
);
console.log(
  "Gömülü tema görselleri aktarıldı. Bulunamayan harici görsel:",
  missingAssets.length,
);
