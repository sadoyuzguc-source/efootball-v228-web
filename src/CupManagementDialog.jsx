import React, { useState } from "react";
import { Trophy, ChevronRight, Trash2, CheckCircle2 } from "lucide-react";
import { useApp, Modal, Field, Select, Form, Badge, Empty } from "./ui";
import { played, fixtureParticipant } from "../shared/rules.mjs";
import CupCreationForm from "./CupCreationForm";
import styles from "./CupManagementDialog.module.css";

export default function CupManagementDialog({ onClose }) {
  const { data, can, act } = useApp();
  const [view, setView] = useState("create"),
    [id, setId] = useState(data.cups[0]?.id || 0),
    [notice, setNotice] = useState(""),
    [deleting, setDeleting] = useState(false),
    [busy, setBusy] = useState(false);
  const cup = data.cups.find((c) => c.id === id) || data.cups[0],
    league = data.leagues.find((l) => l.id === cup?.id),
    participants = data.participants.filter((p) => p.cupId === cup?.id),
    matches = data.matches.filter((m) => m.leagueId === cup?.id);
  async function advance() {
    setBusy(true);
    try {
      if (await act("cup.advance", { id: cup.id }))
        setNotice("Kupa aşaması güncellendi.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      if (await act("cup.delete", { id: cup.id })) {
        setId(data.cups.find((c) => c.id !== cup.id)?.id || 0);
        setDeleting(false);
        setNotice("Kupa silindi.");
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={view === "create" ? "KUPA OLUŞTUR VE KURA ÇEK" : "KUPA YÖNETİMİ"}
      onClose={onClose}
      wide
    >
      {!can("AYARLAR.KUPA") ? (
        <Empty>Kupa yönetimi için yetkiniz bulunmuyor.</Empty>
      ) : (
        <>
          <div className={`tabs ${styles.tabs}`}>
            <button
              type="button"
              className={view === "create" ? "active" : ""}
              onClick={() => {
                setView("create");
                setNotice("");
                setDeleting(false);
              }}
            >
              YENİ KUPA VE KURA
            </button>
            <button
              type="button"
              className={view === "manage" ? "active" : ""}
              onClick={() => setView("manage")}
            >
              KAYITLI KUPALAR ({data.cups.length})
            </button>
          </div>
          {notice && (
            <p className={styles.success} role="status">
              <CheckCircle2 size={17} />
              {notice}
            </p>
          )}
          {view === "create" ? (
            <CupCreationForm
              onCreated={(cupId) => {
                setId(cupId);
                setView("manage");
                setNotice(
                  "Kupa oluşturuldu ve kura çekildi. Katılımcılar ve eşleşmeler aşağıda.",
                );
              }}
            />
          ) : cup ? (
            <>
              <Field label="YÖNETİLECEK KUPA">
                <Select
                  value={cup.id}
                  onChange={(value) => {
                    setId(Number(value));
                    setNotice("");
                    setDeleting(false);
                  }}
                  options={data.cups.map((c) => ({
                    value: c.id,
                    label: `${data.leagues.find((l) => l.id === c.id)?.name} | ${c.season}`,
                  }))}
                />
              </Field>
              <div className={styles.summary}>
                <Trophy size={24} />
                <div>
                  <strong>{league?.name}</strong>
                  <small>
                    {cup.type} · {participants.length} katılımcı
                  </small>
                </div>
                <Badge positive={cup.stage === "TAMAMLANDI"}>{cup.stage}</Badge>
              </div>
              <Form
                key={cup.id}
                label="KUPA BİLGİLERİNİ KAYDET"
                onSubmit={async (f) => {
                  if (
                    await act("cup.save", {
                      id: cup.id,
                      ...Object.fromEntries(f),
                    })
                  )
                    setNotice("Kupa bilgileri kaydedildi.");
                }}
              >
                <div className="form-grid">
                  <Field label="KUPA ADI">
                    <input name="name" required defaultValue={league?.name} />
                  </Field>
                  <Field label="SEZON">
                    <input name="season" required defaultValue={cup.season} />
                  </Field>
                  <Field label="DURUM">
                    <select
                      name="status"
                      defaultValue={league?.status || "Aktif"}
                    >
                      <option>Aktif</option>
                      <option>Pasif</option>
                    </select>
                  </Field>
                </div>
              </Form>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busy || cup.stage === "TAMAMLANDI"}
                  onClick={advance}
                >
                  SONRAKİ TURU OLUŞTUR
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 size={15} />
                  KUPAYI SİL
                </button>
              </div>
              {deleting && (
                <section
                  className={styles.deleteConfirm}
                  aria-label="Kupa silme onayı"
                >
                  <p>
                    Bu kupa, katılımcıları ve maç sonuçları silinecek. Devam
                    edilsin mi?
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDeleting(false)}
                  >
                    VAZGEÇ
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={busy}
                    onClick={remove}
                  >
                    SİLMEYİ ONAYLA
                  </button>
                </section>
              )}
              <details className={styles.result} open>
                <summary>KURA KATILIMCILARI ({participants.length})</summary>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th className="left">TAKIM / OYUNCU</th>
                        <th>GRUP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p, index) => (
                        <tr key={p.id}>
                          <td>{index + 1}</td>
                          <td className="left">
                            <strong>{p.team}</strong>
                            <small className="cell-sub">{p.name}</small>
                          </td>
                          <td>{p.group || "KURA HAVUZU"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <details className={styles.result} open>
                <summary>FİKSTÜR VE EŞLEŞMELER ({matches.length})</summary>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>TUR / HAFTA</th>
                        <th className="left">EV SAHİBİ</th>
                        <th>SKOR</th>
                        <th className="left">DEPLASMAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((m) => (
                        <tr key={m.id}>
                          <td>{m.stage || m.week}</td>
                          <td className="left">
                            {fixtureParticipant(data, m, "home").team}
                          </td>
                          <td>
                            {played(m)
                              ? `${m.homeGoals} – ${m.awayGoals}`
                              : "—"}
                          </td>
                          <td className="left">
                            {m.away === "BAY"
                              ? "BAY"
                              : fixtureParticipant(data, m, "away").team}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <Empty>
              Henüz kupa oluşturulmadı. Yeni Kupa ve Kura sekmesinden
              başlayabilirsiniz.
            </Empty>
          )}
        </>
      )}
    </Modal>
  );
}
