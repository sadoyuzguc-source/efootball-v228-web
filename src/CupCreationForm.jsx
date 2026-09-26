import React, { useState } from "react";
import { useApp, Form, Field, Select } from "./ui";
import { UEFA_COMPETITIONS, played, standings } from "../shared/rules.mjs";

export default function CupCreationForm({ onCreated }) {
  const { data, act } = useApp();
  const [type, setType] = useState("direct"),
    [ids, setIds] = useState([]),
    [competition, setCompetition] = useState("champions"),
    [name, setName] = useState("");
  const qualification = UEFA_COMPETITIONS[competition];
  const changeCompetition = (value) => {
    if (!name || Object.values(UEFA_COMPETITIONS).some((c) => c.name === name))
      setName(UEFA_COMPETITIONS[value].name);
    setCompetition(value);
  };
  return (
    <Form
      label="KUPAYI OLUŞTUR VE KURA ÇEK"
      onSubmit={async (f) => {
        const result = await act("cup.create", {
          ...Object.fromEntries(f),
          type,
          competition: type === "group" ? competition : "league",
          leagueIds: ids,
        });
        if (result) onCreated(result.id);
      }}
    >
      <div className="form-grid">
        <Field label="KUPA ADI">
          <input
            name="name"
            required
            placeholder="Kupa adı"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="SEZON">
          <input name="season" required defaultValue="1.SEZON" />
        </Field>
      </div>
      <Field label="KUPA FORMATI">
        <Select
          value={type}
          onChange={(value) => {
            setType(value);
            setIds([]);
            if (value === "group" && !name) setName(qualification.name);
            if (
              value === "direct" &&
              Object.values(UEFA_COMPETITIONS).some((c) => c.name === name)
            )
              setName("");
          }}
          options={[
            { value: "direct", label: "LİG KUPASI - DOĞRUDAN ELEME" },
            { value: "group", label: "ULUSAL KUPA - GRUPLU + ELEME" },
          ]}
        />
      </Field>
      {type === "group" && (
        <>
          <Field label="ŞAMPİYONA">
            <Select
              value={competition}
              onChange={changeCompetition}
              options={Object.entries(UEFA_COMPETITIONS).map(([value, c]) => ({
                value,
                label: `${c.name} | ${c.start}–${c.end}. sıralar`,
              }))}
            />
          </Field>
          <div className="qualification-bands">
            {Object.entries(UEFA_COMPETITIONS).map(([key, c]) => (
              <div
                key={key}
                className={key === competition ? "selected" : ""}
                style={{ "--competition-accent": c.color }}
              >
                <strong>
                  {c.start}–{c.end}.
                </strong>
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
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
                          ? ids.filter((id) => id !== l.id)
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
          <div className="qualification-summary">
            <strong>{qualification.name}</strong>
            <span>
              Her kaynak ligden {qualification.start}–{qualification.end}.
              sıradaki 4 takım · 4 lig · 16 takım · 4 grup
            </span>
          </div>
          {ids.length > 0 && (
            <div className="qualification-preview">
              {ids.map((id) => {
                const league = data.leagues.find((l) => l.id === id),
                  matches = data.matches.filter((m) => m.leagueId === id),
                  eligible = standings(
                    data.players.filter((p) => p.leagueId === id),
                    matches,
                  ).slice(qualification.start - 1, qualification.end);
                return (
                  <section key={id}>
                    <h3>{league.name}</h3>
                    {!matches.length || matches.some((m) => !played(m)) ? (
                      <p className="error-message">
                        Kaynak ligin fikstürü tamamlanmalı.
                      </p>
                    ) : null}
                    <ol start={qualification.start}>
                      {eligible.map((row) => (
                        <li key={row.id}>
                          <strong>{row.team}</strong>{" "}
                          <small>{row.player}</small>
                        </li>
                      ))}
                    </ol>
                    {eligible.length < 4 && (
                      <p className="error-message">
                        Bu şampiyona için ligde en az {qualification.end} aktif
                        takım olmalı.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          )}
          <p className="note">
            Kontenjan şampiyonaya göre otomatik belirlenir. Her gruba her ligden
            bir takım yerleşir. Lig fikstürleri tamamlanmış olmalıdır.
            Gruplardan ilk iki takım çeyrek finale çıkar.
          </p>
        </>
      )}
    </Form>
  );
}
