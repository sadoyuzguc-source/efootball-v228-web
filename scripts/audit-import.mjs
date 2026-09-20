import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { loadState, db } from "../server/store.mjs";
import { standings, played, winner } from "../shared/rules.mjs";
const s = loadState(),
  wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(
  process.argv[2] || "M:\\eFootball_Lig_Yonetim_Sistemi_v228.xlsm",
);
const mapping = {
  DATA_Ligler: "leagues",
  DATA_Oyuncular: "players",
  DATA_Takimlar: "teams",
  DATA_Kadrolar: "squads",
  DATA_PESDB: "catalog",
  DATA_Maclar: "matches",
  DATA_MacOlaylari: "events",
  DATA_Haberler: "news",
  DATA_CanliYayin: "streams",
  DATA_KupaAyarlar: "cups",
  DATA_KupaKatilimcilari: "participants",
  DATA_Kullanicilar: "users",
  DATA_Roller: "roles",
  DATA_RolYetkileri: "permissions",
  DATA_TakimMuze: "museum",
  DATA_SezonArsiv: "archive",
  DATA_SezonIstatistikArsiv: "statsArchive",
  DATA_FutbolcuIstatistik: "footballStats",
  DATA_Hareketler: "logs",
};
const report = {
  tables: [],
  errors: [],
  passwordsVerified: 0,
  referenceChecks: [],
  standings: {},
};
for (const [sheet, key] of Object.entries(mapping)) {
  const ids = [];
  wb.getWorksheet(sheet)?.eachRow((r, i) => {
    if (i > 1 && Number(r.getCell(1).value))
      ids.push(Number(r.getCell(1).value));
  });
  report.tables.push({
    sheet,
    worksheetRows: wb.getWorksheet(sheet).actualRowCount,
    recordsWithId: ids.length,
    imported: s[key].length,
  });
  if (
    ids.some((id) => !s[key].some((x) => x.id === id)) ||
    s[key].length !== ids.length
  )
    report.errors.push(`Kimlik veya adet uyuşmazlığı: ${sheet}`);
}
wb.getWorksheet("DATA_Kullanicilar").eachRow((r, i) => {
  if (i < 2) return;
  const u = s.users.find((u) => u.id === Number(r.getCell(1).value));
  if (!u) return;
  const encoded = String(r.getCell(3).value || "");
  const decoded = /^(?:[a-fA-F0-9]{4})+$/.test(encoded)
    ? encoded
        .match(/.{4}/g)
        .map((x) => String.fromCharCode(parseInt(x, 16) ^ 1729))
        .join("")
    : encoded;
  if (bcrypt.compareSync(decoded, u.passwordHash)) report.passwordsVerified++;
  else
    report.errors.push("Bir kullanıcı hesabının şifre dönüşümü doğrulanamadı.");
});
for (const squad of s.squads) {
  if (!s.catalog.some((c) => c.id === squad.catalogId))
    report.errors.push(`Kadro kartı eksik: ${squad.id}`);
}
const countries = wb.getWorksheet("DATA_PESDB");
let auxiliary = 0;
countries.eachRow((r, i) => {
  if (i > 1 && r.getCell(20).value) auxiliary++;
});
report.catalogAuxiliaryCountryRows = auxiliary;
for (const l of s.leagues.filter(
  (l) => l.type === "Lig" && l.status === "Aktif",
))
  report.standings[l.name] = standings(
    s.players.filter((p) => p.leagueId === l.id),
    s.matches.filter((m) => m.leagueId === l.id),
  );
report.completedMatches = s.matches.filter(played).length;
report.champions = s.matches
  .filter((m) => m.stage === "FINAL")
  .map((m) => ({ cupId: m.leagueId, winner: winner(m) }));
console.log(JSON.stringify(report, null, 2));
db.close();
if (report.errors.length) process.exitCode = 1;
