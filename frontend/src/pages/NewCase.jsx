import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errText } from "../api";
import { Card, Field, H, Select, Tag, useToast } from "../ui";

export default function NewCase() {
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [insts, setInsts] = useState([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ institution_code: "", category: "Infrastructure", subject: "", description: "", priority: "Medium", source: "Portal", other_subjects: [] });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  useEffect(() => { api.get("/meta").then((r) => setMeta(r.data)); }, []);
  useEffect(() => { const t = setTimeout(() => api.get("/institutions", { params: { q, size: 8 } }).then((r) => setInsts(r.data.items)), 150); return () => clearTimeout(t); }, [q]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await api.post("/complaints", f);
      const ov = await api.get(`/complaints/${r.data.case_id}/overlaps`).catch(() => ({ data: [] }));
      setResult({ c: r.data, overlaps: ov.data.filter((o) => o.status === "suggested") });
      toast(`${r.data.case_id} registered`);
    } catch (x) { toast(errText(x), "err"); } finally { setBusy(false); }
  };
  if (result) {
    const { c, overlaps } = result;
    return (
      <>
        <H title="Complaint registered" />
        <Card className="max-w-2xl space-y-4">
          <div className="font-display text-4xl font-bold">{c.case_id}</div>
          <p className="text-sm">{c.institution.name} ({c.institution.code}), {c.category}</p>
          <div className={`rounded-lg p-4 ${c.bureau.is_review_queue ? "bg-brand text-onbrand" : "bg-raised"}`}>
            <div className="text-sm font-bold">{c.bureau.is_review_queue ? "Sent for manual review" : `Routed to ${c.bureau.name}`}</div>
            <div className="text-sm">{c.routing_note}</div>
            {!c.bureau.is_review_queue && <div className="mt-1 text-sm">Responsible officer: {c.officer?.full_name || "Unassigned"}</div>}
          </div>
          {overlaps.length > 0 ? <div className="rounded-lg border border-accent/70 bg-accent/10 p-4"><div className="font-bold">{overlaps.length} possibly related case{overlaps.length > 1 ? "s" : ""} found</div><p className="text-sm text-muted">An officer should review them. Nothing was merged.</p><Link className="btn mt-2" to="/overlaps">Review related cases</Link></div>
            : <p className="text-sm text-muted">No related complaints were found for this institution.</p>}
          <div className="flex gap-2"><Link className="btn btn-primary" to={`/cases/${c.case_id}`}>Open case</Link><button className="btn" onClick={() => { setResult(null); setF({ ...f, subject: "", description: "", other_subjects: [] }); }}>Register another</button></div>
        </Card>
      </>
    );
  }
  return (
    <>
      <H title="Register complaint" sub="The case is routed by the configured rules. If the subject is unclear it goes to manual review instead of guessing." />
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card className="space-y-3">
          <h2 className="font-display text-xl font-bold">1. Institution</h2>
          <input className="field" placeholder="Search by name, ID or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find institution" />
          <div className="max-h-72 space-y-1.5 overflow-auto">
            {insts.map((i) => (
              <button type="button" key={i.id} onClick={() => set("institution_code", i.code)} className={`w-full rounded-lg border p-2.5 text-left text-sm transition ${f.institution_code === i.code ? "border-brand bg-brand text-onbrand" : "border-line hover:border-brand"}`}>
                <div className="font-semibold">{i.name}</div><div className="text-xs opacity-75">{i.code}, {i.city}, {i.state}</div></button>))}
          </div>
          {f.institution_code ? <Tag tone="ink">Selected {f.institution_code}</Tag> : <p className="text-xs text-muted">Pick an institution. The stable ID is what links cases together.</p>}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-xl font-bold">2. Details</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Category"><Select value={f.category} onChange={(v) => set("category", v)} options={meta?.categories || []} /></Field>
            <Field label="Priority"><Select value={f.priority} onChange={(v) => set("priority", v)} options={meta?.priorities || []} /></Field>
            <Field label="Source"><Select value={f.source} onChange={(v) => set("source", v)} options={meta?.sources || []} /></Field>
          </div>
          <Field label="Subject"><input className="field" value={f.subject} onChange={(e) => set("subject", e.target.value)} maxLength={255} /></Field>
          <Field label="Description" hint="At least 10 characters."><textarea rows={5} className="field" value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <fieldset><legend className="mb-1 text-sm font-semibold">Does it also concern other subjects?</legend>
            <div className="flex flex-wrap gap-2">{(meta?.categories || []).filter((c) => c !== f.category).map((c) => (
              <label key={c} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${f.other_subjects.includes(c) ? "border-transparent bg-brand text-onbrand" : "border-line"}`}>
                <input type="checkbox" className="sr-only" checked={f.other_subjects.includes(c)} onChange={() => set("other_subjects", f.other_subjects.includes(c) ? f.other_subjects.filter((x) => x !== c) : [...f.other_subjects, c])} />{c}</label>))}</div>
            <p className="mt-1 text-xs text-muted">Multiple subjects are sent to manual review.</p></fieldset>
          <button className="btn btn-primary w-full py-2.5" disabled={busy || !f.institution_code || f.subject.length < 3 || f.description.length < 10}>{busy ? "Registering..." : "Register complaint"}</button>
        </Card>
      </form>
    </>
  );
}
