import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { db, loadState, mutate, dataDir, saveInitial } from "./store.mjs";
import { actor, execute, matchSquads } from "./domain.mjs";
import { permitted, normalize, PERMISSIONS } from "../shared/rules.mjs";
import { searchPesdata } from "./pesdata.mjs";

// Render free icin otomatik seed - DB bossa imajdaki seed.json'dan yukle
if (!loadState()) {
  try {
    const seedCandidates = [path.resolve("seed.json"), path.join(dataDir, "seed.json"), path.resolve(dataDir, "../seed.json")];
    for (const sp of seedCandidates) {
      if (fs.existsSync(sp)) {
        const seed = JSON.parse(fs.readFileSync(sp, "utf8"));
        if (seed.format === "efootball-v228-web" && seed.version === 1 && seed.state) {
          saveInitial(seed.state);
          console.log(`Seed yuklendi: ${sp} (${seed.state.users?.length || 0} kullanici)`);
          break;
        }
      }
    }
  } catch (e) { console.error("Seed yuklenemedi:", e.message); }
}

const app = express(),
  port = Number(process.env.PORT || 3228),
  production = process.argv.includes("--production");
app.disable("x-powered-by");
app.use(express.json({ limit: "30mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
  if (
    ["POST", "PUT", "DELETE", "PATCH"].includes(req.method) &&
    req.headers.origin &&
    new URL(req.headers.origin).host !== req.headers.host
  )
    return res.status(403).json({ error: "Ge+ðersiz istek kayna¦þ¦-." });
  next();
});
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex");
const sessionKey = (req) =>
  String(req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("ef228="))
    ?.slice(6);
app.use("/api", (req, res, next) => {
  const token = sessionKey(req);
  if (token) {
    const session = db
      .prepare("SELECT user_id FROM sessions WHERE token=? AND expires>?")
      .get(hash(token), Date.now());
    if (session) {
      const s = loadState();
      req.user = s ? actor(s, session.user_id) : null;
    }
  }
  next();
});
const requireUser = (req, res, next) =>
  req.user
    ? next()
    : res.status(401).json({ error: "Oturum a+ðman¦-z gerekiyor." });
const requireAdmin = (req, res, next) =>
  normalize(req.user?.role) === "admin"
    ? next()
    : res
        .status(403)
        .json({ error: "Bu i+þlem yaln¦-zca Admin taraf¦-ndan yap¦-labilir." });
const issueSession = (res, id) => {
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)").run(
    hash(token),
    id,
    Date.now() + 12 * 3600000,
  );
  res.cookie("ef228", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 12 * 3600000,
    path: "/",
  });
};
const attempts = new Map();
app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    imported: Boolean(loadState()),
    version: "v228-web",
    port,
  }),
);
app.get("/api/session", (req, res) =>
  res.json({ user: req.user || null, imported: Boolean(loadState()) }),
);
app.post("/api/login", (req, res) => {
  const key = req.ip,
    a = attempts.get(key) || { count: 0, until: Date.now() + 15 * 60000 };
  if (Date.now() > a.until) {
    a.count = 0;
    a.until = Date.now() + 15 * 60000;
  }
  if (a.count >= 15)
    return res.status(429).json({
      error: "+çok fazla ba+þar¦-s¦-z giri+þ. 15 dakika sonra tekrar deneyin.",
    });
  const s = loadState();
  if (!s)
    return res.status(503).json({
      error: "+ûnce npm run import komutuyla Excel dosyas¦-n¦- aktar¦-n.",
    });
  const user = s.users.find(
    (u) => normalize(u.username) === normalize(req.body.username) && u.active,
  );
  if (
    !user ||
    !bcrypt.compareSync(String(req.body.password || ""), user.passwordHash)
  ) {
    a.count++;
    attempts.set(key, a);
    return res.status(401).json({
      error:
        "Kullan¦-c¦- ad¦- veya +þifre yanl¦-+þ; hesab¦-n¦-z¦-n aktif oldu¦þunu kontrol edin.",
    });
  }
  attempts.delete(key);
  issueSession(res, user.id);
  res.json({ user: actor(s, user.id) });
});
app.post("/api/logout", (req, res) => {
  const token = sessionKey(req);
  if (token) db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
  res.clearCookie("ef228", { path: "/" });
  res.json({ ok: true });
});
app.get("/api/bootstrap", requireUser, (req, res) => {
  const s = loadState(),
    u = actor(s, req.user.id);
  const { users, roles, permissions, logs, catalog, news, streams, ...rest } =
    s;
  const canUsers = permitted(u, "AYARLAR.KULLANICI"),
    admin = normalize(u.role) === "admin";
  const squadIds = new Set(s.squads.map((k) => k.catalogId));
  res.json({
    ...rest,
    meta: {
      source: s.meta.source,
      importedAt: s.meta.importedAt,
      missingAssetCount: s.meta.missingAssets.length,
    },
    user: u,
    users: canUsers ? users.map(({ passwordHash, ...x }) => x) : [],
    roles: canUsers || admin ? roles : [],
    permissions: admin ? permissions : [],
    permissionCodes: PERMISSIONS,
    logs: permitted(u, "AYARLAR.HAREKETLER") ? logs : [],
    catalog: permitted(u, "KATALOG.GORUNTULE")
      ? catalog
      : catalog.filter((c) => squadIds.has(c.id)),
    catalogCount: catalog.length,
    news: permitted(u, "HABERLER.DUZENLE")
      ? news
      : news.filter((n) => n.active),
    streams:
      permitted(u, "HABERLER.DUZENLE") || permitted(u, "YAYIN.DUZENLE")
        ? streams
        : streams.filter((n) => n.active),
  });
});
const searchCards = new Map();
const countryFile = path.join(dataDir, "nationalities.json");
const nationalityLookup = fs.existsSync(countryFile)
  ? JSON.parse(fs.readFileSync(countryFile, "utf8"))
  : {};
app.get("/api/catalog/search", requireUser, async (req, res) => {
  if (!permitted(req.user, "KATALOG.DUZENLE"))
    return res.status(403).json({ error: "Katalog d+-zenleme yetkiniz yok." });
  const q = String(req.query.q || "").trim(),
    start = Math.max(0, Number(req.query.start) || 0);
  if (q.length < 2 || q.length > 100)
    return res
      .status(400)
      .json({ error: "En az 2, en fazla 100 karakter girin." });
  try {
    const result = await searchPesdata(q, start, nationalityLookup);
    if (searchCards.size > 10000) searchCards.clear();
    for (const card of result.players) searchCards.set(card.pesdataId, card);
    res.json(result);
  } catch (e) {
    res
      .status(502)
      .json({
        error:
          e.name === "TimeoutError"
            ? "PESDATA ba¦þlant¦-s¦- zaman a+þ¦-m¦-na u¦þrad¦-. Yerel katalog kullan¦-labilir."
            : e.message,
      });
  }
});
app.get("/api/matches/:id/squad", requireUser, (req, res) => {
  if (!permitted(req.user, "AYARLAR.SKOR"))
    return res.status(403).json({ error: "Skor giri+þ yetkiniz yok." });
  const s = loadState(),
    m = s.matches.find((x) => x.id === Number(req.params.id));
  if (!m) return res.status(404).json({ error: "Ma+ð bulunamad¦-." });
  res.json(matchSquads(s, m));
});
app.post("/api/action", requireUser, (req, res) => {
  const { op, payload = {}, revision } = req.body;
  if (
    typeof op !== "string" ||
    !payload ||
    Array.isArray(payload) ||
    typeof payload !== "object"
  )
    return res.status(400).json({ error: "Ge+ðersiz i+þlem." });
  if (op === "catalog.import") {
    payload.cards = (Array.isArray(payload.ids) ? payload.ids : []).map((id) =>
      searchCards.get(String(id)),
    );
    if (payload.cards.some((c) => !c))
      return res
        .status(400)
        .json({ error: "Arama sonu+ðlar¦-n¦- yenileyip tekrar se+ðin." });
  }
  const result = mutate(
    (s) => execute(s, actor(s, req.user.id), op, payload),
    revision,
  );
  if (op === "password") {
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(req.user.id);
    issueSession(res, req.user.id);
  }
  res.json(result);
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
app.post("/api/upload", requireUser, upload.single("image"), (req, res) => {
  if (
    !["HABERLER.DUZENLE", "AYARLAR.TAKIM", "TAKIMLAR.DUZENLE"].some((c) =>
      permitted(req.user, c),
    )
  )
    return res.status(403).json({ error: "G+Ârsel y+-kleme yetkiniz yok." });
  const b = req.file?.buffer;
  let ext = "";
  if (b?.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) ext = ".jpg";
  else if (
    b?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    ext = ".png";
  else if (
    b?.subarray(0, 4).toString() === "RIFF" &&
    b.subarray(8, 12).toString() === "WEBP"
  )
    ext = ".webp";
  if (!ext)
    return res
      .status(400)
      .json({ error: "JPG, PNG veya WebP g+Ârsel se+ðin (en fazla 8 MB)." });
  const dir = path.resolve("public/uploads");
  fs.mkdirSync(dir, { recursive: true });
  const name = crypto.randomBytes(16).toString("hex") + ext;
  fs.writeFileSync(path.join(dir, name), b);
  res.json({ url: "/uploads/" + name });
});
app.get("/api/backup", requireUser, requireAdmin, (req, res) => {
  res.attachment(
    `efootball-v228-${new Date().toISOString().slice(0, 10)}.json`,
  );
  res.json({ format: "efootball-v228-web", version: 1, state: loadState() });
});
// Ilk kurulum - DB bosken yetkisiz yukleme (Render free icin)
app.post("/api/init", (req, res) => {
  if (loadState()) return res.status(400).json({ error: "Veritabani zaten dolu. Ayarlar > Yedekten Geri Yukle kullanin." });
  const b = req.body;
  if (b.format !== "efootball-v228-web" || b.version !== 1 || !b.state) return res.status(400).json({ error: "Gecerli bir web yedegi secin." });
  const restored = b.state;
  if (!restored.users?.some((u) => u.role === "Admin" && u.active && /^\$2/.test(u.passwordHash))) return res.status(400).json({ error: "Yedekte aktif yonetici hesabi yok." });
  try { saveInitial(restored); res.json({ message: "Ilk yedek yuklendi. Giris yapabilirsiniz." }); } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post("/api/restore", requireUser, requireAdmin, (req, res) => {
  const b = req.body;
  if (b.format !== "efootball-v228-web" || b.version !== 1 || !b.state)
    return res.status(400).json({ error: "Ge+ðerli bir web yede¦þi se+ðin." });
  const current = loadState(),
    restored = b.state;
  for (const [key, v] of Object.entries(current)) {
    if (Array.isArray(v) && !Array.isArray(restored[key]))
      return res.status(400).json({ error: `Yedek eksik: ${key}` });
  }
  if (
    !restored.users.some(
      (u) => u.role === "Admin" && u.active && /^\$2/.test(u.passwordHash),
    )
  )
    return res
      .status(400)
      .json({ error: "Yedekte aktif y+Ânetici hesab¦- yok." });
  fs.writeFileSync(
    path.join(dataDir, `restore-before-${Date.now()}.json`),
    JSON.stringify({
      format: "efootball-v228-web",
      version: 1,
      state: current,
    }),
  );
  mutate((s) => {
    for (const k of Object.keys(s)) delete s[k];
    Object.assign(s, restored);
  }, current.revision);
  db.prepare("DELETE FROM sessions").run();
  res.clearCookie("ef228", { path: "/" });
  res.json({ message: "Yedek geri y+-klendi. Yeniden giri+þ yap¦-n." });
});
app.get("/api/export", requireUser, (req, res, next) => {
  if (!permitted(req.user, "AYARLAR.LIG"))
    return res.status(403).json({ error: "D¦-+þa aktarma yetkiniz yok." });
  const s = loadState(),
    wb = new ExcelJS.Workbook();
  wb.creator = "eFootball v228 Web";
  const sheets = [
    [
      "DATA_Ligler",
      s.leagues,
      ["id", "name", "season", "format", "status", "createdAt", "type"],
    ],
    ["DATA_Oyuncular", s.players, ["id", "leagueId", "name", "team", "active"]],
    [
      "DATA_Takimlar",
      s.teams,
      ["id", "leagueId", "name", "managerId", "manager", "budget", "logo"],
    ],
    [
      "DATA_Kadrolar",
      s.squads,
      ["id", "leagueId", "team", "catalogId", "createdAt"],
    ],
    [
      "DATA_PESDB",
      s.catalog,
      [
        "id",
        "name",
        "position",
        "club",
        "nation",
        "rating",
        "speed",
        "shoot",
        "pass",
        "dribble",
        "detail",
        "stamina",
        "image",
        "pesdataId",
        "playerId",
      ],
    ],
    [
      "DATA_Maclar",
      s.matches,
      [
        "id",
        "leagueId",
        "week",
        "home",
        "homeGoals",
        "awayGoals",
        "away",
        "date",
        "status",
        "stage",
      ],
    ],
    [
      "DATA_MacOlaylari",
      s.events,
      [
        "id",
        "matchId",
        "leagueId",
        "type",
        "catalogId",
        "player",
        "assistId",
        "assist",
      ],
    ],
    [
      "DATA_FutbolcuIstatistik",
      s.footballStats,
      ["id", "leagueId", "catalogId", "gol", "asist", "sari", "kirmizi"],
    ],
    [
      "DATA_KupaAyarlar",
      s.cups,
      [
        "id",
        "type",
        "season",
        "quota",
        "groups",
        "groupSize",
        "stage",
        "round",
        "museumMarker",
        "competition",
        "qualificationEnd",
      ],
    ],
    [
      "DATA_KupaKatilimcilari",
      s.participants,
      [
        "id",
        "cupId",
        "leagueId",
        "playerId",
        "name",
        "team",
        "group",
        "draw",
        "status",
        "qualifiedRank",
        "sourceSeason",
      ],
    ],
    [
      "DATA_TakimMuze",
      s.museum,
      [
        "id",
        "leagueId",
        "team",
        "league",
        "cup",
        "champions",
        "europa",
        "conference",
        "updatedAt",
      ],
    ],
    [
      "DATA_SezonArsiv",
      s.archive,
      [
        "id",
        "leagueId",
        "league",
        "season",
        "rank",
        "playerId",
        "player",
        "team",
        "o",
        "g",
        "b",
        "m",
        "ag",
        "yg",
        "av",
        "p",
        "date",
      ],
    ],
    [
      "DATA_SezonIstatistikArsiv",
      s.statsArchive,
      [
        "id",
        "leagueId",
        "league",
        "season",
        "name",
        "gol",
        "asist",
        "rank",
        "date",
      ],
    ],
    [
      "DATA_Haberler",
      s.news,
      ["id", "title", "body", "image", "date", "active", "leagueId"],
    ],
    [
      "DATA_CanliYayin",
      s.streams,
      [
        "id",
        "leagueId",
        "league",
        "home",
        "homeTeam",
        "away",
        "awayTeam",
        "date",
        "time",
        "url",
        "active",
      ],
    ],
  ];
  for (const [name, rows, keys] of sheets) {
    const ws = wb.addWorksheet(name);
    ws.columns = keys.map((k) => ({ header: k, key: k, width: 20 }));
    ws.addRows(
      rows.map((r) =>
        Object.fromEntries(
          keys.map((k) => [
            k,
            typeof r[k] === "boolean"
              ? r[k]
                ? "Evet"
                : "Hay¦-r"
              : (r[k] ?? ""),
          ]),
        ),
      ),
    );
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF123B5A" },
    };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  res.attachment("eFootball-v228-web.xlsx");
  wb.xlsx
    .write(res)
    .then(() => res.end())
    .catch(next);
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "API adresi bulunamad¦-." }),
);
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 400).json({
    error:
      err.code === "LIMIT_FILE_SIZE"
        ? "Dosya 8 MB s¦-n¦-r¦-n¦- a+þ¦-yor."
        : err.message || "¦-+þlem tamamlanamad¦-.",
  });
});
app.use("/uploads", express.static(path.resolve("public/uploads")));
app.use("/themes", express.static(path.resolve("public/themes")));
if (production) {
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `eFootball v228 ba¦þ¦-ms¦-z web uygulamas¦-: http://localhost:${port}`,
  ),
);
