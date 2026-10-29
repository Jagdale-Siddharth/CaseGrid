import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { AlertTriangle, ArrowRightLeft, ClipboardCheck, Clock, GitCompareArrows, Loader } from "lucide-react";
import api from "../api";
import { useTheme } from "../theme";
import { Card, H, SlaTag, Spinner, Tag, fmtDT } from "../ui";

const dotTone = { overdue: "bg-danger", escalated: "bg-danger", due_soon: "bg-accent", on_track: "bg-brand", closed: "bg-line" };

function Lanes({ items, bureaus }) {
  const nav = useNavigate();
  return (
    <Card className="rise">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-bold">Who is holding what</h3>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          {[["bg-danger", "Overdue"], ["bg-accent", "Due soon"], ["bg-brand", "On track"], ["bg-line", "Resolved"]].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><i className={`inline-block h-3 w-3 rounded-full ${c}`} />{l}</span>)}
        </div>
      </div>
      <div className="space-y-3">
        {bureaus.map((b) => {
          const mine = items.filter((c) => c.bureau.name === b.bureau).sort((a, z) => (a.sla.days_left ?? 99) - (z.sla.days_left ?? 99));
          return (
            <div key={b.bureau} className="grid items-center gap-3 sm:grid-cols-[210px_1fr]">
              <div><div className="font-semibold">{b.bureau}</div><div className="text-xs text-muted">{b.open} open, {b.overdue} overdue</div></div>
              <div className="flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-lg bg-raised px-3 py-2">
                {mine.length === 0 && <span className="text-xs text-muted">No cases</span>}
                {mine.map((c) => <button key={c.id} title={`${c.case_id}: ${c.subject}`} aria-label={`${c.case_id} ${c.subject}`} onClick={() => nav(`/cases/${c.case_id}`)} className={`h-4 w-4 rounded-full transition hover:scale-150 ${dotTone[c.sla.state]}`} />)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [cases, setCases] = useState([]);
  const { c } = useTheme();
  useEffect(() => {
    api.get("/dashboard/summary").then((r) => setD(r.data));
    api.get("/complaints", { params: { size: 200, sort: "due_date", order: "asc" } }).then((r) => setCases(r.data.items));
  }, []);
  if (!d) return <Spinner />;
  const t = d.totals;
  const axis = { stroke: c.muted, fontSize: 12 };
  const tip = { contentStyle: { background: "var(--tip-bg, #fff)", border: `1px solid ${c.grid}`, borderRadius: 8, color: "#000" } };
  const kpis = [
    ["Overdue", t.overdue, "danger", "/cases?overdue=1", AlertTriangle],
    ["Due soon", t.due_soon, "accent", "/cases", Clock],
    ["Under process", t.under_process ?? 0, null, "/cases", Loader],
    ["Transferred", t.transferred ?? 0, null, "/cases", ArrowRightLeft],
    ["In manual review", t.in_manual_review, null, "/routing", ClipboardCheck],
    ["Overlaps", t.potential_overlaps, null, "/overlaps", GitCompareArrows],
  ];
  return (
    <>
      <H title="Overview" sub={`Showing ${d.scope} as of ${d.as_of}.`} />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_2.4fr]">
        <div className="hero-pattern relative overflow-hidden rounded-xl2 p-6 pb-8 text-white shadow-card">
          <div className="text-sm font-semibold text-white/75">Pending cases</div>
          <div className="font-display text-[6rem] font-bold leading-none text-accent">{t.pending}</div>
          <div className="mt-2 text-sm text-white/85">of {t.registered} registered ({t.resolved} disposed) across {d.by_bureau.filter((b) => !b.bureau.includes("Review")).length} bureaus/cells</div>
          <div className="tricolor absolute inset-x-0 bottom-0 h-2" aria-hidden />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {kpis.map(([l, v, tone, href, Icon]) => {
            const edge = tone === "danger" && v > 0 ? "border-l-danger" : tone === "accent" ? "border-l-accent" : "border-l-brand";
            return (
              <Link key={l} to={href} className={`flex items-center justify-between gap-3 rounded-xl2 border border-line border-l-4 bg-surface p-4 shadow-card transition hover:border-brand hover:bg-raised ${edge}`}>
                <div>
                  <div className={`font-display text-3xl font-bold ${tone === "danger" && v > 0 ? "text-danger" : "text-heading"}`}>{v}</div>
                  <div className="mt-0.5 text-xs font-semibold text-muted">{l}</div>
                </div>
                <Icon size={26} className={tone === "danger" && v > 0 ? "text-danger" : tone === "accent" ? "text-accent" : "text-brand/70"} aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mt-4"><Lanes items={cases} bureaus={d.by_bureau} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><h3 className="mb-3 font-display text-xl font-bold">Registered and resolved by month</h3>
          <ResponsiveContainer width="100%" height={240}><AreaChart data={d.trend}><CartesianGrid stroke={c.grid} vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Legend formatter={(v) => <span style={{ color: c.ink }}>{v}</span>} />
            <Area type="monotone" dataKey="registered" name="Registered" stroke={c.brand} fill={c.brand} fillOpacity={0.35} strokeWidth={2} /><Area type="monotone" dataKey="resolved" name="Resolved" stroke={c.good} fill={c.good} fillOpacity={0.2} strokeWidth={2} /></AreaChart></ResponsiveContainer></Card>
        <Card><h3 className="mb-3 font-display text-xl font-bold">By status</h3>
          <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={d.by_status} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} stroke={c.grid}>{d.by_status.map((_, i) => <Cell key={i} fill={c.series[i % c.series.length]} />)}</Pie><Tooltip {...tip} /><Legend formatter={(v) => <span style={{ color: c.ink }}>{v}</span>} /></PieChart></ResponsiveContainer></Card>
        <Card><h3 className="mb-3 font-display text-xl font-bold">Case ageing (open cases)</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.ageing}><CartesianGrid stroke={c.grid} vertical={false} /><XAxis dataKey="name" interval={0} {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Bar dataKey="value" name="Cases" radius={[6, 6, 0, 0]}>{d.ageing.map((_, i) => <Cell key={i} fill={i === 3 ? c.danger : i === 2 ? c.accent : c.brand} />)}</Bar></BarChart></ResponsiveContainer></Card>
        <Card><h3 className="mb-3 font-display text-xl font-bold">Workload by officer</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.workload} layout="vertical" margin={{ left: 20 }}><CartesianGrid stroke={c.grid} horizontal={false} /><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="name" width={110} interval={0} {...axis} /><Tooltip {...tip} /><Bar dataKey="value" name="Open cases" fill={c.brand} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Card>
        <Card><h3 className="mb-3 font-display text-xl font-bold">By category</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.by_category} layout="vertical" margin={{ left: 30 }}><CartesianGrid stroke={c.grid} horizontal={false} /><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="name" width={120} interval={0} {...axis} /><Tooltip {...tip} /><Bar dataKey="value" name="Cases" fill={c.brand} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><h3 className="mb-3 font-display text-xl font-bold">Needs action now</h3>
          {d.attention.length === 0 ? <p className="text-sm text-muted">Nothing is overdue or due soon in your scope.</p> :
            <ul className="divide-y divide-line">{d.attention.map((x) => (
              <li key={x.id}><Link to={`/cases/${x.case_id}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{x.subject}</span><span className="block truncate text-xs text-muted">{x.case_id}, {x.institution.name}, {x.bureau.name}</span></span><SlaTag sla={x.sla} /></Link></li>))}</ul>}
        </Card>
        <Card><h3 className="mb-3 font-display text-xl font-bold">Recent case movement</h3>
          <ul className="space-y-3">{d.recent_activity.map((a, i) => (
            <li key={i} className="border-l-2 border-accent pl-3"><Link to={`/cases/${a.case_id}`} className="text-sm font-semibold hover:underline">{a.case_id}</Link><p className="text-sm">{a.event}</p><p className="text-xs text-muted">{a.actor}, {fmtDT(a.at)}</p></li>))}</ul>
        </Card>
      </div>
      <Card className="mt-4"><h3 className="mb-3 font-display text-xl font-bold">Complaints per institution</h3>
        <ResponsiveContainer width="100%" height={Math.max(180, d.by_institution.length * 34)}><BarChart data={d.by_institution} layout="vertical" margin={{ left: 40 }}><CartesianGrid stroke={c.grid} horizontal={false} /><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="name" width={230} {...axis} /><Tooltip {...tip} /><Bar dataKey="value" name="Cases" fill={c.brand} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></Card>
    </>
  );
}
