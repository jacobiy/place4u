import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Bell,
  PlusCircle,
  Sparkles,
  RefreshCw,
  Users,
  FileText,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Eye,
  Calendar,
  MapPin,
  DollarSign,
  Check,
  Trash2,
  Filter,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Send,
  Home,
  Wallet as WalletIcon,
  Mail,
  Phone,
  Lock,
  Briefcase,
  FileCheck
} from 'lucide-react';
import DirectContactModal from '../../component/DirectContactModal';
import AgentActivationView from './Component/AgentActivationView';
import { ApplicationDocumentsModal } from './Component/ApplicationDocumentsModal';
import { JobLinkApproximationModal } from './Component/JobLinkApproximationModal';
import { evaluateJobApplicationMatch } from '../../utils/jobAffordabilityMatcher';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Modal } from './Component/Modal';
import './Dashboard.css';

const DEFAULT_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=60";

// Custom Tooltip for Recharts
const CustomAreaTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#111726',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        fontSize: '0.75rem',
        color: '#fff'
      }}>
        <p style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>{label}</p>
        <p style={{ color: '#4f7ef8', fontWeight: 700 }}>
          Applications: {payload[0]?.value || 0}
        </p>
        {payload[1] && (
          <p style={{ color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
            Matches Made: {payload[1]?.value || 0}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const Dashboard = ({
  agentName = "Agent",
  stats = [],
  applications = [],
  properties = [],
  tenantById = new Map(),
  userRow = null,
  profile = null,
  setActiveView = () => {},
  onRefresh = () => {},
  onUpdateStatus = () => {},
  loading = false
}) => {
  // Agent Verification Flag
  const isAgentVerified = Boolean(profile?.is_verified === true);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeDocApp, setActiveDocApp] = useState(null);
  const [activeJobApp, setActiveJobApp] = useState(null);
  const [contactModal, setContactModal] = useState({ isOpen: false, contact: null, defaultSubject: "", defaultMessage: "" });
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [selectedMatchAppId, setSelectedMatchAppId] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [tasks, setTasks] = useState([
    { id: 1, title: "Verify Sarah J's proof of income & references", priority: "High", completed: false, tag: "Tenant Review" },
    { id: 2, title: "Finalize lease agreement draft for Unit 12B", priority: "Urgent", completed: false, tag: "Legal" },
    { id: 3, title: "Schedule weekend viewing slots for Mokopane apartment", priority: "Today", completed: true, tag: "Inspection" },
    { id: 4, title: "Follow up with matching tenants for Westden condos", priority: "Follow-up", completed: false, tag: "AI Match" }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("High");

  // Show temporary toast notification
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3500);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    triggerToast("Refreshing dashboard data…");
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Helper: Status label and styling
  const getStatusBadge = (status = "submitted") => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return {
          label: 'Submitted',
          bg: 'rgba(245, 158, 11, 0.12)',
          color: '#f59e0b',
          border: 'rgba(245, 158, 11, 0.3)'
        };
      case 'under_review':
        return {
          label: 'Under Review',
          bg: 'rgba(79, 126, 248, 0.12)',
          color: '#7c9ffc',
          border: 'rgba(79, 126, 248, 0.3)'
        };
      case 'matches_found':
        return {
          label: 'Matches Found',
          bg: 'rgba(139, 92, 246, 0.15)',
          color: '#a78bfa',
          border: 'rgba(139, 92, 246, 0.35)'
        };
      case 'completed':
        return {
          label: 'Completed',
          bg: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      default:
        return {
          label: status,
          bg: 'rgba(148, 163, 184, 0.12)',
          color: '#94a3b8',
          border: 'rgba(148, 163, 184, 0.3)'
        };
    }
  };

  // Deterministic Match Calculation
  const calculateMatchScore = (app, prop) => {
    let score = 50; // base score
    if (!app || !prop) return score;

    // Budget fit
    const maxBudget = Number(app.max_budget) || 0;
    const propPrice = Number(prop.price) || 0;
    if (maxBudget > 0 && propPrice > 0) {
      if (propPrice <= maxBudget) {
        score += 25;
        if (propPrice >= maxBudget * 0.7) score += 10; // optimal bracket
      } else if (propPrice <= maxBudget * 1.1) {
        score += 10;
      }
    }

    // Location fit
    const preferredAreas = (app.preferred_areas || []).map(a => String(a).toLowerCase());
    const propArea = (prop.area || "").toLowerCase();
    const propCity = (prop.city || "").toLowerCase();
    const propAddress = (prop.address || "").toLowerCase();

    if (preferredAreas.some(area => 
      propArea.includes(area) || propCity.includes(area) || propAddress.includes(area)
    )) {
      score += 15;
    }

    // Type fit
    const preferredTypes = (app.preferred_types || []).map(t => String(t).toLowerCase());
    const propType = (prop.property_type || "").toLowerCase();
    if (preferredTypes.includes(propType)) {
      score += 10;
    }

    return Math.min(score, 98);
  };

  // Filtered Applications for recent table
  const filteredApplications = useMemo(() => {
    let list = applications;
    if (statusFilter !== 'all') {
      list = list.filter(a => (a.status || 'submitted').toLowerCase() === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(app => {
      const tenant = tenantById.get(app.tenant_id);
      const areas = (app.preferred_areas || []).join(" ").toLowerCase();
      const types = (app.preferred_types || []).join(" ").toLowerCase();
      const tenantName = (tenant?.full_name || "").toLowerCase();
      const tenantEmail = (tenant?.email || "").toLowerCase();
      const status = (app.status || "").toLowerCase();

      return (
        tenantName.includes(q) ||
        tenantEmail.includes(q) ||
        areas.includes(q) ||
        types.includes(q) ||
        status.includes(q)
      );
    });
  }, [applications, statusFilter, searchQuery, tenantById]);

  // AI Matches Engine: Cross-reference applicants with properties
  const aiMatches = useMemo(() => {
    const pairs = [];
    if (!applications.length || !properties.length) return pairs;

    applications.forEach(app => {
      const tenant = tenantById.get(app.tenant_id);
      properties.forEach(prop => {
        const score = calculateMatchScore(app, prop);
        if (score >= 60) {
          pairs.push({
            app,
            prop,
            tenant,
            score
          });
        }
      });
    });

    // Sort by highest match score and take top 4
    return pairs.sort((a, b) => b.score - a.score).slice(0, 4);
  }, [applications, properties, tenantById]);

  // Chart Data: Last 6 months activity trend
  const chartActivityData = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const totalApps = applications.length;
    const totalProps = properties.length;

    return months.map((month, idx) => {
      const multiplier = (idx + 1) / months.length;
      return {
        month,
        applications: Math.max(1, Math.round(totalApps * multiplier * 0.8 + (idx * 2))),
        matches: Math.max(0, Math.round(totalProps * multiplier * 0.5 + (idx)))
      };
    });
  }, [applications.length, properties.length]);

  // Status Distribution for Donut Chart
  const statusPieData = useMemo(() => {
    const counts = {
      submitted: 0,
      under_review: 0,
      matches_found: 0,
      completed: 0
    };
    applications.forEach(a => {
      const s = (a.status || 'submitted').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
      else counts.submitted++;
    });

    return [
      { name: 'Submitted', value: Math.max(counts.submitted, 1), color: '#f59e0b' },
      { name: 'Under Review', value: Math.max(counts.under_review, 1), color: '#4f7ef8' },
      { name: 'Matches Found', value: Math.max(counts.matches_found, 1), color: '#8b5cf6' },
      { name: 'Completed', value: Math.max(counts.completed, 1), color: '#10b981' }
    ];
  }, [applications]);

  // Task Queue Handlers
  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      completed: false,
      tag: "Agent Note"
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle("");
    triggerToast("Task added to queue");
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Quick Application Status Update
  const handleQuickStatusChange = async (appId, newStatus) => {
    const success = await onUpdateStatus(appId, newStatus);
    if (success) {
      triggerToast(`Application status updated to ${newStatus.replace('_', ' ')}`);
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp({ ...selectedApp, status: newStatus });
      }
    }
  };

  // Propose AI Match
  const handleProposeMatch = async (match) => {
    const success = await onUpdateStatus(match.app.id, 'matches_found');
    if (success) {
      triggerToast(`Match proposed for ${match.tenant?.full_name || 'Tenant'}! Updated to Matches Found.`);
    }
  };

  // Date String
  const todayDateString = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  return (
    <div className="agent-dashboard-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="agent-toast">
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="agent-header">
        <div className="agent-header-left">
          <div>
            <h1 className="agent-welcome-title">
              Welcome back, {agentName} 👋
            </h1>
            <div className="agent-welcome-subtitle">
              <span>{todayDateString}</span>
              <span style={{ color: 'var(--agent-border)' }}>•</span>
              {isAgentVerified ? (
                <span className="agent-status-indicator" style={{ color: '#10b981' }}>
                  <span className="agent-status-dot" style={{ background: '#10b981' }} />
                  Verified Placement Agent ✓
                </span>
              ) : (
                <span className="agent-status-indicator" style={{ color: '#f59e0b' }}>
                  <span className="agent-status-dot" style={{ background: '#f59e0b' }} />
                  Account Inactive • Verification Required
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Search */}
        {isAgentVerified && (
          <div className="agent-header-search">
            <Search size={16} className="agent-header-search-icon" />
            <input
              type="text"
              className="agent-header-search-input"
              placeholder="Search applicants, areas, status…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="agent-header-search-clear"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="agent-header-actions">
          {isAgentVerified ? (
            <>
              <button
                onClick={() => setActiveView("properties")}
                className="agent-btn agent-btn-secondary"
                title="Manage and create listings"
              >
                <PlusCircle size={16} color="var(--agent-primary)" />
                <span>Add Listing</span>
              </button>

              <button
                onClick={() => setIsMatchModalOpen(true)}
                className="agent-btn agent-btn-sparkle"
                title="Run AI Tenant Matching Engine"
              >
                <Sparkles size={16} />
                <span>Match Tenant</span>
              </button>

              <button
                onClick={() => setActiveView("wallet")}
                className="agent-btn agent-btn-secondary"
                title="View 50% fee split earnings & wallet"
                style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              >
                <WalletIcon size={16} color="#10b981" />
                <span>Wallet & Earnings</span>
              </button>
            </>
          ) : (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              profile?.verification_status === 'pending_review'
                ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400'
                : 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
            }`}>
              {profile?.verification_status === 'pending_review' ? <Clock size={12} /> : <Lock size={12} />}
              <span>
                {profile?.verification_status === 'pending_review'
                  ? 'Verification Pending Review'
                  : 'Account Inactive'}
              </span>
            </div>
          )}

          <div className="agent-header-divider" />

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className="agent-icon-btn"
            title="Refresh portal data"
            disabled={isRefreshing || loading}
          >
            <RefreshCw size={17} className={isRefreshing || loading ? "animate-spin" : ""} />
          </button>

          {/* Notifications Button & Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="agent-icon-btn"
              title="View notifications"
            >
              <Bell size={17} />
              {applications.length > 0 && <span className="agent-badge-count" />}
            </button>

            {showNotifications && (
              <div className="agent-notif-dropdown">
                <div className="agent-notif-header">
                  <span className="agent-notif-title">Recent Activity</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="agent-notif-list">
                  {applications.slice(0, 4).map(app => {
                    const tenant = tenantById.get(app.tenant_id);
                    return (
                      <div key={app.id} className="agent-notif-item">
                        <FileText size={16} color="var(--agent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <p className="agent-notif-text">
                            New application from <strong>{tenant?.full_name || "Applicant"}</strong> for {app.preferred_areas?.[0] || "Area"}.
                          </p>
                          <span className="agent-notif-time">Status: {app.status || "Submitted"}</span>
                        </div>
                      </div>
                    );
                  })}
                  {applications.length === 0 && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                      No recent notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Quick Pill */}
          <div
            onClick={() => setActiveView("profile")}
            className="agent-profile-pill"
            title="Go to Agent Profile"
          >
            <div className="agent-avatar">
              {userRow?.profile_picture ? (
                <img src={userRow.profile_picture} alt="Agent" />
              ) : (
                <span>{(agentName || "A")[0].toUpperCase()}</span>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
              {agentName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="agent-dashboard-content">
        {!isAgentVerified ? (
          <AgentActivationView
            userRow={userRow}
            profile={profile}
            onRefresh={onRefresh}
          />
        ) : (
          <>
            {/* 1. Key Performance Metrics */}
            <section className="agent-metrics-grid">
          {/* New Applications */}
          <div className="agent-card agent-stat-card">
            <div className="agent-stat-header">
              <div className="agent-stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
                <FileText size={20} color="#f59e0b" />
              </div>
              <span className="agent-stat-pill" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <Clock size={11} /> Needs Action
              </span>
            </div>
            <div>
              <p className="agent-stat-label">New Assigned</p>
              <h3 className="agent-stat-value">{stats?.[0]?.value || applications.filter(a => (a.status || 'submitted') === 'submitted').length}</h3>
              <p className="agent-stat-subtext">Assigned &amp; awaiting review</p>
            </div>
          </div>

          {/* Total Applications */}
          <div className="agent-card agent-stat-card">
            <div className="agent-stat-header">
              <div className="agent-stat-icon-wrap" style={{ background: 'rgba(79, 126, 248, 0.12)' }}>
                <CheckCircle2 size={20} color="#4f7ef8" />
              </div>
              <span className="agent-stat-pill" style={{ background: 'rgba(79, 126, 248, 0.12)', color: '#7c9ffc' }}>
                <TrendingUp size={11} /> All Time
              </span>
            </div>
            <div>
              <p className="agent-stat-label">Total Assigned</p>
              <h3 className="agent-stat-value">{stats?.[1]?.value || applications.length}</h3>
              <p className="agent-stat-subtext">Assigned to your profile</p>
            </div>
          </div>

          {/* Active Listings */}
          <div className="agent-card agent-stat-card">
            <div className="agent-stat-header">
              <div className="agent-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                <Building size={20} color="#10b981" />
              </div>
              <span className="agent-stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <Home size={11} /> Live Listings
              </span>
            </div>
            <div>
              <p className="agent-stat-label">Active Properties</p>
              <h3 className="agent-stat-value">{stats?.[2]?.value || properties.length}</h3>
              <p className="agent-stat-subtext">Available for tenant matching</p>
            </div>
          </div>

          {/* Tenants Reached */}
          <div className="agent-card agent-stat-card">
            <div className="agent-stat-header">
              <div className="agent-stat-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                <Users size={20} color="#8b5cf6" />
              </div>
              <span className="agent-stat-pill" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' }}>
                <Sparkles size={11} /> Active Pool
              </span>
            </div>
            <div>
              <p className="agent-stat-label">Tenants Reached</p>
              <h3 className="agent-stat-value">{stats?.[3]?.value || tenantById.size}</h3>
              <p className="agent-stat-subtext">Prospective matched tenants</p>
            </div>
          </div>
        </section>

        {/* 2. Visual Pipeline & Analytics */}
        <section className="agent-charts-grid">
          {/* Monthly Trend Area Chart */}
          <div className="agent-card">
            <div className="agent-card-header">
              <h2 className="agent-card-title">
                <TrendingUp size={18} color="var(--agent-primary)" />
                Application & Placement Volume
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last 6 Months</span>
            </div>
            <div className="agent-card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f7ef8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f7ef8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="matchGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="#4f7ef8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#appGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="matches"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#matchGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Breakdown Donut Chart */}
          <div className="agent-card">
            <div className="agent-card-header">
              <h2 className="agent-card-title">
                <Filter size={18} color="var(--agent-purple)" />
                Application Pipeline Mix
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>By Status</span>
            </div>
            <div className="agent-card-body" style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '50%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#101524" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {statusPieData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
                      <span style={{ color: '#cbd5e1' }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Main Workspace: Applications & AI Match Suggestions */}
        <section className="agent-workspace-grid">
          {/* Left: Recent Applications Table */}
          <div className="agent-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="agent-card-header">
              <div>
                <h2 className="agent-card-title">
                  <FileText size={18} color="var(--agent-primary)" />
                  Applications Assigned to You
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {['all', 'submitted', 'under_review', 'matches_found', 'completed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                        background: statusFilter === st ? 'var(--agent-primary)' : 'rgba(255,255,255,0.06)',
                        color: statusFilter === st ? '#fff' : 'var(--agent-text-muted)',
                        textTransform: 'capitalize'
                      }}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setActiveView("applications")}
                className="agent-card-action-link"
              >
                <span>View All ({applications.length})</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="agent-table-wrapper">
              <table className="agent-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Max Budget</th>
                    <th>Preferred Area</th>
                    <th style={{ textAlign: 'center' }}>Match Fit</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.slice(0, 6).map((app) => {
                    const tenant = tenantById.get(app.tenant_id);
                    const bestProp = properties[0];
                    const matchScore = calculateMatchScore(app, bestProp);
                    const statusBadge = getStatusBadge(app.status);

                    return (
                      <tr key={app.id}>
                        <td>
                          <div className="agent-tenant-cell">
                            <div className="agent-avatar" style={{ width: 34, height: 34, flexShrink: 0 }}>
                              {tenant?.profile_picture ? (
                                <img src={tenant.profile_picture} alt="Applicant" />
                              ) : (
                                <span>{(tenant?.full_name || tenant?.email || "T")[0].toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="agent-tenant-name">{tenant?.full_name || "Prospective Tenant"}</div>
                              <div className="agent-tenant-email">{tenant?.email || "No email provided"}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                            {app.max_budget ? `R${Number(app.max_budget).toLocaleString()}/mo` : "Flexible"}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1' }}>
                            <MapPin size={13} color="var(--agent-text-dim)" />
                            <span>{app.preferred_areas?.join(', ') || "Any Location"}</span>
                          </div>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span className="agent-score-pill">
                            {matchScore}%
                          </span>
                        </td>

                        <td>
                          <span
                            className="agent-status-badge"
                            style={{
                              backgroundColor: statusBadge.bg,
                              color: statusBadge.color,
                              borderColor: statusBadge.border
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusBadge.color }} />
                            {statusBadge.label}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => setSelectedApp(app)}
                              className="agent-icon-btn"
                              style={{ width: 32, height: 32 }}
                              title="View full application details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                const nextStatus = app.status === 'submitted' ? 'under_review' : 'matches_found';
                                handleQuickStatusChange(app.id, nextStatus);
                              }}
                              className="agent-icon-btn"
                              style={{ width: 32, height: 32 }}
                              title="Advance status"
                            >
                              <CheckCircle2 size={14} color="var(--agent-secondary)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredApplications.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        <p style={{ margin: 0, fontWeight: 500 }}>No applications match the current filter</p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            style={{ marginTop: '0.5rem', color: 'var(--agent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Clear search query
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: AI Match Engine Opportunities */}
          <div className="agent-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="agent-card-header">
              <h2 className="agent-card-title">
                <Sparkles size={18} color="var(--agent-secondary)" />
                AI Smart Matches
              </h2>
              <span className="agent-score-pill" style={{ fontSize: '0.7rem' }}>
                High Confidence
              </span>
            </div>

            <div className="agent-card-body agent-ai-matches-list" style={{ flex: 1 }}>
              {aiMatches.map((match, i) => (
                <div key={i} className="agent-match-card">
                  <div className="agent-match-card-top">
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                        {match.tenant?.full_name || "Applicant"}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                        Budget: R{Number(match.app.max_budget || 0).toLocaleString()}/mo
                      </p>
                    </div>
                    <span className="agent-score-pill" style={{ background: 'rgba(79, 126, 248, 0.15)', color: '#7c9ffc', borderColor: 'rgba(79, 126, 248, 0.3)' }}>
                      {match.score}% Match
                    </span>
                  </div>

                  <div className="agent-match-prop-preview">
                    <img
                      src={match.prop.image_urls?.[0] || match.prop.images?.[0] || DEFAULT_PROPERTY_IMAGE}
                      alt="Matched Listing"
                      className="agent-match-thumb"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {match.prop.address || match.prop.title || "Apartment Listing"}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                        {match.prop.city || match.prop.area} • R{Number(match.prop.price).toLocaleString()}/mo
                      </p>
                    </div>
                  </div>

                  <div className="agent-match-card-footer">
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ Budget within range
                    </span>
                    <button
                      onClick={() => handleProposeMatch(match)}
                      className="agent-btn agent-btn-sparkle"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      <Send size={12} /> Propose Match
                    </button>
                  </div>
                </div>
              ))}

              {aiMatches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  <Sparkles size={32} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
                  <p style={{ fontWeight: 600, margin: 0 }}>No automated matches yet</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Add more properties or tenant applications to generate matches.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. Lower Operational Grid: Listings and Task Queue */}
        <section className="agent-lower-grid">
          {/* Active Listings Spotlight */}
          <div className="agent-card">
            <div className="agent-card-header">
              <h2 className="agent-card-title">
                <Building size={18} color="var(--agent-primary)" />
                Active Listings ({properties.length})
              </h2>
              <button
                onClick={() => setActiveView("properties")}
                className="agent-card-action-link"
              >
                <span>Browse</span>
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="agent-card-body" style={{ padding: '1rem' }}>
              {properties.slice(0, 3).map((prop) => {
                const img = prop.image_urls?.[0] || prop.images?.[0] || DEFAULT_PROPERTY_IMAGE;
                return (
                  <div
                    key={prop.id}
                    onClick={() => setActiveView("properties")}
                    className="agent-listing-item"
                  >
                    <img src={img} alt="Property" className="agent-listing-thumb" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prop.address || prop.title || "Rental Property"}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {prop.city || prop.area} • {prop.property_type || "Apartment"}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--agent-primary)' }}>
                          R{Number(prop.price).toLocaleString()}/mo
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {properties.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                  No active listings found
                </div>
              )}
            </div>
          </div>

          {/* Interactive Agent Task Queue */}
          <div className="agent-card">
            <div className="agent-card-header">
              <h2 className="agent-card-title">
                <CheckCircle2 size={18} color="var(--agent-secondary)" />
                Agent Tasks
              </h2>
              <span className="agent-stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                {tasks.filter(t => !t.completed).length} Pending
              </span>
            </div>
            <div className="agent-card-body" style={{ padding: '1rem' }}>
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {tasks.map((task) => (
                  <div key={task.id} className="agent-task-item">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`agent-task-checkbox ${task.completed ? 'checked' : ''}`}
                      title={task.completed ? "Mark incomplete" : "Mark completed"}
                    >
                      {task.completed && <Check size={12} color="#fff" />}
                    </button>
                    <p className={`agent-task-title ${task.completed ? 'completed' : ''}`}>
                      {task.title}
                    </p>
                    <span
                      className="agent-task-priority"
                      style={{
                        background: task.priority === 'Urgent' ? 'rgba(239, 68, 68, 0.15)' :
                                   task.priority === 'High' ? 'rgba(245, 158, 11, 0.15)' :
                                   'rgba(79, 126, 248, 0.15)',
                        color: task.priority === 'Urgent' ? '#ef4444' :
                               task.priority === 'High' ? '#f59e0b' : '#7c9ffc'
                      }}
                    >
                      {task.priority}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                      title="Delete task"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Task Input */}
              <form onSubmit={handleAddTask} className="agent-add-task-form">
                <input
                  type="text"
                  placeholder="New agent reminder…"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="agent-task-input"
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  style={{
                    background: '#1a2236',
                    border: '1px solid var(--agent-border)',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.75rem',
                    padding: '0 0.5rem'
                  }}
                >
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Today">Today</option>
                  <option value="Follow-up">Follow-up</option>
                </select>
                <button
                  type="submit"
                  className="agent-btn agent-btn-primary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        </section>
      </>
    )}

      </div>

      {/* Modal: Application Details View */}
      {selectedApp && (
        <Modal
          isOpen={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          title={`Application Details - #${String(selectedApp.id).slice(0, 8)}`}
          size="lg"
        >
          {(() => {
            const tenant = tenantById.get(selectedApp.tenant_id);
            const statusBadge = getStatusBadge(selectedApp.status);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: '#f1f5f9' }}>
                {/* Applicant Bio Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--agent-border)' }}>
                  <div className="agent-avatar" style={{ width: 48, height: 48, fontSize: '1.1rem' }}>
                    {tenant?.profile_picture ? (
                      <img src={tenant.profile_picture} alt="Applicant" />
                    ) : (
                      <span>{(tenant?.full_name || tenant?.email || "T")[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{tenant?.full_name || "Applicant"}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                      {tenant?.email || "No email"} • {tenant?.phone || "No phone listed"}
                    </p>
                  </div>
                  <div>
                    <span
                      className="agent-status-badge"
                      style={{
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color,
                        borderColor: statusBadge.border
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* Parameters Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Monthly Budget Range</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '1rem', color: '#10b981' }}>
                      R{selectedApp.min_budget ? Number(selectedApp.min_budget).toLocaleString() : '0'} – R{Number(selectedApp.max_budget || 0).toLocaleString()} / month
                    </p>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Preferred Areas</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                      {selectedApp.preferred_areas?.join(', ') || "Any Area"}
                    </p>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Move-in Date</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                      {selectedApp.move_in_date ? new Date(selectedApp.move_in_date).toLocaleDateString() : "Immediate / Flexible"}
                    </p>
                  </div>
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Lease Duration</span>
                    <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                      {selectedApp.lease_duration_months ? `${selectedApp.lease_duration_months} Months` : "12 Months"}
                    </p>
                  </div>
                </div>

                {/* Job & Employment Profile & Underwriting Preview */}
                {(() => {
                  const matchAnalysis = evaluateJobApplicationMatch({
                    application: selectedApp,
                    tenant,
                    property: properties.find(p => p.id === selectedApp.property_id) || properties[0]
                  });
                  const docsCount = (selectedApp.documents && Array.isArray(selectedApp.documents)) ? selectedApp.documents.length : 3;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{
                        padding: '0.85rem 1rem',
                        background: 'rgba(79, 126, 248, 0.08)',
                        border: '1px dashed rgba(79, 126, 248, 0.3)',
                        borderRadius: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                      onClick={() => setActiveJobApp(selectedApp)}
                      title="Click to view full job linking & commute proximity analysis"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '9999px',
                            background: `${matchAnalysis.tierColor}20`,
                            border: `1px solid ${matchAnalysis.tierColor}`,
                            color: matchAnalysis.tierColor,
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Sparkles size={13} />
                            {matchAnalysis.compositeScore}% Match
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                              {matchAnalysis.employment.jobTitle} &middot; {matchAnalysis.employment.employerName}
                            </p>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {matchAnalysis.affordability.multiplier}x Rent Coverage &bull; ~{matchAnalysis.proximity.approxDistanceKm} km Commute
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: matchAnalysis.tierColor }}>
                          {matchAnalysis.verdict} &rarr;
                        </span>
                      </div>

                      {/* Document & Underwriting Action Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDocApp(selectedApp)}
                          className="agent-btn agent-btn-secondary"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            borderColor: 'rgba(16, 185, 129, 0.35)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <FileCheck size={15} />
                          <span>View Documents ({docsCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveJobApp(selectedApp)}
                          className="agent-btn agent-btn-secondary"
                          style={{
                            background: 'rgba(79, 126, 248, 0.15)',
                            borderColor: 'rgba(79, 126, 248, 0.35)',
                            color: '#7c9ffc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Briefcase size={15} />
                          <span>Job &amp; Commute Match</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Special Requirements */}
                {selectedApp.special_requirements && (
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Special Requirements / Notes</span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                      "{selectedApp.special_requirements}"
                    </p>
                  </div>
                )}

                {/* Action Controls */}
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Update status:</span>
                    <select
                      value={selectedApp.status || 'submitted'}
                      onChange={(e) => handleQuickStatusChange(selectedApp.id, e.target.value)}
                      style={{
                        background: '#1a2236',
                        border: '1px solid var(--agent-border)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="matches_found">Matches Found</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        setContactModal({
                          isOpen: true,
                          contact: {
                            name: tenant?.full_name || 'Applicant',
                            role: 'Applicant',
                            email: tenant?.email || 'applicant@place4u.co.za',
                            phone: tenant?.phone || '+27 82 444 3322',
                            unit: selectedApp.preferred_areas?.[0] || 'Rental Application'
                          },
                          defaultSubject: `Update on Place4U Application #${String(selectedApp.id).slice(0, 8)}`,
                          defaultMessage: `Hello ${tenant?.full_name || 'Applicant'}, I am reviewing your application on Place4U.`
                        });
                      }}
                      className="agent-btn agent-btn-secondary"
                      style={{
                        background: 'rgba(37, 211, 102, 0.15)',
                        color: '#25D366',
                        borderColor: 'rgba(37, 211, 102, 0.3)'
                      }}
                    >
                      <Phone size={14} /> Contact Applicant
                    </button>
                    <button
                      onClick={() => setSelectedApp(null)}
                      className="agent-btn agent-btn-primary"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Modal: AI Match Tenant */}
      {isMatchModalOpen && (
        <Modal
          isOpen={isMatchModalOpen}
          onClose={() => setIsMatchModalOpen(false)}
          title="AI Tenant Matching Engine"
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#f1f5f9' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Select an applicant to review real-time compatible properties from your marketplace based on budget, location preferences, and unit specifications.
            </p>

            {/* Applicant Selector */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Applicant:</label>
              <select
                value={selectedMatchAppId || (applications[0]?.id || '')}
                onChange={(e) => setSelectedMatchAppId(e.target.value)}
                style={{
                  flex: 1,
                  background: '#1a2236',
                  border: '1px solid var(--agent-border)',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}
              >
                {applications.map(app => {
                  const t = tenantById.get(app.tenant_id);
                  return (
                    <option key={app.id} value={app.id}>
                      {t?.full_name || 'Applicant'} — Budget: R{Number(app.max_budget || 0).toLocaleString()} ({app.preferred_areas?.[0] || 'Any Area'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Compatible Matches */}
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(() => {
                const targetApp = applications.find(a => a.id === (selectedMatchAppId || applications[0]?.id)) || applications[0];
                if (!targetApp) return <p style={{ color: '#64748b' }}>No applicant selected</p>;

                const rankedProps = properties.map(prop => ({
                  prop,
                  score: calculateMatchScore(targetApp, prop)
                })).sort((a, b) => b.score - a.score);

                return rankedProps.slice(0, 3).map(({ prop, score }) => (
                  <div
                    key={prop.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.85rem',
                      borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--agent-border)'
                    }}
                  >
                    <img
                      src={prop.image_urls?.[0] || prop.images?.[0] || DEFAULT_PROPERTY_IMAGE}
                      alt="Listing"
                      style={{ width: 60, height: 60, borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                          {prop.address || prop.title || "Listing"}
                        </h4>
                        <span className="agent-score-pill">
                          {score}% Match
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                        {prop.city || prop.area} • R{Number(prop.price).toLocaleString()}/month
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleQuickStatusChange(targetApp.id, 'matches_found');
                        setIsMatchModalOpen(false);
                      }}
                      className="agent-btn agent-btn-sparkle"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem' }}
                    >
                      Send Match
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Direct Contact Modal */}
      <DirectContactModal
        isOpen={contactModal.isOpen}
        onClose={() => setContactModal({ isOpen: false, contact: null, defaultSubject: "", defaultMessage: "" })}
        contact={contactModal.contact || {}}
        defaultSubject={contactModal.defaultSubject}
        defaultMessage={contactModal.defaultMessage}
      />

      {/* Application Documents Modal */}
      {activeDocApp && (
        <ApplicationDocumentsModal
          isOpen={Boolean(activeDocApp)}
          onClose={() => setActiveDocApp(null)}
          application={activeDocApp}
          tenant={tenantById?.get(activeDocApp.tenant_id)}
        />
      )}

      {/* Job-to-Application Compatibility & Approximation Modal */}
      {activeJobApp && (
        <JobLinkApproximationModal
          isOpen={Boolean(activeJobApp)}
          onClose={() => setActiveJobApp(null)}
          application={activeJobApp}
          tenant={tenantById?.get(activeJobApp.tenant_id)}
          properties={properties}
          onOpenDocuments={(app) => setActiveDocApp(app)}
          onUpdateStatus={onUpdateStatus}
        />
      )}

    </div>
  );
};
