import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 3228),
  url = `http://localhost:${port}`;
async function health() {
  try {
    const r = await fetch(url + "/api/health", {
      signal: AbortSignal.timeout(1200),
    });
    const d = await r.json();
    return d.ok && d.version === "v228-web";
  } catch {
    return false;
  }
}
function run(args) {
  const p = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (p.status !== 0) process.exit(p.status || 1);
}
if (!(await health())) {
  if (!fs.existsSync(path.join(root, "node_modules")))
    throw Error("Önce proje klasöründe npm.cmd install komutunu çalıştırın.");
  if (!fs.existsSync(path.join(root, "data/efootball.sqlite")))
    run(["scripts/import-workbook.mjs"]);
  if (!fs.existsSync(path.join(root, "dist/index.html")))
    run(["node_modules/vite/bin/vite.js", "build"]);
  const dir = path.join(root, "data");
  fs.mkdirSync(dir, { recursive: true });
  const out = fs.openSync(path.join(dir, "server.log"), "a"),
    err = fs.openSync(path.join(dir, "server-error.log"), "a");
  const child = spawn(process.execPath, ["server/index.mjs", "--production"], {
    cwd: root,
    detached: true,
    stdio: ["ignore", out, err],
    windowsHide: true,
  });
  child.unref();
  fs.closeSync(out);
  fs.closeSync(err);
  fs.writeFileSync(path.join(dir, "server.pid"), String(child.pid));
  for (let i = 0; i < 40; i++) {
    if (await health()) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!(await health()))
    throw Error(
      "Uygulama başlatılamadı. data/server-error.log dosyasını kontrol edin.",
    );
}
console.log(`eFootball v228 Web çalışıyor: ${url}`);
if (process.platform === "win32") {
  const p = spawn("cmd.exe", ["/d", "/s", "/c", `start "" "${url}"`], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  p.unref();
}
