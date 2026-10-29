
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { describeAudit } from "../auditText";
import { Card, H, Spinner, Tag, fmtDT } from "../ui";

export default function Audit() {
  const [rows, setRows] = useState(null);
  const [action, setAction] = useState("");
  const [fails, setFails] = useState(false);
  const [error, setError] = useState("");

  // Fetch audit events from the backend
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      setError("");

      api
        .get("/audit", {
          params: {
            limit: 300,
            ...(fails ? { success: false } : {}),
          },
        })
        .then((response) => {
          if (!cancelled) {
            setRows(Array.isArray(response.data) ? response.data : []);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setRows([]);
            setError(
              err?.response?.data?.detail ||
                err?.message ||
                "Could not load the audit trail."
            );
          }
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fails]);

  // Filter audit events using the search input
  const shown = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    const query = action.trim().toLowerCase();

    return rows.filter((event) => {
      const description = describeAudit(event) || {};

      const searchableText = [
        event.actor,
        event.action,
        event.entity,
        event.entity_id,
        event.detail,
        description.label,
        description.target,
        description.detail,
      ]
        .filter((value) => value != null)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [rows, action]);

  return (
    <>
      <H
        title="Audit trail"
        sub="Security and operational events: sign-ins, denied access, assignments, decisions, exports and configuration changes."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="field max-w-sm"
          placeholder="Search, e.g. signed in, report, CMP-2026-000007"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          aria-label="Search the audit trail"
        />

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={fails}
            onChange={(event) => setFails(event.target.checked)}
          />
          Failed or denied only
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          Failed to load audit events: {error}
        </div>
      )}

      {rows === null ? (
        <Spinner />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                {[
                  "When",
                  "Who",
                  "Action",
                  "Target",
                  "Detail",
                  "Result",
                ].map((heading) => (
                  <th key={heading} className="th">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {shown.map((event) => {
                const description = describeAudit(event) || {};

                return (
                  <tr key={event.id}>
                    <td className="td">{fmtDT(event.at)}</td>

                    <td className="td">
                      {event.actor || "System"}
                    </td>

                    <td className="td font-semibold">
                      {description.label || event.action || "Event"}
                    </td>

                    <td className="td">
                      {description.target || event.entity || "—"}
                    </td>

                    <td
                      className="td max-w-[460px] whitespace-normal"
                      title={description.detail || event.detail || ""}
                    >
                      {description.detail || event.detail || "—"}
                    </td>

                    <td className="td">
                      <Tag tone={event.success ? "good" : "danger"}>
                        {event.success ? "Success" : "Denied"}
                      </Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {rows !== null && shown.length === 0 && !error && (
        <p className="mt-4 text-sm text-muted">
          No events match this filter.
        </p>
      )}
    </>
  );
}
