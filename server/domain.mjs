import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  fixture,
  standings,
  statistics,
  played,
  permitted,
  nextId,
  nextSeason,
  nextSaturday,
  elimination,
  winner,
  normalize,
  PERMISSIONS,
  UEFA_COMPETITIONS,
  cupCompetition,
  isLeagueRole,
  READ_PERMISSIONS,
  fixtureParticipant,
} from "../shared/rules.mjs";
import { assertOperationScope } from "./access.mjs";

const fail = (message, status = 400) => {
  throw Object.assign(Error(message), { status });
};
const required = (value, label) => {
  const s = String(value ?? "").trim();
  if (!s) fail(`${label} zorunludur.`);
  return s;
};
const integer = (v, label, min = 0) => {
  if (
    v === "" ||
    v === null ||
    v === undefined ||
    !Number.isSafeInteger(Number(v)) ||
    Number(v) < min
  )
    fail(`${label} için ${min} veya daha büyük bir tam sayı girin.`);
  return Number(v);
};
const find = (rows, id, label = "Kayıt") =>
  rows.find((r) => r.id === Number(id)) || fail(`${label} bulunamadı.`, 404);
const shuffled = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const validDate = (d) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "") || isNaN(Date.parse(d)))
    fail("Geçerli bir tarih girin.");
  return d;
};
const imagePath = (s) => {
  if (!s) return "";
  if (!/^\/uploads\/[a-zA-Z0-9._-]+$/.test(s))
    fail("Görseli dosya yükleme alanından seçin.");
  return s;
};
export const actor = (state, id) => {
  if (id === 0)
    return {
      id: 0,
      username: "Misafir",
      role: "İzleyici",
      isGuest: true,
      scope: "readonly",
      managedLeagueId: null,
      playerId: 0,
      firstLogin: false,
      permissions: READ_PERMISSIONS,
    };
  const u = state.users.find((u) => u.id === id && u.active);
  const role = u ? state.roles.find((r) => r.name === u.role) : null;
  return u
    ? {
        id: u.id,
        username: u.username,
        role: u.role,
        playerId: u.playerId,
        firstLogin: u.firstLogin,
        isGuest: false,
        scope: isLeagueRole(role) || isLeagueRole(u.role) ? "league" : "global",
        managedLeagueId: Number(u.managedLeagueId) || null,
        permissions: state.permissions
          .filter((p) => p.role === u.role)
          .map((p) => p.code),
      }
    : null;
};
const authorize = (u, code) => {
  if (!permitted(u, code))
    fail("Bu işlem için rolünüze yetki verilmemiş.", 403);
};
function appendMatches(s, leagueId, matches) {
  let id = nextId(s.matches);
  s.matches.push(
    ...matches.map((m) => ({ id: id++, leagueId, date: nextSaturday(), ...m })),
  );
}
function cupRound(s, cup, names) {
  const r = elimination(names);
  cup.stage = r.stage;
  cup.direct = r.direct;
  appendMatches(s, cup.id, r.matches);
}
function museumWinner(s, cup, name) {
  if (cup.museumMarker) return;
  const p = s.participants.find((p) => p.cupId === cup.id && p.name === name);
  if (!p) return;
  let m = s.museum.find((m) => m.leagueId === p.leagueId && m.team === p.team);
  if (!m) {
    m = {
      id: nextId(s.museum),
      leagueId: p.leagueId,
      team: p.team,
      league: 0,
      cup: 0,
      champions: 0,
      europa: 0,
      conference: 0,
    };
    s.museum.push(m);
  }
  const competition = cupCompetition(
    cup,
    s.leagues.find((l) => l.id === cup.id),
  );
  const field = competition === "league" ? "cup" : competition;
  m[field]++;
  m.updatedAt = new Date().toISOString();
  cup.museumMarker = `${p.team}|${field}`;
}
export function advanceCup(s, cup, strict = false) {
  if (cup.stage === "TAMAMLANDI") return;
  let matches = s.matches.filter(
    (m) =>
      m.leagueId === cup.id &&
      (cup.stage === "GRUP ASAMASI"
        ? m.stage.startsWith("GRUP ")
        : m.stage === cup.stage),
  );
  if (
    !matches.length ||
    matches.some((m) => !played(m)) ||
    (cup.stage !== "GRUP ASAMASI" && matches.some((m) => !winner(m)))
  ) {
    if (strict)
      fail(
        "Mevcut turdaki tüm maçlar tamamlanmalı; eleme maçlarında beraberlik kalmamalı.",
      );
    return;
  }
  if (cup.stage === "GRUP ASAMASI") {
    const groups = Object.fromEntries(
      ["A", "B", "C", "D"].map((g) => [
        g,
        standings(
          s.participants.filter((p) => p.cupId === cup.id && p.group === g),
          matches.filter((m) => m.stage === "GRUP " + g),
          "group",
        ),
      ]),
    );
    if (Object.values(groups).some((g) => g.length < 2))
      fail("Gruplarda yeterli katılımcı yok.");
    cupRound(s, cup, [
      groups.A[0].player,
      groups.B[1].player,
      groups.B[0].player,
      groups.A[1].player,
      groups.C[0].player,
      groups.D[1].player,
      groups.D[0].player,
      groups.C[1].player,
    ]);
    return;
  }
  const winners = matches.map(winner);
  if (cup.stage === "FINAL") {
    cup.champion = winners[0];
    museumWinner(s, cup, winners[0]);
    cup.stage = "TAMAMLANDI";
    return;
  }
  let names = winners;
  if (cup.direct?.length) {
    names = [];
    cup.direct.forEach((n, i) => {
      names.push(n);
      if (winners[i]) names.push(winners[i]);
    });
    names.push(...winners.slice(cup.direct.length));
  }
  cupRound(s, cup, names);
}
function checkLeagueMembershipChange(s, leagueId) {
  if (s.matches.some((m) => m.leagueId === leagueId && !played(m)))
    fail("Lig kadrosunu değiştirmeden önce mevcut fikstürü tamamlayın.");
}
function removeCompetition(s, id) {
  const matchIds = new Set(
    s.matches.filter((m) => m.leagueId === id).map((m) => m.id),
  );
  s.matches = s.matches.filter((m) => m.leagueId !== id);
  s.events = s.events.filter((e) => !matchIds.has(e.matchId));
  s.footballStats = s.footballStats.filter((x) => x.leagueId !== id);
  s.leagues = s.leagues.filter((l) => l.id !== id);
  s.cups = s.cups.filter((c) => c.id !== id);
  s.participants = s.participants.filter((p) => p.cupId !== id);
  s.players.forEach((p) => {
    if (p.leagueId === id) p.leagueId = 0;
  });
  s.teams.forEach((t) => {
    if (t.leagueId === id) t.leagueId = 0;
  });
  s.squads.forEach((k) => {
    if (k.leagueId === id) k.leagueId = 0;
  });
}

export function execute(s, user, op, p) {
  if (!user) fail("Oturum açmanız gerekiyor.", 401);
  assertOperationScope(s, user, op, p);
  if (user.firstLogin && op !== "password")
    fail("Önce kişisel şifrenizi belirleyin.", 403);
  let result = { message: "İşlem kaydedildi." };
  switch (op) {
    case "league.save": {
      authorize(user, "AYARLAR.LIG");
      const name = required(p.name, "Lig adı"),
        season = required(p.season, "Sezon");
      if (
        s.leagues.some(
          (l) =>
            l.id !== Number(p.id) &&
            normalize(l.name) === normalize(name) &&
            l.season === season,
        )
      )
        fail("Bu lig ve sezon zaten kayıtlı.");
      const format = ["Tek Devre", "Çift Devre (deplasmanlı)"].includes(
        p.format,
      )
        ? p.format
        : "Çift Devre (deplasmanlı)";
      if (p.id) {
        const l = find(s.leagues, p.id);
        if (l.type !== "Lig")
          fail("Bu kayıt kupa yönetiminden düzenlenmelidir.");
        if (s.matches.some((m) => m.leagueId === l.id) && l.format !== format)
          fail("Fikstür oluşturulduktan sonra format değiştirilemez.");
        Object.assign(l, {
          name,
          season,
          format,
          status: p.status === "Pasif" ? "Pasif" : "Aktif",
        });
      } else
        s.leagues.push({
          id: nextId(s.leagues),
          name,
          season,
          format,
          status: "Aktif",
          type: "Lig",
          createdAt: new Date().toISOString(),
        });
      break;
    }
    case "league.delete":
      authorize(user, "AYARLAR.LIG");
      {
        const l = find(s.leagues, p.id);
        if (l.type !== "Lig") fail("Kupa yönetimini kullanın.");
        removeCompetition(s, l.id);
      }
      break;
    case "player.save": {
      authorize(user, "AYARLAR.OYUNCU");
      const name = required(p.name, "Oyuncu adı"),
        team = required(p.team, "Takım adı"),
        leagueId = integer(p.leagueId, "Lig");
      if (leagueId && find(s.leagues, leagueId).type !== "Lig")
        fail("Oyuncu yalnızca lige atanabilir.");
      const old = p.id ? find(s.players, p.id) : null;
      if (
        s.players.some(
          (x) =>
            x.id !== old?.id &&
            (normalize(x.name) === normalize(name) ||
              normalize(x.team) === normalize(team)),
        )
      )
        fail("Oyuncu veya takım adı zaten kullanılıyor.");
      if (!old || old.leagueId !== leagueId) {
        checkLeagueMembershipChange(s, leagueId);
        if (old?.leagueId) checkLeagueMembershipChange(s, old.leagueId);
      }
      const id = old?.id || nextId(s.players),
        t = s.teams.find((t) => t.managerId === id);
      if (old) {
        s.matches.forEach((m) => {
          if (m.leagueId === old.leagueId) {
            if (m.home === old.name) m.home = name;
            if (m.away === old.name) m.away = name;
          }
        });
        s.squads.forEach((k) => {
          if (k.leagueId === old.leagueId && k.team === old.team) {
            k.team = team;
            k.leagueId = leagueId;
          }
        });
        s.museum.forEach((m) => {
          if (m.leagueId === old.leagueId && m.team === old.team) {
            m.team = team;
            m.leagueId = leagueId;
          }
        });
        Object.assign(old, {
          name,
          team,
          leagueId,
          active: p.active !== false,
        });
      } else s.players.push({ id, name, team, leagueId, active: true });
      if (t) Object.assign(t, { name: team, manager: name, leagueId });
      else
        s.teams.push({
          id: nextId(s.teams),
          leagueId,
          name: team,
          managerId: id,
          manager: name,
          budget: 0,
          logo: "",
        });
      break;
    }
    case "player.delete": {
      authorize(user, "AYARLAR.OYUNCU");
      const player = find(s.players, p.id);
      checkLeagueMembershipChange(s, player.leagueId);
      if (
        s.matches.some((m) => m.home === player.name || m.away === player.name)
      )
        fail("Maç geçmişi olan oyuncuyu silmek yerine pasif yapın.");
      s.players = s.players.filter((x) => x.id !== player.id);
      s.teams = s.teams.filter((x) => x.managerId !== player.id);
      s.squads = s.squads.filter((x) => x.team !== player.team);
      break;
    }
    case "player.transfer": {
      authorize(user, "AYARLAR.OYUNCU");
      const target = find(s.leagues, p.leagueId, "Hedef lig");
      if (target.type !== "Lig") fail("Hedef bir lig olmalıdır.");
      checkLeagueMembershipChange(s, target.id);
      const ids = [...new Set((p.ids || []).map(Number))];
      if (!ids.length) fail("Taşınacak oyuncuları seçin.");
      let moved = 0,
        blocked = 0,
        same = 0;
      for (const id of ids) {
        const player = find(s.players, id, "Oyuncu");
        if (player.leagueId === target.id) {
          same++;
          continue;
        }
        const source = s.leagues.find((l) => l.id === player.leagueId);
        if (
          source?.status !== "Pasif" &&
          s.matches.some((m) => m.leagueId === player.leagueId && !played(m))
        ) {
          blocked++;
          continue;
        }
        const old = player.leagueId;
        player.leagueId = target.id;
        for (const key of ["squads", "museum"])
          for (const row of s[key])
            if (row.leagueId === old && row.team === player.team)
              row.leagueId = target.id;
        for (const row of s.teams)
          if (row.managerId === id) row.leagueId = target.id;
        moved++;
      }
      result.message = `${moved} oyuncu taşındı; ${same} oyuncu zaten hedefte; ${blocked} oyuncu devam eden aktif fikstür nedeniyle taşınamadı.`;
      break;
    }
    case "fixture.generate": {
      authorize(user, "AYARLAR.FIKSTUR");
      const l = find(s.leagues, p.leagueId, "Lig");
      if (l.type !== "Lig") fail("Kupalar için kupa kurasını kullanın.");
      if (s.matches.some((m) => m.leagueId === l.id && played(m)))
        fail("Oynanmış maç bulunan ligin fikstürü değiştirilemez.");
      const names = s.players
        .filter((x) => x.leagueId === l.id && x.active)
        .map((x) => x.name);
      const newMatches = fixture(
        names,
        !normalize(l.format).includes("tek"),
        validDate(p.start || nextSaturday()),
      );
      s.matches = s.matches.filter((m) => m.leagueId !== l.id);
      appendMatches(s, l.id, newMatches);
      result.message = `${newMatches.length} maçlık fikstür oluşturuldu.`;
      break;
    }
    case "match.save": {
      authorize(user, "AYARLAR.SKOR");
      const m = find(s.matches, p.id, "Maç");
      if (played(m) && s.events.some((e) => e.matchId === m.id))
        fail(
          "Bu maç daha önce olaylarıyla kaydedilmiş. İstatistiklerin tekrar yazılması engellendi.",
        );
      if (m.away === "BAY") fail("BAY maçı otomatik sonuçlanır.");
      const homeGoals = integer(p.homeGoals, "Ev sahibi golü"),
        awayGoals = integer(p.awayGoals, "Deplasman golü");
      const cup = s.cups.find((c) => c.id === m.leagueId);
      if (cup && !m.stage.startsWith("GRUP ") && homeGoals === awayGoals)
        fail(
          "Eleme maçında kazanan olmalıdır. Penaltılar dahil kesin sonucu girin.",
        );
      if (
        cup &&
        cup.stage !== m.stage &&
        !(cup.stage === "GRUP ASAMASI" && m.stage.startsWith("GRUP "))
      )
        fail("Önceki turun sonucu artık değiştirilemez.");
      const events = Array.isArray(p.events) ? p.events : [],
        validPlayers = matchSquads(s, m),
        totals = { home: 0, away: 0 };
      let eventId = nextId(s.events);
      const validated = events.map((e) => {
        if (!["Gol", "Sarı Kart", "Kırmızı Kart"].includes(e.type))
          fail("Geçersiz olay türü.");
        const footballer = validPlayers.find((x) => x.key === e.key);
        if (!footballer)
          fail("Futbolcu maçın takımlarından birinin kadrosunda olmalı.");
        const assist = e.assistKey
          ? validPlayers.find((x) => x.key === e.assistKey)
          : null;
        if (
          e.assistKey &&
          (!assist ||
            assist.side !== footballer.side ||
            assist.key === footballer.key ||
            e.type !== "Gol")
        )
          fail("Asist yapan farklı bir takım arkadaşı olmalıdır.");
        if (e.type === "Gol") totals[footballer.side]++;
        return {
          id: eventId++,
          matchId: m.id,
          leagueId: m.leagueId,
          type: e.type,
          catalogId: footballer.id,
          player: footballer.label,
          assistId: assist?.id || 0,
          assist: assist?.label || "",
        };
      });
      if (totals.home > homeGoals || totals.away > awayGoals)
        fail("Gol olaylarının sayısı maç skorunu aşamaz.");
      m.homeGoals = homeGoals;
      m.awayGoals = awayGoals;
      m.status = "Oynandı";
      s.events.push(...validated);
      // Keep DATA_FutbolcuIstatistik in sync, including for Excel exports.
      for (const e of validated) {
        for (const [catalogId, field] of [
          [
            e.catalogId,
            e.type === "Gol"
              ? "gol"
              : e.type === "Sarı Kart"
                ? "sari"
                : "kirmizi",
          ],
          [e.assistId, "asist"],
        ]) {
          if (!catalogId) continue;
          let row = s.footballStats.find(
            (r) => r.leagueId === m.leagueId && r.catalogId === catalogId,
          );
          if (!row) {
            row = {
              id: nextId(s.footballStats),
              leagueId: m.leagueId,
              catalogId,
              gol: 0,
              asist: 0,
              sari: 0,
              kirmizi: 0,
            };
            s.footballStats.push(row);
          }
          row[field]++;
        }
      }
      if (cup) advanceCup(s, cup);
      result.message = "Maç sonucu ve futbolcu olayları kaydedildi.";
      break;
    }
    case "cup.create": {
      authorize(user, "AYARLAR.KUPA");
      if (!["direct", "group"].includes(p.type))
        fail("Geçerli bir kupa formatı seçin.");
      const grouped = p.type === "group";
      const competition = grouped
        ? p.competition ||
          Object.keys(UEFA_COMPETITIONS).find(
            (key) => UEFA_COMPETITIONS[key].start === Number(p.quota ?? 1),
          )
        : "league";
      const qualification = UEFA_COMPETITIONS[competition];
      if (grouped && !qualification)
        fail("Şampiyonlar Ligi, Avrupa Ligi veya Konferans Ligi seçin.");
      if (grouped && p.quota != null && Number(p.quota) !== qualification.start)
        fail("Kontenjan seçilen şampiyonaya göre otomatik belirlenir.");
      const name = required(p.name, "Kupa adı"),
        season = required(p.season, "Sezon");
      if (
        s.leagues.some(
          (l) => normalize(l.name) === normalize(name) && l.season === season,
        )
      )
        fail("Bu kupa ve sezon zaten var.");
      const id = nextId(s.leagues),
        cup = {
          id,
          type: grouped
            ? "ULUSAL KUPA - GRUPLU + ELEME"
            : "LİG KUPASI - DOĞRUDAN ELEME",
          season,
          competition,
          quota: grouped ? qualification.start : 0,
          qualificationEnd: grouped ? qualification.end : 0,
          groups: grouped ? 4 : 0,
          groupSize: grouped ? 4 : 0,
          stage: "",
          round: 1,
          museumMarker: "",
          direct: [],
        };
      const ids = [...new Set((p.leagueIds || []).map(Number))];
      if (ids.length !== (grouped ? 4 : 1))
        fail(
          grouped
            ? "Gruplu kupa için tam olarak 4 lig seçin."
            : "Kaynak lig seçin.",
        );
      let participants = [];
      if (
        grouped &&
        s.cups.some(
          (existing) =>
            existing.season === season &&
            cupCompetition(
              existing,
              s.leagues.find((l) => l.id === existing.id),
            ) === competition &&
            s.participants.some(
              (participant) =>
                participant.cupId === existing.id &&
                ids.includes(participant.leagueId),
            ),
        )
      )
        fail(
          "Bu sezon seçilen kaynak liglerden biri bu şampiyonaya zaten katılmış.",
        );
      cup.sourceLeagueIds = ids;
      for (const leagueId of ids) {
        const l = find(s.leagues, leagueId);
        if (l.type !== "Lig") fail("Kaynak kayıt bir lig olmalıdır.");
        const matches = s.matches.filter((m) => m.leagueId === leagueId);
        if (grouped && (!matches.length || matches.some((m) => !played(m))))
          fail("Gruplu kupa için kaynak liglerin fikstürleri tamamlanmalı.");
        const ranked = standings(
          s.players.filter((x) => x.leagueId === leagueId),
          matches,
        );
        const selected = grouped
          ? ranked.slice(qualification.start - 1, qualification.end)
          : ranked;
        if (selected.length < (grouped ? 4 : 2))
          fail(
            grouped
              ? `${l.name}: ${qualification.name} için en az ${qualification.end} aktif takım gerekir (${qualification.start}–${qualification.end}. sıralar).`
              : "Seçilen ligde en az iki aktif oyuncu gerekir.",
          );
        shuffled(
          selected.map((r, index) => ({
            ...r,
            qualifiedRank: grouped ? qualification.start + index : index + 1,
          })),
        ).forEach((r, i) =>
          participants.push({
            cupId: id,
            leagueId,
            playerId: r.id,
            name: r.player,
            team: r.team,
            group: grouped ? "ABCD"[i] : "",
            draw: i + 1,
            status: "Aktif",
            qualifiedRank: r.qualifiedRank,
            sourceSeason: l.season || "",
          }),
        );
      }
      if (participants.length > 64) fail("En fazla 64 katılımcı desteklenir.");
      let partId = nextId(s.participants);
      participants = participants.map((x) => ({ id: partId++, ...x }));
      s.participants.push(...participants);
      s.leagues.push({
        id,
        name,
        season,
        format: cup.type,
        status: "Aktif",
        type: "Kupa",
        createdAt: new Date().toISOString(),
      });
      s.cups.push(cup);
      if (grouped) {
        cup.stage = "GRUP ASAMASI";
        for (const g of ["A", "B", "C", "D"])
          appendMatches(
            s,
            id,
            fixture(
              participants.filter((p) => p.group === g).map((p) => p.name),
              false,
            ).map((m) => ({ ...m, stage: "GRUP " + g })),
          );
      } else
        cupRound(
          s,
          cup,
          participants.map((p) => p.name),
        );
      result.message = "Kupa oluşturuldu ve kura çekildi.";
      result.id = id;
      break;
    }
    case "cup.advance":
      authorize(user, "AYARLAR.KUPA");
      advanceCup(s, find(s.cups, p.id), true);
      break;
    case "cup.save":
      authorize(user, "AYARLAR.KUPA");
      {
        const cup = find(s.cups, p.id),
          l = find(s.leagues, cup.id);
        l.name = required(p.name, "Kupa adı");
        l.season = cup.season = required(p.season, "Sezon");
        l.status = p.status === "Pasif" ? "Pasif" : "Aktif";
      }
      break;
    case "cup.delete":
      authorize(user, "AYARLAR.KUPA");
      removeCompetition(s, find(s.cups, p.id).id);
      break;
    case "season.new": {
      authorize(user, "AYARLAR.LIG");
      const l = find(s.leagues, p.id);
      if (l.type !== "Lig")
        fail("Yeni sezon sadece ligler için kullanılabilir.");
      const matches = s.matches.filter((m) => m.leagueId === l.id);
      if (!matches.length || matches.some((m) => !played(m)))
        fail("Yeni sezon için mevcut sezonun tüm maçlarını tamamlayın.");
      if (s.archive.some((a) => a.leagueId === l.id && a.season === l.season))
        fail("Bu sezon zaten arşivlenmiş.");
      const table = standings(
        s.players.filter((p) => p.leagueId === l.id),
        matches,
        "archive",
      );
      if (!table.length) fail("Aktif oyuncu yok.");
      let id = nextId(s.archive);
      s.archive.push(
        ...table.map((r, i) => ({
          ...r,
          playerId: r.id,
          id: id++,
          leagueId: l.id,
          league: l.name,
          season: l.season,
          rank: i + 1,
          date: new Date().toISOString(),
        })),
      );
      let sid = nextId(s.statsArchive);
      s.statsArchive.push(
        ...statistics(s.events, matches).map((r, i) => ({
          ...r,
          id: sid++,
          leagueId: l.id,
          league: l.name,
          season: l.season,
          rank: i + 1,
        })),
      );
      const matchIds = new Set(matches.map((m) => m.id));
      s.events = s.events.filter((e) => !matchIds.has(e.matchId));
      s.matches = s.matches.filter((m) => m.leagueId !== l.id);
      s.footballStats = s.footballStats.filter((x) => x.leagueId !== l.id);
      s.playerStats = s.playerStats.filter((x) => Number(x[1]) !== l.id);
      l.season = nextSeason(l.season);
      l.status = "Aktif";
      result.message = `Sezon arşivlendi. ${l.season} başlatıldı.`;
      break;
    }
    case "catalog.import": {
      authorize(user, "KATALOG.DUZENLE");
      if (!Array.isArray(p.cards) || !p.cards.length)
        fail("Arama sonuçlarından en az bir kart seçin.");
      let count = 0;
      for (const c of p.cards) {
        if (!/^\d{1,20}$/.test(c.pesdataId) || !c.name)
          fail("Geçersiz PESDATA kartı.");
        if (s.catalog.some((x) => x.pesdataId === c.pesdataId)) continue;
        s.catalog.push({
          ...c,
          id: nextId(s.catalog),
          club: c.club || "",
          playerId: "",
        });
        count++;
      }
      result.message = `${count} kart yerel kataloğa eklendi.`;
      break;
    }
    case "catalog.delete": {
      authorize(user, "KATALOG.DUZENLE");
      const ids = (p.ids || []).map(Number);
      if (!ids.length) fail("Silinecek kartları seçin.");
      if (s.squads.some((k) => ids.includes(k.catalogId)))
        fail(
          "Kadroda kullanılan kart önce takım kadrolarından çıkarılmalıdır.",
        );
      if (
        s.events.some(
          (e) => ids.includes(e.catalogId) || ids.includes(e.assistId),
        )
      )
        fail("Maç geçmişinde kullanılan kart silinemez.");
      s.catalog = s.catalog.filter((c) => !ids.includes(c.id));
      result.message = "Seçili kartlar katalogdan silindi.";
      break;
    }
    case "squad.add": {
      authorize(user, "KATALOG.DUZENLE");
      const team = find(s.teams, p.teamId, "Takım");
      const ids = [...new Set((p.ids || []).map(Number))];
      if (!ids.length) fail("En az bir futbolcu seçin.");
      let count = 0;
      for (const id of ids) {
        find(s.catalog, id, "Futbolcu");
        if (
          s.squads.some(
            (k) =>
              k.team === team.name &&
              k.leagueId === team.leagueId &&
              k.catalogId === id,
          )
        )
          continue;
        s.squads.push({
          id: nextId(s.squads),
          leagueId: team.leagueId,
          team: team.name,
          catalogId: id,
          createdAt: new Date().toISOString(),
        });
        count++;
      }
      result.message = `${count} futbolcu kadroya eklendi.`;
      break;
    }
    case "squad.transfer": {
      authorize(user, "KATALOG.DUZENLE");
      const squad = find(s.squads, p.id, "Kadro kaydı"),
        team = find(s.teams, p.teamId, "Hedef takım");
      if (
        s.squads.some(
          (k) =>
            k.id !== squad.id &&
            k.leagueId === team.leagueId &&
            k.team === team.name &&
            k.catalogId === squad.catalogId,
        )
      )
        fail("Bu futbolcu hedef takımın kadrosunda zaten var.");
      if (squad.team === team.name && squad.leagueId === team.leagueId)
        fail("Farklı bir hedef takım seçin.");
      const old = squad.team;
      squad.team = team.name;
      squad.leagueId = team.leagueId;
      squad.createdAt = new Date().toISOString();
      result.message = `Futbolcu ${old} takımından ${team.name} takımına transfer edildi.`;
      break;
    }
    case "squad.delete":
      authorize(user, "KATALOG.DUZENLE");
      find(s.squads, p.id);
      s.squads = s.squads.filter((x) => x.id !== Number(p.id));
      break;
    case "team.save": {
      if (!permitted(user, "AYARLAR.TAKIM"))
        authorize(user, "TAKIMLAR.DUZENLE");
      const t = find(s.teams, p.id);
      const budget = Number(p.budget);
      if (!Number.isFinite(budget) || budget < 0) fail("Bütçe negatif olamaz.");
      t.budget = budget;
      if (p.logo !== undefined) t.logo = imagePath(p.logo);
      let m = s.museum.find(
        (m) => m.leagueId === t.leagueId && m.team === t.name,
      );
      if (!m) {
        m = { id: nextId(s.museum), leagueId: t.leagueId, team: t.name };
        s.museum.push(m);
      }
      for (const key of ["league", "cup", "champions", "europa", "conference"])
        m[key] = integer(p[key] ?? m[key] ?? 0, "Kupa sayısı");
      m.updatedAt = new Date().toISOString();
      break;
    }
    case "news.save": {
      authorize(user, "HABERLER.DUZENLE");
      const data = {
        title: required(p.title, "Başlık"),
        body: required(p.body, "Haber metni"),
        image: imagePath(p.image),
        leagueId: integer(p.leagueId ?? 0, "Lig"),
        active: p.active !== false,
        date: new Date().toISOString(),
      };
      if (data.leagueId) find(s.leagues, data.leagueId);
      if (p.id) Object.assign(find(s.news, p.id), data);
      else s.news.push({ id: nextId(s.news), ...data });
      break;
    }
    case "news.delete":
      authorize(user, "HABERLER.DUZENLE");
      find(s.news, p.id);
      s.news = s.news.filter((x) => x.id !== Number(p.id));
      break;
    case "stream.save": {
      if (!permitted(user, "YAYIN.DUZENLE"))
        authorize(user, "HABERLER.DUZENLE");
      const l = find(s.leagues, p.leagueId);
      const existing = p.id ? find(s.streams, p.id, "Yayın") : null;
      let matchId, home, away, homeTeam, awayTeam;
      if (p.matchId === "existing") {
        if (
          !existing ||
          existing.leagueId !== l.id ||
          (existing.matchId &&
            (!existing.fixtureSeason || existing.fixtureSeason === l.season) &&
            s.matches.some(
              (m) => m.id === existing.matchId && m.leagueId === l.id,
            ))
        )
          fail("Fikstürden maç seçin.");
        // Keep historical broadcasts editable after their season fixture has been archived.
        ({ home, away, homeTeam, awayTeam } = existing);
        matchId = existing.matchId || null;
      } else {
        const match = find(
          s.matches,
          integer(p.matchId, "Fikstür maçı", 1),
          "Fikstür maçı",
        );
        if (match.leagueId !== l.id)
          fail("Seçilen maç bu lig/kupaya ait değil.");
        if (normalize(match.home) === "bay" || normalize(match.away) === "bay")
          fail("BAY eşleşmesi için yayın oluşturulamaz.");
        const h = fixtureParticipant(s, match, "home"),
          a = fixtureParticipant(s, match, "away");
        matchId = match.id;
        home = h.name;
        away = a.name;
        homeTeam = h.team;
        awayTeam = a.team;
      }
      if (!/^https?:\/\//.test(p.url))
        fail("Geçerli bir http veya https yayın bağlantısı girin.");
      try {
        new URL(p.url);
      } catch {
        fail("Bağlantı geçersiz.");
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time))
        fail("Geçerli bir saat girin.");
      const data = {
        matchId,
        fixtureSeason:
          p.matchId === "existing" ? existing.fixtureSeason || null : l.season,
        leagueId: l.id,
        league: l.name,
        home,
        away,
        homeTeam,
        awayTeam,
        date: validDate(p.date),
        time: p.time,
        url: p.url,
        active: p.active !== false,
      };
      if (existing) Object.assign(existing, data);
      else s.streams.push({ id: nextId(s.streams), ...data });
      break;
    }
    case "stream.delete":
      if (!permitted(user, "YAYIN.DUZENLE"))
        authorize(user, "HABERLER.DUZENLE");
      find(s.streams, p.id);
      s.streams = s.streams.filter((x) => x.id !== Number(p.id));
      break;
    case "user.save": {
      authorize(user, "AYARLAR.KULLANICI");
      const username = required(p.username, "Kullanıcı adı"),
        role = required(p.role, "Rol");
      const existing = p.id ? find(s.users, p.id) : null;
      const targetRole = s.roles.find((r) => r.name === role);
      if (!targetRole) fail("Rol bulunamadı.");
      let managedLeagueId = null;
      if (isLeagueRole(targetRole)) {
        managedLeagueId = integer(
          p.managedLeagueId ?? existing?.managedLeagueId,
          "Yetkili lig",
          1,
        );
        if (find(s.leagues, managedLeagueId, "Yetkili lig").type !== "Lig")
          fail("Lig yöneticisine bir lig atanmalıdır; kupa atanamaz.");
      }
      if (
        normalize(user.role) !== "admin" &&
        (isLeagueRole(targetRole) ||
          isLeagueRole(s.roles.find((r) => r.name === existing?.role)))
      )
        fail("Lig yöneticisi atamalarını yalnızca Admin yapabilir.", 403);
      if (
        normalize(user.role) !== "admin" &&
        (role === "Admin" ||
          existing?.role === "Admin" ||
          Number(p.id) === user.id)
      )
        fail("Yönetici hesabını yalnızca Admin düzenleyebilir.", 403);
      if (normalize(user.role) !== "admin") {
        for (const assignedRole of [role, existing?.role].filter(Boolean)) {
          const assigned = s.permissions
            .filter((x) => x.role === assignedRole)
            .map((x) => x.code);
          if (assigned.some((code) => !permitted(user, code)))
            fail(
              "Kendi yetkilerinizden daha geniş bir role sahip hesabı yönetemezsiniz.",
              403,
            );
        }
      }
      if (
        s.users.some(
          (u) =>
            u.id !== Number(p.id) &&
            normalize(u.username) === normalize(username),
        )
      )
        fail("Kullanıcı adı zaten var.");
      if (
        existing?.role === "Admin" &&
        (role !== "Admin" || p.active === false) &&
        s.users.filter((u) => u.role === "Admin" && u.active).length < 2
      )
        fail("Son aktif Admin hesabı kapatılamaz.");
      const data = {
        username,
        role,
        active: p.active !== false,
        playerId: Number(p.playerId) || 0,
        managedLeagueId,
        updatedAt: new Date().toISOString(),
      };
      if (p.password) {
        if (p.password.length < 4) fail("Şifre en az 4 karakter olmalı.");
        data.passwordHash = bcrypt.hashSync(p.password, 12);
        data.firstLogin = true;
      }
      if (existing) Object.assign(existing, data);
      else {
        if (!data.passwordHash) fail("Geçici şifre zorunlu.");
        s.users.push({
          id: nextId(s.users),
          ...data,
          createdAt: new Date().toISOString(),
        });
      }
      break;
    }
    case "role.save": {
      if (normalize(user.role) !== "admin")
        fail("Rolleri yalnızca Admin yönetebilir.", 403);
      const name = required(p.name, "Rol adı");
      if (normalize(name) === "kullanici")
        fail(
          "Kullanici rolü kaldırıldı. İzleyici veya lig kapsamlı yönetici rolünü kullanın.",
        );
      if (name.length < 2) fail("Rol adı en az iki karakter olmalı.");
      if (
        s.roles.some(
          (r) => r.id !== Number(p.id) && normalize(r.name) === normalize(name),
        )
      )
        fail("Rol adı zaten var.");
      const codes = [...new Set(p.permissions || [])];
      if (!codes.length && name !== "Admin") fail("En az bir yetki seçin.");
      if (codes.some((c) => !PERMISSIONS.includes(c))) fail("Geçersiz yetki.");
      const old = p.id ? find(s.roles, p.id) : null;
      const scope = isLeagueRole({ name, scope: p.scope ?? old?.scope })
        ? "league"
        : "global";
      if (old?.system && name !== old.name)
        fail("Sistem rolünün adı değiştirilemez.");
      if (name === "Admin" && scope !== "global")
        fail("Admin rolü sistem genelindedir.");
      if (old?.name === "Admin" && name !== "Admin")
        fail("Admin rolünün adı değiştirilemez.");
      if (old) {
        s.users.forEach((u) => {
          if (u.role === old.name) u.role = name;
        });
        s.permissions = s.permissions.filter((x) => x.role !== old.name);
        Object.assign(old, {
          name,
          description: String(p.description || ""),
          scope,
        });
      } else
        s.roles.push({
          id: nextId(s.roles),
          name,
          description: String(p.description || ""),
          system: false,
          scope,
        });
      for (const code of codes)
        s.permissions.push({
          id: nextId(s.permissions),
          role: name,
          code,
          description: code,
        });
      break;
    }
    case "role.delete": {
      if (normalize(user.role) !== "admin")
        fail("Rolleri yalnızca Admin yönetebilir.", 403);
      const r = find(s.roles, p.id);
      if (r.system || s.users.some((u) => u.role === r.name))
        fail("Sistem rolü veya kullanıcıya atanmış rol silinemez.");
      s.roles = s.roles.filter((x) => x.id !== r.id);
      s.permissions = s.permissions.filter((x) => x.role !== r.name);
      break;
    }
    case "password": {
      const u = find(s.users, user.id);
      if (!bcrypt.compareSync(String(p.current || ""), u.passwordHash))
        fail("Mevcut şifre yanlış.");
      if (typeof p.password !== "string" || p.password.length < 4)
        fail("Yeni şifre en az 4 karakter olmalı.");
      u.passwordHash = bcrypt.hashSync(p.password, 12);
      u.firstLogin = false;
      u.updatedAt = new Date().toISOString();
      result.message = "Şifreniz güncellendi.";
      break;
    }
    default:
      fail("Bilinmeyen işlem.", 404);
  }
  s.logs.push({
    id: nextId(s.logs),
    date: new Date().toISOString(),
    username: user.username,
    role: user.role,
    action: op,
    module: op.split(".")[0],
    description: result.message,
    reference: String(p.id || p.leagueId || ""),
  });
  return result;
}
export function matchSquads(s, m) {
  const sides = [
      ["home", m.home],
      ["away", m.away],
    ],
    result = [];
  for (const [side, name] of sides) {
    const p =
      s.participants.find((p) => p.cupId === m.leagueId && p.name === name) ||
      s.players.find((p) => p.leagueId === m.leagueId && p.name === name);
    if (!p) continue;
    const leagueId = p.leagueId;
    for (const k of s.squads.filter(
      (k) => k.leagueId === leagueId && k.team === p.team,
    )) {
      const c = s.catalog.find((c) => c.id === k.catalogId);
      if (c)
        result.push({
          ...c,
          key: `${side}:${k.id}`,
          side,
          team: p.team,
          label: `${c.name}  -  ${p.team}`,
        });
    }
  }
  return result;
}
