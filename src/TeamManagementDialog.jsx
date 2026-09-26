import React, { useState } from "react";
import {
  Shield,
  ArrowRightLeft,
  Trash2,
  Plus,
  CheckCircle2,
} from "lucide-react";
import {
  useApp,
  Modal,
  Field,
  Select,
  LeagueSelect,
  Form,
  ImageInput,
  Photo,
  Empty,
} from "./ui";
import { normalize, isActiveOrganization } from "../shared/rules.mjs";
import TeamMuseum from "./TeamMuseum";
import styles from "./TeamManagementDialog.module.css";

const trophyFields = [
  ["league", "LİG ŞAMPİYONLUĞU"],
  ["cup", "LİG KUPASI"],
  ["champions", "UEFA ŞAMPİYONLAR LİGİ"],
  ["europa", "UEFA AVRUPA LİGİ"],
  ["conference", "UEFA KONFERANS LİGİ"],
];

function MuseumEditor({ team }) {
  const { data, act } = useApp();
  const museum = data.museum.find(
    (m) => m.team === team.name && m.leagueId === team.leagueId,
  );
  const [logo, setLogo] = useState(team.logo || ""),
    [counts, setCounts] = useState(
      Object.fromEntries(
        trophyFields.map(([key]) => [key, museum?.[key] || 0]),
      ),
    ),
    [saved, setSaved] = useState(false);
  return (
    <Form
      label="TAKIM VE MÜZEYİ KAYDET"
      onSubmit={async (f) => {
        if (
          await act("team.save", {
            id: team.id,
            logo,
            ...Object.fromEntries(f),
          })
        )
          setSaved(true);
      }}
    >
      <div className={styles.editor}>
        <div>
          <div className={styles.profileFields}>
            <Field label="TAKIM LOGOSU">
              <ImageInput
                value={logo}
                onChange={(value) => {
                  setLogo(value);
                  setSaved(false);
                }}
              />
            </Field>
            <Field label="BÜTÇE">
              <input
                name="budget"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={team.budget ?? 0}
                onChange={() => setSaved(false)}
              />
            </Field>
          </div>
          <h3 className={styles.subheading}>ŞAMPİYONLUK SAYILARI</h3>
          <div className={styles.counts}>
            {trophyFields.map(([key, label]) => (
              <Field label={label} key={key}>
                <input
                  name={key}
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={counts[key]}
                  onChange={(e) => {
                    setCounts({ ...counts, [key]: e.target.value });
                    setSaved(false);
                  }}
                />
              </Field>
            ))}
          </div>
        </div>
        <div className={styles.preview}>
          <span className={styles.previewLabel}>MÜZE ÖNİZLEMESİ</span>
          <TeamMuseum
            compact
            museum={Object.fromEntries(
              trophyFields.map(([key]) => [key, Number(counts[key]) || 0]),
            )}
          />
        </div>
      </div>
      {saved && (
        <p className={styles.success} role="status">
          <CheckCircle2 size={17} />
          Takım ve müze bilgileri kaydedildi.
        </p>
      )}
    </Form>
  );
}

function SquadEditor({ team, includeInactive }) {
  const { data, act, canManageLeague } = useApp();
  const [q, setQ] = useState(""),
    [cardId, setCardId] = useState(""),
    [transfer, setTransfer] = useState(null),
    [removing, setRemoving] = useState(null);
  const squad = data.squads.filter(
    (k) => k.leagueId === team.leagueId && k.team === team.name,
  );
  const targets = data.teams.filter(
    (t) =>
      t.id !== team.id &&
      canManageLeague(t.leagueId) &&
      (includeInactive ||
        isActiveOrganization(data.leagues.find((l) => l.id === t.leagueId))),
  );
  const cards = data.catalog
    .filter((c) => normalize(c.name).includes(normalize(q)))
    .slice(0, 100);
  return (
    <>
      <Form
        label="KADROYA EKLE"
        onSubmit={async () => {
          if (
            await act("squad.add", { teamId: team.id, ids: [Number(cardId)] })
          )
            setCardId("");
        }}
      >
        <div className={styles.addPlayer}>
          <Field label="KATALOGDA FUTBOLCU ARA">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCardId("");
              }}
              placeholder="Futbolcu adı…"
            />
          </Field>
          <Field label="KADROYA EKLENECEK KART">
            <Select
              required
              value={cardId}
              onChange={setCardId}
              placeholder="Futbolcu seçin"
              options={cards.map((c) => ({
                value: c.id,
                label: `${c.name} · ${c.position} · GEN ${c.rating} · #${c.id}`,
              }))}
            />
          </Field>
        </div>
      </Form>
      <div className={styles.roster}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="left">FUTBOLCU</th>
                <th>POZİSYON</th>
                <th>GEN</th>
                <th>İŞLEM</th>
              </tr>
            </thead>
            <tbody>
              {squad.map((k) => {
                const card = data.catalog.find((c) => c.id === k.catalogId);
                return (
                  <tr key={k.id}>
                    <td className="left">
                      {card?.name || `Katalog #${k.catalogId}`}
                    </td>
                    <td>{card?.position || "—"}</td>
                    <td>{card?.rating ?? "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="small"
                          onClick={() => setTransfer(k)}
                          disabled={!targets.length}
                        >
                          <ArrowRightLeft size={14} />
                          TRANSFER
                        </button>
                        <button
                          type="button"
                          className="icon-button danger-text"
                          aria-label={`${card?.name || k.catalogId} kadrodan çıkar`}
                          disabled={removing !== null}
                          onClick={async () => {
                            setRemoving(k.id);
                            try {
                              if (await act("squad.delete", { id: k.id })) {
                                if (transfer?.id === k.id) setTransfer(null);
                              }
                            } finally {
                              setRemoving(null);
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!squad.length && <Empty>Bu takımın kadrosu boş.</Empty>}
      </div>
      {transfer && (
        <section className={styles.transfer}>
          <h3>FUTBOLCU TRANSFERİ</h3>
          <p>
            {data.catalog.find((c) => c.id === transfer.catalogId)?.name} ·{" "}
            {team.name}
          </p>
          <Form
            label="TRANSFERİ TAMAMLA"
            onSubmit={async (f) => {
              if (
                await act("squad.transfer", {
                  id: transfer.id,
                  teamId: Number(f.get("targetTeamId")),
                })
              )
                setTransfer(null);
            }}
          >
            <Field label="HEDEF TAKIM">
              <select name="targetTeamId" required defaultValue="">
                <option value="">Hedef takım seçin</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ·{" "}
                    {data.leagues.find((l) => l.id === t.leagueId)?.name ||
                      "Atanmamış"}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="button"
              className="text-button"
              onClick={() => setTransfer(null)}
            >
              VAZGEÇ
            </button>
          </Form>
        </section>
      )}
    </>
  );
}

export default function TeamManagementDialog({
  onClose,
  initialTeamId,
  initialTab = "museum",
  includeInactive = false,
}) {
  const { data, can, canManageLeague, user, leagueScoped } = useApp();
  const canMuseum = can("AYARLAR.TAKIM") || can("TAKIMLAR.DUZENLE"),
    canSquad = can("KATALOG.DUZENLE");
  const allowed = data.teams.filter(
    (t) =>
      canManageLeague(t.leagueId) &&
      (includeInactive ||
        isActiveOrganization(data.leagues.find((l) => l.id === t.leagueId))),
  );
  const firstTeam =
    allowed.find((t) => t.id === Number(initialTeamId)) ||
    allowed.find(
      (t) => data.leagues.find((l) => l.id === t.leagueId)?.status === "Aktif",
    ) ||
    allowed[0];
  const [league, setLeague] = useState(
      leagueScoped ? user.managedLeagueId : firstTeam?.leagueId || 0,
    ),
    [teamId, setTeamId] = useState(firstTeam?.id || ""),
    [tab, setTab] = useState(canMuseum ? initialTab : "squad");
  const teams = allowed.filter((t) => !league || t.leagueId === league),
    team = teams.find((t) => t.id === Number(teamId)) || teams[0];
  return (
    <Modal title="TAKIM VE MÜZE YÖNETİMİ" wide onClose={onClose}>
      {!canMuseum && !canSquad ? (
        <Empty>Bu işlemi yapmak için yetkiniz bulunmuyor.</Empty>
      ) : (
        <>
          <div className={styles.selectors}>
            <Field label="LİG">
              <LeagueSelect
                all
                management
                active={!includeInactive}
                cups={false}
                value={league}
                onChange={(value) => {
                  setLeague(value);
                  setTeamId("");
                }}
              />
            </Field>
            <Field label="TAKIM">
              <Select
                value={team?.id || ""}
                onChange={setTeamId}
                options={teams}
              />
            </Field>
          </div>
          {team ? (
            <>
              <div className={styles.team}>
                <Photo src={team.logo} fallback={<Shield size={25} />} />
                <div>
                  <strong>{team.name}</strong>
                  <small>Menajer: {team.manager || "—"}</small>
                </div>
              </div>
              <div className={`tabs ${styles.tabs}`}>
                {canMuseum && (
                  <button
                    type="button"
                    className={tab === "museum" ? "active" : ""}
                    onClick={() => setTab("museum")}
                  >
                    TAKIM VE MÜZE
                  </button>
                )}
                {canSquad && (
                  <button
                    type="button"
                    className={tab === "squad" ? "active" : ""}
                    onClick={() => setTab("squad")}
                  >
                    KADRO VE TRANSFER
                  </button>
                )}
              </div>
              {tab === "museum" && canMuseum ? (
                <MuseumEditor key={team.id} team={team} />
              ) : canSquad ? (
                <SquadEditor
                  key={team.id}
                  team={team}
                  includeInactive={includeInactive}
                />
              ) : null}
            </>
          ) : (
            <Empty>Yönetebileceğiniz takım bulunmuyor.</Empty>
          )}
        </>
      )}
    </Modal>
  );
}
