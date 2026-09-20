import React, { useEffect, useState } from "react";
import {
  Shield,
  Trophy,
  Users as UsersIcon,
  CalendarDays,
  Goal,
  UserPlus,
  KeyRound,
  Activity,
  Plus,
  Pencil,
  Trash2,
  Archive as ArchiveIcon,
  Download,
  Upload,
  Lock,
  Search,
  Save,
} from "lucide-react";
import {
  useApp,
  api,
  PageHead,
  Panel,
  BackBar,
  Field,
  Select,
  LeagueSelect,
  Empty,
  Badge,
  Modal,
  Form,
  Confirm,
  trDate,
} from "./ui";
import { played, nextSaturday, normalize, UEFA_COMPETITIONS, standings } from "../shared/rules.mjs";
import { MatchTable } from "./pages";

export function SettingsPage() {
  const { data, can, navigate, notify } = useApp();
  const [restore, setRestore] = useState(null);
  const sections = [
    [
      "LİG VE KUPA YÖNETİMİ",
      "cyan",
      [
        ["manage-leagues", "LİG OLUŞTUR", Shield, "AYARLAR.LIG"],
        ["fixtures", "FİKSTÜR OLUŞTUR", CalendarDays, "AYARLAR.FIKSTUR"],
        ["cups", "KUPA OLUŞTUR", Trophy, "AYARLAR.KUPA"],
      ],
    ],
    [
      "OYUNCU VE HESAP YÖNETİMİ",
      "purple",
      [
        ["players", "OYUNCU KAYDET", UsersIcon, "AYARLAR.OYUNCU"],
        ["users", "KULLANICI OLUŞTUR", UserPlus, "AYARLAR.KULLANICI"],
        ["roles", "ROLLER VE YETKİLER", KeyRound, "ADMIN"],
      ],
    ],
    [
      "MAÇ VE SİSTEM YÖNETİMİ",
      "gold",
      [
        ["teams", "TAKIM VE MÜZE YÖNETİMİ", Trophy, "AYARLAR.TAKIM"],
        ["matches", "SKOR VE İSTATİSTİKLERİ GİR", Goal, "AYARLAR.SKOR"],
        ["logs", "SİSTEM HAREKETLERİ", Activity, "AYARLAR.HAREKETLER"],
      ],
    ],
  ];
  return (
    <div className="page">
      <PageHead
        title="AYARLAR"
        subtitle="Lig, kupa, oyuncu, kullanıcı, takım, maç ve sistem yönetimini tek merkezden yönetin."
      />
      <div className="settings-groups">
        {sections.map(([title, color, links]) => (
          <Panel
            key={title}
            title={title}
            className={`settings-group ${color}`}
          >
            {links.map(([route, label, Icon, permission]) => (
              <button
                key={route}
                className="settings-button"
                disabled={!can(permission)}
                onClick={() => navigate(route)}
              >
                <Icon size={25} />
                <span>{label}</span>
                {!can(permission) && <Lock size={16} />}
              </button>
            ))}
          </Panel>
        ))}
      </div>
      <Panel title="VERİ VE YEDEKLEME">
        <div className="backup-actions">
          {can("AYARLAR.LIG") && (
            <a className="button" href="/api/export">
              <Download size={17} />
              EXCEL'E AKTAR
            </a>
          )}
          {can("ADMIN") && (
            <>
              <a className="button" href="/api/backup">
                <Download size={17} />
                WEB YEDEĞİ İNDİR
              </a>
              <label className="button">
                <Upload size={17} />
                YEDEKTEN GERİ YÜKLE
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    try {
                      setRestore(JSON.parse(await f.text()));
                    } catch {
                      notify("Yedek dosyası okunamadı.", "error");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </>
          )}
        </div>
        <p className="note">
          Kaynak: {data.meta.source} · Aktarım: {trDate(data.meta.importedAt)} ·{" "}
          {data.meta.missingAssetCount} harici görsel kaynağı bulunamadı.
        </p>
        <p className="note">
          Kayıtlar bu projenin SQLite veritabanına otomatik kaydedilir. Web
          yedeği tüm verileri içerir; yüklenen görseller için public/uploads
          klasörünü de yedekleyin.
        </p>
      </Panel>
      <BackBar />
      {restore && (
        <Confirm
          title="YEDEKTEN GERİ YÜKLE"
          message="Mevcut web verileri seçtiğiniz yedekle değiştirilecek. Önceki durum otomatik olarak data klasörüne kaydedilecek. İşlemden sonra tekrar giriş yapmanız gerekir."
          onClose={() => setRestore(null)}
          onConfirm={async () => {
            try {
              await api("/api/restore", {
                method: "POST",
                body: JSON.stringify(restore),
              });
              location.reload();
            } catch (e) {
              notify(e.message, "error");
            }
          }}
        />
      )}
    </div>
  );
}

export function LeagueManager() {
  const { data, act } = useApp();
  const [edit, setEdit] = useState(null),
    [confirm, setConfirm] = useState(null);
  const leagues = data.leagues.filter((l) => l.type === "Lig");
  return (
    <div className="page">
      <PageHead
        title="LİG YÖNETİMİ"
        subtitle="Lig oluştur, sezonu yönet ve tamamlanan sezonu arşivle"
      >
        <button className="primary" onClick={() => setEdit({})}>
          <Plus size={17} />
          LİG OLUŞTUR
        </button>
      </PageHead>
      <Panel title="KAYITLI LİGLER">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th className="left">LİG ADI</th>
                <th>SEZON</th>
                <th>FORMAT</th>
                <th>OYUNCU</th>
                <th>DURUM</th>
                <th>İŞLEM</th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td className="left">
                    <strong>{l.name}</strong>
                  </td>
                  <td>{l.season}</td>
                  <td>{l.format}</td>
                  <td>
                    {
                      data.players.filter(
                        (p) => p.leagueId === l.id && p.active,
                      ).length
                    }
                  </td>
                  <td>
                    <Badge positive={l.status === "Aktif"}>{l.status}</Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        title="Ligi düzenle"
                        onClick={() => setEdit(l)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="small"
                        onClick={() =>
                          setConfirm({
                            op: "season.new",
                            id: l.id,
                            message: `${l.name}: ${l.season} arşivlenecek, maçlar ve istatistikler sıfırlanacak, sonraki sezon başlatılacak. Kadrolar ve takım müzesi korunur.`,
                          })
                        }
                      >
                        <ArchiveIcon size={15} />
                        YENİ SEZON
                      </button>
                      <button
                        className="icon-button danger-text"
                        title="Ligi sil"
                        onClick={() =>
                          setConfirm({
                            op: "league.delete",
                            id: l.id,
                            message: `${l.name} ve mevcut maçları silinecek. Oyuncular atanmamış duruma alınacak. Devam edilsin mi?`,
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!leagues.length && <Empty>Henüz lig oluşturulmamış.</Empty>}
        </div>
      </Panel>
      <BackBar to="settings" />
      {edit && (
        <Modal
          title={edit.id ? "LİGİ DÜZENLE" : "LİG OLUŞTUR"}
          onClose={() => setEdit(null)}
        >
          <Form
            onSubmit={async (f) => {
              if (
                await act("league.save", {
                  id: edit.id,
                  ...Object.fromEntries(f),
                })
              )
                setEdit(null);
            }}
          >
            <Field label="LİG ADI">
              <input
                name="name"
                required
                defaultValue={edit.name}
                placeholder="Örn. E-FOOTBALL RÜYA LİGİ"
              />
            </Field>
            <div className="form-grid">
              <Field label="SEZON">
                <input
                  name="season"
                  required
                  defaultValue={edit.season || "1.SEZON"}
                />
              </Field>
              <Field label="DURUM">
                <select name="status" defaultValue={edit.status || "Aktif"}>
                  <option>Aktif</option>
                  <option>Pasif</option>
                </select>
              </Field>
            </div>
            <Field label="LİG FORMATI">
              <select
                name="format"
                defaultValue={edit.format || "Çift Devre (deplasmanlı)"}
              >
                <option>Tek Devre</option>
                <option>Çift Devre (deplasmanlı)</option>
              </select>
            </Field>
          </Form>
        </Modal>
      )}
      {confirm && (
        <Confirm
          message={confirm.message}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (await act(confirm.op, { id: confirm.id })) setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

export function PlayerManager() {
  const { data, act } = useApp();
  const [edit, setEdit] = useState(null),
    [q, setQ] = useState(""),
    [remove, setRemove] = useState(null),
    [selected, setSelected] = useState([]),
    [target, setTarget] = useState("");
  const rows = data.players.filter((p) =>
    normalize(p.name + " " + p.team).includes(normalize(q)),
  );
  return (
    <div className="page">
      <PageHead
        title="OYUNCU YÖNETİMİ"
        subtitle="Oyuncu, takım adı, lig ataması ve aktiflik durumunu yönet"
      >
        <button className="primary" onClick={() => setEdit({})}>
          <Plus size={17} />
          OYUNCU KAYDET
        </button>
      </PageHead>
      <div className="toolbar">
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label="Oyuncu ara"
            placeholder="Oyuncu veya takım ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="transfer-bar">
        <span>SEÇİLİ OYUNCULARI LİGE TAŞI</span>
        <Select
          aria-label="Oyuncu hedef ligi"
          value={target}
          onChange={setTarget}
          placeholder="HEDEF LİG"
          options={data.leagues.filter((l) => l.type === "Lig")}
        />
        <button
          disabled={!selected.length || !target}
          onClick={async () => {
            if (
              await act("player.transfer", {
                ids: selected,
                leagueId: Number(target),
              })
            )
              setSelected([]);
          }}
        >
          {selected.length} OYUNCUYU TAŞI
        </button>
      </div>
      <Panel title="OYUNCULAR">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>SEÇ</th>
                <th className="left">OYUNCU</th>
                <th className="left">TAKIM</th>
                <th>LİG</th>
                <th>DURUM</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${p.name} taşımak için seç`}
                      checked={selected.includes(p.id)}
                      onChange={() =>
                        setSelected(
                          selected.includes(p.id)
                            ? selected.filter((id) => id !== p.id)
                            : [...selected, p.id],
                        )
                      }
                    />
                  </td>
                  <td className="left">
                    <strong>{p.name}</strong>
                  </td>
                  <td className="left">{p.team}</td>
                  <td>
                    {data.leagues.find((l) => l.id === p.leagueId)?.name ||
                      "Atanmamış"}
                  </td>
                  <td>
                    <Badge positive={p.active}>
                      {p.active ? "Aktif" : "Pasif"}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label={`${p.name} düzenle`}
                        className="icon-button"
                        onClick={() => setEdit(p)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        aria-label={`${p.name} sil`}
                        className="icon-button danger-text"
                        onClick={() => setRemove(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty>Oyuncu bulunamadı.</Empty>}
        </div>
      </Panel>
      <BackBar to="settings" />
      {edit && (
        <Modal
          title={edit.id ? "OYUNCUYU DÜZENLE" : "OYUNCU KAYDET"}
          onClose={() => setEdit(null)}
        >
          <Form
            onSubmit={async (f) => {
              if (
                await act("player.save", {
                  id: edit.id,
                  ...Object.fromEntries(f),
                  active: f.get("active") === "on",
                })
              )
                setEdit(null);
            }}
          >
            <Field label="OYUNCU ADI">
              <input name="name" required defaultValue={edit.name} />
            </Field>
            <Field label="TAKIM ADI">
              <input name="team" required defaultValue={edit.team} />
            </Field>
            <Field label="LİG">
              <select name="leagueId" defaultValue={edit.leagueId || 0}>
                <option value="0">Atanmamış oyuncu</option>
                {data.leagues
                  .filter((l) => l.type === "Lig")
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </Field>
            <label className="check-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={edit.active !== false}
              />
              Aktif oyuncu
            </label>
          </Form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="OYUNCUYU SİL"
          message={`${remove.name} ve takım kaydı silinsin mi?`}
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            if (await act("player.delete", { id: remove.id })) setRemove(null);
          }}
        />
      )}
    </div>
  );
}

export function Fixtures() {
  const { data, act, navigate } = useApp();
  const [id, setId] = useState(
      data.leagues.find((l) => l.type === "Lig" && l.status === "Aktif")?.id ||
        0,
    ),
    [start, setStart] = useState(nextSaturday()),
    [confirm, setConfirm] = useState(false);
  const matches = data.matches.filter((m) => m.leagueId === id),
    league = data.leagues.find((l) => l.id === id);
  return (
    <div className="page">
      <PageHead
        title="FİKSTÜR OLUŞTUR"
        subtitle="Aktif oyuncular için tek veya çift devre lig takvimi"
      />
      <div className="toolbar">
        <Field label="LİG">
          <LeagueSelect value={id} onChange={setId} cups={false} />
        </Field>
        <Field label="BAŞLANGIÇ TARİHİ">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <button
          className="primary"
          onClick={() => setConfirm(true)}
          disabled={!id}
        >
          <CalendarDays size={17} />
          FİKSTÜR OLUŞTUR
        </button>
      </div>
      <p className="note">
        {league?.format} ·{" "}
        {data.players.filter((p) => p.leagueId === id && p.active).length} aktif
        oyuncu · Haftalık maç takvimi. Tek sayıda oyuncu varsa her hafta bir
        oyuncu BAY geçer.
      </p>
      <Panel title="FİKSTÜR" aside={<Badge>{matches.length} MAÇ</Badge>}>
        <MatchTable matches={matches} />
      </Panel>
      <button onClick={() => navigate("matches")}>
        SKOR VE İSTATİSTİK GİR <Goal size={16} />
      </button>
      <BackBar to="settings" />
      {confirm && (
        <Confirm
          title="FİKSTÜR OLUŞTUR"
          message={`${league?.name} için yeni fikstür oluşturulsun mu? Oynanmamış mevcut fikstür yeniden düzenlenir. Oynanmış maç varsa işlem engellenir.`}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            if (await act("fixture.generate", { leagueId: id, start }))
              setConfirm(false);
          }}
        />
      )}
    </div>
  );
}

export function Matches() {
  const { data } = useApp();
  const [league, setLeague] = useState(0),
    [status, setStatus] = useState("all"),
    [edit, setEdit] = useState(null);
  const rows = data.matches.filter(
    (m) =>
      (!league || m.leagueId === league) &&
      (status === "all" || (status === "played" ? played(m) : !played(m))),
  );
  return (
    <div className="page">
      <PageHead
        title="MAÇ SONUCU GİR"
        subtitle="Skorları ve futbolcu olaylarını tek işlemde kaydet"
      />
      <div className="toolbar">
        <Field label="LİG / KUPA">
          <LeagueSelect all value={league} onChange={setLeague} />
        </Field>
        <Field label="DURUM">
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Tüm maçlar" },
              { value: "planned", label: "Planlanan" },
              { value: "played", label: "Oynanan" },
            ]}
          />
        </Field>
      </div>
      <Panel title="MAÇ LİSTESİ" aside={<Badge>{rows.length} MAÇ</Badge>}>
        <MatchTable
          matches={rows}
          action={(m) => (
            <button className="small" onClick={() => setEdit(m)}>
              <Pencil size={15} />
              {played(m) ? "GÖRÜNTÜLE" : "SONUÇ GİR"}
            </button>
          )}
        />
      </Panel>
      <BackBar to="settings" />
      {edit && <MatchEditor match={edit} close={() => setEdit(null)} />}
    </div>
  );
}
function MatchEditor({ match: m, close }) {
  const { data, act, notify } = useApp();
  const [squad, setSquad] = useState([]),
    [loading, setLoading] = useState(true),
    [events, setEvents] = useState([]),
    [type, setType] = useState("Gol"),
    [key, setKey] = useState(""),
    [assistKey, setAssist] = useState(""),
    [home, setHome] = useState(m.homeGoals ?? 0),
    [away, setAway] = useState(m.awayGoals ?? 0);
  const saved = data.events.filter((e) => e.matchId === m.id),
    locked = played(m) && (saved.length > 0 || m.away === "BAY"),
    footballer = squad.find((c) => c.key === key);
  useEffect(() => {
    let live = true;
    api(`/api/matches/${m.id}/squad`)
      .then((r) => {
        if (live) setSquad(r);
      })
      .catch((e) => notify(e.message, "error"))
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [m.id, notify]);
  const score = (list) => {
    setHome(list.filter((e) => e.type === "Gol" && e.side === "home").length);
    setAway(list.filter((e) => e.type === "Gol" && e.side === "away").length);
  };
  const add = () => {
    if (!footballer) return;
    const event = {
      type,
      key,
      assistKey: type === "Gol" ? assistKey : "",
      side: footballer.side,
      label: footballer.label,
      assist: squad.find((c) => c.key === assistKey)?.label || "",
    };
    const list = [...events, event];
    setEvents(list);
    if (type === "Gol") score(list);
    setAssist("");
  };
  return (
    <Modal title="MAÇ SONUCU VE OLAYLAR" onClose={close} wide>
      <div className="match-editor-title">
        <span>
          {data.leagues.find((l) => l.id === m.leagueId)?.name} ·{" "}
          {trDate(m.date)}
        </span>
        <h3>
          {m.home} <em>VS</em> {m.away}
        </h3>
      </div>
      <Form
        label="SONUCU VE OLAYLARI KAYDET"
        disabled={locked || loading}
        onSubmit={async () => {
          if (locked) return;
          if (
            await act("match.save", {
              id: m.id,
              homeGoals: Number(home),
              awayGoals: Number(away),
              events: events.map(({ type, key, assistKey }) => ({
                type,
                key,
                assistKey,
              })),
            })
          )
            close();
        }}
      >
        <fieldset disabled={locked || loading}>
          <div className="score-editor">
            <Field label="EV SAHİBİ">
              <input
                aria-label="Ev sahibi golü"
                type="number"
                min="0"
                required
                value={home}
                onChange={(e) => setHome(e.target.value)}
              />
            </Field>
            <span>:</span>
            <Field label="DEPLASMAN">
              <input
                aria-label="Deplasman golü"
                type="number"
                min="0"
                required
                value={away}
                onChange={(e) => setAway(e.target.value)}
              />
            </Field>
          </div>
          {!locked && (
            <>
              <div className="event-form">
                <Field label="OLAY TÜRÜ">
                  <Select
                    value={type}
                    onChange={(v) => {
                      setType(v);
                      setAssist("");
                    }}
                    options={["Gol", "Sarı Kart", "Kırmızı Kart"]}
                  />
                </Field>
                <Field label="FUTBOLCU">
                  <Select
                    value={key}
                    onChange={(v) => {
                      setKey(v);
                      setAssist("");
                    }}
                    options={squad.map((c) => ({
                      value: c.key,
                      label: c.label,
                    }))}
                    placeholder="Futbolcu seçin"
                  />
                </Field>
                <Field label="ASİST YAPAN">
                  <Select
                    disabled={type !== "Gol" || !key}
                    value={assistKey}
                    onChange={setAssist}
                    options={squad
                      .filter(
                        (c) => c.side === footballer?.side && c.key !== key,
                      )
                      .map((c) => ({ value: c.key, label: c.label }))}
                    placeholder="Asist yok"
                  />
                </Field>
                <button type="button" disabled={!key} onClick={add}>
                  <Plus size={16} />
                  EKLE
                </button>
              </div>
              {!loading && !squad.length && (
                <p className="note">
                  Kadro boş: PESDB kataloğundan futbolcu ekleyin. Yalnızca skor
                  kaydedebilirsiniz.
                </p>
              )}
            </>
          )}
          <table>
            <thead>
              <tr>
                <th>OLAY</th>
                <th className="left">FUTBOLCU</th>
                <th className="left">ASİST</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(locked ? saved : events).map((e, i) => (
                <tr key={e.id || i}>
                  <td>{e.type}</td>
                  <td className="left">{e.label || e.player}</td>
                  <td className="left">{e.assist || "—"}</td>
                  <td>
                    {!locked && (
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label="Olayı sil"
                        onClick={() => {
                          const list = events.filter((_, j) => i !== j);
                          setEvents(list);
                          if (e.type === "Gol") score(list);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
        {locked && (
          <p className="note">
            Bu maçın sonucu kaydedilmiş. VBA kuralı gereği olayların ikinci kez
            yazılması engellenir.
          </p>
        )}
      </Form>
    </Modal>
  );
}

export function CupCreate({ close, onCreated }) {
  const { data, act } = useApp();
  const [type, setType] = useState("direct"),
    [ids, setIds] = useState([]),
    [competition,setCompetition]=useState('champions'),
    [name,setName]=useState('');
  const qualification=UEFA_COMPETITIONS[competition];
  const changeCompetition=value=>{
    if(!name||Object.values(UEFA_COMPETITIONS).some(c=>c.name===name))setName(UEFA_COMPETITIONS[value].name);
    setCompetition(value);
  };
  return (
    <Modal title="KUPA OLUŞTUR VE KURA ÇEK" onClose={close} wide>
      <Form
        label="KUPAYI OLUŞTUR VE KURA ÇEK"
        onSubmit={async (f) => {
          const r = await act("cup.create", {
            ...Object.fromEntries(f),
            type,
            competition:type==='group'?competition:'league',
            leagueIds: ids,
          });
          if (r) {
            onCreated?.(r.id);
            close();
          }
        }}
      >
        <div className="form-grid">
          <Field label="KUPA ADI">
            <input name="name" required placeholder="Kupa adı" value={name} onChange={e=>setName(e.target.value)}/>
          </Field>
          <Field label="SEZON">
            <input name="season" required defaultValue="1.SEZON" />
          </Field>
        </div>
        <Field label="KUPA FORMATI">
          <Select
            value={type}
            onChange={(v) => {
              setType(v);
              setIds([]);
              if(v==='group'&&!name)setName(qualification.name);
              if(v==='direct'&&Object.values(UEFA_COMPETITIONS).some(c=>c.name===name))setName('');
            }}
            options={[
              { value: "direct", label: "LİG KUPASI - DOĞRUDAN ELEME" },
              { value: "group", label: "ULUSAL KUPA - GRUPLU + ELEME" },
            ]}
          />
        </Field>
        {type==='group'&&<>
          <Field label="ŞAMPİYONA"><Select value={competition} onChange={changeCompetition} options={Object.entries(UEFA_COMPETITIONS).map(([value,c])=>({value,label:`${c.name} | ${c.start}–${c.end}. sıralar`}))}/></Field>
          <div className="qualification-bands">{Object.entries(UEFA_COMPETITIONS).map(([key,c])=><div className={key===competition?'selected':''} key={key} style={{'--competition-accent':c.color}}><strong>{c.start}–{c.end}.</strong><span>{c.name}</span></div>)}</div>
        </>}
        <Field
          label={type === "direct" ? "KAYNAK LİG" : "KAYNAK LİGLER (TAM 4 LİG)"}
        >
          <div className="league-checks">
            {data.leagues
              .filter((l) => l.type === "Lig")
              .map((l) => (
                <label className="check-label" key={l.id}>
                  <input
                    type={type === "direct" ? "radio" : "checkbox"}
                    name="sourceLeague"
                    checked={ids.includes(l.id)}
                    onChange={() =>
                      setIds(
                        type === "direct"
                          ? [l.id]
                          : ids.includes(l.id)
                            ? ids.filter((i) => i !== l.id)
                            : [...ids, l.id],
                      )
                    }
                  />
                  <span>
                    {l.name}
                    <small>
                      {l.season} ·{" "}
                      {
                        data.players.filter(
                          (p) => p.leagueId === l.id && p.active,
                        ).length
                      }{" "}
                      aktif oyuncu
                    </small>
                  </span>
                </label>
              ))}
          </div>
        </Field>
        {type === "group" && (
          <>
            <div className="qualification-summary"><strong>{qualification.name}</strong><span>Her kaynak ligden {qualification.start}–{qualification.end}. sıradaki 4 takım · 4 lig · 16 takım · 4 grup</span></div>
            {ids.length>0&&<div className="qualification-preview">{ids.map(id=>{
              const league=data.leagues.find(l=>l.id===id);
              const matches=data.matches.filter(m=>m.leagueId===id);
              const eligible=standings(data.players.filter(p=>p.leagueId===id),matches).slice(qualification.start-1,qualification.end);
              return <section key={id}><h3>{league.name}</h3>{!matches.length||matches.some(m=>!played(m))?<p className="error-message">Kaynak ligin fikstürü tamamlanmalı.</p>:null}<ol start={qualification.start}>{eligible.map(row=><li key={row.id}><strong>{row.team}</strong> <small>{row.player}</small></li>)}</ol>{eligible.length<4&&<p className="error-message">Bu şampiyona için ligde en az {qualification.end} aktif takım olmalı.</p>}</section>;
            })}</div>}
            <p className="note">
              Kontenjan şampiyonaya göre otomatik belirlenir. Her gruba her ligden bir takım yerleşir. Lig fikstürleri tamamlanmış olmalıdır.
              Gruplardan ilk iki takım çeyrek finale çıkar.
            </p>
          </>
        )}
      </Form>
    </Modal>
  );
}

export function Users() {
  const { data, act } = useApp();
  const [edit, setEdit] = useState(null);
  return (
    <div className="page">
      <PageHead
        title="KULLANICI YÖNETİMİ"
        subtitle="Kullanıcı hesapları, geçici şifreler ve rol atamaları"
      >
        <button className="primary" onClick={() => setEdit({})}>
          <UserPlus size={17} />
          KULLANICI OLUŞTUR
        </button>
      </PageHead>
      <Panel title="KULLANICILAR">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th className="left">KULLANICI ADI</th>
                <th>ROL</th>
                <th>DURUM</th>
                <th>İLK GİRİŞ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td className="left">
                    <strong>{u.username}</strong>
                  </td>
                  <td>{u.role}</td>
                  <td>
                    <Badge positive={u.active}>
                      {u.active ? "Aktif" : "Pasif"}
                    </Badge>
                  </td>
                  <td>{u.firstLogin ? "Şifre belirleyecek" : "Tamamlandı"}</td>
                  <td>
                    <button className="small" onClick={() => setEdit(u)}>
                      <Pencil size={15} />
                      DÜZENLE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <BackBar to="settings" />
      {edit && (
        <Modal
          title={edit.id ? "KULLANICIYI DÜZENLE" : "KULLANICI OLUŞTUR"}
          onClose={() => setEdit(null)}
        >
          <Form
            onSubmit={async (f) => {
              if (
                await act("user.save", {
                  id: edit.id,
                  ...Object.fromEntries(f),
                  active: f.get("active") === "on",
                })
              )
                setEdit(null);
            }}
          >
            <Field label="KULLANICI ADI">
              <input
                name="username"
                required
                defaultValue={edit.username}
                autoComplete="off"
              />
            </Field>
            <Field
              label="GEÇİCİ ŞİFRE"
              hint={
                edit.id
                  ? "Değiştirmemek için boş bırakın."
                  : "İlk girişte kullanıcı kendi şifresini belirler."
              }
            >
              <input
                name="password"
                type="password"
                minLength={4}
                required={!edit.id}
                autoComplete="new-password"
              />
            </Field>
            <Field label="ROL">
              <select name="role" defaultValue={edit.role || ""} required>
                <option value="">Rol seçin</option>
                {data.roles.map((r) => (
                  <option key={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>
            <Field label="BAĞLI OYUNCU">
              <select name="playerId" defaultValue={edit.playerId || 0}>
                <option value="0">Bağlı oyuncu yok</option>
                {data.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="check-label">
              <input
                name="active"
                type="checkbox"
                defaultChecked={edit.active !== false}
              />
              Aktif kullanıcı
            </label>
          </Form>
        </Modal>
      )}
    </div>
  );
}

export function Roles() {
  const { data, act } = useApp();
  const [edit, setEdit] = useState(null),
    [codes, setCodes] = useState([]),
    [remove, setRemove] = useState(null);
  return (
    <div className="page">
      <PageHead
        title="ROLLER VE YETKİLER"
        subtitle="VBA yetki kodlarına göre ekran ve işlem erişimi"
      >
        <button
          className="primary"
          onClick={() => {
            setEdit({});
            setCodes([]);
          }}
        >
          <Plus size={17} />
          ROL EKLE
        </button>
      </PageHead>
      <div className="roles-grid">
        {data.roles.map((r) => (
          <Panel
            title={r.name}
            key={r.id}
            aside={r.system && <Badge>SİSTEM ROLÜ</Badge>}
          >
            <div className="role-body">
              <p>{r.description}</p>
              <div className="permission-tags">
                {data.permissions
                  .filter((p) => p.role === r.name)
                  .map((p) => (
                    <Badge key={p.id}>{p.code}</Badge>
                  ))}
              </div>
              <div className="row-actions">
                <button
                  onClick={() => {
                    setEdit(r);
                    setCodes(
                      data.permissions
                        .filter((p) => p.role === r.name)
                        .map((p) => p.code),
                    );
                  }}
                >
                  <Pencil size={15} />
                  DÜZENLE
                </button>
                <button
                  className="danger-text"
                  disabled={r.system}
                  onClick={() => setRemove(r)}
                >
                  <Trash2 size={15} />
                  SİL
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
      <BackBar to="settings" />
      {edit && (
        <Modal
          title={edit.id ? "ROLÜ DÜZENLE" : "ROL EKLE"}
          onClose={() => setEdit(null)}
          wide
        >
          <Form
            onSubmit={async (f) => {
              if (
                await act("role.save", {
                  id: edit.id,
                  ...Object.fromEntries(f),
                  permissions: codes,
                })
              )
                setEdit(null);
            }}
          >
            <div className="form-grid">
              <Field label="ROL ADI">
                <input
                  name="name"
                  defaultValue={edit.name}
                  required
                  minLength={2}
                />
              </Field>
              <Field label="AÇIKLAMA">
                <input name="description" defaultValue={edit.description} />
              </Field>
            </div>
            <div className="permissions-grid">
              {data.permissionCodes.map((c) => (
                <label className="check-label" key={c}>
                  <input
                    type="checkbox"
                    checked={codes.includes(c)}
                    onChange={() =>
                      setCodes(
                        codes.includes(c)
                          ? codes.filter((x) => x !== c)
                          : [...codes, c],
                      )
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
          </Form>
        </Modal>
      )}
      {remove && (
        <Confirm
          message={`${remove.name} rolü silinsin mi? Kullanıcıya atanmış roller silinemez.`}
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            if (await act("role.delete", { id: remove.id })) setRemove(null);
          }}
        />
      )}
    </div>
  );
}

export function Logs() {
  const { data } = useApp();
  const [q, setQ] = useState(""),
    [module, setModule] = useState(""),
    [page, setPage] = useState(0);
  const rows = data.logs
    .filter(
      (l) =>
        (!module || l.module === module) &&
        normalize(`${l.username} ${l.description} ${l.action}`).includes(
          normalize(q),
        ),
    )
    .slice()
    .reverse();
  const pages = Math.max(1, Math.ceil(rows.length / 50));
  return (
    <div className="page">
      <PageHead
        title="SİSTEM HAREKETLERİ"
        subtitle="Excel'den aktarılan ve web uygulamasında oluşan işlem geçmişi"
      />
      <div className="toolbar">
        <Field label="ARA">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Kullanıcı veya işlem…"
          />
        </Field>
        <Field label="MODÜL">
          <Select
            value={module}
            onChange={(v) => {
              setModule(v);
              setPage(0);
            }}
            options={[
              { value: "", label: "Tüm modüller" },
              ...[...new Set(data.logs.map((l) => l.module))].filter(Boolean),
            ]}
          />
        </Field>
      </div>
      <Panel
        title="HAREKET KAYITLARI"
        aside={<Badge>{rows.length} KAYIT</Badge>}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>TARİH / SAAT</th>
                <th>KULLANICI</th>
                <th>ROL</th>
                <th>İŞLEM</th>
                <th>MODÜL</th>
                <th className="left">AÇIKLAMA</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 50, (page + 1) * 50).map((l) => (
                <tr key={l.id}>
                  <td className="nowrap">
                    {l.date ? new Date(l.date).toLocaleString("tr-TR") : "—"}
                  </td>
                  <td>{l.username}</td>
                  <td>{l.role}</td>
                  <td>{l.action}</td>
                  <td>{l.module}</td>
                  <td className="left">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty>İşlem kaydı bulunamadı.</Empty>}
        </div>
        <div className="pagination">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            ÖNCEKİ
          </button>
          <span>
            {page + 1} / {pages}
          </span>
          <button
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
          >
            SONRAKİ
          </button>
        </div>
      </Panel>
      <BackBar to="settings" />
    </div>
  );
}
