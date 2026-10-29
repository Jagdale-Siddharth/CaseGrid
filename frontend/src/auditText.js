// Turns raw audit-trail records into plain sentences an officer can read.
// Handles both new records and older ones already stored in the database.

const PERM = {
  "case:read": "view cases", "case:create": "register cases", "case:update": "edit case details", "case:status": "change case status",
  "case:reopen": "reopen cases", "case:assign": "reassign cases", "case:note": "add notes", "document:upload": "attach or remove documents",
  "link:review": "review related cases", "overlap:scan": "run a related-case scan", "report:view": "view reports", "report:export": "export reports",
  "institution:read": "view institutions", "institution:write": "edit institutions", "alerts:run": "run alert checks", "audit:read": "view the audit trail",
  "config:manage": "change system settings", "routing:manage": "manage routing rules", "user:manage": "manage users", "dashboard:view": "view the dashboard",
};
const FIELD = { priority: "Priority", subject: "Subject", description: "Description", category: "Category", status: "Status", institution_id: "Institution", sla_days: "Deadline days (SLA)", categories: "Complaint categories", overlap_threshold: "Related-case sensitivity", overlap_window_days: "Related-case time window", remind_days: "Reminder days", escalate_days: "Escalation days" };
const field = (k) => FIELD[k] || k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const arrow = (s) => s.replace(/\s*->\s*/g, " \u2192 ");

const LABEL = {
  "login.success": "Signed in", "login.failure": "Failed sign-in attempt", "login.locked": "Sign-in blocked (account locked)",
  "access.denied": "Access denied",
  "case.create": "Case registered", "case.create_citizen": "Case registered by a citizen", "case.update": "Case details edited",
  "case.status": "Case status changed", "case.assign": "Case reassigned", "case.note": "Note added to case",
  "case.document": "Document attached", "case.document.remove": "Document removed",
  "overlap.link": "Related cases linked", "overlap.dismiss": "Related-case suggestion dismissed", "overlap.unlink": "Related cases unlinked",
  "overlap.manual": "Cases linked manually", "overlap.scan": "Related-case scan run",
  "report.export": "Report exported", "config.update": "System settings changed", "routing.create": "Routing rule added", "routing.update": "Routing rule changed",
  "user.create": "User account created", "institution.create": "Institution added", "institution.update": "Institution details edited",
  "alerts.run": "Alert check run", "backup.export": "Data backup downloaded", seed: "Demo data loaded",
};

function exportDetail(d) {
  const m = d.match(/^(\d+) rows; filters: inst=(\S*) bureau=(\S*) cat=(.*?) status=(.*?) state=(.*?) (\S*)\.\.(\S*)$/);
  if (!m) return d;
  const [, n, inst, bureau, cat, status, state, from, to] = m;
  const f = [];
  if (inst && inst !== "None") f.push("one institution");
  if (bureau && bureau !== "None") f.push("one bureau or cell");
  if (cat) f.push(`category ${cat}`);
  if (status) f.push(`status ${status}`);
  if (state) f.push(`state ${state}`);
  if (from) f.push(`from ${from}`);
  if (to) f.push(`until ${to}`);
  return `${n} case${n === "1" ? "" : "s"} included. ${f.length ? `Filtered by ${f.join(", ")}.` : "No filters applied (all cases the officer can see)."}`;
}

function routingChange(d) {
  const m = d.match(/^(.*?)->(\d+) verified=(\w+) active=(\w+) => (.*?)->(\d+) verified=(\w+) active=(\w+)$/);
  if (!m) return d;
  const [, cat, b1, v1, a1, , b2, v2, a2] = m;
  const out = [];
  if (b1 !== b2) out.push("destination bureau changed");
  if (v1 !== v2) out.push(v2 === "True" ? "marked as verified" : "marked as unverified");
  if (a1 !== a2) out.push(a2 === "True" ? "switched on" : "switched off");
  return `Rule for \u201c${cat}\u201d: ${out.join(", ") || "saved without changes"}.`;
}

export function describeAudit(a) {
  const act = a.action, d = (a.detail || "").trim();
  let label = LABEL[act] || act.replace(/[._]/g, " ").replace(/^./, (c) => c.toUpperCase());
  let target = a.entity_id || "";
  let detail = d;

  if (act.startsWith("login.")) target = "";
  if (act === "login.failure") detail = d.replace(/^username=/, "Username entered: ");
  else if (act === "login.locked") detail = "Tried to sign in while the account was locked.";
  else if (act === "login.success") detail = "Signed in to the portal.";
  else if (act === "access.denied") {
    if (/outside user scope/.test(d)) detail = "Tried to open a case that belongs to another bureau or cell.";
    else if (/^status /.test(d)) detail = `Tried to change case status (${arrow(d.replace(/^status /, ""))}) without permission.`;
    else {
      const perms = [...d.matchAll(/'([a-z_]+:[a-z_]+)'/g)].map((x) => PERM[x[1]] || x[1]);
      detail = perms.length ? `Tried to ${perms.join(" or ")} without permission.` : "Tried an action that this role is not allowed to do.";
    }
    if (a.entity === "permission") target = "";
  } else if (act === "case.update") detail = d ? `Changed: ${d.split(",").map((x) => field(x.trim())).join(", ")}.` : "";
  else if (act === "case.status") detail = arrow(d);
  else if (act === "case.assign") { const m = d.match(/^(.*?) -> (.*?): (.*)$/); detail = m ? `From ${m[1]} to ${m[2]}. Reason: ${m[3]}` : arrow(d); }
  else if (act === "case.document") detail = d ? `File: ${d}` : "";
  else if (act === "case.document.remove") detail = d ? `File removed: ${d}` : "";
  else if (act.startsWith("overlap.") && act !== "overlap.scan" && act !== "overlap.manual") {
    const m = d.match(/^(CMP-[\d-]+)\/(CMP-[\d-]+): (.*)$/);
    detail = m ? `Between ${m[1]} and ${m[2]}. Reason: ${m[3]}` : d;
    target = "";
  } else if (act === "overlap.manual") { detail = d ? `Reason: ${d}` : ""; target = ""; }
  else if (act === "overlap.scan") detail = d.replace(/(\d+) new suggestion\(s\)/, (_, n) => `${n} new related-case suggestion${n === "1" ? "" : "s"} found.`);
  else if (act === "report.export") { detail = exportDetail(d); target = target ? `${target.toUpperCase()} file` : ""; }
  else if (act === "config.update") {
    const keys = [...new Set([...d.matchAll(/'([a-z_]+)':/g)].map((x) => x[1]))];
    detail = keys.length ? `Updated: ${keys.map(field).join(", ")}.` : d; target = "";
  } else if (act === "routing.create") { const m = d.match(/^(.*?) -> bureau (\d+)$/); detail = m ? `New rule for \u201c${m[1]}\u201d.` : d; target = ""; }
  else if (act === "routing.update") { detail = routingChange(d); target = ""; }
  else if (act === "user.create") { detail = `New account created for ${a.entity_id}.`; target = a.entity_id; }
  else if (act === "institution.create") detail = d ? `Added ${d}.` : "";
  else if (act === "institution.update") detail = d ? `Changed: ${d.split(",").map((x) => field(x.trim())).join(", ")}.` : "";
  else if (act === "alerts.run") { const m = d.match(/created=(\d+) suppressed_duplicates=(\d+)/); detail = m ? `${m[1]} new alert${m[1] === "1" ? "" : "s"} created, ${m[2]} duplicate${m[2] === "1" ? "" : "s"} skipped.` : d; target = ""; }
  else if (act === "backup.export" || act === "seed") target = "";

  if (a.entity === "case_link" || a.entity === "routing_rule" || a.entity === "settings" || a.entity === "system" || a.entity === "notification") target = "";
  return { label, target: target || "\u2014", detail: detail || "\u2014" };
}