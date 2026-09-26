import React, { useRef, useState } from "react";
import {
  Shield,
  Trophy,
  Users,
  CalendarDays,
  Goal,
  UserPlus,
  KeyRound,
  Activity,
  Download,
  Upload,
  Lock,
  ChevronRight,
  ShieldCheck,
  Database,
  FolderArchive,
  CheckCircle2,
} from "lucide-react";
import { useApp, api, BackBar, Confirm, trDate } from "./ui";
import styles from "./SettingsHub.module.css";
import TeamManagementDialog from "./TeamManagementDialog";
import CupManagementDialog from "./CupManagementDialog";

const sections = [
  {
    title: "LİG VE KUPA YÖNETİMİ",
    description: "Organizasyonlarını planla",
    accent: "#71d9ff",
    links: [
      [
        "manage-leagues",
        "LİG OLUŞTUR",
        "Lig bilgileri, format ve sezon yönetimi",
        Shield,
        "AYARLAR.LIG",
      ],
      [
        "fixtures",
        "FİKSTÜR OLUŞTUR",
        "Eşleşmeleri ve maç takvimini hazırla",
        CalendarDays,
        "AYARLAR.FIKSTUR",
      ],
      [
        "cup-management",
        "KUPA OLUŞTUR",
        "Kura, grup aşaması ve eleme sistemi",
        Trophy,
        "AYARLAR.KUPA",
      ],
    ],
  },
  {
    title: "OYUNCU VE HESAP YÖNETİMİ",
    description: "Ekibini ve erişimleri yönet",
    accent: "#bbabff",
    links: [
      [
        "players",
        "OYUNCU KAYDET",
        "Oyuncu bilgileri ve lig atamaları",
        Users,
        "AYARLAR.OYUNCU",
      ],
      [
        "users",
        "KULLANICI OLUŞTUR",
        "Hesaplar, roller ve yetkili lig seçimi",
        UserPlus,
        "AYARLAR.KULLANICI",
      ],
      [
        "roles",
        "ROLLER VE YETKİLER",
        "Görevlere göre erişim izinleri",
        KeyRound,
        "ADMIN",
      ],
    ],
  },
  {
    title: "MAÇ VE SİSTEM YÖNETİMİ",
    description: "Sonuçları ve kulüpleri takip et",
    accent: "#efc581",
    links: [
      [
        "team-management",
        "TAKIM VE MÜZE YÖNETİMİ",
        "Takım profili, logo ve şampiyonluklar",
        Trophy,
        "AYARLAR.TAKIM",
      ],
      [
        "matches",
        "SKOR VE İSTATİSTİKLERİ GİR",
        "Maç sonucu, gol, asist ve kartlar",
        Goal,
        "AYARLAR.SKOR",
      ],
      [
        "logs",
        "SİSTEM HAREKETLERİ",
        "İşlem geçmişi ve kayıt takibi",
        Activity,
        "AYARLAR.HAREKETLER",
      ],
    ],
  },
];

function ActionContent({ Icon, label, description, id, locked = false }) {
  return (
    <>
      <span className={styles.icon} aria-hidden="true">
        <Icon size={23} strokeWidth={1.65} />
      </span>
      <span className={styles.actionText}>
        <strong>{label}</strong>
        <small id={id}>{description}</small>
      </span>
      <span className={styles.trailing} aria-hidden="true">
        {locked ? <Lock size={14} /> : <ChevronRight size={17} />}
      </span>
    </>
  );
}

export default function SettingsHub() {
  const { data, can, navigate, notify, user, leagueScoped } = useApp();
  const [restore, setRestore] = useState(null),
    [teamManagement, setTeamManagement] = useState(false),
    [cupManagement, setCupManagement] = useState(false);
  const allowed = (route, permission) =>
    route === "team-management"
      ? can("AYARLAR.TAKIM") ||
        can("TAKIMLAR.DUZENLE") ||
        can("KATALOG.DUZENLE")
      : can(permission);
  const fileInput = useRef(null);
  const enabledCount = sections
    .flatMap((s) => s.links)
    .filter(([route, , , , permission]) => allowed(route, permission)).length;
  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>SİSTEM KONTROL MERKEZİ</span>
          <h1>AYARLAR</h1>
          <p>Ligini planla, ekibini yönet, oyunun her detayını kontrol et.</p>
        </div>
        <div className={styles.identity}>
          <ShieldCheck size={25} strokeWidth={1.7} />
          <div>
            <strong>{user.username}</strong>
            <small>{user.role}</small>
          </div>
        </div>
      </header>
      {leagueScoped && (
        <p className="league-access-note">
          Yetkili lig:{" "}
          <strong>
            {data.leagues.find((l) => l.id === user.managedLeagueId)?.name ||
              "Lig atanmamış"}
          </strong>
          . Yönetim işlemleri bu ligle sınırlıdır.
        </p>
      )}
      <div className={styles.sectionIntro}>
        <span>YÖNETİM MODÜLLERİ</span>
        <span>
          <i />
          {enabledCount} modüle erişiminiz var
        </span>
      </div>
      <div className={styles.groups}>
        {sections.map((section, index) => (
          <section
            className={styles.group}
            key={section.title}
            style={{ "--action-accent": section.accent }}
          >
            <div className={styles.groupHeading}>
              <span className={styles.number}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
            </div>
            <div className={styles.tools}>
              {section.links.map(
                ([route, label, description, Icon, permission]) => {
                  const locked = !allowed(route, permission);
                  return (
                    <button
                      key={route}
                      className={styles.action}
                      data-settings-action={route}
                      aria-label={label}
                      aria-describedby={`settings-description-${route}`}
                      disabled={locked}
                      onClick={() =>
                        route === "team-management"
                          ? setTeamManagement(true)
                          : route === "cup-management"
                            ? setCupManagement(true)
                            : navigate(route)
                      }
                    >
                      <ActionContent
                        Icon={Icon}
                        label={label}
                        description={
                          locked
                            ? "Bu işlem için yetkiniz bulunmuyor"
                            : description
                        }
                        id={`settings-description-${route}`}
                        locked={locked}
                      />
                    </button>
                  );
                },
              )}
            </div>
          </section>
        ))}
      </div>
      <section className={styles.backup}>
        <div className={styles.backupHeading}>
          <div>
            <Database size={22} strokeWidth={1.7} />
            <div>
              <h2>VERİ VE YEDEKLEME</h2>
              <p>Verilerini dışa aktar, yedekle ve geri yükle.</p>
            </div>
          </div>
          <span className={styles.saved}>
            <CheckCircle2 size={14} />
            OTOMATİK KAYIT
          </span>
        </div>
        <div className={styles.backupActions}>
          {can("AYARLAR.LIG") && (
            <a
              className={styles.action}
              href="/api/export"
              aria-label="EXCEL'E AKTAR"
            >
              <ActionContent
                Icon={Download}
                label="EXCEL'E AKTAR"
                description="Güncel tabloları .xlsx olarak indir"
              />
            </a>
          )}
          {can("ADMIN") && (
            <>
              <a
                className={styles.action}
                href="/api/backup"
                aria-label="WEB YEDEĞİ İNDİR"
              >
                <ActionContent
                  Icon={FolderArchive}
                  label="WEB YEDEĞİ İNDİR"
                  description="Tüm uygulama verilerini yedekle"
                />
              </a>
              <button
                className={styles.action}
                onClick={() => fileInput.current?.click()}
                aria-label="YEDEKTEN GERİ YÜKLE"
              >
                <ActionContent
                  Icon={Upload}
                  label="YEDEKTEN GERİ YÜKLE"
                  description="Kaydettiğin web yedeğini yükle"
                />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    setRestore(JSON.parse(await file.text()));
                  } catch {
                    notify("Yedek dosyası okunamadı.", "error");
                  }
                  e.target.value = "";
                }}
              />
            </>
          )}
        </div>
        <details className={styles.source}>
          <summary>Kaynak ve yedekleme bilgileri</summary>
          <p>
            Kaynak: {data.meta.source} · Aktarım: {trDate(data.meta.importedAt)}{" "}
            · {data.meta.missingAssetCount} harici görsel kaynağı bulunamadı.
          </p>
          <p>
            Kayıtlar veritabanına otomatik kaydedilir. Web yedeği tüm verileri
            içerir; yüklenen görseller için public/uploads klasörünü de
            yedekleyin.
          </p>
        </details>
      </section>
      <BackBar />
      {teamManagement && (
        <TeamManagementDialog
          includeInactive
          onClose={() => setTeamManagement(false)}
        />
      )}
      {cupManagement && (
        <CupManagementDialog onClose={() => setCupManagement(false)} />
      )}
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
