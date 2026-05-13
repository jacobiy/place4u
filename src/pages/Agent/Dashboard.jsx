import { T } from "./Styles/designTokens";
import { StatCard } from "./Component/StatCard";

export const Dashboard = ({ agentName, stats }) => {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "2rem", color: T.textMuted, marginTop: "2px" }}>Agent Portal</p>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2rem", color: T.textPrimary, marginBottom: "8px" }}>
          Welcome back{agentName ? `, ${agentName}` : ""}
        </h1>
        <p style={{ color: T.textMuted }}>Review applications and help tenants shortlist options.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", padding: "1.25rem 1.5rem" }}>
        <h3 style={{ color: T.textPrimary, fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Workflow</h3>
        <p style={{ color: T.textSecondary, lineHeight: 1.6, fontSize: "0.9rem" }}>
          Tenants submit an application → Place4U agents scan available listings → agents message tenants with shortlist options → tenant chooses → we proceed with next steps.
        </p>
      </div>
    </div>
  );
};

