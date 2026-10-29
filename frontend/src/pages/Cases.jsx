import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
import api from "../api";
import { useAuth } from "../auth";
import { Empty, H, Pager, Select, SlaTag, Spinner, StatusTag, Tag, fmtDate } from "../ui";

const COLS = [["case_id", "Case ID"], ["", "Institution"], ["category", "Category"], ["", "Bureau / cell"], ["", "Officer"], ["status", "Status"], ["", "Last action"], ["due_date", "Due"]];

export default function Cases() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { can } = useAuth();
  const [meta, setMeta] = useState(null);
  const [bureaus, setBureaus] = useState([]);
  const [f, setF] = useState({ q: "", bureau_id: "", category: "", status: "", priority: "", state: "", overdue: sp.get("overdue") ? "true" : "", date_from: "", date_to: "", sort: "registered_on", order: "desc", page: 1 });
  const [data, setData] = useState(null);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v, page: k === "page" ? v : 1 }));
  useEffect(() => { api.get("/meta").then((r) => setMeta(r.data)); api.get("/bureaus").then((r) => setBureaus(r.data)); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "")); params.size = 15;
      api.get("/complaints", { params }).then((r) => setData(r.data));
    }, 200);
    return () => clearTimeout(t);
  }, [f]);
  const sortBy = (k) => k && setF((o) => ({ ...o, sort: k, order: o.sort === k && o.order === "asc" ? "desc" : "asc", page: 1 }));
  return (
    <>
      <H title="Cases" sub="Every complaint you are allowed to see, across bureaus and cells." />
      <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input className="field sm:col-span-2" placeholder="Search case ID, institution, subject or description" value={f.q} onChange={(e) => set("q", e.target.value)} aria-label="Search" />
        <Select value={f.bureau_id} onChange={(v) => set("bureau_id", v)} placeholder="All bureaus and cells" options={bureaus.map((b) => ({ value: b.id, label: b.name }))} />
        <Select value={f.category} onChange={(v) => set("category", v)} placeholder="All categories" options={meta?.categories || []} />
        <Select value={f.status} onChange={(v) => set("status", v)} placeholder="All statuses" options={meta?.statuses || []} />
        <Select value={f.priority} onChange={(v) => set("priority", v)} placeholder="All priorities" options={meta?.priorities || []} />
        <Select value={f.state} onChange={(v) => set("state", v)} placeholder="All regions / states" options={meta?.states || []} />
        <input type="date" className="field" value={f.date_from} onChange={(e) => set("date_from", e.target.value)} aria-label="Registered from" />
        <input type="date" className="field" value={f.date_to} onChange={(e) => set("date_to", e.target.value)} aria-label="Registered to" />
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={f.overdue === "true"} onChange={(e) => set("overdue", e.target.checked ? "true" : "")} />Overdue only</label>
        <button className="btn" onClick={() => setF({ ...f, q: "", bureau_id: "", category: "", status: "", priority: "", state: "", overdue: "", date_from: "", date_to: "", page: 1 })}>Clear filters</button>
      </div>
      {!data ? <Spinner /> : data.items.length === 0 ? <Empty title="No cases match" hint="Loosen a filter. Cases outside your bureau scope are never listed." /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line"><tr>{COLS.map(([k, l]) => (
              <th key={l} className={`th ${k ? "cursor-pointer select-none hover:text-ink" : ""}`} onClick={() => sortBy(k)}>
                <span className="inline-flex items-center gap-1">{l}{f.sort === k && (f.order === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</span></th>))}</tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-brand/10" onClick={() => nav(`/cases/${c.case_id}`)}>
                  <td className="td font-semibold">{c.case_id}<div className="text-xs font-normal text-muted">{c.subject}</div></td>
                  <td className="td">{c.institution.name}<div className="text-xs text-muted">{c.institution.code}</div></td>
                  <td className="td">{c.category}</td>
                  <td className="td">{c.bureau.is_review_queue ? <Tag tone="brand">{c.bureau.name}</Tag> : c.bureau.name}</td>
                  <td className="td">{c.officer?.full_name || <span className="text-muted">Unassigned</span>}</td>
                  <td className="td"><StatusTag s={c.status} /></td>
                  <td className="td max-w-[220px] truncate" title={c.last_action}>{c.last_action}</td>
                  <td className="td">{fmtDate(c.due_date)}<div className="mt-1"><SlaTag sla={c.sla} /></div></td>
                </tr>))}
            </tbody>
          </table>
          <div className="px-4 pb-4"><Pager page={data.page} size={data.size} total={data.total} onPage={(p) => set("page", p)} /></div>
        </div>
      )}
    </>
  );
}
