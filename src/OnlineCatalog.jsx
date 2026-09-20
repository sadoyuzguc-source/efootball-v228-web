import React, { useState } from "react";
import {
  Search,
  Plus,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, useApp, Modal, Field, Empty, Photo, Badge } from "./ui";

export default function OnlineCatalog({ close, initialQuery = "" }) {
  const { act, data } = useApp();
  const [q, setQ] = useState(initialQuery),
    [searched, setSearched] = useState(""),
    [result, setResult] = useState(null),
    [selected, setSelected] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function search(start = 0, query = q) {
    if (query.trim().length < 2) {
      setError("Aramak için en az 2 karakter girin.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api(
        `/api/catalog/search?q=${encodeURIComponent(query)}&start=${start}`,
      );
      setResult(r);
      setSelected([]);
      setSearched(query);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const imported = new Set(data.catalog.map((c) => c.pesdataId));
  return (
    <Modal title="PESDB FUTBOLCU ARAMA" onClose={close} wide>
      <div className="online-catalog">
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Field label="PESDB / PESDATA ÜZERİNDE FUTBOLCU ARA">
            <input
              required
              minLength={2}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Örn. Messi, Ronaldo, Arda…"
            />
          </Field>
          <button disabled={busy} className="primary">
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Search size={17} />
            )}
            PESDB'DE ARA
          </button>
        </form>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {result ? (
          <>
            <p className="note">
              {result.count} sonuç · {result.start + 1}–
              {result.start + result.players.length} arası gösteriliyor
            </p>
            <div className="table-wrap online-results">
              <table>
                <thead>
                  <tr>
                    <th>SEÇ</th>
                    <th className="left">FUTBOLCU</th>
                    <th>POZİSYON</th>
                    <th>GEN</th>
                    <th>DURUM</th>
                  </tr>
                </thead>
                <tbody>
                  {result.players.map((p) => (
                    <tr key={p.pesdataId}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${p.name} kartı ${p.pesdataId}`}
                          disabled={imported.has(p.pesdataId)}
                          checked={selected.includes(p.pesdataId)}
                          onChange={() =>
                            setSelected((s) =>
                              s.includes(p.pesdataId)
                                ? s.filter((x) => x !== p.pesdataId)
                                : [...s, p.pesdataId],
                            )
                          }
                        />
                      </td>
                      <td className="left">
                        <div className="online-player">
                          <Photo src={p.image} />
                          <div>
                            <strong>{p.name}</strong>
                            <small className="cell-sub">{p.pesdataId}</small>
                          </div>
                        </div>
                      </td>
                      <td>{p.position}</td>
                      <td className="points">{p.rating}</td>
                      <td>
                        {imported.has(p.pesdataId) ? (
                          <Badge positive>Yerel listede</Badge>
                        ) : (
                          <a href={p.detail} target="_blank" rel="noreferrer">
                            Detay ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!result.players.length && <Empty>Sonuç bulunamadı.</Empty>}
            </div>
            <div className="pagination">
              <button
                type="button"
                disabled={busy || !result.start}
                onClick={() =>
                  search(Math.max(0, result.start - 100), searched)
                }
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {Math.floor(result.start / 100) + 1} /{" "}
                {Math.max(1, Math.ceil(result.count / 100))}
              </span>
              <button
                type="button"
                disabled={busy || result.start + 100 >= result.count}
                onClick={() => search(result.start + 100, searched)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <Empty>
            Çevrimiçi PESDATA kataloğunda futbolcu arayın, sonuçlardan kartları
            seçin ve yerel listenize ekleyin.
          </Empty>
        )}
        <div className="form-footer online-catalog-footer">
          <button type="button" onClick={close}>
            YEREL LİSTEYE DÖN
          </button>
          <button
            className="primary"
            disabled={!selected.length || busy}
            onClick={async () => {
              setBusy(true);
              try {
                if (await act("catalog.import", { ids: selected }))
                  setSelected([]);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Plus size={17} />
            {selected.length} KARTI YEREL LİSTEYE EKLE
          </button>
        </div>
      </div>
    </Modal>
  );
}
