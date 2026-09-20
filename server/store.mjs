import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
export const dataDir = path.resolve(process.env.DATA_DIR || "data");
fs.mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(path.join(dataDir, "efootball.sqlite"));
db.exec(
  "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);",
);
export const loadState = () => {
  const r = db.prepare("SELECT data, revision FROM app_state WHERE id=1").get();
  return r ? { ...JSON.parse(r.data), revision: r.revision } : null;
};
export function saveInitial(state) {
  if (loadState())
    throw Error(
      "Bu projede veritabanı zaten var. Mevcut verilerin üzerine aktarım yapılmadı.",
    );
  db.prepare("INSERT INTO app_state(id,data,revision) VALUES(1,?,1)").run(
    JSON.stringify(state),
  );
}
export function mutate(fn, expectedRevision) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const s = loadState();
    if (!s) throw Error("Önce Excel dosyasını içe aktarın.");
    if (
      expectedRevision !== undefined &&
      Number(expectedRevision) !== s.revision
    )
      throw Object.assign(
        Error("Veriler başka bir işlemle değişti. Yenileyip tekrar deneyin."),
        { status: 409 },
      );
    const result = fn(s);
    db.prepare(
      "UPDATE app_state SET data=?, revision=revision+1 WHERE id=1",
    ).run(JSON.stringify(s));
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
