import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const dir = fs.mkdtempSync(path.resolve("data", "unit-"));
process.env.DATA_DIR = dir;
const { loadState, saveInitial, mutate, db } =
  await import("../server/store.mjs");
test("SQLite işlemleri geri alınır, eski revizyon kaydı engellenir, başarılı kayıt kalıcıdır", () => {
  try {
    saveInitial({ players: [], value: 1 });
    const initial = loadState();
    assert.equal(initial.revision, 1);
    assert.throws(() =>
      mutate((s) => {
        s.value = 999;
        throw Error("Hata");
      }, 1),
    );
    assert.equal(loadState().value, 1);
    assert.equal(loadState().revision, 1);
    mutate((s) => {
      s.value = 2;
    }, 1);
    assert.equal(loadState().value, 2);
    assert.equal(loadState().revision, 2);
    assert.throws(
      () =>
        mutate((s) => {
          s.value = 3;
        }, 1),
      /başka bir işlemle/,
    );
    assert.equal(loadState().value, 2);
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
