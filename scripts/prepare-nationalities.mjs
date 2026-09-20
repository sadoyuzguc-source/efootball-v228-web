import fs from "node:fs";
import path from "node:path";
const dir = path.resolve(process.env.DATA_DIR || "data");
const sheets = JSON.parse(
  fs.readFileSync(path.join(dir, "source-sheets.json"), "utf8"),
);
const rows = sheets.find((s) => s.name === "DATA_PESDB")?.rows || [];
const countries = {
  France: "Fransa",
  England: "İngiltere",
  Spain: "İspanya",
  Germany: "Almanya",
  Italy: "İtalya",
  Portugal: "Portekiz",
  Brazil: "Brezilya",
  Argentina: "Arjantin",
  Netherlands: "Hollanda",
  Belgium: "Belçika",
  Croatia: "Hırvatistan",
  Turkey: "Türkiye",
  Norway: "Norveç",
  Poland: "Polonya",
  Slovenia: "Slovenya",
  Switzerland: "İsviçre",
  Sweden: "İsveç",
  Denmark: "Danimarka",
  Uruguay: "Uruguay",
  Colombia: "Kolombiya",
  Morocco: "Fas",
  Nigeria: "Nijerya",
  "South Korea": "Güney Kore",
  Japan: "Japonya",
};
const lookup = {};
for (const row of rows.slice(1)) {
  if (row?.[20] && row?.[21])
    lookup[String(row[20])] = countries[row[21]] || row[21];
}
fs.writeFileSync(path.join(dir, "nationalities.json"), JSON.stringify(lookup));
console.log(
  Object.keys(lookup).length,
  "yardımcı ülke eşleştirmesi hazırlandı.",
);
