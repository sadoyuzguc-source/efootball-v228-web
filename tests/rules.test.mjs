import test from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  standings,
  elimination,
  winner,
  statistics,
  permitted,
  nextSeason,
  turkeyToday,
  isPastBroadcast,
  UEFA_COMPETITIONS,
  cupCompetition,
} from "../shared/rules.mjs";
import { execute, advanceCup } from "../server/domain.mjs";
const admin = {
  id: 1,
  username: "admin",
  role: "Admin",
  permissions: ["TUMU"],
};
test("Yayın arşivi Türkiye tarihine göre ayrılır; bugünkü yayın saatinden bağımsız günceldir", () => {
  assert.equal(turkeyToday(new Date("2030-06-01T20:59:59Z")), "2030-06-01");
  assert.equal(turkeyToday(new Date("2030-06-01T21:00:00Z")), "2030-06-02");
  assert.equal(isPastBroadcast({ date: "2030-05-31" }, "2030-06-01"), true);
  assert.equal(
    isPastBroadcast({ date: "2030-06-01", time: "00:01" }, "2030-06-01"),
    false,
  );
  assert.equal(isPastBroadcast({ date: "2030-06-02" }, "2030-06-01"), false);
  assert.equal(isPastBroadcast({ date: "2029-12-31" }, "2030-01-01"), true);
});
function state() {
  return {
    leagues: [
      {
        id: 1,
        name: "Test Ligi",
        type: "Lig",
        season: "1.SEZON",
        status: "Aktif",
        format: "Çift Devre (deplasmanlı)",
      },
    ],
    players: ["A", "B", "C"].map((name, i) => ({
      id: i + 1,
      name,
      team: "Takım " + name,
      leagueId: 1,
      active: true,
    })),
    teams: [],
    catalog: [],
    squads: [],
    matches: [],
    events: [],
    cups: [],
    participants: [],
    museum: [],
    archive: [],
    statsArchive: [],
    footballStats: [],
    playerStats: [],
    news: [],
    streams: [],
    users: [],
    roles: [],
    permissions: [],
    logs: [],
  };
}
test("VBA çift devre: tek/çift sayıda oyuncu, her ikili iki kez, aynı hafta tek maç", () => {
  for (const size of [2, 3, 4, 5, 8, 16]) {
    const names = Array.from({ length: size }, (_, i) => "P" + i),
      matches = fixture(names, true, "2026-09-19");
    assert.equal(matches.length, size * (size - 1));
    for (const a of names)
      for (const b of names)
        if (a !== b)
          assert.equal(
            matches.filter((m) => m.home === a && m.away === b).length,
            1,
          );
    for (const week of new Set(matches.map((m) => m.week))) {
      const all = matches
        .filter((m) => m.week === week)
        .flatMap((m) => [m.home, m.away]);
      assert.equal(all.length, new Set(all).size);
    }
    assert.ok(matches.every((m) => new Date(m.date).getUTCDay() === 6));
  }
});
test("Puan hesabı oyuncu adlarını kullanır, planlanan skorları saymaz, 0-0 oynananı sayar", () => {
  const players = [
    { id: 1, name: "A", team: "TA" },
    { id: 2, name: "B", team: "TB" },
    { id: 3, name: "C", team: "TC", active: false },
  ];
  const matches = [
    { home: "A", away: "B", homeGoals: 2, awayGoals: 1, status: "Oynandı" },
    { home: "B", away: "A", homeGoals: 0, awayGoals: 0, status: "Oynandı" },
    { home: "A", away: "B", homeGoals: 9, awayGoals: 0, status: "Planlandı" },
  ];
  const r = standings(players, matches);
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].player, r[0].p, r[0].o, r[0].av], ["A", 4, 2, 1]);
  assert.equal(r[1].p, 1);
});
test("Eleme ağacı tüm katılımcıları yalnızca bir kez kullanır, 12 takım 4 doğrudan çeyrek finalist üretir", () => {
  for (const n of [2, 3, 5, 8, 9, 12, 13, 16, 32, 64]) {
    const names = Array.from({ length: n }, (_, i) => "P" + i),
      r = elimination(names),
      all = [
        ...r.direct,
        ...r.matches
          .flatMap((m) => [m.home, m.away])
          .filter((x) => x !== "BAY"),
      ];
    assert.equal(all.length, n);
    assert.equal(new Set(all).size, n);
    assert.ok(
      r.matches
        .filter((m) => m.away === "BAY")
        .every((m) => winner(m) === m.home),
    );
  }
  const r = elimination(Array.from({ length: 12 }, (_, i) => "P" + i));
  assert.equal(r.direct.length, 4);
  assert.equal(r.matches.length, 4);
});
test("Kupa otomatik ilerler, final şampiyonu müzeye yalnızca bir kez yazılır", () => {
  const s = state();
  execute(s, admin, "cup.create", {
    name: "Test Kupa",
    season: "1.SEZON",
    type: "direct",
    leagueIds: [1],
  });
  const cup = s.cups[0];
  for (let guard = 0; cup.stage !== "TAMAMLANDI" && guard < 10; guard++) {
    for (const m of s.matches.filter(
      (m) => m.leagueId === cup.id && m.stage === cup.stage && !winner(m),
    ))
      execute(s, admin, "match.save", {
        id: m.id,
        homeGoals: 1,
        awayGoals: 0,
        events: [],
      });
  }
  assert.equal(cup.stage, "TAMAMLANDI");
  assert.ok(cup.champion);
  assert.equal(s.museum[0].cup, 1);
  advanceCup(s, cup, true);
  assert.equal(s.museum[0].cup, 1);
});
test("Fikstür oynanmış sonuçları silmez; tamamlanmadan yeni sezon başlatılmaz", () => {
  const s = state();
  execute(s, admin, "fixture.generate", { leagueId: 1, start: "2026-09-19" });
  execute(s, admin, "match.save", {
    id: s.matches[0].id,
    homeGoals: 0,
    awayGoals: 0,
    events: [],
  });
  assert.throws(
    () =>
      execute(s, admin, "fixture.generate", {
        leagueId: 1,
        start: "2026-09-19",
      }),
    /Oynanmış/,
  );
  assert.throws(
    () => execute(s, admin, "season.new", { id: 1 }),
    /tüm maçlarını/,
  );
  for (const m of s.matches) {
    m.homeGoals = 0;
    m.awayGoals = 0;
    m.status = "Oynandı";
  }
  execute(s, admin, "season.new", { id: 1 });
  assert.equal(s.archive.length, 3);
  assert.equal(s.matches.length, 0);
  assert.equal(s.players.length, 3);
  assert.equal(s.leagues[0].season, "2.SEZON");
});
test("Gruplu kupa 4 tamamlanmış lig ister; çeyrek final A1-B2 çapraz eşleşir", () => {
  const s = state();
  s.players = [];
  s.leagues = [];
  for (let i = 1; i <= 4; i++) {
    s.leagues.push({ id: i, name: "Lig" + i, type: "Lig" });
    for (let j = 0; j < 4; j++)
      s.players.push({
        id: i * 10 + j,
        name: `L${i}P${j}`,
        team: `T${i}${j}`,
        leagueId: i,
        active: true,
      });
    s.matches.push({
      id: i,
      leagueId: i,
      home: `L${i}P0`,
      away: `L${i}P1`,
      homeGoals: 1,
      awayGoals: 0,
      status: "Oynandı",
    });
  }
  execute(s, admin, "cup.create", {
    name: "Ulusal",
    season: "1",
    type: "group",
    quota: 1,
    leagueIds: [1, 2, 3, 4],
  });
  const c = s.cups[0];
  assert.equal(s.participants.length, 16);
  assert.equal(s.matches.filter((m) => m.leagueId === c.id).length, 24);
  for (const m of s.matches.filter((m) => m.leagueId === c.id)) {
    m.homeGoals = 1;
    m.awayGoals = 0;
    m.status = "Oynandı";
  }
  const groupA = standings(
    s.participants.filter((p) => p.group === "A"),
    s.matches.filter((m) => m.stage === "GRUP A"),
    "group",
  );
  const groupB = standings(
    s.participants.filter((p) => p.group === "B"),
    s.matches.filter((m) => m.stage === "GRUP B"),
    "group",
  );
  advanceCup(s, c, true);
  assert.equal(c.stage, "CEYREK FINAL");
  const quarter = s.matches.filter((m) => m.stage === "CEYREK FINAL");
  assert.equal(quarter.length, 4);
  assert.equal(quarter[0].home, groupA[0].player);
  assert.equal(quarter[0].away, groupB[1].player);
});
test("Gol/asist/kartlar oynanan maçlardan gelir", () => {
  const events = [
    { matchId: 1, type: "Gol", player: "Ronaldo", assist: "Arda" },
    { matchId: 1, type: "Sarı Kart", player: "Ronaldo" },
    { matchId: 2, type: "Gol", player: "Ronaldo" },
  ];
  const r = statistics(events, [
    { id: 1, status: "Oynandı" },
    { id: 2, status: "Planlandı" },
  ]);
  assert.deepEqual(
    r.find((x) => x.name === "Ronaldo"),
    { name: "Ronaldo", gol: 1, asist: 0, sari: 1, kirmizi: 0 },
  );
  assert.equal(r.find((x) => x.name === "Arda").asist, 1);
});
test("Yetki grupları VBA ile aynı; yetkisiz doğrudan işlem reddedilir", () => {
  const viewer = { id: 2, role: "İzleyici", permissions: [] };
  assert.equal(permitted(viewer, "LIGLER.GORUNTULE"), true);
  assert.equal(permitted(viewer, "AYARLAR.SKOR"), false);
  assert.throws(
    () => execute(state(), viewer, "league.delete", { id: 1 }),
    /yetki/,
  );
  assert.equal(
    permitted({ ...viewer, permissions: ["AYARLAR.TUMU"] }, "AYARLAR.LIG"),
    true,
  );
  assert.equal(
    permitted(
      { ...viewer, permissions: ["HABERLER.DUZENLE"] },
      "HABERLER.GORUNTULE",
    ),
    true,
  );
  assert.equal(
    permitted({ ...viewer, permissions: ["AYARLAR.SKOR"] }, "AYARLAR"),
    true,
  );
});
test("Negatif/kesirli skor ve eleme beraberliği reddedilir", () => {
  const s = state();
  execute(s, admin, "fixture.generate", { leagueId: 1, start: "2026-09-19" });
  for (const n of [-1, 1.5, "abc"])
    assert.throws(
      () =>
        execute(s, admin, "match.save", {
          id: s.matches[0].id,
          homeGoals: n,
          awayGoals: 0,
        }),
      /tam sayı/,
    );
  execute(s, admin, "cup.create", {
    name: "Kupa",
    season: "1",
    type: "direct",
    leagueIds: [1],
  });
  const m = s.matches.find(
    (m) => m.leagueId === s.cups[0].id && m.away !== "BAY",
  );
  assert.throws(
    () =>
      execute(s, admin, "match.save", { id: m.id, homeGoals: 0, awayGoals: 0 }),
    /kazanan/,
  );
});
test("Sezon numarası artırılır", () => {
  assert.equal(nextSeason("9.SEZON"), "10.SEZON");
  assert.equal(nextSeason("Sezon 2026"), "Sezon 2027");
});
function qualificationState(count=12){
  const s=state();s.leagues=[];s.players=[];
  for(let leagueId=1;leagueId<=4;leagueId++){
    s.leagues.push({id:leagueId,type:'Lig',name:`Kaynak ${leagueId}`,season:'1.SEZON'});
    for(let rank=count;rank>=1;rank--)s.players.push({id:leagueId*100+rank,leagueId,name:`L${leagueId}P${rank}`,team:`L${leagueId} Takım ${rank}`,active:true});
    for(let a=1;a<=count;a++)for(let b=a+1;b<=count;b++)s.matches.push({id:s.matches.length+1,leagueId,home:`L${leagueId}P${a}`,away:`L${leagueId}P${b}`,homeGoals:1,awayGoals:0,status:'Oynandı',stage:'LIG'});
  }
  return s;
}
test('Üç UEFA kupası her kaynak ligin 1–4, 5–8 ve 9–12 sıralarını ayrı ayrı alır',()=>{
  const s=qualificationState();
  for(const [competition,config] of Object.entries(UEFA_COMPETITIONS)){
    execute(s,admin,'cup.create',{name:config.name,season:'1.SEZON',type:'group',competition,leagueIds:[1,2,3,4]});
    const cup=s.cups.at(-1),participants=s.participants.filter(p=>p.cupId===cup.id);
    assert.equal(cup.quota,config.start);assert.equal(cup.competition,competition);assert.equal(participants.length,16);
    for(const leagueId of [1,2,3,4])assert.deepEqual(participants.filter(p=>p.leagueId===leagueId).map(p=>p.playerId).sort((a,b)=>a-b),Array.from({length:4},(_,i)=>leagueId*100+config.start+i));
    for(const group of ['A','B','C','D'])assert.equal(new Set(participants.filter(p=>p.group===group).map(p=>p.leagueId)).size,4);
    assert.ok(participants.every(p=>p.qualifiedRank>=config.start&&p.qualifiedRank<=config.end));
    assert.equal(s.matches.filter(m=>m.leagueId===cup.id).length,24);
  }
  assert.equal(new Set(s.participants.map(p=>p.playerId)).size,48);
  assert.throws(()=>execute(s,admin,'cup.create',{name:'Başka isim',season:'1.SEZON',type:'group',competition:'champions',leagueIds:[1,2,3,4]}),/zaten katılmış/);
});
test('Eksik takım ve değiştirilmiş UEFA kontenjanı kayıt oluşturmadan reddedilir',()=>{
  const s=qualificationState(8),before=structuredClone(s);
  assert.throws(()=>execute(s,admin,'cup.create',{name:'Konferans',season:'1',type:'group',competition:'conference',leagueIds:[1,2,3,4]}),/en az 12/);
  assert.deepEqual(s,before);
  assert.throws(()=>execute(s,admin,'cup.create',{name:'Avrupa',season:'1',type:'group',competition:'europa',quota:1,leagueIds:[1,2,3,4]}),/otomatik/);
  assert.deepEqual(s,before);
});
test('Şampiyona kimliği arka planı ve kupa müzesi alanını kupa adından bağımsız belirler',()=>{
  for(const competition of Object.keys(UEFA_COMPETITIONS)){
    const s=qualificationState();execute(s,admin,'cup.create',{name:'Özel Şampiyona',season:'1',type:'group',competition,leagueIds:[1,2,3,4]});
    const cup=s.cups[0],names=s.participants.filter(p=>p.cupId===cup.id).map(p=>p.name);
    cup.stage='FINAL';s.matches.push({id:s.matches.length+1,leagueId:cup.id,stage:'FINAL',home:names[0],away:names[1],homeGoals:2,awayGoals:0,status:'Oynandı'});
    advanceCup(s,cup,true);assert.equal(s.museum[0][competition],1);assert.equal(cupCompetition(cup,{name:'Farklı ad'}),competition);
    advanceCup(s,cup,true);assert.equal(s.museum[0][competition],1);
  }
  assert.equal(cupCompetition({type:'ULUSAL KUPA - GRUPLU + ELEME',quota:5}),'europa');
  assert.equal(cupCompetition({type:'ULUSAL KUPA - GRUPLU + ELEME',quota:9}),'conference');
  assert.equal(cupCompetition({type:'LİG KUPASI - DOĞRUDAN ELEME',quota:0}),'league');
});
test("Skor olayları doğru kadro/asist ile tek sefer kaydedilir ve futbolcu istatistikleri güncellenir", () => {
  const s = state();
  s.catalog = [
    { id: 1, name: "Golcü" },
    { id: 2, name: "Asistçi" },
    { id: 3, name: "Rakip" },
  ];
  s.squads = [
    { id: 1, leagueId: 1, team: "Takım A", catalogId: 1 },
    { id: 2, leagueId: 1, team: "Takım A", catalogId: 2 },
    { id: 3, leagueId: 1, team: "Takım B", catalogId: 3 },
  ];
  s.matches = [
    {
      id: 1,
      leagueId: 1,
      home: "A",
      away: "B",
      homeGoals: null,
      awayGoals: null,
      status: "Planlandı",
      stage: "LIG",
    },
  ];
  const payload = {
    id: 1,
    homeGoals: 1,
    awayGoals: 0,
    events: [{ type: "Gol", key: "home:1", assistKey: "away:3" }],
  };
  assert.throws(
    () => execute(s, admin, "match.save", payload),
    /takım arkadaşı/,
  );
  assert.equal(s.events.length, 0);
  payload.events[0].assistKey = "home:2";
  execute(s, admin, "match.save", payload);
  assert.equal(s.footballStats.find((r) => r.catalogId === 1).gol, 1);
  assert.equal(s.footballStats.find((r) => r.catalogId === 2).asist, 1);
  assert.throws(() => execute(s, admin, "match.save", payload), /tekrar/);
  assert.equal(s.events.length, 1);
});
test("Toplu taşıma aktif fikstürü engeller; pasif kaynaktan logo/kadro/müze ile taşır", () => {
  const s = state();
  s.leagues.push({ id: 2, type: "Lig", name: "Hedef", status: "Aktif" });
  s.matches = [
    { id: 1, leagueId: 1, home: "A", away: "B", status: "Planlandı" },
  ];
  s.teams = [
    {
      id: 1,
      leagueId: 1,
      name: "Takım A",
      managerId: 1,
      logo: "/uploads/test.png",
    },
  ];
  s.squads = [{ id: 1, leagueId: 1, team: "Takım A", catalogId: 1 }];
  s.museum = [{ id: 1, leagueId: 1, team: "Takım A", cup: 2 }];
  execute(s, admin, "player.transfer", { leagueId: 2, ids: [1] });
  assert.equal(s.players[0].leagueId, 1);
  s.leagues[0].status = "Pasif";
  execute(s, admin, "player.transfer", { leagueId: 2, ids: [1] });
  assert.equal(s.players[0].leagueId, 2);
  assert.equal(s.squads[0].leagueId, 2);
  assert.equal(s.museum[0].cup, 2);
  assert.equal(s.teams[0].logo, "/uploads/test.png");
});
