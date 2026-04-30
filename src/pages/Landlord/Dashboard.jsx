import { TrendingUp, DollarSign, Home, Users, Calendar, MessageSquare, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { T } from './styles/designTokens';
import { StatCard } from './Component/StatCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const revenueData = [
  { month: "Jan", revenue: 24500 },
  { month: "Feb", revenue: 26800 },
  { month: "Mar", revenue: 27200 },
  { month: "Apr", revenue: 28900 },
  { month: "May", revenue: 31200 },
  { month: "Jun", revenue: 29800 }
];

const propertyDistribution = [
  { name: "Apartments", value: 65, color: T.accent },
  { name: "Houses", value: 25, color: T.emerald },
  { name: "Commercial", value: 10, color: T.amber }
];

const recentActivities = [
  { id: 1, type: "payment", message: "Rent payment received from Sunset Apartments", amount: "R8,500", time: "2 hours ago", icon: DollarSign },
  { id: 2, type: "maintenance", message: "Maintenance request for Harbour View", status: "Pending", time: "5 hours ago", icon: Home },
  { id: 3, type: "message", message: "New message from John Doe", time: "1 day ago", icon: MessageSquare },
  { id: 4, type: "lease", message: "Lease renewal for Garden Flat", time: "2 days ago", icon: Calendar }
];

export const Dashboard = () => {
  const stats = [
    { label: "Monthly Revenue", value: "R26,700", change: "+12.5%", trend: "up", icon: "DollarSign" },
    { label: "Occupancy Rate", value: "92%", change: "+5%", trend: "up", icon: "Home" },
    { label: "Active Properties", value: "8", change: "+2", trend: "up", icon: "Building" },
    { label: "Total Tenants", value: "12", change: "+3", trend: "up", icon: "Users" }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
      <p style={{ fontSize: "2rem", color: T.textMuted, marginTop: "2px"}}>Landlord Portal</p>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2rem", color: T.textPrimary, marginBottom: "8px" }}>
          Welcome back, John
        </h1>
        <p style={{ color: T.textMuted }}>Here's what's happening with your properties today.</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Revenue Chart */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.5rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: T.textPrimary }}>Revenue Trend</h3>
            <select style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "0.75rem",
              color: T.textSecondary
            }}>
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="month" stroke={T.textMuted} />
              <YAxis stroke={T.textMuted} />
              <Tooltip 
                contentStyle={{ background: T.navy, border: `1px solid ${T.border}`, borderRadius: "8px" }}
                labelStyle={{ color: T.textPrimary }}
              />
              <Line type="monotone" dataKey="revenue" stroke={T.accent} strokeWidth={2} dot={{ fill: T.accent }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Property Distribution */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.5rem"
        }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: T.textPrimary, marginBottom: "1rem" }}>Property Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={propertyDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {propertyDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: T.navy, border: `1px solid ${T.border}`, borderRadius: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1rem" }}>
            {propertyDistribution.map((item, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color }} />
                <span style={{ fontSize: "0.75rem", color: T.textSecondary }}>{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: "1rem",
        padding: "1.5rem"
      }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: T.textPrimary, marginBottom: "1rem" }}>Recent Activity</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {recentActivities.map(activity => (
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
                <activity.icon size={16} color={T.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "0.85rem", color: T.textPrimary }}>{activity.message}</p>
                <p style={{ fontSize: "0.7rem", color: T.textMuted, marginTop: "2px" }}>{activity.time}</p>
              </div>
              {activity.amount && (
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: T.emerald }}>{activity.amount}</span>
              )}
              {activity.status && (
                <span style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "rgba(245,158,11,0.1)",
                  color: T.amber
                }}>{activity.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};