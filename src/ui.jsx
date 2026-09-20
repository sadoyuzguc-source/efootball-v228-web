import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useId,
} from "react";
import {
  X,
  ArrowLeft,
  RefreshCw,
  ImageOff,
  LoaderCircle,
  AlertCircle,
  Upload,
} from "lucide-react";
import { turkeyToday } from "../shared/rules.mjs";
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
export function useBroadcastToday() {
  const [today, setToday] = useState(turkeyToday);
  useEffect(() => {
    let timer;
    const update = () => {
      const day = turkeyToday();
      setToday(day);
      window.clearTimeout(timer);
      const midnight = Date.parse(`${day}T00:00:00+03:00`) + 86400000;
      timer = window.setTimeout(
        update,
        Math.max(100, midnight - Date.now() + 100),
      );
    };
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, []);
  return today;
}
export async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "İşlem tamamlanamadı.");
  return data;
}
export const trDate = (d) =>
  d ? new Date(d).toLocaleDateString("tr-TR") : "—";
export const number = (n) => Number(n || 0).toLocaleString("tr-TR");
export function Empty({ children = "Henüz kayıt bulunmuyor." }) {
  return (
    <div className="empty">
      <AlertCircle size={26} />
      <p>{children}</p>
    </div>
  );
}
export function Badge({ children, positive }) {
  return (
    <span className={`badge ${positive ? "positive" : ""}`}>{children}</span>
  );
}
export function PageHead({ title, subtitle, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="head-actions">{children}</div>
    </header>
  );
}
export function Panel({ title, aside, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-title">
          <h2>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export function BackBar({ to = "home" }) {
  const { navigate, refresh } = useApp();
  return (
    <footer className="back-bar">
      <button onClick={refresh}>
        <RefreshCw size={16} />
        YENİLE
      </button>
      <button className="danger" onClick={() => navigate(to)}>
        <ArrowLeft size={16} />
        GERİ DÖN
      </button>
    </footer>
  );
}
export function Field({ label, children, hint }) {
  const labelId = useId();
  const control =
    React.isValidElement(children) &&
    ["input", "select", "textarea", Select].includes(children.type)
      ? React.cloneElement(
          children,
          children.props["aria-label"] ? {} : { "aria-labelledby": labelId },
        )
      : children;
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {control}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Select({ value, onChange, options, placeholder, ...props }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value ?? o.id ?? o} value={o.value ?? o.id ?? o}>
          {o.label ?? o.name ?? o}
        </option>
      ))}
    </select>
  );
}
export function LeagueSelect({
  value,
  onChange,
  all = false,
  allLabel = "TÜMÜ",
  cups = true,
  active = false,
}) {
  const { data } = useApp();
  const options = data.leagues
    .filter(
      (l) => (cups || l.type === "Lig") && (!active || l.status === "Aktif"),
    )
    .map((l) => ({
      value: l.id,
      label: `${l.name} | ${l.season}${l.status === "Pasif" ? " (Pasif)" : ""}`,
    }));
  if (all) options.unshift({ value: 0, label: allLabel });
  return (
    <Select
      aria-label="Lig / kupa seçimi"
      value={value}
      onChange={(v) => onChange(Number(v))}
      options={options}
    />
  );
}
export function Photo({
  src,
  alt = "",
  className = "",
  fallback,
  loading = "lazy",
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`photo-fallback ${className}`}>
      {fallback || (
        <>
          <ImageOff size={30} />
          <small>Görsel eklenmemiş</small>
        </>
      )}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const { toasts = [] } = useApp() || {};
  const openedAt = useRef(Date.now());
  const ref = useRef(null),
    previous = useRef(document.activeElement);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous.current?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Pencereyi kapat"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <div className="modal-body">
        {children}
        {toasts
          .filter((t) => t.type === "error" && t.id >= openedAt.current)
          .map((t) => (
            <p key={t.id} className="error-message modal-feedback" role="alert">
              {t.message}
            </p>
          ))}
      </div>
    </dialog>
  );
}
export function Form({
  onSubmit,
  children,
  label = "KAYDET",
  danger = false,
  disabled = false,
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (disabled || busy) return;
        setBusy(true);
        try {
          await onSubmit(new FormData(e.currentTarget));
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <div className="form-footer">
        <button
          disabled={busy || disabled}
          className={danger ? "danger" : "primary"}
        >
          {busy ? <LoaderCircle className="spin" size={17} /> : null}
          {busy ? "KAYDEDİLİYOR…" : label}
        </button>
      </div>
    </form>
  );
}
export function ImageInput({ value, onChange }) {
  const { notify } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <div className="image-input">
      <Photo src={value} />
      <label className="button">
        <Upload size={16} />
        {busy ? "Yükleniyor…" : "GÖRSEL SEÇ"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            setBusy(true);
            const body = new FormData();
            body.append("image", f);
            try {
              const r = await api("/api/upload", { method: "POST", body });
              onChange(r.url);
            } catch (err) {
              notify(err.message, "error");
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {value && (
        <button
          type="button"
          className="text-button"
          onClick={() => onChange("")}
        >
          Kaldır
        </button>
      )}
    </div>
  );
}
export function StandingsTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="left">TAKIM / OYUNCU</th>
            {["O", "G", "B", "M", "AG", "YG", "AV", "P"].map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player || r.id} className={i === 0 ? "leader" : ""}>
              <td>{i + 1}</td>
              <td className="left">
                <strong>{r.team || "—"}</strong>
                <small className="cell-sub">{r.player}</small>
              </td>
              {["o", "g", "b", "m", "ag", "yg", "av", "p"].map((k) => (
                <td key={k} className={k === "p" ? "points" : ""}>
                  {r[k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <Empty>Bu ligde gösterilecek aktif oyuncu bulunmuyor.</Empty>
      )}
    </div>
  );
}
export function Confirm({
  title = "İşlemi onayla",
  message,
  onConfirm,
  onClose,
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-message">{message}</p>
      <Form label="ONAYLA" danger onSubmit={onConfirm}>
        <button type="button" onClick={onClose}>
          VAZGEÇ
        </button>
      </Form>
    </Modal>
  );
}
