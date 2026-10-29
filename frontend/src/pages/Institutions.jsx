import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errText } from "../api";
import { useAuth } from "../auth";
import { Empty, Field, H, Modal, Spinner, Tag, useToast } from "../ui";

function AddModal({ onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", state: "", city: "", inst_type: "", affiliating_body: "", contact_email: "" });
  const [dups, setDups] = useState(null);
  const save = async (confirm) => {
    try { await api.post("/institutions", { ...f, confirm_distinct: confirm }); toast("Institution created"); onDone(); }
    catch (e) { if (e.response?.status === 409) setDups(e.response.data.detail); else toast(errText(e), "err"); }
  };
  return (
    <Modal title="Add institution" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Official name"><input className="field" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setDups(null); }} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="State"><input className="field" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field><Field label="City"><input className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Type"><input className="field" value={f.inst_type} onChange={(e) => setF({ ...f, inst_type: e.target.value })} /></Field><Field label="Contact email"><input className="field" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></Field></div>
        {dups && (
          <div className="rounded-lg border border-accent/70 bg-accent/10 p-4">
            <div className="font-bold">This may already exist</div><p className="mb-2 text-sm">Check these before creating a second record:</p>
            <ul className="space-y-1 text-sm">{dups.matches.map((m) => <li key={m.code}><b>{m.code}</b> {m.name}, {Math.round(m.confidence * 100)}% match ({m.reason})</li>)}</ul>
            <button className="btn mt-3" onClick={() => save(true)}>I verified it is a different institution</button>
          </div>)}
      </div>
      <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.name.length < 3 || !!dups} onClick={() => save(false)}>Create institution</button></div>
    </Modal>
  );
}

export default function Institutions() {
  const { can } = useAuth();
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [add, setAdd] = useState(false);
  const load = () => api.get("/institutions", { params: { q, size: 100 } }).then((r) => setData(r.data));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);
  return (
    <>
      <H title="Institutions" sub="The institution ID is the stable key that ties every complaint to one record.">
        {can("institution:write") && <button className="btn btn-primary" onClick={() => setAdd(true)}>Add institution</button>}
      </H>
      <input className="field mb-4 max-w-md" placeholder="Search by name, ID or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search institutions" />
      {!data ? <Spinner /> : data.items.length === 0 ? <Empty title="No institutions found" hint="Try another spelling or the institution ID." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((i) => (
            <Link key={i.id} to={`/institutions/${i.id}`} className="card group transition hover:border-brand">
              <div className="flex items-start justify-between gap-2"><h2 className="font-display text-xl font-bold leading-tight">{i.name}</h2><Tag tone="ink">{i.code}</Tag></div>
              <p className="mt-1 text-sm text-muted">{i.city}, {i.state}. {i.inst_type}</p>
              <div className="mt-4 flex items-end justify-between"><div><span className="font-display text-4xl font-bold">{i.case_count}</span><span className="ml-1 text-sm text-muted">case{i.case_count === 1 ? "" : "s"} you can see</span></div><span className="h-1.5 w-12 rounded-full bg-accent transition-all group-hover:w-20" /></div>
            </Link>))}
        </div>)}
      {add && <AddModal onClose={() => setAdd(false)} onDone={() => { setAdd(false); load(); }} />}
    </>
  );
}
