import { TrendingUp, Home, Users, Calendar, MessageSquare, ArrowUpRight, ArrowDownRight, Building, Key, Percent, Activity, Plus, Edit, PlusCircle, CheckCircle, RefreshCw } from "lucide-react";
import { T } from './Styles/designTokens';
import { StatCard } from './Component/StatCard';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const getActivityIcon = (type) => {
  switch (type) {
    case 'property_created':
      return Plus;
    case 'property_updated':
      return Edit;
    default:
      return Activity;
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "recently";
  try {
    const past = new Date(dateStr);
    const now = new Date();
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  } catch {
    return "recently";
  }
};

export const Dashboard = ({ profile, stats = [], activities = [], propertyDistribution = [] }) => {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "2rem", color: T.textMuted, marginTop: "2px" }}>Landlord Portal</p>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, marginBottom: "8px" }}>
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p style={{ color: T.textMuted }}>Here's what's happening with your properties today.</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map((stat, index) => <StatCard key={index} {...stat} />)}
      </div>

      {/* Charts & Activity Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        
        {/* Property Distribution Card */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: T.textPrimary, marginBottom: "1rem" }}>Property Distribution</h3>
          {propertyDistribution.length === 0 ? (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              textAlign: "center"
            }}>
              <Building size={48} color={T.textMuted} style={{ marginBottom: "1rem", opacity: 0.5 }} />
              <p style={{ color: T.textSecondary, fontSize: "0.9rem", fontWeight: 500 }}>No properties listed</p>
              <p style={{ color: T.textMuted, fontSize: "0.75rem", marginTop: "4px" }}>Create a property to see distribution analytics here.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={propertyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {propertyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: T.navy, border: `1px solid ${T.border}`, borderRadius: "8px" }}
                    itemStyle={{ color: T.textPrimary }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem", marginTop: "1rem" }}>
                {propertyDistribution.map((item, index) => (
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color }} />
                    <span style={{ fontSize: "0.75rem", color: T.textSecondary }}>{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Dynamic Recent Activity */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: T.textPrimary, marginBottom: "1rem" }}>Recent Activity</h3>
          {activities.length === 0 ? (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              textAlign: "center"
            }}>
              <Activity size={48} color={T.textMuted} style={{ marginBottom: "1rem", opacity: 0.5 }} />
              <p style={{ color: T.textSecondary, fontSize: "0.9rem", fontWeight: 500 }}>No recent activity</p>
              <p style={{ color: T.textMuted, fontSize: "0.75rem", marginTop: "4px" }}>Actions like adding or updating properties will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {activities.map(activity => {
                const IconComponent = getActivityIcon(activity.activity_type);
                return (
                  <div key={activity.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "0.75rem",
                    background: T.surface,
                    borderRadius: "0.75rem",
                    transition: "all 0.15s"
                  }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(79,126,248,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <IconComponent size={16} color={T.accent} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.85rem", color: T.textPrimary }}>{activity.activity_description}</p>
                      <p style={{ fontSize: "0.7rem", color: T.textMuted, marginTop: "2px" }}>{formatTimeAgo(activity.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
