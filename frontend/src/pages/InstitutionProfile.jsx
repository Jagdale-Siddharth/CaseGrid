import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { Card, Empty, H, SlaTag, Spinner, StatusTag, Tag, fmtDate } from "../ui";

export default function InstitutionProfile() {
  const { id } = useParams();
  const [i, setI] = useState(null);
  const [cases, setCases] = useState(null);
  useEffect(() => { api.get(`/institutions/${id}`).then((r) => setI(r.data)); api.get(`/institutions/${id}/cases`).then((r) => setCases(r.data)); }, [id]);
  if (!i || !cases) return <Spinner />;
  const facts = [["State", i.state], ["City", i.city], ["Type", i.inst_type], ["Affiliating body", i.affiliating_body], ["Established", i.established_year], ["Contact", i.contact_email], ["Status", i.status], ["Also known as", (i.aliases || []).join(", ") || "-"]];
  const byDate = [...cases.items].sort((a, b) => b.registered_on.localeCompare(a.registered_on));
  return (
    <>
      <Link to="/institutions" className="text-sm font-semibold text-muted hover:text-ink">All institutions</Link>
      <H title={i.name} sub={`Institution ID ${i.code}`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <Card><h2 className="mb-3 font-display text-xl font-bold">Profile</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">{facts.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold text-muted">{k}</dt><dd>{v || "-"}</dd></div>)}</dl></Card>
        <Card><h2 className="mb-3 font-display text-xl font-bold">Complaints by bureau or cell</h2>
          <div className="flex flex-wrap gap-3">{Object.entries(cases.by_bureau).map(([b, n]) => <div key={b} className="min-w-[130px] rounded-xl border border-line p-3"><div className="font-display text-3xl font-bold">{n}</div><div className="text-xs font-semibold text-muted">{b}</div></div>)}
            {Object.keys(cases.by_bureau).length === 0 && <p className="text-sm text-muted">No cases in your scope.</p>}</div>
          {cases.outside_scope_count > 0 && <p className="mt-3 rounded-lg bg-raised p-2.5 text-xs">{cases.outside_scope_count} more case{cases.outside_scope_count > 1 ? "s are" : " is"} handled by other bureaus and hidden by your access scope.</p>}</Card>
      </div>
      <Card className="mt-4"><h2 className="mb-4 font-display text-xl font-bold">Complaint history across bureaus</h2>
        {byDate.length === 0 ? <Empty title="No visible complaints" /> : (
          <ol className="relative space-y-4 border-l-2 border-brand/80 pl-5">{byDate.map((c) => (
            <li key={c.id} className="relative"><span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full border-2 border-brand bg-brand" />
              <Link to={`/cases/${c.case_id}`} className="block rounded-lg border border-line p-3 transition hover:border-brand">
                <div className="flex flex-wrap items-center gap-2"><b>{c.case_id}</b><Tag tone="ink">{c.bureau.name}</Tag><StatusTag s={c.status} /><SlaTag sla={c.sla} /></div>
                <div className="mt-1 font-semibold">{c.subject}</div><div className="text-xs text-muted">{c.category}, registered {fmtDate(c.registered_on)}, officer {c.officer?.full_name || "unassigned"}</div></Link></li>))}</ol>)}
      </Card>
    </>
  );
}
