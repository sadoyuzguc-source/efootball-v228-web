// Ported from modLigSistemi: PuanDurumunuYukle, FiksturOlustur,
// KupaElemeTuruOlusturYeni, KupaGrupSiralamasi and RolYetkisiVar.
export const PERMISSIONS = [
  "LIGLER.GORUNTULE",
  "KUPALAR.GORUNTULE",
  "TAKIMLAR.GORUNTULE",
  "TUMU",
  "AYARLAR.TUMU",
  "AYARLAR.LIG",
  "AYARLAR.KUPA",
  "AYARLAR.OYUNCU",
  "AYARLAR.FIKSTUR",
  "AYARLAR.SKOR",
  "AYARLAR.KULLANICI",
  "AYARLAR.HAREKETLER",
  "AYARLAR.TAKIM",
  "TAKIMLAR.DUZENLE",
  "KATALOG.GORUNTULE",
  "KATALOG.DUZENLE",
  "HABERLER.GORUNTULE",
  "HABERLER.DUZENLE",
  "YAYIN.DUZENLE",
];
export function turkeyToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type).value)
    .join("-");
}
export function isPastBroadcast(broadcast, today = turkeyToday()) {
  const date = String(broadcast.date || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < today;
}
export const normalize = (s) =>
  String(s ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ı", "i");
export const played = (m) => normalize(m.status).startsWith("oynand");
export const isActiveOrganization = (organization) =>
  normalize(organization?.status).trim() === "aktif";
export function fixtureParticipant(state, match, side) {
  const name = match[side] || "";
  const participant =
    state.participants.find(
      (p) => p.cupId === match.leagueId && p.name === name,
    ) ||
    state.players.find((p) => p.leagueId === match.leagueId && p.name === name);
  const team =
    participant?.team ||
    state.teams.find((t) => t.leagueId === match.leagueId && t.manager === name)
      ?.name ||
    name;
  return { name, team };
}
export const READ_PERMISSIONS = [
  "LIGLER.GORUNTULE",
  "KUPALAR.GORUNTULE",
  "TAKIMLAR.GORUNTULE",
  "KATALOG.GORUNTULE",
  "HABERLER.GORUNTULE",
];
export const LEAGUE_ROLE_PERMISSIONS = [
  "AYARLAR.OYUNCU",
  "AYARLAR.SKOR",
  "AYARLAR.FIKSTUR",
  "AYARLAR.TAKIM",
  "TAKIMLAR.DUZENLE",
  "KATALOG.GORUNTULE",
  "KATALOG.DUZENLE",
  "HABERLER.GORUNTULE",
  "HABERLER.DUZENLE",
  "YAYIN.DUZENLE",
];
export function isLeagueRole(role) {
  const name = normalize(typeof role === "string" ? role : role?.name).replace(
    /[\s_-]/g,
    "",
  );
  return (
    role?.scope === "league" ||
    ["ligadmini", "ligadmin", "ligyoneticisi"].includes(name)
  );
}
export const isLeagueScoped = (user) =>
  user?.scope === "league" || isLeagueRole(user?.role);
export const isViewer = (user) =>
  Boolean(user?.isGuest) || normalize(user?.role) === "izleyici";
export function canManageLeague(user, leagueId) {
  if (!user || isViewer(user)) return false;
  return (
    !isLeagueScoped(user) ||
    (Number(user.managedLeagueId) > 0 &&
      Number(leagueId) === Number(user.managedLeagueId))
  );
}
export const UEFA_COMPETITIONS = {
  champions: {
    name: "UEFA ŞAMPİYONLAR LİGİ",
    start: 1,
    end: 4,
    color: "#86baff",
    theme: "/championships/champions.svg",
  },
  europa: {
    name: "UEFA AVRUPA LİGİ",
    start: 5,
    end: 8,
    color: "#ffad54",
    theme: "/championships/europa.svg",
  },
  conference: {
    name: "UEFA KONFERANS LİGİ",
    start: 9,
    end: 12,
    color: "#70e8a1",
    theme: "/championships/conference.svg",
  },
};
export function cupCompetition(cup, league) {
  if (!cup) return "league";
  if (UEFA_COMPETITIONS[cup.competition]) return cup.competition;
  if (normalize(cup.type).includes("dogrudan")) return "league";
  // Old workbook cups stored the qualification band rather than a competition id.
  if (Number(cup.quota) === 5) return "europa";
  if (Number(cup.quota) === 9) return "conference";
  const title = normalize(league?.name || "");
  if (title.includes("konferans")) return "conference";
  if (title.includes("avrupa")) return "europa";
  return normalize(cup.type).includes("grup") ? "champions" : "league";
}
export function permitted(user, code) {
  if (!user) return false;
  if (isViewer(user)) return READ_PERMISSIONS.includes(code);
  if (isLeagueScoped(user)) {
    if (READ_PERMISSIONS.includes(code)) return true;
    if (!Number(user.managedLeagueId)) return false;
    if (code !== "AYARLAR" && !LEAGUE_ROLE_PERMISSIONS.includes(code))
      return false;
  }
  if (
    ["LIGLER.GORUNTULE", "KUPALAR.GORUNTULE", "TAKIMLAR.GORUNTULE"].includes(
      code,
    )
  )
    return true;
  const codes = user.permissions || [];
  if (normalize(user.role) === "admin" || codes.includes("TUMU")) return true;
  if (codes.includes(code)) return true;
  if (code.startsWith("AYARLAR.") && codes.includes("AYARLAR.TUMU"))
    return true;
  if (code === "AYARLAR" && codes.some((x) => x.startsWith("AYARLAR.")))
    return true;
  return (
    code.endsWith(".GORUNTULE") &&
    codes.includes(code.replace(".GORUNTULE", ".DUZENLE"))
  );
}
export function standings(players, matches, mode = "league") {
  const rows = players
    .filter((p) => p.active !== false)
    .map((p) => ({
      id: p.id,
      player: p.name,
      team: p.team || "",
      o: 0,
      g: 0,
      b: 0,
      m: 0,
      ag: 0,
      yg: 0,
      av: 0,
      p: 0,
    }));
  for (const match of matches.filter(played)) {
    for (const [name, goals, conceded] of [
      [match.home, match.homeGoals, match.awayGoals],
      [match.away, match.awayGoals, match.homeGoals],
    ]) {
      const r = rows.find((x) => normalize(x.player) === normalize(name));
      if (!r || name === "BAY") continue;
      r.o++;
      r.ag += Number(goals);
      r.yg += Number(conceded);
      r.av = r.ag - r.yg;
      if (goals > conceded) {
        r.g++;
        r.p += 3;
      } else if (goals === conceded) {
        r.b++;
        r.p++;
      } else r.m++;
    }
  }
  return rows.sort(
    (a, b) =>
      b.p - a.p ||
      b.av - a.av ||
      (mode === "group"
        ? b.ag - a.ag
        : mode === "archive"
          ? a.player.localeCompare(b.player, "tr")
          : 0),
  );
}
export function nextSaturday(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}
export function fixture(names, double = true, start = nextSaturday()) {
  if (names.length < 2 || new Set(names).size !== names.length)
    throw Error("En az iki farklı aktif oyuncu gerekir.");
  const rotation = [...names];
  if (rotation.length % 2) rotation.push("BAY");
  const result = [],
    rounds = rotation.length - 1;
  for (let period = 0; period < (double ? 2 : 1); period++) {
    for (let r = 0; r < rounds; r++) {
      const week = period * rounds + r + 1;
      const date = new Date(start + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() + (week - 1) * 7);
      for (let i = 0; i < rotation.length / 2; i++) {
        let home = rotation[i],
          away = rotation[rotation.length - 1 - i];
        if (home === "BAY" || away === "BAY") continue;
        if (r % 2) [home, away] = [away, home];
        if (period === 1) [home, away] = [away, home];
        result.push({
          week,
          home,
          away,
          homeGoals: null,
          awayGoals: null,
          date: date.toISOString().slice(0, 10),
          status: "Planlandı",
          stage: "LIG",
        });
      }
      rotation.splice(1, 0, rotation.pop());
    }
  }
  return result;
}
export const stageFor = (n) =>
  n <= 2
    ? "FINAL"
    : n <= 4
      ? "YARI FINAL"
      : n <= 8
        ? "CEYREK FINAL"
        : n <= 16
          ? "SON 16"
          : `SON ${2 ** Math.ceil(Math.log2(n))}`;
export function elimination(names) {
  if (names.length < 2) throw Error("En az iki katılımcı gerekir.");
  const stage = stageFor(names.length),
    matches = [],
    direct = [];
  let cursor = 0;
  if (names.length >= 12 && names.length <= 16) {
    direct.push(...names.slice(0, 16 - names.length));
    cursor = direct.length;
    while (cursor < names.length)
      matches.push({ home: names[cursor++], away: names[cursor++], stage });
  } else {
    const slots = 2 ** Math.ceil(Math.log2(names.length)),
      byes = slots - names.length;
    for (let i = 0; i < slots / 2; i++)
      matches.push({
        home: names[cursor++],
        away: i < byes ? "BAY" : names[cursor++],
        stage,
      });
  }
  return {
    stage,
    direct,
    matches: matches.map((m, i) => ({
      ...m,
      week: i + 1,
      homeGoals: m.away === "BAY" ? 1 : null,
      awayGoals: m.away === "BAY" ? 0 : null,
      status: m.away === "BAY" ? "Oynandı" : "Planlandı",
    })),
  };
}
export function winner(m) {
  if (m.away === "BAY") return m.home;
  if (m.home === "BAY") return m.away;
  if (!played(m) || m.homeGoals === m.awayGoals) return null;
  return m.homeGoals > m.awayGoals ? m.home : m.away;
}
export function statistics(events, matches) {
  const valid = new Set(matches.filter(played).map((m) => m.id)),
    map = new Map();
  function row(name) {
    if (!map.has(name))
      map.set(name, { name, gol: 0, asist: 0, sari: 0, kirmizi: 0 });
    return map.get(name);
  }
  for (const e of events) {
    if (!valid.has(e.matchId)) continue;
    if (e.type === "Gol") {
      row(e.player).gol++;
      if (e.assist) row(e.assist).asist++;
    }
    if (e.type === "Sarı Kart") row(e.player).sari++;
    if (e.type === "Kırmızı Kart") row(e.player).kirmizi++;
  }
  return [...map.values()].sort(
    (a, b) =>
      b.gol - a.gol || b.asist - a.asist || a.name.localeCompare(b.name, "tr"),
  );
}
export const nextId = (rows) =>
  rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
export const nextSeason = (s) =>
  /\d+/.test(s) ? s.replace(/\d+/, (x) => String(Number(x) + 1)) : "2.SEZON";
export const safeUrl = (s) =>
  /^(https?:\/\/|\/(?!\/))/.test(s || "") ? s : "";
