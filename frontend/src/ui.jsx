import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { X } from "lucide-react";

// ---------- toast
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((msg, kind = "ok") => { setT({ msg, kind }); setTimeout(() => setT(null), 4200); }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && (
        <div role="status" className={`fixed bottom-5 left-1/2 z-[60] max-w-[92vw] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-lg ${t.kind === "err" ? "bg-danger text-white" : "bg-brand text-onbrand"}`}>
          {t.msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

// ---------- small pieces
export const Card = ({ className = "", children, ...p }) => <div className={`card ${className}`} {...p}>{children}</div>;
export const H = ({ title, sub, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
    <div><h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1><span className="mt-2 block h-1 w-14 rounded-full bg-accent" aria-hidden />{sub && <p className="mt-2 max-w-2xl text-sm text-muted">{sub}</p>}</div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);
export const Tag = ({ tone = "plain", children, className = "" }) => {
  const tones = {
    plain: "border-line bg-surface text-ink", brand: "border-accent/60 bg-accent/20 text-ink", ink: "border-transparent bg-brand text-onbrand",
    danger: "border-transparent bg-danger text-white", good: "border-good/40 bg-good/10 text-good", muted: "border-line bg-raised text-muted",
  };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>;
};
export const STATUS_TONE = { Open: "plain", "In Progress": "ink", "Pending Information": "muted", "Under Review": "brand", Resolved: "good" };
export const StatusTag = ({ s }) => <Tag tone={STATUS_TONE[s] || "plain"}>{s}</Tag>;
export function SlaTag({ sla }) {
  if (!sla) return null;
  const map = {
    closed: ["good", "Closed"], on_track: ["muted", `${sla.days_left} days left`],
    due_soon: ["brand", sla.days_left === 0 ? "Due today" : `Due in ${sla.days_left} day${sla.days_left === 1 ? "" : "s"}`],
    overdue: ["danger", `Overdue ${-sla.days_left}d`], escalated: ["danger", `Escalated, ${-sla.days_left}d late`],
  };
  const [tone, text] = map[sla.state] || ["plain", sla.state];
  return <Tag tone={tone}>{text}</Tag>;
}
export const Empty = ({ title, hint }) => (
  <div className="rounded-xl2 border border-dashed border-line p-10 text-center"><p className="font-display text-lg font-bold">{title}</p>{hint && <p className="mt-1 text-sm text-muted">{hint}</p>}</div>
);
export const Spinner = () => <div className="p-10 text-center text-sm text-muted">Loading...</div>;
export const Field = ({ label, children, hint }) => (
  <label className="block text-sm"><span className="mb-1 block font-semibold">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}</label>
);
export const Select = ({ value, onChange, options, placeholder, className = "", ...p }) => (
  <select className={`field ${className}`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...p}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
  </select>
);

// ---------- modal
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-rail/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-auto rounded-xl2 border border-line border-t-4 border-t-accent bg-surface p-6 shadow-2xl ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-start justify-between gap-4"><h2 className="font-display text-2xl font-bold">{title}</h2>
          <button className="rounded-md p-1 hover:bg-raised" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

/** Asks for a recorded reason (used for link / dismiss / reassign decisions). */
export function ReasonModal({ title, label, confirm = "Confirm", danger, onSubmit, onClose, children }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = text.trim().length >= 5;
  return (
    <Modal title={title} onClose={onClose}>
      {children}
      <Field label={label} hint="This reason is stored in the case history and audit trail (min. 5 characters).">
        <textarea autoFocus rows={3} className="field" value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={!ok || busy}
          onClick={async () => { setBusy(true); try { await onSubmit(text.trim()); } finally { setBusy(false); } }}>{confirm}</button>
      </div>
    </Modal>
  );
}

export function Pager({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-4 text-sm text-muted">
      <span>{total} result{total === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-2">
        <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");
export const fmtDT = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");
