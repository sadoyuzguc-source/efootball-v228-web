import React from "react";
import leagueTrophy from "./assets/trophies/league.svg";
import cupTrophy from "./assets/trophies/cup.svg";
import championsTrophy from "./assets/trophies/champions.svg";
import europaTrophy from "./assets/trophies/europa.svg";
import conferenceTrophy from "./assets/trophies/conference.svg";
import styles from "./TeamMuseum.module.css";

const trophies = [
  {
    key: "league",
    label: "LİG ŞAMPİYONLUĞU",
    image: leagueTrophy,
    accent: "#f4ce82",
  },
  { key: "cup", label: "LİG KUPASI", image: cupTrophy, accent: "#a9dcf5" },
  {
    key: "champions",
    label: "UEFA ŞAMPİYONLAR LİGİ",
    image: championsTrophy,
    accent: "#99bbff",
  },
  {
    key: "europa",
    label: "UEFA AVRUPA LİGİ",
    image: europaTrophy,
    accent: "#ffb675",
  },
  {
    key: "conference",
    label: "UEFA KONFERANS LİGİ",
    image: conferenceTrophy,
    accent: "#7fe7b3",
  },
];

export default function TeamMuseum({ museum, compact = false }) {
  return (
    <section
      className={`${styles.museum} ${compact ? styles.compact : ""}`}
      aria-label="Takım müzesi"
      data-testid="team-museum"
    >
      <h2 className={styles.heading}>
        <span aria-hidden="true" />
        TAKIM MÜZESİ
        <span aria-hidden="true" />
      </h2>
      <div className={styles.cabinet}>
        {trophies.map((trophy, index) => {
          const count = museum?.[trophy.key] || 0;
          return (
            <article
              key={trophy.key}
              className={`${styles.display} ${index < 2 ? styles.major : ""} ${count ? styles.awarded : ""}`}
              style={{ "--trophy-accent": trophy.accent }}
              data-trophy={trophy.key}
              aria-label={`${trophy.label}: ${count} şampiyonluk`}
            >
              <h3 className={styles.title}>{trophy.label}</h3>
              <div className={styles.stage}>
                <img
                  src={trophy.image}
                  alt={`${trophy.label} kupası`}
                  width={100}
                  height={118}
                />
              </div>
              <div className={styles.total}>
                <strong>{count}</strong>
                <small>ŞAMPİYONLUK</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
