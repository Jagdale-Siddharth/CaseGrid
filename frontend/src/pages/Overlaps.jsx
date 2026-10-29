import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errText } from "../api";
import { useAuth } from "../auth";
import { Card, Empty, Field, H, Modal, ReasonModal, Spinner, StatusTag, Tag, fmtDT, useToast } from "../ui";

const METHOD = { "multilingual-ai": "AI language model", "rules+tfidf": "word matching", manual: "manual link" };
const TABS = [["suggested", "To review"], ["linked", "Linked"], ["dismissed", "Dismissed"], ["unlinked", "Unlinked"]];

function Side({ c }) {
  return (
    <div className={`rounded-xl border p-4 ${c.redacted ? "border-dashed border-line bg-raised" : "border-line"}`}>
      <div className="flex flex-wrap items-center gap-2"><Tag tone="ink">{c.bureau}</Tag><StatusTag s={c.status} /></div>
      <div className="mt-2 text-xs text-muted">{c.case_id}, registered {c.registered_on}</div>
      <div className="mt-1 font-display text-lg font-bold leading-snug">{c.subject}</div>
      {c.redacted ? <p className="mt-1 text-sm text-muted">Details are hidden because this case belongs to another bureau. The match score and signals are still shown.</p>
        : <p className="mt-1 text-sm">{c.description}</p>}
      {!c.redacted && <Link to={`/cases/${c.case_id}`} className="mt-2 inline-block text-sm font-semibold underline">Open case</Link>}
    </div>
  );
}

export default function Overlaps() {
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("suggested");
  const [items, setItems] = useState(null);
  const [ask, setAsk] = useState(null);
  const [manual, setManual] = useState(false);
  const [engine, setEngine] = useState(null);
  useEffect(() => { api.get("/overlaps/engine").then((r) => setEngine(r.data)).catch(() => {}); }, []);
  const load = () => api.get("/overlaps", { params: { status: tab } }).then((r) => setItems(r.data));
  useEffect(() => { setItems(null); load(); }, [tab]);
  const decide = (l, decision) => setAsk({ l, decision });
  const submit = async (reason) => {
    try { await api.post(`/overlaps/${ask.l.id}/decision`, { decision: ask.decision, reason }); toast(`Decision recorded: ${ask.decision}`); setAsk(null); load(); }
    catch (e) { toast(errText(e), "err"); }
  };
  const copy = { link: ["Link these cases", "Why are these cases related?", "Link cases"], dismiss: ["Dismiss suggestion", "Why are these not the same issue?", "Dismiss"], unlink: ["Unlink cases", "Why should the link be removed?", "Unlink"] };
  return (
    <>
      <H title="Related cases" sub="Complaints that may concern the same issue, even across bureaus and in different words. The system only suggests. An officer decides, and both records always stay separate.">
        {can("link:review") && <button className="btn" onClick={() => setManual(true)}>Link two cases manually</button>}
        {can("overlap:scan") && <button className="btn" onClick={async () => { const r = await api.post("/overlaps/scan"); toast(`${r.data.new_suggestions} new suggestion(s)`); load(); }}>Scan all cases</button>}
      </H>
      {engine && (
        <div className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-2.5 text-sm ${engine.engine === "multilingual-ai" ? "border-good/40 bg-good/10" : "border-accent/60 bg-accent/10"}`}>
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${engine.engine === "multilingual-ai" ? "bg-good" : "bg-accent"}`} aria-hidden />
          <p><b>Matching engine: {engine.engine === "multilingual-ai" ? "AI language model (active)" : "basic word matching"}.</b> {engine.languages}.
            {engine.engine !== "multilingual-ai" && <span className="text-muted"> {engine.state === "loading" ? "The multilingual model is loading and will switch on automatically." : "The multilingual model is not available on this server yet, so complaints in different languages may not be linked."}</span>}</p>
        </div>)}
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${tab === k ? "border-transparent bg-brand text-onbrand" : "border-line hover:border-brand"}`}>{l}</button>)}</div>
      {tab === "suggested" && items && items.length > 0 && (
        <div className="mb-4 rounded-xl border border-accent/70 bg-accent/10 p-4">
          <div className="font-display text-base font-bold text-ink">
            ⚠️ Potential Overlapping Cases – Coordination Required
          </div>
          <p className="mt-1 text-sm text-ink/80">
            Automated detection identified cross-bureau complaints concerning the same institution (e.g. Regulation Bureau &amp; PGRC). Review match scores, inspect signals, and link or dismiss cases below.
          </p>
        </div>
      )}
      {!items ? <Spinner /> : items.length === 0 ? <Empty title="Nothing here" hint={tab === "suggested" ? "No unreviewed suggestions in your scope." : "Decisions will appear here."} /> : (
        <div className="space-y-4">{items.map((l) => (
          <Card key={l.id}>
            <div className="mb-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3"><div className="font-display text-4xl font-bold">{Math.round(l.score * 100)}%</div><div className="text-xs text-muted">match<br />{METHOD[l.method] || l.method}</div></div>
              <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-raised"><div className="h-full bg-brand" style={{ width: `${Math.round(l.score * 100)}%`, boxShadow: "inset 0 0 0 1px rgb(var(--ink))" }} /></div>
              {l.origin === "manual" && <Tag>Linked manually</Tag>}
            </div>
            <div className="grid gap-3 md:grid-cols-2"><Side c={l.case_a} /><Side c={l.case_b} /></div>
            <div className="mt-4"><div className="mb-2 text-sm font-bold">Why they may be related</div>
              <ul className="grid gap-2 sm:grid-cols-2">{l.signals.map((s, i) => <li key={i} className="rounded-lg bg-raised px-3 py-2 text-sm"><b>{s.label}.</b> {s.detail}</li>)}</ul></div>
            {l.decision_reason && <p className="mt-3 rounded-lg border border-line p-3 text-sm"><b>Decision note:</b> {l.decision_reason} <span className="text-muted">({fmtDT(l.decided_at)})</span></p>}
            {can("link:review") && <div className="mt-4 flex flex-wrap gap-2">
              {l.status === "suggested" && <><button className="btn btn-primary" onClick={() => decide(l, "link")}>Link cases</button><button className="btn btn-danger" onClick={() => decide(l, "dismiss")}>Dismiss</button></>}
              {l.status === "linked" && <button className="btn btn-danger" onClick={() => decide(l, "unlink")}>Unlink</button>}</div>}
          </Card>))}</div>)}
      {ask && <ReasonModal title={copy[ask.decision][0]} label={copy[ask.decision][1]} confirm={copy[ask.decision][2]} danger={ask.decision !== "link"} onClose={() => setAsk(null)} onSubmit={submit} />}
      {manual && <ManualLink onClose={() => setManual(false)} onDone={() => { setManual(false); setTab("linked"); load(); }} />}
    </>
  );
}

function ManualLink({ onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ case_a: "", case_b: "", reason: "" });
  return (
    <Modal title="Link two cases manually" onClose={onClose}>
      <div className="space-y-3">
        <Field label="First case ID"><input className="field" placeholder="CMP-2026-000001" value={f.case_a} onChange={(e) => setF({ ...f, case_a: e.target.value.trim() })} /></Field>
        <Field label="Second case ID"><input className="field" placeholder="CMP-2026-000002" value={f.case_b} onChange={(e) => setF({ ...f, case_b: e.target.value.trim() })} /></Field>
        <Field label="Reason"><textarea rows={3} className="field" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!f.case_a || !f.case_b || f.reason.trim().length < 5} onClick={async () => { try { await api.post("/overlaps/manual", f); toast("Cases linked"); onDone(); } catch (e) { toast(errText(e), "err"); } }}>Link cases</button></div>
    </Modal>
  );
}