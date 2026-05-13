import { useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { T } from "./Styles/designTokens";
import { PrimaryBtn, SecondaryBtn } from "./Component/Buttons";

export const Applications = ({ applications, tenantById, onRefresh, onUpdateStatus, loading }) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((a) => {
      const tenant = tenantById?.get(a.tenant_id);
      return (
        String(a.id).toLowerCase().includes(q) ||
        (a.status || "").toLowerCase().includes(q) ||
        (tenant?.full_name || "").toLowerCase().includes(q) ||
        (tenant?.email || "").toLowerCase().includes(q)
      );
    });
  }, [applications, query, tenantById]);

  const inputStyle = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: "0.625rem",
    padding: "0.6rem 0.875rem",
    fontSize: "0.85rem",
    color: T.textPrimary,
    outline: "none",
    fontFamily: "inherit"
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, lineHeight: 1, marginBottom: "6px" }}>
            Applications
          </h1>
          <p style={{ color: T.textMuted, fontSize: "0.9rem" }}>Review tenant applications and update their status</p>
        </div>
        <SecondaryBtn onClick={onRefresh} disabled={loading}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={14} /> Refresh
          </span>
        </SecondaryBtn>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} color={T.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by tenant, email, status..." style={{ ...inputStyle, width: "100%", paddingLeft: "36px" }} />
        </div>
      </div>

      {loading ? (
        <p style={{ color: T.textMuted }}>Loading applications…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: T.textSecondary, fontWeight: 600 }}>No applications found</p>
          <p style={{ color: T.textMuted, marginTop: "6px" }}>Once tenants submit applications, they will appear here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((a) => {
            const tenant = tenantById?.get(a.tenant_id);
            return (
              <div key={a.id} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ color: T.textPrimary, fontWeight: 700 }}>Application #{String(a.id).slice(0, 8)}</p>
                    <p style={{ color: T.textMuted, fontSize: "0.85rem", marginTop: "4px" }}>
                      Tenant: {tenant?.full_name || "Unknown"} {tenant?.email ? `· ${tenant.email}` : ""}
                    </p>
                    <p style={{ color: T.textMuted, fontSize: "0.8rem", marginTop: "4px" }}>
                      Submitted: {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: T.textSecondary, background: T.surface, border: `1px solid ${T.border}`, padding: "4px 10px", borderRadius: "999px" }}>
                      {a.status || "unknown"}
                    </span>
                    <select
                      value={a.status || "submitted"}
                      onChange={(e) => onUpdateStatus?.(a.id, e.target.value)}
                      style={{ ...inputStyle, padding: "0.45rem 0.65rem" }}
                    >
                      {["submitted", "under_review", "matches_found", "completed"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

