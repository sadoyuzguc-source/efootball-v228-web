import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Pause,
  Newspaper,
  Radio,
  Users,
  Trophy,
  CalendarDays,
  Check,
  Search,
  Trash2,
  Pencil,
  Download,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import {
  useApp,
  useBroadcastToday,
  PageHead,
  Panel,
  BackBar,
  Field,
  Select,
  LeagueSelect,
  Photo,
  Empty,
  Badge,
  Modal,
  Form,
  ImageInput,
  StandingsTable,
  Confirm,
  trDate,
  number,
} from "./ui";
import {
  played,
  standings,
  statistics,
  winner,
  normalize,
  safeUrl,
  isPastBroadcast,
  UEFA_COMPETITIONS,
  cupCompetition,
} from "../shared/rules.mjs";
import { CupCreate } from "./management";
import OnlineCatalog from "./OnlineCatalog";
const activeLeague = (data) =>
  data.leagues.find((l) => l.type === "Lig" && l.status === "Aktif")?.id ||
  data.leagues.find((l) => l.type === "Lig")?.id ||
  0;

function NewsSlideContent({ item, outgoing = false }) {
  return (
    <>
      <Photo
        src={safeUrl(item.image)}
        alt={outgoing ? "" : item.title}
        loading="eager"
        fallback={
          <>
            <Newspaper size={62} />
            <span>E-FOOTBALL</span>
          </>
        }
      />
      <div className="news-overlay">
        <span className="eyebrow">LİGDEN HABERLER</span>
        {outgoing ? (
          <div className="news-slide-title">{item.title}</div>
        ) : (
          <h2>{item.title}</h2>
        )}
        <p>
          {item.body.slice(0, 150)}
          {item.body.length > 150 ? "…" : ""}
        </p>
        <span className="read-link">
          HABERİ OKU <ArrowUpRight size={16} />
        </span>
      </div>
    </>
  );
}

function SlidingNews({ item, direction }) {
  const [slides, setSlides] = useState({
    id: item.id,
    previous: null,
    current: item,
  });
  if (slides.id !== item.id)
    setSlides({ id: item.id, previous: slides.current, current: item });
  useEffect(() => {
    if (!slides.previous) return;
    const timer = setTimeout(
      () => setSlides((s) => ({ ...s, previous: null })),
      650,
    );
    return () => clearTimeout(timer);
  }, [slides.id, slides.previous]);
  return (
    <div className="news-slides" style={{ "--slide-direction": direction }}>
      {slides.previous && (
        <div
          className="news-slide news-slide-out"
          key={`old-${slides.previous.id}`}
          aria-hidden="true"
        >
          <NewsSlideContent item={slides.previous} outgoing />
        </div>
      )}
      <div
        className={`news-slide ${slides.previous ? "news-slide-in" : ""}`}
        key={item.id}
      >
        <NewsSlideContent item={item} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data, user, navigate } = useApp();
  const today = useBroadcastToday();
  const [league, setLeague] = useState(0),
    [newsIndex, setNewsIndex] = useState(0),
    [article, setArticle] = useState(null),
    [autoPlay, setAutoPlay] = useState(true),
    [newsDirection, setNewsDirection] = useState(1);
  const leagues = data.leagues.filter(
    (l) => l.status === "Aktif" && (!league || l.id === league),
  );
  const matches = data.matches.filter((m) => !league || m.leagueId === league);
  const news = data.news.filter(
    (n) => n.active && Number(n.leagueId || 0) === league,
  );
  const item = news[newsIndex % Math.max(news.length, 1)];
  useEffect(() => {
    if (!autoPlay || article || news.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        setNewsDirection(1);
        setNewsIndex((index) => (index + 1) % news.length);
      }
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoPlay, article, league, news.length, newsIndex]);
  const streams = data.streams
    .filter(
      (y) =>
        y.active &&
        !isPastBroadcast(y, today) &&
        (!league || y.leagueId === league),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const metrics = [
    [
      Users,
      data.players.filter((p) => p.active && (!league || p.leagueId === league))
        .length,
      "OYUNCU",
    ],
    [Shield, leagues.filter((l) => l.type === "Lig").length, "AKTİF LİG"],
    [Trophy, leagues.filter((l) => l.type === "Kupa").length, "AKTİF KUPA"],
    [CalendarDays, matches.length, "TOPLAM MAÇ"],
    [Check, matches.filter(played).length, "OYNANAN MAÇ"],
  ];
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">ÇOKLU LİG MERKEZİ</span>
          <h1>E-FOOTBALL LİGİ</h1>
        </div>
        <Field label="GENEL / LİG / KUPA">
          <LeagueSelect
            all
            allLabel="GENEL"
            value={league}
            onChange={(v) => {
              setLeague(v);
              setNewsDirection(1);
              setNewsIndex(0);
            }}
          />
        </Field>
      </header>
      <div className="dashboard-kicker">
        <span className="status-dot" /> LİGİNİN TÜM HEYECANI, TEK EKRANDA{" "}
        <span>
          {new Date().toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <div className="dashboard-content">
        <Panel
          title={
            <>
              <Newspaper size={22} /> HABERLER
            </>
          }
          aside={<span className="muted">{news.length} HABER</span>}
          className="news-panel"
        >
          {item ? (
            <>
              <button className="news-hero" onClick={() => setArticle(item)}>
                <SlidingNews
                  key={league}
                  item={item}
                  direction={newsDirection}
                />
              </button>
              <div className="news-controls">
                <button
                  className="icon-button"
                  aria-label={
                    autoPlay
                      ? "Otomatik haber geçişini durdur"
                      : "Otomatik haber geçişini başlat"
                  }
                  title={
                    autoPlay
                      ? "Otomatik geçiş: 6 saniye — durdur"
                      : "Otomatik geçişi başlat"
                  }
                  onClick={() => setAutoPlay((value) => !value)}
                  disabled={news.length < 2}
                >
                  {autoPlay ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  className="icon-button"
                  aria-label="Önceki haber"
                  onClick={() => {
                    setNewsDirection(-1);
                    setNewsIndex((newsIndex + news.length - 1) % news.length);
                  }}
                >
                  <ChevronLeft />
                </button>
                <div className="news-dots">
                  {news.map((n, i) => (
                    <button
                      key={n.id}
                      aria-label={`${i + 1}. haber`}
                      className={newsIndex % news.length === i ? "active" : ""}
                      onClick={() => {
                        setNewsDirection(i < newsIndex % news.length ? -1 : 1);
                        setNewsIndex(i);
                      }}
                    />
                  ))}
                </div>
                <span>
                  {(newsIndex % news.length) + 1} / {news.length}
                </span>
                <button
                  className="icon-button"
                  aria-label="Sonraki haber"
                  onClick={() => {
                    setNewsDirection(1);
                    setNewsIndex((newsIndex + 1) % news.length);
                  }}
                >
                  <ChevronRight />
                </button>
              </div>
            </>
          ) : (
            <Empty>Bu seçim için aktif haber yok.</Empty>
          )}
        </Panel>
        <Panel
          title={
            <>
              <Radio size={22} /> CANLI YAYIN AKIŞI
            </>
          }
          aside={<span className="live-label">YAYIN TAKVİMİ</span>}
          className="stream-panel"
        >
          <div className="stream-head">
            <span>TARİH / SAAT</span>
            <span>OYUNCU VE TAKIMLAR</span>
            <span>YAYIN</span>
          </div>
          {streams.length ? (
            streams.map((y) => (
              <div className="stream-row" key={y.id}>
                <div className="stream-time">
                  <strong>{y.time}</strong>
                  <small>{trDate(y.date)}</small>
                </div>
                <div className="stream-players">
                  <strong>{y.homeTeam}</strong>
                  <small>{y.home}</small>
                  <span className="vs">VS</span>
                  <strong>{y.awayTeam}</strong>
                  <small>{y.away}</small>
                </div>
                <a
                  className="button primary small"
                  href={safeUrl(y.url) || undefined}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Play size={13} />
                  AÇ
                </a>
              </div>
            ))
          ) : (
            <Empty>Planlanmış aktif yayın bulunmuyor.</Empty>
          )}
          <div className="stadium-quote">
            <span>E-FOOTBALL</span>
            <h2>
              İyi oyunlar,
              <br />
              <em>bol goller!</em>
            </h2>
            <p>Her maç yeni bir hikâye.</p>
            <button onClick={() => navigate("leagues")}>
              LİGLERİ GÖRÜNTÜLE <ChevronRight size={16} />
            </button>
          </div>
        </Panel>
      </div>
      <div className="dashboard-metrics">
        {metrics.map(([Icon, count, label]) => (
          <div className="metric" key={label}>
            <Icon size={23} />
            <strong>{number(count)}</strong>
            <span>{label}</span>
          </div>
        ))}
        <div className="welcome">
          <strong>LİGİNE HOŞ GELDİN!</strong>
          <small>Giriş yapan: {user.username}</small>
          <Badge positive>{user.role}</Badge>
        </div>
      </div>
      {article && (
        <Modal title={article.title} onClose={() => setArticle(null)} wide>
          <Photo src={article.image} className="article-photo" />
          <p className="article-body">{article.body}</p>
          <small>{trDate(article.date)}</small>
        </Modal>
      )}
    </div>
  );
}

function Rankings({ stats, field, title }) {
  const rows = [...stats]
    .filter((s) => s[field] > 0)
    .sort((a, b) => b[field] - a[field])
    .slice(0, 10);
  return (
    <Panel title={title}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="left">FUTBOLCU</th>
              <th>{field === "gol" ? "GOL" : "ASİST"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name}>
                <td>{i + 1}</td>
                <td className="left">{r.name}</td>
                <td className="points">{r[field]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>Henüz kayıt yok.</Empty>}
      </div>
    </Panel>
  );
}
export function MatchTable({ matches, action }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>HAFTA / TUR</th>
            <th className="left">EV SAHİBİ</th>
            <th>SKOR</th>
            <th className="left">DEPLASMAN</th>
            <th>TARİH</th>
            <th>DURUM</th>
            {action && <th />}
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id}>
              <td>{m.stage && m.stage !== "LIG" ? m.stage : m.week}</td>
              <td className="left">
                <strong>{m.home}</strong>
              </td>
              <td>
                <span className={`score ${played(m) ? "done" : ""}`}>
                  {played(m) ? `${m.homeGoals} – ${m.awayGoals}` : "— : —"}
                </span>
              </td>
              <td className="left">
                <strong>{m.away}</strong>
              </td>
              <td className="nowrap">{trDate(m.date)}</td>
              <td>
                <Badge positive={played(m)}>{m.status}</Badge>
              </td>
              {action && <td>{action(m)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!matches.length && <Empty>Bu seçim için maç bulunmuyor.</Empty>}
    </div>
  );
}
export function Leagues() {
  const { data, navigate } = useApp();
  const [id, setId] = useState(activeLeague(data)),
    [tab, setTab] = useState("table"),
    [season, setSeason] = useState("");
  const league = data.leagues.find((l) => l.id === id),
    matches = data.matches.filter((m) => m.leagueId === id),
    stats = statistics(data.events, matches);
  const seasons = [
    ...new Set(
      data.archive.filter((a) => a.leagueId === id).map((a) => a.season),
    ),
  ];
  const table = season
    ? data.archive
        .filter((a) => a.leagueId === id && a.season === season)
        .sort((a, b) => a.rank - b.rank)
    : standings(
        data.players.filter((p) => p.leagueId === id),
        matches,
      );
  const displayStats = season
    ? data.statsArchive.filter((a) => a.leagueId === id && a.season === season)
    : stats;
  return (
    <div className="page leagues-page">
      <PageHead
        title="LİGLER"
        subtitle="Puan durumu, fikstür ve sezon istatistikleri"
      />
      <div className="toolbar">
        <Field label="LİG SEÇİMİ">
          <LeagueSelect
            value={id}
            onChange={(v) => {
              setId(v);
              setSeason("");
            }}
            cups={false}
          />
        </Field>
        <Field label="GÖRÜNÜM">
          <Select
            value={season}
            onChange={setSeason}
            options={[
              { value: "", label: "GÜNCEL SEZON" },
              ...seasons.map((s) => ({ value: s, label: `ARŞİV • ${s}` })),
            ]}
          />
        </Field>
        <Badge positive={league?.status === "Aktif"}>
          {league?.season} · {league?.status}
        </Badge>
        <button className="text-button" onClick={() => navigate("archive")}>
          TÜM ARŞİVLER <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="tabs">
        {[
          ["table", "PUAN DURUMU"],
          ["fixture", "FİKSTÜR"],
          ["stats", "İSTATİSTİKLER"],
        ].map(([k, v]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {v}
          </button>
        ))}
      </div>
      {tab === "table" ? (
        <div className="league-layout">
          <Panel
            title={league?.name || "PUAN DURUMU"}
            aside={<span>{season || league?.season}</span>}
          >
            <StandingsTable rows={table} />
            <div className="table-legend">
              <span className="status-dot" /> Sıralama: puan → averaj{" "}
              <span>Galibiyet 3 · Beraberlik 1 puan</span>
            </div>
          </Panel>
          <div className="ranking-stack">
            <Rankings stats={displayStats} field="gol" title="GOL KRALLIĞI" />
            <Rankings
              stats={displayStats}
              field="asist"
              title="ASİST KRALLIĞI"
            />
          </div>
        </div>
      ) : tab === "fixture" ? (
        <Panel title="SEZON FİKSTÜRÜ">
          {season ? (
            <Empty>
              Excel sezon arşivi maç ayrıntılarını değil, final sıralamasını
              saklar.
            </Empty>
          ) : (
            <MatchTable matches={matches} />
          )}
        </Panel>
      ) : (
        <Panel title="FUTBOLCU İSTATİSTİKLERİ">
          <StatsTable rows={displayStats} />
        </Panel>
      )}
      <BackBar />
    </div>
  );
}
function StatsTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="left">FUTBOLCU / TAKIM</th>
            <th>GOL</th>
            <th>ASİST</th>
            <th>
              <span className="yellow-card" />
            </th>
            <th>
              <span className="red-card" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r.name}>
              <td>{i + 1}</td>
              <td className="left">{r.name}</td>
              <td className="points">{r.gol}</td>
              <td>{r.asist}</td>
              <td>{r.sari || 0}</td>
              <td>{r.kirmizi || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty>Henüz futbolcu olayı kaydedilmemiş.</Empty>}
    </div>
  );
}
export function Cups() {
  const { data, can, act } = useApp();
  const [id, setId] = useState(data.cups[0]?.id || 0),
    [create, setCreate] = useState(false),
    [tab, setTab] = useState("bracket"),
    [edit, setEdit] = useState(false),
    [remove, setRemove] = useState(false);
  const cup = data.cups.find((c) => c.id === id),
    league = data.leagues.find((l) => l.id === id),
    parts = data.participants.filter((p) => p.cupId === id),
    matches = data.matches.filter((m) => m.leagueId === id);
  const competition=cupCompetition(cup,league);
  const championship=UEFA_COMPETITIONS[competition];
  const stages = [
    { key: "SON 16", title: "SON 16", slots: 8 },
    { key: "CEYREK FINAL", title: "ÇEYREK FİNAL", slots: 4 },
    { key: "YARI FINAL", title: "YARI FİNAL", slots: 2 },
    { key: "FINAL", title: "FİNAL", slots: 1 },
  ];
  const final = matches.find((m) => m.stage === "FINAL"),
    champion = final ? winner(final) : cup?.champion;
  const label = (name) => {
    const p = parts.find((p) => p.name === name);
    return p ? `${p.name} · ${p.team}` : name;
  };
  return (
    <div className={`page cups-page cup-theme-${competition}`} style={championship?{'--competition-accent':championship.color,'--competition-background':`url("${championship.theme}")`}:undefined}>
      <PageHead
        title="KUPALAR"
        subtitle="Kura havuzu, grup aşaması ve eleme ağacı"
      >
        {can("AYARLAR.KUPA") && (
          <button className="primary" onClick={() => setCreate(true)}>
            <Plus size={17} />
            KUPA OLUŞTUR
          </button>
        )}
      </PageHead>
      {championship&&<div className="championship-banner"><Trophy size={30}/><div><span>ULUSAL KUPA · GRUPLU + ELEME</span><h2>{championship.name}</h2></div><Badge>{championship.start}–{championship.end}. SIRALAR</Badge></div>}
      <div className="toolbar">
        <Field label="KUPA SEÇİMİ">
          <Select
            value={id}
            onChange={(v) => setId(Number(v))}
            options={data.cups.map((c) => ({
              value: c.id,
              label: `${data.leagues.find((l) => l.id === c.id)?.name} | ${c.season} | ${c.type}`,
            }))}
          />
        </Field>
        {cup && (
          <Badge positive={cup.stage === "TAMAMLANDI"}>{cup.stage}</Badge>
        )}
        {cup && can("AYARLAR.KUPA") && (
          <>
            <button
              className="icon-button"
              title="Kupayı düzenle"
              onClick={() => setEdit(true)}
            >
              <Pencil size={17} />
            </button>
            <button
              className="icon-button danger-text"
              title="Kupayı sil"
              onClick={() => setRemove(true)}
            >
              <Trash2 size={17} />
            </button>
          </>
        )}
      </div>
      {!cup ? (
        <Empty>Henüz oluşturulmuş bir kupa bulunmuyor.</Empty>
      ) : (
        <>
          <Panel
            title={`${cup.type} KATILIMCILARI`}
            aside={<Badge>{parts.length} KATILIMCI</Badge>}
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="left">OYUNCU / TAKIM</th>
                    <th>GRUP</th>
                    <th>KAYNAK LİG</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, i) => (
                    <tr key={p.id}>
                      <td>{String(i + 1).padStart(2, "0")}</td>
                      <td className="left">
                        <strong>{p.name}</strong>
                        <small className="cell-sub">{p.team}{p.qualifiedRank?` · Lig sırası: ${p.qualifiedRank}`:''}</small>
                      </td>
                      <td>{p.group || "KURA HAVUZU"}</td>
                      <td>
                        {data.leagues.find((l) => l.id === p.leagueId)?.name ||
                          "Arşiv lig"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="tabs">
            {[
              ["bracket", "ELEME AĞACI"],
              ["groups", "GRUP PUANLARI"],
              ["matches", "MAÇLAR"],
              ["stats", "İSTATİSTİKLER"],
            ].map(([k, v]) => (
              <button
                key={k}
                className={tab === k ? "active" : ""}
                onClick={() => setTab(k)}
              >
                {v}
              </button>
            ))}
          </div>
          {tab === "bracket" ? (
            <Panel
              title="ELEME AĞACI / SABİT EŞLEŞME"
              className="bracket-panel"
            >
              <div className="bracket">
                {stages.map((stage) => (
                  <div className="bracket-round" key={stage.key}>
                    <h3>{stage.title}</h3>
                    <div className="round-games">
                      {Array.from({ length: stage.slots }, (_, index) => {
                        const m = matches.filter((m) => m.stage === stage.key)[
                          index
                        ];
                        const span = 16 / stage.slots;
                        return (
                          <div
                            className="bracket-cell"
                            key={index}
                            style={{
                              gridRow: `${index * span + 1} / span ${span}`,
                            }}
                          >
                            {m ? (
                              <div
                                className="bracket-game"
                                aria-label={`${stage.title}: ${label(m.home)} - ${label(m.away)}`}
                              >
                                {[
                                  ["home", m.home, m.homeGoals],
                                  ["away", m.away, m.awayGoals],
                                ].map(([side, name, score]) => (
                                  <div
                                    key={side}
                                    className={winner(m) === name ? "won" : ""}
                                  >
                                    <span title={label(name)}>
                                      {parts.find((p) => p.name === name)
                                        ?.team || name}
                                    </span>
                                    <b>{played(m) ? score : "–"}</b>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div
                                className="bracket-placeholder"
                                aria-label={`${stage.title} ${index + 1}. eşleşme bekleniyor`}
                              >
                                <span>—</span>
                                <span>—</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="bracket-round champion">
                  <h3>ŞAMPİYON</h3>
                  <div className="round-games">
                    <div
                      className="bracket-cell"
                      style={{ gridRow: "1 / span 16" }}
                    >
                      <div className="champion-card">
                        <Trophy size={30} />
                        <strong>
                          {champion ? label(champion) : "Şampiyon bekleniyor"}
                        </strong>
                        <small>{league?.name}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {cup.direct?.length > 0 && (
                <p className="note">
                  Doğrudan çeyrek final: {cup.direct.join(", ")}
                </p>
              )}
            </Panel>
          ) : tab === "groups" ? (
            <div className="two-columns">
              {["A", "B", "C", "D"]
                .filter((g) => parts.some((p) => p.group === g))
                .map((g) => (
                  <Panel key={g} title={`GRUP ${g}`}>
                    <StandingsTable
                      rows={standings(
                        parts.filter((p) => p.group === g),
                        matches.filter((m) => m.stage === "GRUP " + g),
                        "group",
                      )}
                    />
                  </Panel>
                ))}
              {!parts.some((p) => p.group) && (
                <Empty>Bu kupa doğrudan eleme formatında.</Empty>
              )}
            </div>
          ) : tab === "matches" ? (
            <Panel title="KUPA MAÇLARI">
              <MatchTable matches={matches} />
            </Panel>
          ) : (
            <Panel title="KUPA İSTATİSTİKLERİ">
              <StatsTable rows={statistics(data.events, matches)} />
            </Panel>
          )}
          {can("AYARLAR.KUPA") && cup.stage !== "TAMAMLANDI" && (
            <button onClick={() => act("cup.advance", { id })}>
              SONRAKİ TURU OLUŞTUR <ChevronRight size={16} />
            </button>
          )}
        </>
      )}
      <BackBar />
      {create && (
        <CupCreate
          close={() => setCreate(false)}
          onCreated={(id) => setId(id)}
        />
      )}{" "}
      {edit && (
        <Modal title="KUPAYI DÜZENLE" onClose={() => setEdit(false)}>
          <Form
            onSubmit={async (f) => {
              if (
                await act("cup.save", {
                  id,
                  name: f.get("name"),
                  season: f.get("season"),
                  status: f.get("status"),
                })
              )
                setEdit(false);
            }}
          >
            <Field label="KUPA ADI">
              <input name="name" defaultValue={league.name} required />
            </Field>
            <Field label="SEZON">
              <input name="season" defaultValue={cup.season} required />
            </Field>
            <Field label="DURUM">
              <select name="status" defaultValue={league.status}>
                <option>Aktif</option>
                <option>Pasif</option>
              </select>
            </Field>
          </Form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="KUPAYI SİL"
          message="Kupa, katılımcıları ve maç sonuçları silinecek. Devam edilsin mi?"
          onClose={() => setRemove(false)}
          onConfirm={async () => {
            if (await act("cup.delete", { id })) {
              setRemove(false);
              setId(data.cups.find((c) => c.id !== id)?.id || 0);
            }
          }}
        />
      )}
    </div>
  );
}

export function Teams() {
  const { data, can, act, navigate } = useApp();
  const [league, setLeague] = useState(activeLeague(data)),
    [id, setId] = useState(data.teams[0]?.id),
    [edit, setEdit] = useState(false),
    [logo, setLogo] = useState(""),
    [selectedCard, setSelectedCard] = useState(null);
  const teams = data.teams.filter((t) => !league || t.leagueId === league),
    team = teams.find((t) => t.id === id) || teams[0],
    museum = data.museum.find(
      (m) => m.team === team?.name && m.leagueId === team?.leagueId,
    );
  const squad = data.squads
    .filter((k) => k.leagueId === team?.leagueId && k.team === team?.name)
    .map((k) => {
      const totals = { gol: 0, asist: 0, sari: 0, kirmizi: 0 };
      const belongsToTeam = (label) =>
        normalize(
          String(label || "")
            .split(/\s+-\s+/)
            .at(-1),
        ) === normalize(team.name);
      for (const event of data.events.filter(
        (e) => e.leagueId === team.leagueId,
      )) {
        if (event.catalogId === k.catalogId && belongsToTeam(event.player)) {
          if (event.type === "Gol") totals.gol++;
          if (event.type === "Sarı Kart") totals.sari++;
          if (event.type === "Kırmızı Kart") totals.kirmizi++;
        }
        if (
          event.type === "Gol" &&
          event.assistId === k.catalogId &&
          belongsToTeam(event.assist)
        )
          totals.asist++;
      }
      return {
        ...k,
        card: data.catalog.find((c) => c.id === k.catalogId),
        ...totals,
      };
    });
  const trophies = [
    ["league", "LİG ŞAMPİYONLUĞU"],
    ["cup", "LİG KUPASI"],
    ["champions", "UEFA ŞAMPİYONLAR LİGİ"],
    ["europa", "UEFA AVRUPA LİGİ"],
    ["conference", "UEFA KONFERANS LİGİ"],
  ];
  return (
    <div className="page teams-page">
      <h1 className="teams-heading">TAKIMLAR VE KADROLAR</h1>
      <div className="teams-workspace">
        <section
          className="teams-roster-column"
          aria-label="Takım seçimi ve kadro"
        >
          <div className="teams-selectors">
            <Field label="LİG">
              <LeagueSelect
                all
                value={league}
                onChange={setLeague}
                cups={false}
              />
            </Field>
            <Field label="TAKIM">
              <Select
                value={team?.id || ""}
                onChange={(v) => setId(Number(v))}
                options={teams}
              />
            </Field>
            <div className="teams-manager">
              <span>MENAJER</span>
              <strong>{team?.manager || "—"}</strong>
            </div>
          </div>
          <div className="teams-roster-heading" aria-hidden="true">
            <span>SIRA</span>
            <span>FUTBOLCU</span>
            <span>GOL</span>
            <span>ASİST</span>
            <span>SARI</span>
            <span>KIRMIZI</span>
          </div>
          <div className="teams-roster-table table-wrap">
            <table aria-label="Takım kadrosu ve istatistikleri">
              <colgroup>
                <col style={{ width: "8%" }} />
                <col style={{ width: "43%" }} />
                {[0, 1, 2, 3].map((i) => (
                  <col key={i} style={{ width: "12.25%" }} />
                ))}
              </colgroup>
              <thead className="sr-only">
                <tr>
                  {["SIRA", "FUTBOLCU", "GOL", "ASİST", "SARI", "KIRMIZI"].map(
                    (label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {squad.map((k, i) => (
                  <tr key={k.id}>
                    <td>{i + 1}</td>
                    <td className="left">
                      <div className="teams-player-name">
                        <button
                          className="teams-player-card-button"
                          aria-label={`${k.card?.name || `Katalog #${k.catalogId}`} kartını aç`}
                          onClick={() =>
                            setSelectedCard(
                              k.card || { name: `Katalog #${k.catalogId}` },
                            )
                          }
                        >
                          <Photo
                            className="teams-player-thumbnail"
                            src={safeUrl(k.card?.image)}
                            alt=""
                            fallback={<Users size={22} />}
                          />
                          <span>
                            <strong>
                              {k.card?.name || `Katalog #${k.catalogId}`}
                            </strong>
                            <small>{k.card?.position}</small>
                          </span>
                        </button>
                        {can("KATALOG.DUZENLE") && (
                          <button
                            className="icon-button danger-text"
                            aria-label={`${k.card?.name} kadrodan çıkar`}
                            onClick={() => act("squad.delete", { id: k.id })}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                    {["gol", "asist", "sari", "kirmizi"].map((field) => (
                      <td key={field}>{k[field]}</td>
                    ))}
                  </tr>
                ))}
                {!squad.length && (
                  <tr>
                    <td colSpan={6}>
                      <Empty>
                        {team
                          ? "Bu takımın kadrosu boş."
                          : "Bu ligde takım bulunmuyor."}
                      </Empty>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {can("KATALOG.DUZENLE") && (
            <button
              className="teams-catalog-link text-button"
              onClick={() => navigate("catalog")}
            >
              <Plus size={14} />
              KATALOGDAN FUTBOLCU EKLE
            </button>
          )}
        </section>
        <aside
          className="teams-identity-column"
          aria-label="Takım logosu ve müzesi"
        >
          <section className="teams-logo-section">
            <div className="teams-logo-title">
              <h2>TAKIM LOGOSU</h2>
              {team && (can("AYARLAR.TAKIM") || can("TAKIMLAR.DUZENLE")) && (
                <button
                  className="icon-button"
                  aria-label="Takım ve müze düzenle"
                  title="Takım ve müze düzenle"
                  onClick={() => {
                    setLogo(team.logo);
                    setEdit(true);
                  }}
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
            <div className="teams-logo-stage">
              <Photo
                src={team?.logo}
                alt={team ? `${team.name} takım logosu` : "Takım logosu"}
                fallback={<Shield size={100} />}
              />
            </div>
          </section>
          <section className="teams-museum" aria-label="Takım müzesi">
            <h2>TAKIM MÜZESİ</h2>
            <div className="teams-museum-grid">
              {trophies.map(([key, label], i) => (
                <div
                  className={`teams-museum-cell ${i < 2 ? "major" : ""}`}
                  key={key}
                >
                  <span>{label}</span>
                  <strong>{museum?.[key] || 0}</strong>
                </div>
              ))}
            </div>
          </section>
          <footer className="teams-footer">
            <button className="danger" onClick={() => navigate("home")}>
              ← GERİ DÖN
            </button>
          </footer>
        </aside>
      </div>
      {selectedCard && (
        <Modal title={selectedCard.name} onClose={() => setSelectedCard(null)}>
          <div className="squad-card-detail">
            <Photo
              src={safeUrl(selectedCard.image)}
              alt={`${selectedCard.name} futbolcu kartı`}
              className="squad-card-preview"
            />
            <div className="squad-card-caption">
              <span>
                {[selectedCard.position, selectedCard.nation]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {selectedCard.rating != null && (
                <Badge positive>GEN {selectedCard.rating}</Badge>
              )}
            </div>
            <div
              className="squad-card-attributes"
              aria-label="Futbolcu güçleri"
            >
              {[
                ["pass", "PAS"],
                ["shoot", "ŞUT"],
                ["speed", "HIZ / KOŞU"],
                ["dribble", "DRİPLİNG"],
                ["stamina", "DAYANIKLILIK"],
                ["rating", "GENEL GÜÇ"],
              ].map(([key, label]) => {
                const raw = selectedCard[key];
                const value =
                  raw !== null &&
                  raw !== undefined &&
                  raw !== "" &&
                  Number.isFinite(Number(raw))
                    ? Number(raw)
                    : null;
                return (
                  <div
                    className="squad-card-attribute"
                    key={key}
                    data-attribute={key}
                  >
                    <div>
                      <span>{label}</span>
                      <strong>{value ?? "—"}</strong>
                    </div>
                    {value !== null ? (
                      <meter
                        aria-label={label}
                        min={0}
                        max={Math.max(110, value)}
                        value={value}
                      />
                    ) : (
                      <small>Veri bulunmuyor</small>
                    )}
                  </div>
                );
              })}
            </div>
            {safeUrl(selectedCard.detail) && (
              <a
                className="button"
                href={safeUrl(selectedCard.detail)}
                target="_blank"
                rel="noreferrer"
              >
                PESDATA DETAYI <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </Modal>
      )}
      {edit && (
        <Modal title="TAKIM VE MÜZE YÖNETİMİ" onClose={() => setEdit(false)}>
          <Form
            onSubmit={async (f) => {
              if (
                await act("team.save", {
                  id: team.id,
                  logo,
                  ...Object.fromEntries(f),
                })
              )
                setEdit(false);
            }}
          >
            <h3>{team.name}</h3>
            <ImageInput value={logo} onChange={setLogo} />
            <div className="form-grid">
              <Field label="BÜTÇE">
                <input
                  name="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={team.budget}
                />
              </Field>
              {trophies.map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    name={key}
                    type="number"
                    min="0"
                    defaultValue={museum?.[key] || 0}
                  />
                </Field>
              ))}
            </div>
          </Form>
        </Modal>
      )}
    </div>
  );
}

export function Catalog() {
  const { data, can, act } = useApp();
  const [q, setQ] = useState(""),
    [position, setPosition] = useState(""),
    [nation, setNation] = useState(""),
    [league, setLeague] = useState(activeLeague(data)),
    [teamId, setTeam] = useState(""),
    [selected, setSelected] = useState([]),
    [detail, setDetail] = useState(data.catalog[0]),
    [page, setPage] = useState(0),
    [online, setOnline] = useState(false),
    [remove, setRemove] = useState(false);
  const found = useMemo(
    () =>
      data.catalog.filter(
        (c) =>
          (!q || normalize(`${c.name} ${c.club}`).includes(normalize(q))) &&
          (!position || c.position === position) &&
          (!nation || c.nation === nation),
      ),
    [data.catalog, q, position, nation],
  );
  const pages = Math.max(1, Math.ceil(found.length / 100)),
    visible = found.slice(
      Math.min(page, pages - 1) * 100,
      (Math.min(page, pages - 1) + 1) * 100,
    ),
    teams = data.teams.filter((t) => t.leagueId === league);
  const toggle = (id) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  return (
    <div className="page catalog-page">
      <PageHead
        title="PESDB KATALOĞU"
        subtitle={`${number(data.catalogCount)} futbolcu kartı • Yerel arama ve kadro yönetimi`}
      >
        {can("KATALOG.DUZENLE") && (
          <button className="primary" onClick={() => setOnline(true)}>
            <Search size={16} />
            PESDB'DE ARA
          </button>
        )}
      </PageHead>
      <div className="toolbar catalog-search">
        <Field label="YEREL LİSTEDE ARA">
          <div className="search-input">
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Futbolcu adı veya kulüp…"
            />
          </div>
        </Field>
        <Field label="POZİSYON">
          <Select
            value={position}
            onChange={(v) => {
              setPosition(v);
              setPage(0);
            }}
            options={[
              { value: "", label: "Tüm pozisyonlar" },
              ...[...new Set(data.catalog.map((c) => c.position))]
                .filter(Boolean)
                .sort(),
            ]}
          />
        </Field>
        <Field label="UYRUK">
          <Select
            value={nation}
            onChange={(v) => {
              setNation(v);
              setPage(0);
            }}
            options={[
              { value: "", label: "Tüm ülkeler" },
              ...[...new Set(data.catalog.map((c) => c.nation))]
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, "tr")),
            ]}
          />
        </Field>
        <button
          onClick={() => {
            setQ("");
            setPosition("");
            setNation("");
            setSelected([]);
            setPage(0);
          }}
        >
          TEMİZLE
        </button>
      </div>
      {can("KATALOG.DUZENLE") && (
        <div className="transfer-bar">
          <span>KADROYA EKLEME HEDEFİ</span>
          <button
            className="small danger-text"
            disabled={!selected.length}
            onClick={() => setRemove(true)}
          >
            <Trash2 size={14} />
            SEÇİLİ KARTLARI SİL
          </button>
          <LeagueSelect
            cups={false}
            value={league}
            onChange={(v) => {
              setLeague(v);
              setTeam("");
            }}
          />
          <Select
            aria-label="Hedef takım"
            value={teamId}
            onChange={setTeam}
            options={teams}
            placeholder="HEDEF TAKIM"
          />
          <button
            className="primary"
            disabled={!selected.length || !teamId}
            onClick={async () => {
              if (
                await act("squad.add", {
                  teamId: Number(teamId),
                  ids: selected,
                })
              )
                setSelected([]);
            }}
          >
            <Plus size={16} />
            SEÇİLİ {selected.length} KARTI AKTAR
          </button>
        </div>
      )}
      <div className="catalog-layout">
        <Panel
          title="FUTBOLCU LİSTESİ"
          aside={<span>{number(found.length)} SONUÇ</span>}
        >
          <div
            className="catalog-table table-wrap"
            key={`${page}-${q}-${position}-${nation}`}
            tabIndex={0}
            role="region"
            aria-label="Kaydırılabilir futbolcu listesi"
          >
            <table>
              <thead>
                <tr>
                  <th>SEÇ</th>
                  <th className="left">FUTBOLCU</th>
                  <th className="left">POZİSYON</th>
                  <th>UYRUK</th>
                  <th>GEN</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr
                    key={c.id}
                    className={detail?.id === c.id ? "selected" : ""}
                    onClick={() => setDetail(c)}
                  >
                    <td>
                      <input
                        aria-label={`${c.name} seç`}
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        onChange={() => toggle(c.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="left">
                      <button className="row-link" onClick={() => setDetail(c)}>
                        {c.name}
                      </button>
                      <small className="cell-sub">
                        #{c.id} {c.club}
                      </small>
                    </td>
                    <td className="left">{c.position}</td>
                    <td>{c.nation}</td>
                    <td>
                      <b className="rating small-rating">{c.rating}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <Empty>Aramanızla eşleşen futbolcu bulunamadı.</Empty>
            )}
          </div>
          <div className="pagination">
            <button
              disabled={page <= 0}
              onClick={() => setPage(page - 1)}
              aria-label="Önceki sayfa"
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {Math.min(page, pages - 1) + 1} / {pages}
            </span>
            <button
              disabled={page >= pages - 1}
              onClick={() => setPage(page + 1)}
              aria-label="Sonraki sayfa"
            >
              <ChevronRight size={17} />
            </button>
            <small>Sayfada en fazla 100 kart</small>
          </div>
        </Panel>
        <Panel title="FUTBOLCU DETAYI" className="player-detail">
          {detail ? (
            <>
              <Photo
                src={detail.image}
                alt={detail.name}
                className="player-card-image"
                fallback={<Users size={70} />}
              />
              <div className="player-detail-text">
                <h2>{detail.name}</h2>
                <p>
                  {detail.position} · {detail.nation}
                </p>
                <strong className="big-rating">
                  {detail.rating}
                  <small>GENEL GÜÇ</small>
                </strong>
                <div className="attribute-grid">
                  {[
                    ["speed", "HIZ"],
                    ["shoot", "ŞUT"],
                    ["pass", "PAS"],
                    ["dribble", "DRİPLİNG"],
                    ["stamina", "DAYANIKLILIK"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span>{v}</span>
                      <b>{detail[k] ?? "—"}</b>
                      <meter min="0" max="110" value={detail[k]} />
                    </div>
                  ))}
                </div>
                {safeUrl(detail.detail) && (
                  <a
                    className="button"
                    href={detail.detail}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PESDATA DETAYI <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </>
          ) : (
            <Empty>Listeden futbolcu seçin.</Empty>
          )}
        </Panel>
      </div>
      <BackBar />
      {online && (
        <OnlineCatalog initialQuery={q} close={() => setOnline(false)} />
      )}
      {remove && (
        <Confirm
          title="KATALOG KARTLARINI SİL"
          message={`${selected.length} kart yerel katalogdan silinsin mi? Kadroda veya maç geçmişinde kullanılan kartlar korunur.`}
          onClose={() => setRemove(false)}
          onConfirm={async () => {
            if (await act("catalog.delete", { ids: selected })) {
              setSelected([]);
              setRemove(false);
              setDetail(null);
            }
          }}
        />
      )}
    </div>
  );
}

export function News() {
  const { data, can, act } = useApp();
  const [league, setLeague] = useState(0),
    [edit, setEdit] = useState(null),
    [open, setOpen] = useState(null),
    [image, setImage] = useState(""),
    [remove, setRemove] = useState(null);
  const rows = data.news
    .filter((n) => Number(n.leagueId || 0) === league)
    .slice()
    .reverse();
  return (
    <div className="page">
      <PageHead
        title="HABERLER"
        subtitle="Liginden gelişmeler, duyurular ve haberler"
      >
        {can("HABERLER.DUZENLE") && (
          <button
            className="primary"
            onClick={() => {
              setEdit({});
              setImage("");
            }}
          >
            <Plus size={17} />
            HABER EKLE
          </button>
        )}
      </PageHead>
      <div className="toolbar">
        <Field label="GENEL / LİG / KUPA">
          <LeagueSelect
            all
            allLabel="GENEL"
            value={league}
            onChange={setLeague}
          />
        </Field>
      </div>
      <div className="news-grid">
        {rows.map((n) => (
          <article className="news-card" key={n.id}>
            <button onClick={() => setOpen(n)} className="news-image-button">
              <Photo src={safeUrl(n.image)} alt={n.title} />
            </button>
            <div className="news-card-body">
              <div className="news-card-meta">
                <span>{trDate(n.date)}</span>
                <Badge positive={n.active}>
                  {n.active ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              <h2>
                <button onClick={() => setOpen(n)} className="row-link">
                  {n.title}
                </button>
              </h2>
              <p>
                {n.body.slice(0, 180)}
                {n.body.length > 180 ? "…" : ""}
              </p>
              <div className="news-card-footer">
                <button className="text-button" onClick={() => setOpen(n)}>
                  DEVAMINI OKU <ChevronRight size={15} />
                </button>
                {can("HABERLER.DUZENLE") && (
                  <div>
                    <button
                      className="icon-button"
                      aria-label={`${n.title} düzenle`}
                      onClick={() => {
                        setEdit(n);
                        setImage(n.image);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button danger-text"
                      aria-label={`${n.title} sil`}
                      onClick={() => setRemove(n)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && <Empty>Bu seçim için haber bulunmuyor.</Empty>}
      <BackBar />
      {open && (
        <Modal title={open.title} wide onClose={() => setOpen(null)}>
          <Photo src={open.image} className="article-photo" />
          <p className="article-body">{open.body}</p>
          <small>{trDate(open.date)}</small>
        </Modal>
      )}
      {edit && (
        <Modal
          title={edit.id ? "HABERİ DÜZENLE" : "HABER EKLE"}
          onClose={() => setEdit(null)}
          wide
        >
          <Form
            onSubmit={async (f) => {
              if (
                await act("news.save", {
                  ...Object.fromEntries(f),
                  id: edit.id,
                  image,
                  active: f.get("active") === "on",
                })
              ) {
                setLeague(Number(f.get("leagueId")) || 0);
                setEdit(null);
              }
            }}
          >
            <div className="form-grid">
              <Field label="BAŞLIK">
                <input name="title" required defaultValue={edit.title} />
              </Field>
              <Field label="GENEL / LİG / KUPA">
                <select name="leagueId" defaultValue={edit.leagueId ?? league}>
                  <option value="0">GENEL</option>
                  {data.leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="HABER METNİ">
              <textarea
                name="body"
                required
                rows={7}
                defaultValue={edit.body}
              />
            </Field>
            <Field label="HABER GÖRSELİ">
              <ImageInput value={image} onChange={setImage} />
            </Field>
            <label className="check-label">
              <input
                name="active"
                type="checkbox"
                defaultChecked={edit.active !== false}
              />
              Aktif olarak yayımla
            </label>
          </Form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="HABERİ SİL"
          message={`“${remove.title}” silinsin mi?`}
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            if (await act("news.delete", { id: remove.id })) setRemove(null);
          }}
        />
      )}
    </div>
  );
}

export function Streams() {
  const { data, can, act } = useApp();
  const today = useBroadcastToday();
  const [edit, setEdit] = useState(null),
    [league, setLeague] = useState(activeLeague(data)),
    [remove, setRemove] = useState(null),
    [tab, setTab] = useState("current");
  const current = data.streams
    .filter((y) => !isPastBroadcast(y, today))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const archived = data.streams
    .filter((y) => isPastBroadcast(y, today))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const broadcasts = tab === "archive" ? archived : current;
  const leagueObj = data.leagues.find((l) => l.id === league),
    players =
      leagueObj?.type === "Kupa"
        ? data.participants.filter((p) => p.cupId === league)
        : data.players.filter((p) => p.leagueId === league && p.active),
    manage = can("YAYIN.DUZENLE") || can("HABERLER.DUZENLE");
  return (
    <div className="page">
      <PageHead
        title="CANLI YAYIN"
        subtitle="Yayın programını planla, maçın heyecanını paylaş"
      >
        {manage && (
          <button className="primary" onClick={() => setEdit({})}>
            <Plus size={17} />
            YAYIN EKLE
          </button>
        )}
      </PageHead>
      <div className="tabs" aria-label="Yayın görünümü">
        <button
          className={tab === "current" ? "active" : ""}
          aria-pressed={tab === "current"}
          onClick={() => setTab("current")}
        >
          GÜNCEL YAYINLAR ({current.length})
        </button>
        <button
          className={tab === "archive" ? "active" : ""}
          aria-pressed={tab === "archive"}
          onClick={() => setTab("archive")}
        >
          YAYIN ARŞİVİ ({archived.length})
        </button>
      </div>
      <div
        className="stream-list"
        aria-label={tab === "archive" ? "Yayın arşivi" : "Güncel yayınlar"}
      >
        {broadcasts.map((y) => (
          <Panel key={y.id} className={y.active ? "" : "inactive"}>
            <div className="broadcast">
              <div className="broadcast-date">
                <CalendarDays size={24} />
                <strong>{trDate(y.date)}</strong>
                <span>{y.time}</span>
              </div>
              <div className="broadcast-match">
                <small>{y.league}</small>
                <h2>
                  {y.homeTeam} <span>VS</span> {y.awayTeam}
                </h2>
                <p>
                  {y.home} · {y.away}
                </p>
              </div>
              <div className="broadcast-actions">
                <Badge positive={tab === "current" && y.active}>
                  {tab === "archive" ? "Arşiv" : y.active ? "Aktif" : "Pasif"}
                </Badge>
                <a
                  className="button primary"
                  href={safeUrl(y.url) || undefined}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Play size={16} />
                  YAYINI AÇ
                </a>
                {manage && (
                  <>
                    <button
                      className="icon-button"
                      title="Yayını düzenle"
                      onClick={() => {
                        setLeague(y.leagueId);
                        setEdit(y);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button danger-text"
                      title="Yayını sil"
                      onClick={() => setRemove(y)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </Panel>
        ))}
      </div>
      {!broadcasts.length && (
        <Empty>
          {tab === "archive"
            ? "Henüz arşivlenmiş yayın bulunmuyor."
            : "Bugün veya ileri bir tarih için planlanmış yayın bulunmuyor."}
        </Empty>
      )}
      <BackBar />
      {edit && (
        <Modal
          title={edit.id ? "YAYINI DÜZENLE" : "YAYIN EKLE"}
          onClose={() => setEdit(null)}
        >
          <Form
            onSubmit={async (f) => {
              if (
                await act("stream.save", {
                  id: edit.id,
                  ...Object.fromEntries(f),
                  leagueId: league,
                  active: f.get("active") === "on",
                })
              ) {
                setTab(
                  isPastBroadcast({ date: f.get("date") }, today)
                    ? "archive"
                    : "current",
                );
                setEdit(null);
              }
            }}
          >
            <Field label="LİG / KUPA">
              <LeagueSelect value={league} onChange={setLeague} />
            </Field>
            <div className="form-grid">
              <Field label="EV SAHİBİ">
                <select
                  name="home"
                  required
                  defaultValue={edit.home}
                  key={`home${league}`}
                >
                  <option value="">Oyuncu seçin</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} • {p.team}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="DEPLASMAN">
                <select
                  name="away"
                  required
                  defaultValue={edit.away}
                  key={`away${league}`}
                >
                  <option value="">Oyuncu seçin</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} • {p.team}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="TARİH">
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={edit.date || today}
                />
              </Field>
              <Field label="SAAT">
                <input
                  name="time"
                  type="time"
                  required
                  defaultValue={edit.time || "21:00"}
                />
              </Field>
            </div>
            <Field label="YAYIN BAĞLANTISI">
              <input
                name="url"
                type="url"
                required
                defaultValue={edit.url}
                placeholder="https://www.youtube.com/live/…"
              />
            </Field>
            <label className="check-label">
              <input
                name="active"
                type="checkbox"
                defaultChecked={edit.active !== false}
              />
              Aktif yayın
            </label>
          </Form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="YAYINI SİL"
          message="Bu yayın takvimden silinsin mi?"
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            if (await act("stream.delete", { id: remove.id })) setRemove(null);
          }}
        />
      )}
    </div>
  );
}

export function Archive() {
  const { data } = useApp();
  const [id, setId] = useState(data.archive[0]?.leagueId || 0),
    [season, setSeason] = useState("");
  const ids = [...new Set(data.archive.map((a) => a.leagueId))],
    seasons = [
      ...new Set(
        data.archive.filter((a) => a.leagueId === id).map((a) => a.season),
      ),
    ],
    selected = seasons.includes(season) ? season : seasons[0],
    rows = data.archive
      .filter((a) => a.leagueId === id && a.season === selected)
      .sort((a, b) => a.rank - b.rank);
  return (
    <div className="page">
      <PageHead
        title="SEZON ARŞİVİ"
        subtitle="Tamamlanan sezonların kalıcı sıralama kayıtları"
      />
      <div className="toolbar">
        <Field label="LİG">
          <Select
            value={id}
            onChange={(v) => {
              setId(Number(v));
              setSeason("");
            }}
            options={ids.map((id) => ({
              value: id,
              label: data.archive.find((a) => a.leagueId === id)?.league,
            }))}
          />
        </Field>
        <Field label="SEZON">
          <Select
            value={selected || ""}
            onChange={setSeason}
            options={seasons}
          />
        </Field>
      </div>
      <Panel
        title={`${data.archive.find((a) => a.leagueId === id)?.league || "ARŞİV"} • ${selected || ""}`}
      >
        <StandingsTable rows={rows} />
      </Panel>
      <Panel title="SEZON İSTATİSTİKLERİ">
        <StatsTable
          rows={data.statsArchive.filter(
            (a) => a.leagueId === id && a.season === selected,
          )}
        />
      </Panel>
      <BackBar to="leagues" />
    </div>
  );
}
