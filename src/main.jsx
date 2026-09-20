import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Medal,
  Trophy,
  ShieldHalf,
  SlidersHorizontal,
  ScanSearch,
  Newspaper,
  RadioTower,
  ChevronRight,
  LogOut,
  Menu,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { AppContext, api, Modal, Form, Field } from "./ui";
import { permitted } from "../shared/rules.mjs";
import {
  Dashboard,
  Leagues,
  Cups,
  Teams,
  Catalog,
  News,
  Streams,
  Archive,
} from "./pages";
import {
  SettingsPage,
  LeagueManager,
  PlayerManager,
  Fixtures,
  Matches,
  Users,
  Roles,
  Logs,
} from "./management";
import "./style.css";

function Login({ onLogin, imported }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-screen">
      <div className="login-brand">
        <img src="/logo.svg" alt="" />
        <span>
          E-FOOTBALL<small>ÇOKLU LİG MERKEZİ</small>
        </span>
      </div>
      <div className="login-card">
        <span className="eyebrow">LİGİNE HOŞ GELDİN</span>
        <h1>Oyun burada başlar.</h1>
        <p>Ligini, takımını ve sezonun her anını yönet.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const d = await api("/api/login", {
                method: "POST",
                body: JSON.stringify({
                  username: f.get("username"),
                  password: f.get("password"),
                }),
              });
              onLogin(d.user);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="KULLANICI ADI">
            <input
              name="username"
              autoComplete="username"
              required
              autoFocus
              placeholder="Excel kullanıcı adınız"
            />
          </Field>
          <Field label="ŞİFRE">
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Şifrenizi girin"
            />
          </Field>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button className="primary login-submit" disabled={busy || !imported}>
            {busy ? <LoaderCircle className="spin" size={18} /> : null}GİRİŞ YAP
            →
          </button>
        </form>
        <small>
          {imported
            ? "Excel dosyanızdaki kullanıcı adı ve şifrenizle giriş yapabilirsiniz."
            : "Önce terminalde npm run import komutunu çalıştırın."}
        </small>
      </div>
      <footer>
        eFootball Lig Yönetim Sistemi <b>v228 • WEB</b>
      </footer>
    </div>
  );
}
function PasswordDialog({ close }) {
  const { act } = React.useContext(AppContext);
  return (
    <Modal title="ŞİFRENİ BELİRLE" onClose={close}>
      <p>Hesabınız için kişisel şifrenizi girin.</p>
      <Form
        onSubmit={async (f) => {
          if (f.get("password") !== f.get("confirm")) return;
          const ok = await act("password", {
            current: f.get("current"),
            password: f.get("password"),
          });
          if (ok) close();
        }}
      >
        <div className="form-grid">
          <Field label="MEVCUT / GEÇİCİ ŞİFRE">
            <input
              type="password"
              name="current"
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="YENİ ŞİFRE">
            <input
              type="password"
              name="password"
              required
              minLength={4}
              autoComplete="new-password"
            />
          </Field>
          <Field label="YENİ ŞİFRE TEKRAR">
            <input
              type="password"
              name="confirm"
              required
              minLength={4}
              autoComplete="new-password"
              onInput={(e) => {
                const p = e.target.form.elements.password.value;
                e.target.setCustomValidity(
                  e.target.value === p ? "" : "Şifreler eşleşmiyor.",
                );
              }}
            />
          </Field>
        </div>
      </Form>
    </Modal>
  );
}
const menus = [
  ["home", "ANA MENÜ", LayoutDashboard, null, "#63ddff"],
  ["leagues", "LİGLER", Medal, null, "#83acff"],
  ["cups", "KUPALAR", Trophy, null, "#ffd178"],
  ["teams", "TAKIMLAR", ShieldHalf, null, "#67e4ca"],
  ["settings", "AYARLAR", SlidersHorizontal, "AYARLAR", "#b7a0ff"],
  ["catalog", "PESDB KATALOĞU", ScanSearch, "KATALOG.GORUNTULE", "#78d5ff"],
  ["news", "HABERLER", Newspaper, "HABERLER.GORUNTULE", "#ffbb93"],
  ["streams", "CANLI YAYIN", RadioTower, null, "#ff8caa"],
];
const routes = {
  home: Dashboard,
  leagues: Leagues,
  cups: Cups,
  teams: Teams,
  settings: SettingsPage,
  catalog: Catalog,
  news: News,
  streams: Streams,
  archive: Archive,
  "manage-leagues": LeagueManager,
  players: PlayerManager,
  fixtures: Fixtures,
  matches: Matches,
  users: Users,
  roles: Roles,
  logs: Logs,
};
const routePermission = {
  settings: "AYARLAR",
  catalog: "KATALOG.GORUNTULE",
  news: "HABERLER.GORUNTULE",
  "manage-leagues": "AYARLAR.LIG",
  players: "AYARLAR.OYUNCU",
  fixtures: "AYARLAR.FIKSTUR",
  matches: "AYARLAR.SKOR",
  users: "AYARLAR.KULLANICI",
  roles: "ADMIN",
  logs: "AYARLAR.HAREKETLER",
};
function App() {
  const [user, setUser] = useState(null),
    [data, setData] = useState(null),
    [ready, setReady] = useState(false),
    [imported, setImported] = useState(true),
    [route, setRoute] = useState(location.hash.slice(1) || "home"),
    [toasts, setToasts] = useState([]),
    [password, setPassword] = useState(false),
    [mobile, setMobile] = useState(false),
    [initialError, setInitialError] = useState("");
  const notify = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const d = await api("/api/bootstrap");
      setData(d);
      setUser(d.user);
      return d;
    } catch (e) {
      notify(e.message, "error");
      return null;
    }
  }, [notify]);
  useEffect(() => {
    api("/api/session")
      .then(async (d) => {
        setImported(d.imported);
        setUser(d.user);
        if (d.user) await refresh();
      })
      .catch((e) => setInitialError(e.message))
      .finally(() => setReady(true));
  }, [refresh]);
  useEffect(() => {
    const f = () => {
      setRoute(location.hash.slice(1) || "home");
      setMobile(false);
      document.querySelector("main")?.scrollTo(0, 0);
    };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  const navigate = (page) => {
    location.hash = page;
    setRoute(page);
    setMobile(false);
  };
  const act = async (op, payload) => {
    try {
      const result = await api("/api/action", {
        method: "POST",
        body: JSON.stringify({ op, payload, revision: data.revision }),
      });
      await refresh();
      notify(result.message);
      return result;
    } catch (e) {
      notify(e.message, "error");
      if (e.message.includes("Yenileyip")) await refresh();
      return false;
    }
  };
  const can = (code) =>
    code === "ADMIN" ? user?.role === "Admin" : permitted(user, code);
  if (!ready)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" />
        <p>Lig merkezi yükleniyor…</p>
      </div>
    );
  if (initialError)
    return (
      <div className="loading-screen">
        <AlertCircle />
        <h2>Sunucuya ulaşılamadı</h2>
        <p>{initialError}</p>
        <button onClick={() => location.reload()}>TEKRAR DENE</button>
      </div>
    );
  if (!user)
    return (
      <Login
        imported={imported}
        onLogin={async (u) => {
          setUser(u);
          await refresh();
          navigate("home");
        }}
      />
    );
  if (!data)
    return (
      <div className="loading-screen">
        <p>Veriler yüklenemedi.</p>
        <button onClick={refresh}>TEKRAR DENE</button>
      </div>
    );
  const Page = routes[route] || Dashboard,
    allowed = !routePermission[route] || can(routePermission[route]);
  return (
    <AppContext.Provider
      value={{ data, user, can, act, refresh, navigate, notify, toasts }}
    >
      <div className="app-shell">
        <button
          className="mobile-toggle icon-button"
          aria-label="Menüyü aç"
          onClick={() => setMobile(!mobile)}
        >
          <Menu />
        </button>
        <aside className={`sidebar ${mobile ? "open" : ""}`}>
          <a className="brand" href="#home">
            <img src="/logo.svg" alt="" />
            <div>
              E-FOOTBALL<small>ÇOKLU LİG MERKEZİ</small>
            </div>
          </a>
          <span className="version">
            LİG YÖNETİM SİSTEMİ <b>v228</b>
          </span>
          <nav className="sidebar-nav" aria-label="Ana gezinme">
            {[menus.slice(0, 4), menus.slice(4)].map((group, groupIndex) => (
              <div
                className={`nav-group ${groupIndex ? "nav-group-bottom" : "nav-group-top"}`}
                key={groupIndex}
              >
                {groupIndex === 1 && (
                  <div className="nav-section-label">
                    <span />
                    YÖNETİM & TAKİP
                    <span />
                  </div>
                )}
                {group.map(([key, label, Icon, permission, accent]) => (
                  <React.Fragment key={key}>
                    <button
                      className={`nav-button ${route === key ? "active" : ""}`}
                      style={{ "--nav-accent": accent }}
                      aria-current={route === key ? "page" : undefined}
                      disabled={permission && !can(permission)}
                      onClick={() => navigate(key)}
                    >
                      <span className="nav-icon" aria-hidden="true">
                        <Icon size={21} strokeWidth={1.7} />
                      </span>
                      <span className="nav-label">{label}</span>
                      <ChevronRight
                        className="nav-chevron"
                        size={13}
                        aria-hidden="true"
                      />
                    </button>
                  </React.Fragment>
                ))}
              </div>
            ))}
          </nav>
          <div className="session-card">
            <span className="avatar">
              {user.username.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{user.username}</strong>
              <small>{user.role}</small>
            </div>
            <button
              className="icon-button"
              title="Şifre değiştir"
              aria-label="Şifre değiştir"
              onClick={() => setPassword(true)}
            >
              <KeyRound size={16} />
            </button>
          </div>
          <button
            className="danger logout"
            onClick={async () => {
              try {
                await api("/api/logout", { method: "POST" });
                setUser(null);
                setData(null);
              } catch (e) {
                notify(e.message, "error");
              }
            }}
          >
            <span className="logout-icon" aria-hidden="true">
              <LogOut size={19} strokeWidth={1.8} />
            </span>
            <span>ÇIKIŞ</span>
          </button>
        </aside>
        <main>
          {allowed ? (
            <Page key={route} />
          ) : (
            <div className="access-denied">
              <AlertCircle />
              <h1>Bu ekran için yetkiniz bulunmuyor.</h1>
              <button onClick={() => navigate("home")}>ANA MENÜYE DÖN</button>
            </div>
          )}
        </main>
      </div>
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            role={t.type === "error" ? "alert" : "status"}
          >
            {t.type === "error" ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      {(password || user.firstLogin) && (
        <PasswordDialog close={() => setPassword(false)} />
      )}
    </AppContext.Provider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
