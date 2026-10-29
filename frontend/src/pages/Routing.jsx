import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errText } from "../api";
import { useAuth } from "../auth";
import { Card, Empty, H, ReasonModal, Select, Spinner, Tag, useToast } from "../ui";

export default function Routing() {
  const { can } = useAuth();
  const toast = useToast();
  const [rules, setRules] = useState(null);
  const [bureaus, setBureaus] = useState([]);
  const [queue, setQueue] = useState([]);
  const [meta, setMeta] = useState(null);
  const [assign, setAssign] = useState(null);
  const [nr, setNr] = useState({ category: "", state: "", bureau_id: "" });
  const load = () => { api.get("/routing-rules").then((r) => setRules(r.data)); api.get("/complaints/review-queue").then((r) => setQueue(r.data)); };
  useEffect(() => { load(); api.get("/bureaus").then((r) => setBureaus(r.data)); api.get("/meta").then((r) => setMeta(r.data)); }, []);
  const edit = can("routing:manage");
  const save = async (r, patch) => { try { await api.put(`/routing-rules/${r.id}`, { category: r.category, state: r.state, bureau_id: r.bureau.id, is_verified: r.is_verified, source_note: r.source_note, active: r.active, ...patch }); toast("Rule saved"); load(); } catch (e) { toast(errText(e), "err"); } };
  if (!rules) return <Spinner />;
  const bopts = bureaus.map((b) => ({ value: b.id, label: b.name }));
  return (
    <>
      <H title="Routing" sub="Complaints are routed by category and, where set, state. If no single rule applies, the case waits in manual review instead of being guessed." />
      <div className="bg-accent mb-5 rounded-lg p-0.5"><div className="rounded-md bg-surface px-4 py-2 text-sm font-semibold">Rules marked Prototype have not been verified against official AICTE procedure. Mark a rule Verified only after checking it with the owning bureau.</div></div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-x-auto p-0">
          <table className="w-full"><thead className="border-b border-line"><tr>{["Category", "State", "Goes to", "Status", "Active"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rules.map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="td font-semibold">{r.category}</td><td className="td">{r.state || "Any state"}</td>
                <td className="td">{edit ? <Select className="min-w-[200px]" value={r.bureau.id} onChange={(v) => save(r, { bureau_id: Number(v) })} options={bopts} /> : r.bureau.name}</td>
                <td className="td">{edit ? <button onClick={() => save(r, { is_verified: !r.is_verified })} title={r.source_note}><Tag tone={r.is_verified ? "good" : "brand"}>{r.is_verified ? "Verified" : "Prototype"}</Tag></button> : <Tag tone={r.is_verified ? "good" : "brand"}>{r.is_verified ? "Verified" : "Prototype"}</Tag>}</td>
                <td className="td"><input type="checkbox" disabled={!edit} checked={r.active} onChange={(e) => save(r, { active: e.target.checked })} aria-label={`Rule ${r.category} active`} /></td></tr>))}</tbody></table>
          {edit && (
            <div className="grid gap-2 border-t border-line p-4 sm:grid-cols-4">
              <Select value={nr.category} onChange={(v) => setNr({ ...nr, category: v })} placeholder="Category" options={meta?.categories || []} />
              <input className="field" placeholder="State (optional)" value={nr.state} onChange={(e) => setNr({ ...nr, state: e.target.value })} />
              <Select value={nr.bureau_id} onChange={(v) => setNr({ ...nr, bureau_id: v })} placeholder="Bureau or cell" options={bopts} />
              <button className="btn btn-primary" disabled={!nr.category || !nr.bureau_id} onClick={async () => { try { await api.post("/routing-rules", { category: nr.category, state: nr.state || null, bureau_id: Number(nr.bureau_id) }); setNr({ category: "", state: "", bureau_id: "" }); toast("Rule added as Prototype"); load(); } catch (e) { toast(errText(e), "err"); } }}>Add rule</button>
              <p className="text-xs text-muted sm:col-span-4">Two active rules for one category and place that point to different units send the case to manual review.</p>
            </div>)}
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-xl font-bold">Manual review queue <Tag tone="brand">{queue.length}</Tag></h2>
          {queue.length === 0 ? <Empty title="Queue is empty" hint="Ambiguous complaints land here." /> : (
            <ul className="space-y-3">{queue.map((c) => (
              <li key={c.id} className="rounded-lg border border-line p-3"><Link to={`/cases/${c.case_id}`} className="font-bold underline">{c.case_id}</Link>
                <div className="text-sm">{c.subject}</div><div className="mt-1 text-xs text-muted">{c.institution.name}</div><div className="mt-1 text-xs">{c.routing_note}</div>
                {can("case:assign") && <button className="btn mt-2" onClick={() => setAssign({ c, bureau_id: "" })}>Choose destination</button>}</li>))}</ul>)}
        </Card>
      </div>
      {assign && (
        <ReasonModal title={`Route ${assign.c.case_id}`} label="Why this destination?" confirm="Assign" onClose={() => setAssign(null)}
          onSubmit={async (reason) => { try { await api.post(`/complaints/${assign.c.case_id}/assign`, { bureau_id: Number(assign.bureau_id), reason }); toast("Case routed"); setAssign(null); load(); } catch (e) { toast(errText(e), "err"); } }}>
          <div className="mb-4"><Select value={assign.bureau_id} onChange={(v) => setAssign({ ...assign, bureau_id: v })} placeholder="Choose bureau or cell" options={bopts.filter((b) => !bureaus.find((x) => x.id === b.value)?.is_review_queue)} /></div>
        </ReasonModal>)}
    </>
  );
}
