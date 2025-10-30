import React, { useEffect, useMemo, useState } from "react";

type AuditItem = {
  id?: string;
  ts?: string;
  time?: string;
  createdAt?: string;
  user?: string;
  action?: string;
  target?: string;
  status?: string; // SUCCESS / DENY / ERROR
  sensitivity?: string; // normal / sensitive
  ip?: string;
  requestId?: string; // Axios interceptor will add X-Request-ID
  method?: string;
  path?: string;
  clientTime?: string; // X-Client-Time
  [k: string]: unknown;
};

function pickTime(x: AuditItem) {
  return x.ts || x.time || x.createdAt || "";
}

function fmtTime(s?: string) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toStr(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function coerceAuditItems(u: unknown): AuditItem[] {
  if (Array.isArray(u)) {
    return u.filter(isRecord) as AuditItem[];
  }
  if (isRecord(u) && Array.isArray((u as { items?: unknown }).items)) {
    const arr = (u as { items?: unknown[] }).items!;
    return arr.filter(isRecord) as AuditItem[];
  }
  return [];
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sev, setSev] = useState<string>(""); // Empty means no filtering
  const [expanded, setExpanded] = useState<string | null>(null); // Expand to see details
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // === NEW: 弹窗开关 ===
  const [sensOpen, setSensOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [query, sev]);

  function isSensitive(x: AuditItem) {
    return (x.sensitivity || "").toLowerCase() === "sensitive";
  }

  function rowStyle(x: AuditItem): React.CSSProperties {
    if (!isSensitive(x)) return { cursor: "pointer" };
    return {
      cursor: "pointer",
      background: "rgba(217,48,37,0.06)",
      boxShadow: "inset 6px 0 0 #d93025",
    };
  }

  function SensBadge({ val }: { val?: string }) {
    const v = (val || "").toLowerCase();
    const sensitive = v === "sensitive";
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 999,
          fontSize: 12,
          background: sensitive ? "#ffe8e6" : "#eef7ff",
          color: sensitive ? "#7a1212" : "#0b4a91",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
        aria-label={sensitive ? "Sensitive event" : "Normal event"}
        title={sensitive ? "Sensitive event" : "Normal event"}
      >
        {sensitive ? "🛡 Sensitive" : "Normal"}
      </span>
    );
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // Development: use public/audit.json
      const useJSON = true; // Switch to false when we want to call the real backend
      if (useJSON) {
        const res = await fetch(`/audit.json`);
        const raw: unknown = await res.json();
        const arr = coerceAuditItems(raw);
        setItems(arr);
        return;
      }

      // —— Real backend (for future switch-over) ——
      const mod = await import("../lib/api");
      const api: { get: (url: string) => Promise<{ data: unknown }> } = (
        mod as {
          api: { get: (url: string) => Promise<{ data: unknown }> };
        }
      ).api;

      const r = await api.get("/audit-logs");
      const arr = coerceAuditItems(r.data);
      setItems(arr);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((x) => !sev || (x.sensitivity || "").toLowerCase() === sev)
      .filter((x) => {
        if (!q) return true;
        const hay = [
          x.user,
          x.action,
          x.target,
          x.status,
          x.ip,
          x.requestId,
          x.path,
          pickTime(x),
        ]
          .map((v) => toStr(v).toLowerCase())
          .join(" ");
        return hay.includes(q);
      })
      .sort((a, b) => {
        // In reverse time order
        const ta = +new Date(pickTime(a) || 0);
        const tb = +new Date(pickTime(b) || 0);
        return tb - ta;
      });
  }, [items, query, sev]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingTo = Math.min(safePage * pageSize, filtered.length);

  // === NEW: 统计敏感事件，并在进入页面/加载完成后弹窗 ===
  const sensitiveItems = useMemo(() => items.filter(isSensitive), [items]);

  useEffect(() => {
    if (sensitiveItems.length > 0) {
      setSensOpen(true);
    }
  }, [sensitiveItems.length]);

  function exportCSV() {
    const headers = [
      "time",
      "user",
      "action",
      "target",
      "status",
      "sensitivity",
      "ip",
      "requestId",
      "method",
      "path",
    ];
    const rows = filtered.map((x) => [
      pickTime(x),
      toStr(x.user),
      toStr(x.action),
      toStr(x.target),
      toStr(x.status),
      toStr(x.sensitivity),
      toStr(x.ip),
      toStr(x.requestId),
      toStr(x.method),
      toStr(x.path),
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((v) => {
            const s = toStr(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Audit Logs</h2>

      {/* === NEW: 页面内弹窗（仅当有敏感事件时显示） === */}
      {sensOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setSensOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 16,
              width: "min(560px, 92vw)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Sensitive audit events detected</h3>
            <p style={{ marginTop: 8 }}>
              There are <b>{sensitiveItems.length}</b> sensitive audit event(s)
              that may require immediate review.
            </p>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setSev("sensitive"); // 一键切到“只看敏感”
                  setPage(1);
                  setSensOpen(false);
                }}
              >
                View sensitive only
              </button>
              <button onClick={() => setSensOpen(false)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Search user/action/target/ip/requestId…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: 6, minWidth: 320 }}
        />
        <select
          value={sev}
          onChange={(e) => setSev(e.target.value)}
          style={{ padding: 6 }}
        >
          <option value="">All sensitivities</option>
          <option value="normal">normal</option>
          <option value="sensitive">sensitive</option>
        </select>
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
        <button onClick={exportCSV} disabled={!filtered.length}>
          Export CSV
        </button>
        {err && (
          <span style={{ color: "crimson", marginLeft: 8 }}>Error: {err}</span>
        )}
      </div>

      {!loading && !err && filtered.length === 0 && (
        <div style={{ opacity: 0.8 }}>No audit records.</div>
      )}

      <table
        border={1}
        cellPadding={6}
        cellSpacing={0}
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ background: "#f6f6f6" }}>
            <th style={{ textAlign: "left" }}>Time</th>
            <th style={{ textAlign: "left" }}>User</th>
            <th style={{ textAlign: "left" }}>Action</th>
            <th style={{ textAlign: "left" }}>Target</th>
            <th style={{ textAlign: "left" }}>Status</th>
            <th style={{ textAlign: "left" }}>Sensitivity</th>
            <th style={{ textAlign: "left" }}>IP</th>
            <th style={{ textAlign: "left" }}>Request ID</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((x, idx) => {
            const id =
              x.id ||
              `${pickTime(x)}-${x.user}-${(safePage - 1) * pageSize + idx}`;
            const isOpen = expanded === id;
            return (
              <React.Fragment key={id}>
                <tr
                  onClick={() => setExpanded(isOpen ? null : id)}
                  style={rowStyle(x)}
                >
                  <td>{fmtTime(pickTime(x))}</td>
                  <td>{toStr(x.user) || "-"}</td>
                  <td>{toStr(x.action) || "-"}</td>
                  <td>{toStr(x.target) || "-"}</td>
                  <td>{toStr(x.status) || "-"}</td>
                  <td>
                    <SensBadge
                      val={
                        typeof x.sensitivity === "string"
                          ? x.sensitivity
                          : undefined
                      }
                    />
                  </td>
                  <td>{toStr(x.ip) || "-"}</td>
                  <td>{toStr(x.requestId) || "-"}</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={8} style={{ background: "#fafafa" }}>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {JSON.stringify(x, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ opacity: 0.7 }}>
          Showing {showingFrom}-{showingTo} of {filtered.length}
        </span>

        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          Prev
        </button>

        {/* page button：1..totalPages */}
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              disabled={n === safePage}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: n === safePage ? "1px solid #999" : "1px solid #ddd",
                background: n === safePage ? "#eee" : "#fff",
              }}
              aria-current={n === safePage ? "page" : undefined}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
