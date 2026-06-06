import { useState, useEffect } from "react";
import { Users, Search, UserPlus, Filter } from "lucide-react";
import { T } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from './Component/Buttons';
import { supabase } from '../../utils/Supabase';

export const Tenants = ({ profile }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchTenants = async () => {
      setIsLoading(true);
      try {
        if (!profile?.id) return;
        // Attempt to fetch attached tenants if the table exists
        const { data, error } = await supabase
          .from('tenants')
          .select('*, user:user_id(email, full_name)')
          .eq('landlord_id', profile.id);
        
        if (!error && data && !cancelled) {
          setTenants(data);
        }
      } catch (err) {
        // Silently ignore if table doesn't exist yet
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchTenants();

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const inputStyle = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: "0.625rem", padding: "0.6rem 0.875rem",
    fontSize: "0.85rem", color: T.textPrimary, outline: "none", fontFamily: "inherit"
  };

  const filteredTenants = tenants.filter(t => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const name = (t.user?.full_name || "").toLowerCase();
    const email = (t.user?.email || "").toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  return (
    <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, lineHeight: 1, marginBottom: "6px" }}>
            Tenants
          </h1>
          <p style={{ color: T.textMuted, fontSize: "0.9rem" }}>Manage your tenant relationships, leases, and documents</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <PrimaryBtn>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <UserPlus size={14} /> Invite Tenant
            </span>
          </PrimaryBtn>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
          <Search size={16} color={T.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search tenants by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: "100%", paddingLeft: "40px" }}
          />
        </div>
        <SecondaryBtn>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={14} /> Filter
          </span>
        </SecondaryBtn>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p style={{ color: T.textSecondary }}>Loading tenants…</p>
        </div>
      ) : filteredTenants.length > 0 ? (
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          overflow: "hidden"
        }}>
          {/* Table Header Placeholder */}
          <div style={{ padding: "1.5rem" }}>
            <p style={{ color: T.textPrimary }}>You have {filteredTenants.length} tenants.</p>
          </div>
        </div>
      ) : (
        /* Beautiful Empty State */
        <div style={{
          background: T.cardBg,
          border: `1px dashed ${T.border}`,
          borderRadius: "1rem",
          padding: "5rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "rgba(79,126,248,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem"
          }}>
            <Users size={32} color={T.accent} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: T.textPrimary, marginBottom: "0.75rem" }}>
            You currently have no tenants attached
          </h2>
          <p style={{ color: T.textMuted, maxWidth: "400px", margin: "0 auto 2rem", lineHeight: 1.5 }}>
            Invite tenants to attach them to your properties. Once connected, you can manage leases, communicate, and track rent payments directly from this portal.
          </p>
          <PrimaryBtn>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <UserPlus size={16} /> Invite Your First Tenant
            </span>
          </PrimaryBtn>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
