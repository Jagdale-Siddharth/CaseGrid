import { useEffect, useRef, useState } from "react";
import { Braces, ChevronDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api, { download, errText } from "../api";
import { useTheme } from "../theme";
import { Card, Empty, H, Select, SlaTag, Spinner, StatusTag, Tag, useToast } from "../ui";

const FORMATS = [
  ["pdf", "PDF report", "Official format with analytics and case register", FileText],
  ["csv", "CSV spreadsheet", "Open in Excel or Google Sheets", FileSpreadsheet],
  ["json", "JSON data", "For other systems and integrations", Braces],
];

function ExportMenu({ onPick, busy }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="relative" ref={box}>
      <button className="btn btn-primary" onClick={() => setOpen((o) => !o)} disabled={busy} aria-haspopup="menu" aria-expanded={open}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : null}{busy ? "Preparing..." : "Export"}<ChevronDown size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-lg border border-line border-t-4 border-t-accent bg-surface shadow-2xl">
          {FORMATS.map(([fmt, name, hint, Icon]) => (
            <button key={fmt} role="menuitem" onClick={() => { setOpen(false); onPick(fmt); }} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-raised">
              <Icon size={20} className="mt-0.5 shrink-0 text-brand" />
              <span><span className="block text-sm font-bold text-heading">{name}</span><span className="block text-xs text-muted">{hint}</span></span>
            </button>))}
        </div>)}
    </div>
  );
}

export default function Reports() {
  const toast = useToast();
  const { c } = useTheme();
  const [f, setF] = useState({ institution_id: "", bureau_id: "", category: "", status: "", state: "", date_from: "", date_to: "" });
  const [meta, setMeta] = useState(null);
  const [insts, setInsts] = useState([]);
  const [bureaus, setBureaus] = useState([]);
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/meta").then((x) => setMeta(x.data)); api.get("/institutions", { params: { size: 200 } }).then((x) => setInsts(x.data.items)); api.get("/bureaus").then((x) => setBureaus(x.data)); }, []);
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""));
  useEffect(() => { api.get("/reports/cases", { params }).then((x) => setR(x.data)); }, [JSON.stringify(f)]);
  const exp = async (fmt) => {
    setBusy(true);
    try { await download("/reports/export", { ...params, fmt }, `complaints-report.${fmt}`); toast(`${fmt.toUpperCase()} report downloaded (${r.total} cases)`); }
    catch (e) { toast(e.response?.status === 403 ? "Your role cannot export reports" : errText(e), "err"); }
    finally { setBusy(false); }
  };
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const chart = (title, data) => (
    <Card><h3 className="mb-2 font-display text-lg font-bold">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(130, (data?.length || 1) * 34)}><BarChart data={data || []} layout="vertical" margin={{ left: 30 }}><CartesianGrid stroke={c.grid} horizontal={false} /><XAxis type="number" allowDecimals={false} stroke={c.muted} fontSize={12} /><YAxis type="category" dataKey="name" width={150} stroke={c.muted} fontSize={12} /><Tooltip contentStyle={{ borderRadius: 8, color: "#000" }} /><Bar dataKey="value" name="Cases" fill={c.brand} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Card>
  );
  return (
    <>
      <H title="Reports" sub="Filter, review and export. Reports only ever include the cases your role may see.">
        {r?.can_export ? <ExportMenu onPick={exp} busy={busy} /> : <Tag tone="muted">Export not available for your role</Tag>}
      </H>
      <Card className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <Select value={f.institution_id} onChange={set("institution_id")} placeholder="All institutions" options={insts.map((i) => ({ value: i.id, label: i.name }))} />
        <Select value={f.bureau_id} onChange={set("bureau_id")} placeholder="All bureaus" options={bureaus.map((b) => ({ value: b.id, label: b.name }))} />
        <Select value={f.category} onChange={set("category")} placeholder="All categories" options={meta?.categories || []} />
        <Select value={f.status} onChange={set("status")} placeholder="All statuses" options={meta?.statuses || []} />
        <Select value={f.state} onChange={set("state")} placeholder="All regions / states" options={meta?.states || []} />
        <input type="date" className="field" value={f.date_from} onChange={(e) => set("date_from")(e.target.value)} aria-label="From date" />
        <input type="date" className="field" value={f.date_to} onChange={(e) => set("date_to")(e.target.value)} aria-label="To date" />
      </Card>
      {!r ? <Spinner /> : (
        <>
          <div className="mb-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl2 bg-brand p-5 text-onbrand"><div className="font-display text-6xl font-bold leading-none">{r.total}</div><div className="mt-1 font-semibold">matching cases</div></div>
            {chart("By status", r.summary.status)}{chart("By bureau or cell", r.summary.bureau)}{chart("By region / state", r.summary.state)}
          </div>
          {r.rows.length === 0 ? <Empty title="No cases match these filters" /> : (
            <Card className="overflow-x-auto p-0"><table className="w-full"><thead className="border-b border-line"><tr>{["Case ID", "Institution", "Region", "Category", "Bureau or cell", "Officer", "Status", "Registered", "Due", "Age", "Timing"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">{r.rows.map((x) => (
                <tr key={x.case_id}><td className="td font-semibold">{x.case_id}</td><td className="td">{x.institution}</td><td className="td text-xs">{x.state}</td><td className="td">{x.category}</td><td className="td">{x.bureau}</td><td className="td">{x.officer}</td><td className="td"><StatusTag s={x.status} /></td><td className="td">{x.registered_on}</td><td className="td">{x.due_date}</td><td className="td">{x.age_days}d</td>
                  <td className="td"><SlaTag sla={{ state: x.sla_state, days_left: x.sla_state === "closed" ? null : Math.round((new Date(x.due_date) - new Date("2026-10-23")) / 864e5), age_days: x.age_days }} /></td></tr>))}</tbody></table></Card>)}
        </>)}
    </>
  );
}