import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errText } from "../api";
import { useAuth } from "../auth";
import { Card, Empty, Field, H, Spinner, Tag, fmtDT, useToast } from "../ui";

const KIND = { pending: ["brand", "Due soon"], overdue: ["danger", "Overdue"], escalated: ["danger", "Escalated"], overlap: ["brand", "Overlap Alert"] };

export default function Alerts() {
  const { can } = useAuth();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [run, setRun] = useState(null);
  const load = () => api.get("/notifications").then((r) => setList(r.data));
  useEffect(() => { load(); api.get("/config").then((r) => setCfg(r.data)); }, []);
  const edit = can("config:manage");
  const saveCfg = async () => {
    try { const r = await api.put("/config", { warn_days: Number(cfg.warn_days), escalation_days: Number(cfg.escalation_days), sla_days: Object.fromEntries(Object.entries(cfg.sla_days).map(([k, v]) => [k, Number(v)])) }); setCfg(r.data); toast("Thresholds saved"); }
    catch (e) { toast(errText(e), "err"); }
  };
  if (!list || !cfg) return <Spinner />;
  const unread = list.filter((n) => !n.is_read).length;
  return (
    <>
      <H title="Alerts and reminders" sub="A case is pending when its deadline is close, and overdue once the deadline has passed. Each alert is created once, however often the check runs.">
        {can("alerts:run") && <button className="btn btn-primary" onClick={async () => { const r = await api.post("/alerts/run"); setRun(r.data); toast(`${r.data.created} new, ${r.data.suppressed_duplicates} duplicate(s) suppressed`); load(); }}>Run alert check</button>}
      </H>
      {run && <div className="mb-4 rounded-lg border border-accent/70 bg-accent/10 p-3 text-sm font-semibold">Checked {run.checked} open cases. Created {run.created} new alert(s) and suppressed {run.suppressed_duplicates} duplicate(s).</div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Card className="space-y-3">
          <h2 className="font-display text-xl font-bold">Thresholds</h2>
          <Field label="Remind when due within (days)"><input className="field" type="number" min={0} disabled={!edit} value={cfg.warn_days} onChange={(e) => setCfg({ ...cfg, warn_days: e.target.value })} /></Field>
          <Field label="Escalate when overdue by (days)"><input className="field" type="number" min={1} disabled={!edit} value={cfg.escalation_days} onChange={(e) => setCfg({ ...cfg, escalation_days: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-2">{["High", "Medium", "Low"].map((p) => <Field key={p} label={`${p} (days)`}><input className="field" type="number" min={1} disabled={!edit} value={cfg.sla_days[p]} onChange={(e) => setCfg({ ...cfg, sla_days: { ...cfg.sla_days, [p]: e.target.value } })} /></Field>)}</div>
          <p className="text-xs text-muted">Resolution deadlines by priority. Changing them affects new cases and cases whose priority is edited.</p>
          {edit ? <button className="btn btn-primary w-full" onClick={saveCfg}>Save thresholds</button> : <p className="text-xs text-muted">Only an administrator can change thresholds.</p>}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Your notifications</h2><Tag tone={unread ? "brand" : "muted"}>{unread} unread</Tag></div>
          {list.length === 0 ? <Empty title="No notifications yet" hint="Run the alert check to generate reminders." /> : (
            <ul className="divide-y divide-line">{list.map((n) => { const [tone, label] = KIND[n.kind] || ["plain", n.kind]; return (
              <li key={n.id} className={`flex flex-wrap items-center gap-3 py-3 ${n.is_read ? "opacity-60" : ""}`}>
                <Tag tone={tone}>{label}</Tag><div className="min-w-0 flex-1"><Link to={`/cases/${n.case_id}`} className="text-sm font-semibold hover:underline">{n.message}</Link><div className="text-xs text-muted">{fmtDT(n.created_at)}{n.recipient_role ? `, for ${n.recipient_role}` : ""}</div></div>
                {!n.is_read && <button className="btn" onClick={async () => { await api.post(`/notifications/${n.id}/read`); load(); }}>Mark read</button>}</li>); })}</ul>)}
        </Card>
      </div>
    </>
  );
}
