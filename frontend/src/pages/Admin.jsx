import { useEffect, useState } from "react";
import api, { errText } from "../api";
import { Card, Field, H, Select, Spinner, Tag, useToast } from "../ui";

export default function Admin() {
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [roles, setRoles] = useState([]);
  const [bureaus, setBureaus] = useState([]);
  const [f, setF] = useState({ username: "", full_name: "", password: "", role_id: "", bureau_id: "" });
  const load = () => api.get("/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); api.get("/roles").then((r) => setRoles(r.data)); api.get("/bureaus").then((r) => setBureaus(r.data)); }, []);
  if (!users) return <Spinner />;
  const role = roles.find((r) => String(r.id) === String(f.role_id));
  return (
    <>
      <H title="Users and roles" sub="Access is enforced by the server from the role and, for officers, the bureau they belong to." />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-x-auto p-0"><table className="w-full"><thead className="border-b border-line"><tr>{["Name", "Username", "Role", "Bureau or cell", "Scope"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{users.map((u) => <tr key={u.id}><td className="td font-semibold">{u.full_name}</td><td className="td">{u.username}</td><td className="td"><Tag tone="ink">{u.role.name.replace("_", " ")}</Tag></td><td className="td">{u.bureau?.name || "-"}</td><td className="td">{u.role.all_bureaus ? "All bureaus" : "Own bureau only"}</td></tr>)}</tbody></table></Card>
        <Card className="space-y-3"><h2 className="font-display text-xl font-bold">Add user</h2>
          <Field label="Full name"><input className="field" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
          <Field label="Username"><input className="field" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></Field>
          <Field label="Password" hint="At least 8 characters."><input type="password" className="field" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field label="Role"><Select value={f.role_id} onChange={(v) => setF({ ...f, role_id: v })} placeholder="Choose role" options={roles.map((r) => ({ value: r.id, label: r.name.replace("_", " ") }))} /></Field>
          {role && !role.all_bureaus && <Field label="Bureau or cell"><Select value={f.bureau_id} onChange={(v) => setF({ ...f, bureau_id: v })} placeholder="Choose unit" options={bureaus.filter((b) => !b.is_review_queue).map((b) => ({ value: b.id, label: b.name }))} /></Field>}
          <button className="btn btn-primary w-full" disabled={!f.username || !f.full_name || f.password.length < 8 || !f.role_id}
            onClick={async () => { try { await api.post("/users", { ...f, role_id: Number(f.role_id), bureau_id: f.bureau_id ? Number(f.bureau_id) : null }); toast("User created"); setF({ username: "", full_name: "", password: "", role_id: "", bureau_id: "" }); load(); } catch (e) { toast(errText(e), "err"); } }}>Create user</button>
        </Card>
      </div>
    </>
  );
}
