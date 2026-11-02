import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Camera, Download, ExternalLink, Eye, FileText, Image, MapPin, Paperclip, X } from "lucide-react";
import api, { download, errText } from "../api";
import { useAuth } from "../auth";
import { Card, Field, Modal, ReasonModal, Select, SlaTag, Spinner, StatusTag, Tag, fmtDT, fmtDate, useToast } from "../ui";

export default function CaseDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [hist, setHist] = useState([]);
  const [asg, setAsg] = useState([]);
  const [docs, setDocs] = useState([]);
  const [rmDoc, setRmDoc] = useState(null);
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
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const file = useRef();

  const openDocPreview = async (d) => {
    setPreviewDoc(d);
    setLoadingPreview(true);
    try {
      const res = await api.get(`/complaints/${id}/documents/${d.id}/download`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      setPreviewUrl(blobUrl);
    } catch {
      toast("Failed to load document preview", "err");
      setPreviewDoc(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closeDocPreview = () => {
    if (previewUrl && !previewDoc?.isDirect) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

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
          {(c.geo_latitude || c.geo_address || c.photo_url) && (
            <Card className="border border-brand/40 bg-brand/5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <MapPin size={18} className="text-brand" />
                  Geotagged Evidence &amp; Location
                </h2>
                {c.geo_latitude && c.geo_longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${c.geo_latitude},${c.geo_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-onbrand hover:brightness-110"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {c.geo_address && (
                <div className="mt-1 flex items-start gap-2 text-sm text-ink">
                  <span className="text-xs font-bold uppercase text-muted mt-0.5">Address:</span>
                  <span className="font-medium">{c.geo_address}</span>
                </div>
              )}

              {c.geo_latitude && c.geo_longitude && (
                <div className="mt-1 flex items-center gap-2 text-xs font-mono text-muted">
                  <span>Coordinates: {Number(c.geo_latitude).toFixed(6)}, {Number(c.geo_longitude).toFixed(6)}</span>
                </div>
              )}

              {c.photo_url && (
                <div className="mt-3.5 pt-3 border-t border-line/60">
                  <p className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                    <Camera size={14} className="text-brand" /> Geotagged Site Photo
                  </p>
                  <div
                    className="group relative inline-block cursor-pointer overflow-hidden rounded-xl border border-line bg-surface hover:shadow-md transition"
                    onClick={() => {
                      const fullUrl = `${api.defaults.baseURL || "https://casegrid-backend.onrender.com"}${c.photo_url}`;
                      setPreviewDoc({ filename: "Geotag_Photo.jpg", isDirect: true, isImg: true });
                      setPreviewUrl(fullUrl);
                    }}
                  >
                    <img
                      src={`${api.defaults.baseURL || "https://casegrid-backend.onrender.com"}${c.photo_url}`}
                      alt="Field evidence"
                      className="h-44 w-auto max-w-full rounded-lg object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/80 px-3 py-1.5 text-xs font-bold text-white shadow">
                        <Eye size={13} /> Click to View Full Photo
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Supporting documents</h2>
              <span className="text-xs text-muted font-medium">{docs.length} attached</span>
            </div>
            {docs.length === 0 && <p className="text-sm text-muted">No documents attached yet.</p>}
            <ul className="space-y-3 pt-1">
              {docs.map((d) => {
                const isImg = Boolean(d.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i));
                const isPdf = Boolean(d.filename.match(/\.pdf$/i));
                const thumbUrl = d.stored_name
                  ? `${api.defaults.baseURL || "https://casegrid-backend.onrender.com"}/complaints/documents/${d.stored_name}`
                  : null;

                return (
                  <li key={d.id} className="relative rounded-xl border border-line bg-surface p-2.5 transition hover:border-brand/70 shadow-xs">
                    <div className="flex items-start gap-3">
                      {isImg && thumbUrl ? (
                        <div
                          className="group/thumb relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line bg-raised hover:opacity-90"
                          onClick={() => openDocPreview(d)}
                          title="Click to preview"
                        >
                          <img
                            src={thumbUrl}
                            alt={d.filename}
                            className="h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition">
                            <Eye size={14} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-raised text-muted">
                          {isPdf ? <FileText size={22} className="text-danger" /> : isImg ? <Image size={22} className="text-brand" /> : <Paperclip size={20} />}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink" title={d.filename}>
                          {d.filename}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {Math.max(1, Math.round(d.size_bytes / 1024))} KB
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDocPreview(d)}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-raised px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-brand hover:bg-brand/10"
                          >
                            <Eye size={12} className="text-brand" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => download(`/complaints/${id}/documents/${d.id}/download`, {}, d.filename)}
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-raised px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-brand hover:bg-brand/10"
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>

                      {can("document:upload") && (
                        <button
                          type="button"
                          onClick={() => setRmDoc(d)}
                          aria-label={`Remove ${d.filename}`}
                          title="Remove this document"
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:bg-danger hover:text-white"
                        >
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {can("document:upload") && (
              <>
                <input
                  ref={file}
                  type="file"
                  className="sr-only"
                  id="up"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const fd = new FormData();
                      fd.append("file", e.target.files[0]);
                      act(() => api.post(`/complaints/${id}/documents`, fd), "Document attached");
                      e.target.value = "";
                    }
                  }}
                />
                <label htmlFor="up" className="btn mt-3 w-full cursor-pointer text-center block">
                  Attach a document
                </label>
              </>
            )}
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
          {rmDoc && (
        <Modal title="Remove this document?" onClose={() => setRmDoc(null)}>
          <p className="text-sm">You are about to remove <b>{rmDoc.filename}</b> from this case. Use this if it was attached by mistake. The removal is recorded in the case history.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn" onClick={() => setRmDoc(null)}>Keep document</button>
            <button className="btn btn-danger" onClick={() => { const d = rmDoc; setRmDoc(null); act(() => api.delete(`/complaints/${id}/documents/${d.id}`), "Document removed"); }}>Remove document</button>
          </div>
        </Modal>
      )}

      {previewDoc && (
        <Modal
          title={`Preview: ${previewDoc.filename}`}
          onClose={closeDocPreview}
          wide="xl"
        >
          <div className="space-y-4">
            {loadingPreview ? (
              <div className="flex h-72 flex-col items-center justify-center gap-3">
                <Spinner />
                <p className="text-xs text-muted">Loading document preview...</p>
              </div>
            ) : previewUrl ? (
              <div className="rounded-xl border border-line bg-raised p-2 text-center">
                {previewDoc.isImg || previewDoc.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <div className="flex justify-center overflow-auto max-h-[72vh]">
                    <img
                      src={previewUrl}
                      alt={previewDoc.filename}
                      className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow"
                    />
                  </div>
                ) : previewDoc.filename.match(/\.pdf$/i) ? (
                  <iframe
                    src={previewUrl}
                    title={previewDoc.filename}
                    className="h-[72vh] w-full rounded-lg border-0 bg-white"
                  />
                ) : (
                  <div className="py-12 text-center space-y-3">
                    <FileText size={48} className="mx-auto text-muted" />
                    <p className="text-sm font-semibold">Inline preview is not supported for this file type.</p>
                    {previewDoc.id && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => download(`/complaints/${id}/documents/${previewDoc.id}/download`, {}, previewDoc.filename)}
                      >
                        Download {previewDoc.filename}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-danger">Failed to display document preview.</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-xs text-muted truncate max-w-xs">{previewDoc.filename}</span>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn text-xs inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={12} />
                    <span>Open in new tab</span>
                  </a>
                )}
                {previewDoc.id && (
                  <button
                    type="button"
                    className="btn btn-primary text-xs inline-flex items-center gap-1.5"
                    onClick={() => download(`/complaints/${id}/documents/${previewDoc.id}/download`, {}, previewDoc.filename)}
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                )}
                <button type="button" className="btn text-xs" onClick={closeDocPreview}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}