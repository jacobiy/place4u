import { T } from "./Styles/designTokens";

export const Profile = ({ userRow }) => {
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, lineHeight: 1, marginBottom: "6px" }}>
          My Profile
        </h1>
        <p style={{ color: T.textMuted, fontSize: "0.9rem" }}>Agent account details</p>
      </div>

      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", padding: "1.25rem 1.5rem" }}>
        <p style={{ color: T.textSecondary, marginBottom: "10px" }}>
          <span style={{ color: T.textMuted }}>Name:</span> {userRow?.full_name || "—"}
        </p>
        <p style={{ color: T.textSecondary, marginBottom: "10px" }}>
          <span style={{ color: T.textMuted }}>Email:</span> {userRow?.email || "—"}
        </p>
        <p style={{ color: T.textSecondary }}>
          <span style={{ color: T.textMuted }}>Role:</span> {userRow?.user_type || "agent"}
        </p>
      </div>
    </div>
  );
};

