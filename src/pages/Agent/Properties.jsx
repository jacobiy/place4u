import { useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { T } from "./Styles/designTokens";
import { SecondaryBtn } from "./Component/Buttons";

export const Properties = ({ properties, onRefresh, loading }) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => {
      return (
        (p.address || "").toLowerCase().includes(q) ||
        (p.area || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.property_type || "").toLowerCase().includes(q)
      );
    });
  }, [properties, query]);

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

  const placeholderImage = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=60";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, lineHeight: 1, marginBottom: "6px" }}>
            Properties
          </h1>
          <p style={{ color: T.textMuted, fontSize: "0.9rem" }}>Browse active listings in the database</p>
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
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by address, area, city, type..." style={{ ...inputStyle, width: "100%", paddingLeft: "36px" }} />
        </div>
      </div>

      {loading ? (
        <p style={{ color: T.textMuted }}>Loading properties…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}>
          <p style={{ color: T.textSecondary, fontWeight: 600 }}>No properties found</p>
          <p style={{ color: T.textMuted, marginTop: "6px" }}>If landlords haven't uploaded listings yet, this will be empty.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", overflow: "hidden" }}>
              <div style={{ height: "160px", overflow: "hidden" }}>
                <img src={p.image_url || placeholderImage} alt={p.address} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ padding: "1rem 1.25rem" }}>
                <p style={{ color: T.textPrimary, fontWeight: 700, textTransform: "capitalize" }}>{p.property_type}</p>
                <p style={{ color: T.textMuted, fontSize: "0.85rem", marginTop: "4px" }}>{p.area}, {p.city}{p.province ? `, ${p.province}` : ""}</p>
                <p style={{ color: T.textSecondary, fontSize: "0.85rem", marginTop: "10px" }}>{p.address}</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: T.textSecondary, background: T.surface, border: `1px solid ${T.border}`, padding: "4px 10px", borderRadius: "999px" }}>
                    R{Number(p.price).toLocaleString()}/mo
                  </span>
                  {typeof p.bedrooms === "number" && (
                    <span style={{ fontSize: "0.75rem", color: T.textSecondary, background: T.surface, border: `1px solid ${T.border}`, padding: "4px 10px", borderRadius: "999px" }}>
                      {p.bedrooms} bd
                    </span>
                  )}
                  {typeof p.bathrooms === "number" && (
                    <span style={{ fontSize: "0.75rem", color: T.textSecondary, background: T.surface, border: `1px solid ${T.border}`, padding: "4px 10px", borderRadius: "999px" }}>
                      {p.bathrooms} ba
                    </span>
                  )}
                  {p.furnished && (
                    <span style={{ fontSize: "0.75rem", color: T.textSecondary, background: T.surface, border: `1px solid ${T.border}`, padding: "4px 10px", borderRadius: "999px" }}>
                      Furnished
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

