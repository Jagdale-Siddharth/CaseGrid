import { useEffect, useState } from "react";
import api from "../api";
import { Card, H, Spinner, Tag, fmtDT } from "../ui";

export default function Audit() {
  const [rows, setRows] = useState(null);
  const [action, setAction] = useState("");
  const [fails, setFails] = useState(false);
  useEffect(() => { const t = setTimeout(() => api.get("/audit", { params: { action, limit: 300, ...(fails ? { success: false } : {}) } }).then((r) => setRows(r.data)), 200); return () => clearTimeout(t); }, [action, fails]);
  return (
    <>
      <H title="Audit trail" sub="Security and operational events: sign-ins, denied access, assignments, decisions, exports and configuration changes." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="field max-w-xs" placeholder="Filter by action, e.g. overlap or login" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action" />
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={fails} onChange={(e) => setFails(e.target.checked)} />Failed or denied only</label>
      </div>
      {!rows ? <Spinner /> : (
        <Card className="overflow-x-auto p-0"><table className="w-full"><thead className="border-b border-line"><tr>{["When", "Who", "Action", "Target", "Detail", "Result"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{rows.map((a) => (
            <tr key={a.id}><td className="td">{fmtDT(a.at)}</td><td className="td">{a.actor}</td><td className="td font-semibold">{a.action}</td><td className="td">{a.entity_id || a.entity}</td><td className="td max-w-[420px] truncate" title={a.detail}>{a.detail}</td><td className="td"><Tag tone={a.success ? "good" : "danger"}>{a.success ? "OK" : "Denied"}</Tag></td></tr>))}</tbody></table></Card>)}
    </>
  );
}
