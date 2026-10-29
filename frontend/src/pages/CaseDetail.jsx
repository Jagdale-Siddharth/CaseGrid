import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Paperclip } from "lucide-react";
import api, { download, errText } from "../api";
import { useAuth } from "../auth";
import { Card, Field, ReasonModal, Select, SlaTag, Spinner, StatusTag, Tag, fmtDT, fmtDate, useToast } from "../ui";

export default function CaseDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [hist, setHist] = useState([]);
  const [asg, setAsg] = useState([]);
  const [docs, setDocs] = useState([]);
  const [links, setLinks] = useState([]);
  const [meta, setMeta] = useState(null);
  const [bureaus, setBureaus] = useState([]);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [toStatus, setToStatus] = useState("");
  const [note, setNote] = useState("");
  const [freeNote, setFreeNote] = useState("");
  const [target, setTarget] = useState({ bureau_id: "", officer_id: "" });
  const [reassign, setReassign] = useState(false);
  const file = useRef();

  const load = useCallback(async () => {
    try {
      const [a, h, s, d, l] = await Promise.all([api.get(`/complaints/${id}`), api.get(`/complaints/${id}/history`), api.get(`/complaints/${id}/assignments`), api.get(`/complaints/${id}/documents`), api.get(`/complaints/${id}/overlaps`)]);
      setC(a.data); setHist(h.data); setAsg(s.data); setDocs(d.data); setLinks(l.data);
    } catch (e) { setErr(e.response?.status === 404 ? "This case does not exist or is outside your access scope." : errText(e)); }
  }, [id]);
  useEffect(() => { load(); api.get("/meta").then((r) => setMeta(r.data)); api.get("/bureaus").then((r) => setBureaus(r.data)); if (can("case:assign")) api.get("/users").then((r) => setUsers(r.data)); }, [id]);
  const act = async (fn, ok) => { try { await fn(); toast(ok); await load(); } catch (e) { toast(errText(e), "err"); } };

  if (err) return <Card><h2 className="font-display text-xl font-bold">{err}</h2><Link to="/cases" className="btn mt-3">Back to cases</Link></Card>;
  if (!c) return <Spinner />;
  const next = meta?.transitions?.[c.status] || [];
  const allowedNext = next.filter((s) => s !== "In Progress" || c.status !== "Resolved" || can("case:reopen"));
  const needNote = ["Resolved", "Pending Information"].includes(toStatus) || c.status === "Resolved";
  const sideOf = (l) => (l.case_a.case_id === c.case_id ? l.case_b : l.case_a);
  const officersFor = users.filter((u) => String(u.bureau?.id) === String(target.bureau_id));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/cases" className="text-sm font-semibold text-muted hover:text-ink">All cases</Link>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{c.subject}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2"><Tag tone="ink">{c.case_id}</Tag><StatusTag s={c.status} /><SlaTag sla={c.sla} /><Tag>{c.priority} priority</Tag><Tag>{c.category}</Tag></div>
        </div>
      </div>
      {c.sla?.state === "escalated" && <div className="bg-accent mb-4 rounded-lg p-0.5"><div className="rounded-md bg-surface px-4 py-2 text-sm font-bold">Escalated: this case is {-c.sla.days_left} days past its deadline and has been raised to a supervisor.</div></div>}
      {links.some((l) => l.status === "suggested") && (
        <div className="mb-4 rounded-xl border border-accent/70 bg-accent/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display text-base font-bold text-ink">
              ⚠️ Potential Overlapping Cases – Coordination Required
            </div>
            <Link to="/overlaps" className="rounded-lg bg-brand px-3 py-1 text-xs font-bold text-onbrand hover:brightness-110">Review &amp; Coordinate &rarr;</Link>
          </div>
          <p className="mt-1 text-sm text-ink/80">
            This institution has related complaints being handled across bureaus/cells (e.g., Regulation Bureau / PGRC). Please review linked cases to coordinate and avoid duplicate action.
          </p>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{c.description}</p>
            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
              {[["Institution", <Link className="font-semibold underline" to={`/institutions/${c.institution.id}`}>{c.institution.name} ({c.institution.code})</Link>],
                ["Bureau or cell", c.bureau.name], ["Responsible officer", c.officer?.full_name || "Unassigned"], ["Registered", `${fmtDate(c.registered_on)} via ${c.source}`],
                ["Due date", fmtDate(c.due_date)], ["Age", `${c.sla.age_days} days`], ["Last action", c.last_action], ["Pending action", c.pending_action], ["Routing", c.routing_note || "-"]].map(([k, v]) => (
                <div key={k}><dt className="text-xs font-semibold text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>))}
            </dl>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-xl font-bold">Case history</h2>
            <ol className="relative space-y-4 border-l-2 border-brand/80 pl-5">
              {[...hist].reverse().map((h) => (
                <li key={h.id} className="relative">
                  <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-brand ${h.event_type === "alert" ? "bg-danger" : "bg-brand"}`} />
                  <div className="text-sm">{h.description}</div>
                  <div className="text-xs text-muted">{h.actor_name} ({h.actor_role.replace("_", " ")}), {fmtDT(h.created_at)}</div>
                </li>))}
            </ol>
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-xl font-bold">Assignment history</h2>
            <ul className="divide-y divide-line text-sm">{asg.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span><b>{a.bureau.name}</b>, {a.officer?.full_name || "Unassigned"}<span className="block text-xs text-muted">{a.reason}</span></span>
                <span className="text-xs text-muted">{fmtDT(a.assigned_on)} to {a.released_on ? fmtDT(a.released_on) : "now"}</span></li>))}</ul>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="font-display text-xl font-bold">Actions</h2>
            {can("case:status") && allowedNext.length > 0 && (
              <div className="space-y-2">
                <Field label="Change status"><Select value={toStatus} onChange={setToStatus} placeholder="Choose next status" options={allowedNext} /></Field>
                {toStatus && <textarea rows={2} className="field" placeholder={needNote ? "Note required" : "Note (optional)"} value={note} onChange={(e) => setNote(e.target.value)} />}
                <button className="btn btn-primary w-full" disabled={!toStatus || (needNote && note.trim().length < 5)} onClick={() => act(async () => { await api.post(`/complaints/${id}/status`, { to_status: toStatus, note }); setToStatus(""); setNote(""); }, "Status updated")}>Update status</button>
              </div>)}
            {c.status !== "Resolved" && can("case:status") && allowedNext.length === 0 && <p className="text-sm text-muted">No further status changes are permitted from here.</p>}
            {can("case:assign") && <button className="btn w-full" onClick={() => { setTarget({ bureau_id: c.bureau.id, officer_id: "" }); setReassign(true); }}>Reassign to a bureau or officer</button>}
            {can("case:note") && (
              <div className="space-y-2 border-t border-line pt-3"><Field label="Add an action note"><textarea rows={2} className="field" value={freeNote} onChange={(e) => setFreeNote(e.target.value)} /></Field>
                <button className="btn w-full" disabled={freeNote.trim().length < 2} onClick={() => act(async () => { await api.post(`/complaints/${id}/notes`, { note: freeNote }); setFreeNote(""); }, "Note added")}>Add note</button></div>)}
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-xl font-bold">Supporting documents</h2>
            {docs.length === 0 && <p className="text-sm text-muted">No documents attached yet.</p>}
            <ul className="space-y-1.5">{docs.map((d) => (
              <li key={d.id}><button className="flex w-full items-center gap-2 rounded-lg border border-line p-2 text-left text-sm hover:border-brand" onClick={() => download(`/complaints/${id}/documents/${d.id}/download`, {}, d.filename)}><Paperclip size={14} /><span className="flex-1 truncate">{d.filename}</span><span className="text-xs text-muted">{Math.max(1, Math.round(d.size_bytes / 1024))} KB</span></button></li>))}</ul>
            {can("document:upload") && <><input ref={file} type="file" className="sr-only" id="up" onChange={(e) => { const fd = new FormData(); fd.append("file", e.target.files[0]); act(() => api.post(`/complaints/${id}/documents`, fd), "Document attached"); e.target.value = ""; }} />
              <label htmlFor="up" className="btn mt-3 w-full cursor-pointer">Attach a document</label></>}
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-xl font-bold">Possibly related cases</h2>
            {links.length === 0 && <p className="text-sm text-muted">No related cases found.</p>}
            <ul className="space-y-2">{links.map((l) => { const o = sideOf(l); return (
              <li key={l.id} className="rounded-lg border border-line p-3 text-sm"><div className="flex items-center justify-between gap-2"><b>{o.case_id}</b><Tag tone={l.status === "linked" ? "ink" : l.status === "suggested" ? "brand" : "muted"}>{l.status}</Tag></div>
                <div>{o.subject}</div><div className="text-xs text-muted">{o.bureau}, match {Math.round(l.score * 100)}%</div></li>); })}</ul>
            {links.some((l) => l.status === "suggested") && <Link to="/overlaps" className="btn mt-3 w-full">Review suggestions</Link>}
          </Card>
        </div>
      </div>
      {reassign && (
        <ReasonModal title="Reassign case" label="Reason for reassignment" confirm="Reassign" onClose={() => setReassign(false)}
          onSubmit={(reason) => act(async () => { await api.post(`/complaints/${id}/assign`, { bureau_id: Number(target.bureau_id), officer_id: target.officer_id ? Number(target.officer_id) : null, reason }); setReassign(false); }, "Case reassigned")}>
          <div className="mb-4 space-y-3">
            <Field label="Bureau or cell"><Select value={target.bureau_id} onChange={(v) => setTarget({ bureau_id: v, officer_id: "" })} options={bureaus.map((b) => ({ value: b.id, label: b.name }))} /></Field>
            <Field label="Officer" hint="Leave empty to use the default officer of that unit."><Select value={target.officer_id} onChange={(v) => setTarget({ ...target, officer_id: v })} placeholder="Default officer" options={officersFor.map((u) => ({ value: u.id, label: u.full_name }))} /></Field>
          </div>
        </ReasonModal>)}
    </>
  );
}
