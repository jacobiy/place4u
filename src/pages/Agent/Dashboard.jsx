import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Bell,
  PlusCircle,
  RefreshCw,
  Users,
  FileText,
  Building2,
  Inbox,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Check,
  ChevronRight,
  ShieldCheck,
  Send,
  Wallet as WalletIcon,
  Phone,
  Lock,
  Briefcase,
  FileCheck,
  AlertTriangle,
  Waypoints,
  BarChart3,
  ListChecks,
  PieChart,
  Trash2
} from 'lucide-react';
import DirectContactModal from '../../component/DirectContactModal';
import AgentActivationView from './Component/AgentActivationView';
import { ApplicationDocumentsModal } from './Component/ApplicationDocumentsModal';
import { JobLinkApproximationModal } from './Component/JobLinkApproximationModal';
import { evaluateJobApplicationMatch } from '../../utils/jobAffordabilityMatcher';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart as RcPieChart,
  Pie,
  Cell
} from 'recharts';
import { Modal } from './Component/Modal';
import {
  AGENT_SELECTABLE_APPLICATION_STATUSES,
  applicationStatusLabel
} from '../../services/applicationStatus';
import './Dashboard.css';

const DEFAULT_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=60";

const STATUS_META = {
  submitted: { label: 'Submitted', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  under_review: { label: 'Under review', color: '#7da2ff', bg: 'rgba(79,126,248,0.12)', border: 'rgba(79,126,248,0.32)' },
  matches_found: { label: 'Matches found', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.32)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  expired: { label: 'Expired', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' }
};

const PIPELINE_COLORS = {
  submitted: '#f59e0b',
  under_review: '#4f7ef8',
  matches_found: '#22d3ee',
  completed: '#10b981'
};

const PRIORITY_TONES = {
  Urgent: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  High: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  Today: { bg: 'rgba(79,126,248,0.15)', color: '#7da2ff' },
  'Follow-up': { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' }
};

const BarTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="ag-chart-tooltip">
      <div className="ag-chart-tooltip-label">Week of {label}</div>
      <div className="ag-chart-tooltip-value">{payload[0].value} submission{payload[0].value === 1 ? '' : 's'}</div>
    </div>
  );
};

export const Dashboard = ({
  agentName = "Agent",
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
  const isAgentVerified = Boolean(profile?.is_verified === true);

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
  const [openApplyModal, setOpenApplyModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Task queue is the agent's own scratchpad — persisted locally so it survives navigation.
  const [tasks, setTasks] = useState(() => {
    try {
      const raw = localStorage.getItem("place4u_agent_tasks");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("High");

  useEffect(() => {
    try {
      localStorage.setItem("place4u_agent_tasks", JSON.stringify(tasks));
    } catch {
      /* storage unavailable — tasks stay in memory for this session */
    }
  }, [tasks]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3400);
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

  const getStatusBadge = (status = "submitted") => {
    const key = String(status || "submitted").toLowerCase();
    return STATUS_META[key] || {
      label: status,
      bg: 'rgba(148,163,184,0.12)',
      color: '#94a3b8',
      border: 'rgba(148,163,184,0.3)'
    };
  };

  // Heuristic fit — preserved from the original dashboard.
  const calculateMatchScore = (app, prop) => {
    let score = 50;
    if (!app || !prop) return score;

    const maxBudget = Number(app.max_budget) || 0;
    const propPrice = Number(prop.price) || 0;
    if (maxBudget > 0 && propPrice > 0) {
      if (propPrice <= maxBudget) {
        score += 25;
        if (propPrice >= maxBudget * 0.7) score += 10;
      } else if (propPrice <= maxBudget * 1.1) {
        score += 10;
      }
    }

    const preferredAreas = (app.preferred_areas || []).map(a => String(a).toLowerCase());
    const propArea = (prop.area || "").toLowerCase();
    const propCity = (prop.city || "").toLowerCase();
    const propAddress = (prop.address || "").toLowerCase();
    if (preferredAreas.some(area => propArea.includes(area) || propCity.includes(area) || propAddress.includes(area))) {
      score += 15;
    }

    const preferredTypes = (app.preferred_types || []).map(t => String(t).toLowerCase());
    const propType = (prop.property_type || "").toLowerCase();
    if (preferredTypes.includes(propType)) score += 10;

    return Math.min(score, 98);
  };

  const pendingResponses = useMemo(
    () => applications.filter((a) => a.assigned_to && (a.assignment_status || 'assigned') === 'assigned').length,
    [applications]
  );

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

  const aiMatches = useMemo(() => {
    const pairs = [];
    if (!applications.length || !properties.length) return pairs;

    applications.forEach(app => {
      const tenant = tenantById.get(app.tenant_id);
      properties.forEach(prop => {
        const score = calculateMatchScore(app, prop);
        if (score >= 60) pairs.push({ app, prop, tenant, score });
      });
    });

    return pairs.sort((a, b) => b.score - a.score).slice(0, 4);
  }, [applications, properties, tenantById]);

  const kpis = useMemo(() => {
    const newCount = applications.filter(a => (a.status || 'submitted').toLowerCase() === 'submitted').length;
    return [
      { key: 'new', label: 'New assigned', value: newCount, meta: 'Awaiting first review', icon: FileText, tone: 'warn' },
      { key: 'book', label: 'Active book', value: applications.length, meta: 'Applications assigned to you', icon: Inbox, tone: 'accent' },
      { key: 'listings', label: 'Live listings', value: properties.length, meta: 'Available for tenant matching', icon: Building2, tone: 'ok' },
      { key: 'pool', label: 'Tenant pool', value: tenantById.size, meta: 'Applicants in your pipeline', icon: Users, tone: 'info' }
    ];
  }, [applications, properties.length, tenantById.size]);

  const pipeline = useMemo(() => {
    const counts = { submitted: 0, under_review: 0, matches_found: 0, completed: 0 };
    applications.forEach(a => {
      const s = (a.status || 'submitted').toLowerCase();
      if (counts[s] !== undefined) counts[s]++; else counts.submitted++;
    });
    return [
      { key: 'submitted', name: 'Submitted', value: counts.submitted },
      { key: 'under_review', name: 'Under review', value: counts.under_review },
      { key: 'matches_found', name: 'Matches found', value: counts.matches_found },
      { key: 'completed', name: 'Completed', value: counts.completed }
    ].map(d => ({ ...d, color: PIPELINE_COLORS[d.key] }));
  }, [applications]);

  const pipelineTotal = useMemo(() => pipeline.reduce((s, d) => s + d.value, 0), [pipeline]);
  const pipelinePie = useMemo(() => pipeline.filter(d => d.value > 0), [pipeline]);

  // Real submission cadence — bucket applications by week from their timestamps.
  const activity = useMemo(() => {
    const weeks = 8;
    const now = new Date();
    const buckets = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i * 7);
      buckets.push({ start, label: `${start.getDate()}/${start.getMonth() + 1}`, applications: 0 });
    }

    let placed = 0;
    applications.forEach(a => {
      const raw = a.submitted_at || a.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      for (let i = 0; i < buckets.length; i++) {
        const next = i + 1 < buckets.length ? buckets[i + 1].start : null;
        if (d >= buckets[i].start && (!next || d < next)) {
          buckets[i].applications++;
          placed++;
          break;
        }
      }
    });

    return { data: buckets.map(b => ({ label: b.label, applications: b.applications })), placed };
  }, [applications]);

  const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks([{ id: Date.now(), title: newTaskTitle.trim(), priority: newTaskPriority, completed: false }, ...tasks]);
    setNewTaskTitle("");
    triggerToast("Task added to queue");
  };

  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));

  const handleQuickStatusChange = async (appId, newStatus) => {
    const success = await onUpdateStatus(appId, newStatus);
    if (success) {
      triggerToast(`Status updated to ${newStatus.replace('_', ' ')}`);
      if (selectedApp && selectedApp.id === appId) setSelectedApp({ ...selectedApp, status: newStatus });
    }
  };

  const handleProposeMatch = async (match) => {
    const success = await onUpdateStatus(match.app.id, 'matches_found');
    if (success) triggerToast(`Match shared with ${match.tenant?.full_name || 'tenant'}`);
  };

  const todayDateString = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-ZA', { weekday: 'long', month: 'short', day: 'numeric' });
  }, []);

  return (
    <div className="agent-dashboard">
      {toastMessage && (
        <div className="ag-toast">
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top bar */}
      <header className="ag-topbar">
        <div className="ag-topbar-lead">
          <span className="ag-eyebrow">Dashboard</span>
          <h1 className="ag-topbar-title">Welcome back, {agentName}</h1>
          <div className="ag-topbar-meta">
            <span>{todayDateString}</span>
            <span className="ag-dot-sep" />
            {isAgentVerified ? (
              <span className="ag-verify">
                <span className="dot" /> Verified placement agent
              </span>
            ) : (
              <span className="ag-verify is-warn">
                <span className="dot" /> Verification required
              </span>
            )}
          </div>
        </div>

        {isAgentVerified && (
          <div className="ag-search ag-topbar-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search applicants, areas, status…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <div className="ag-topbar-actions">
          {isAgentVerified ? (
            <>
              <button type="button" onClick={() => setActiveView("properties")} className="agent-btn agent-btn-secondary" title="Manage listings">
                <PlusCircle size={15} /> Add listing
              </button>
              <button type="button" onClick={() => setIsMatchModalOpen(true)} className="agent-btn agent-btn-sparkle" title="Open the matching engine">
                <Waypoints size={15} /> Match tenant
              </button>
              <button type="button" onClick={() => setActiveView("wallet")} className="agent-btn agent-btn-secondary" title="Earnings & payouts">
                <WalletIcon size={15} /> Earnings
              </button>
            </>
          ) : (
            <>
              <span className={`ag-badge ${profile?.verification_status === 'pending_review' ? 'ag-badge--info' : 'ag-badge--warn'}`}>
                {profile?.verification_status === 'pending_review' ? <Clock size={12} /> : <Lock size={12} />}
                {profile?.verification_status === 'pending_review'
                  ? 'Review pending'
                  : profile?.verification_status === 'rejected'
                    ? 'Application rejected'
                    : 'Account inactive'}
              </span>
              <button type="button" onClick={() => setOpenApplyModal(true)} className="agent-btn agent-btn-primary">
                <ShieldCheck size={15} />
                {profile?.verification_status === 'rejected' ? 'Re-apply for verification' : 'Apply for verification'}
              </button>
            </>
          )}

          <span className="ag-topbar-divider" />

          <button
            type="button"
            onClick={handleManualRefresh}
            className="agent-icon-btn"
            title="Refresh data"
            disabled={isRefreshing || loading}
          >
            <RefreshCw size={16} className={isRefreshing || loading ? "animate-spin" : ""} />
          </button>

          <div className="ag-notif-wrap">
            <button type="button" onClick={() => setShowNotifications(v => !v)} className="agent-icon-btn" title="Notifications">
              <Bell size={16} />
              {pendingResponses > 0 && <span className="ag-notif-dot" />}
            </button>

            {showNotifications && (
              <div className="ag-notif">
                <div className="ag-notif-head">
                  <strong>Recent activity</strong>
                  <button type="button" className="ag-notif-close" onClick={() => setShowNotifications(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="ag-notif-list">
                  {applications.slice(0, 4).map(app => {
                    const tenant = tenantById.get(app.tenant_id);
                    return (
                      <div key={app.id} className="ag-notif-item">
                        <FileText size={15} color="#7da2ff" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <p className="ag-notif-text">
                            New application from <strong>{tenant?.full_name || "Applicant"}</strong> for {app.preferred_areas?.[0] || "your area"}.
                          </p>
                          <span className="ag-notif-time">Status: {getStatusBadge(app.status).label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {applications.length === 0 && (
                    <div className="ag-empty" style={{ padding: '28px 16px' }}>
                      <p className="ag-empty-sub" style={{ margin: 0 }}>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className="ag-topbar-profile"
            role="button"
            tabIndex={0}
            onClick={() => setActiveView("profile")}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveView("profile"); } }}
            title="View profile"
          >
            <div className="agent-avatar" style={{ width: 28, height: 28 }}>
              {userRow?.profile_picture ? (
                <img src={userRow.profile_picture} alt="Agent" />
              ) : (
                <span>{(agentName || "A")[0].toUpperCase()}</span>
              )}
            </div>
            <span>{agentName}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="ag-page">
        {!isAgentVerified ? (
          <AgentActivationView
            userRow={userRow}
            profile={profile}
            onRefresh={onRefresh}
            autoOpenModal={openApplyModal}
            onAutoOpenHandled={() => setOpenApplyModal(false)}
          />
        ) : (
          <>
            {pendingResponses > 0 && (
              <section className="ag-alert">
                <div className="ag-alert-icon">
                  <AlertTriangle size={18} />
                </div>
                <div className="ag-alert-text">
                  <p className="ag-alert-title">
                    {pendingResponses} job{pendingResponses === 1 ? '' : 's'} awaiting your response
                  </p>
                  <p className="ag-alert-sub">
                    Accept or reject each assignment so the administrator can plan placements and reassignments.
                  </p>
                </div>
                <button type="button" className="agent-btn agent-btn-danger" onClick={() => setActiveView('applications')}>
                  Respond now <ChevronRight size={14} />
                </button>
              </section>
            )}

            {/* KPI strip */}
            <section className="ag-kpi">
              {kpis.map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.key} className={`ag-kpi-cell is-${kpi.tone}`}>
                    <div className="ag-kpi-head">
                      <span className="ag-kpi-label">{kpi.label}</span>
                      <span className="ag-kpi-icon"><Icon size={16} /></span>
                    </div>
                    <p className="ag-kpi-value">{kpi.value}</p>
                    <p className="ag-kpi-meta">{kpi.meta}</p>
                  </div>
                );
              })}
            </section>

            {/* Primary grid: worklist + pipeline mix */}
            <section className="ag-grid ag-grid--wide">
              <div className="ag-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="ag-panel-head" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <h2 className="ag-panel-title">
                      <FileText size={17} /> Applications assigned to you
                    </h2>
                    <div style={{ marginTop: 12 }}>
                      <div className="ag-segment">
                        {['all', 'submitted', 'under_review', 'matches_found', 'completed'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            className={statusFilter === st ? 'is-active' : ''}
                            onClick={() => setStatusFilter(st)}
                          >
                            {st === 'all' ? 'All' : getStatusBadge(st).label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="ag-panel-action" onClick={() => setActiveView("applications")}>
                    View all ({applications.length}) <ChevronRight size={14} />
                  </button>
                </div>

                <div className="ag-table-wrap">
                  <table className="ag-table">
                    <thead>
                      <tr>
                        <th>Applicant</th>
                        <th>Budget / mo</th>
                        <th>Preferred area</th>
                        <th style={{ textAlign: 'center' }}>Fit</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.slice(0, 6).map((app) => {
                        const tenant = tenantById.get(app.tenant_id);
                        const linkedProp = app.property_id ? properties.find((p) => p.id === app.property_id) : null;
                        const matchScore = linkedProp ? calculateMatchScore(app, linkedProp) : null;
                        const badge = getStatusBadge(app.status);

                        return (
                          <tr key={app.id}>
                            <td>
                              <div className="ag-tenant-cell">
                                <div className="agent-avatar" style={{ width: 34, height: 34 }}>
                                  {tenant?.profile_picture ? (
                                    <img src={tenant.profile_picture} alt="Applicant" />
                                  ) : (
                                    <span>{(tenant?.full_name || tenant?.email || "T")[0].toUpperCase()}</span>
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div className="ag-tenant-name">{tenant?.full_name || "Prospective tenant"}</div>
                                  <div className="ag-tenant-email">{tenant?.email || "No email provided"}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="ag-mono">
                                {app.max_budget ? `R${Number(app.max_budget).toLocaleString()}` : "Flexible"}
                              </span>
                            </td>
                            <td>
                              <span className="ag-cell-muted">
                                <MapPin size={13} />
                                {app.preferred_areas?.join(', ') || "Any location"}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {matchScore === null ? (
                                <span className="ag-cell-muted" title="No listing linked to this application">—</span>
                              ) : (
                                <span className="agent-score-pill">{matchScore}%</span>
                              )}
                            </td>
                            <td>
                              <span className="agent-status-badge" style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}>
                                <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: badge.color }} />
                                {badge.label}
                              </span>
                            </td>
                            <td>
                              <div className="ag-row-actions">
                                <button type="button" onClick={() => setSelectedApp(app)} className="agent-icon-btn" style={{ width: 30, height: 30 }} title="View application">
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(app.id, app.status === 'submitted' ? 'under_review' : 'matches_found')}
                                  className="agent-icon-btn"
                                  style={{ width: 30, height: 30 }}
                                  title="Advance status"
                                >
                                  <CheckCircle2 size={14} color="#10b981" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredApplications.length === 0 && (
                        <tr>
                          <td colSpan={6}>
                            <div className="ag-empty" style={{ padding: '40px 16px' }}>
                              <FileText size={30} />
                              <p className="ag-empty-title">No applications match this view</p>
                              {searchQuery && (
                                <button type="button" className="ag-panel-action" style={{ marginTop: 10 }} onClick={() => setSearchQuery("")}>
                                  Clear search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ag-panel">
                <div className="ag-panel-head">
                  <h2 className="ag-panel-title">
                    <PieChart size={17} /> Pipeline mix
                  </h2>
                  <span className="ag-panel-meta">By status</span>
                </div>

                <div className="ag-pipeline">
                  <div className="ag-pipeline-chart">
                    {pipelineTotal > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <RcPieChart>
                            <Pie data={pipelinePie} cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                              {pipelinePie.map((entry) => (
                                <Cell key={entry.key} fill={entry.color} />
                              ))}
                            </Pie>
                          </RcPieChart>
                        </ResponsiveContainer>
                        <div className="ag-pipeline-center">
                          <div className="ag-pipeline-center-value">{pipelineTotal}</div>
                          <div className="ag-pipeline-center-label">Total</div>
                        </div>
                      </>
                    ) : (
                      <div className="ag-empty" style={{ padding: '40px 16px' }}>
                        <p className="ag-empty-sub" style={{ margin: 0 }}>No applications yet</p>
                      </div>
                    )}
                  </div>

                  <div className="ag-pipeline-legend">
                    {pipeline.map(item => (
                      <div key={item.key} className="ag-pipeline-row">
                        <div className="ag-pipeline-row-left">
                          <span className="ag-pipeline-swatch" style={{ background: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="ag-pipeline-row-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Secondary grid: submission volume + match assist */}
            <section className="ag-grid ag-grid--wide">
              <div className="ag-panel">
                <div className="ag-panel-head">
                  <h2 className="ag-panel-title">
                    <BarChart3 size={17} /> Application volume
                  </h2>
                  <span className="ag-panel-meta">Last 8 weeks</span>
                </div>
                <div className="ag-chart-body">
                  {activity.placed > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activity.data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="agBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7da2ff" />
                            <stop offset="100%" stopColor="#4f7ef8" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.09)" vertical={false} />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<BarTip />} />
                        <Bar dataKey="applications" fill="url(#agBar)" radius={[5, 5, 0, 0]} maxBarSize={34} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="ag-empty" style={{ paddingTop: 60 }}>
                      <BarChart3 size={30} />
                      <p className="ag-empty-title">No dated activity yet</p>
                      <p className="ag-empty-sub">Submission cadence appears once applications carry timestamps.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="ag-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="ag-panel-head">
                  <h2 className="ag-panel-title">
                    <Waypoints size={17} /> Match assist
                  </h2>
                  <span className="ag-panel-meta">Heuristic fit</span>
                </div>

                <div className="ag-match-list" style={{ flex: 1 }}>
                  {aiMatches.map((match, i) => {
                    const withinBudget = Number(match.prop.price) <= Number(match.app.max_budget || Infinity);
                    return (
                      <div key={i} className="ag-match">
                        <div className="ag-match-top">
                          <div style={{ minWidth: 0 }}>
                            <p className="ag-match-name">{match.tenant?.full_name || "Applicant"}</p>
                            <p className="ag-match-budget">Budget R{Number(match.app.max_budget || 0).toLocaleString()}/mo</p>
                          </div>
                          <span className="agent-score-pill">{match.score}%</span>
                        </div>

                        <div className="ag-match-prop">
                          <img
                            src={match.prop.image_urls?.[0] || match.prop.images?.[0] || DEFAULT_PROPERTY_IMAGE}
                            alt="Matched listing"
                            className="ag-match-thumb"
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="ag-match-prop-title">{match.prop.address || match.prop.title || "Apartment listing"}</p>
                            <p className="ag-match-prop-sub">
                              {match.prop.city || match.prop.area || "—"} • R{Number(match.prop.price).toLocaleString()}/mo
                            </p>
                          </div>
                        </div>

                        <div className="ag-match-foot">
                          <span className="ag-match-note" style={{ color: withinBudget ? '#10b981' : '#fbbf24' }}>
                            <Check size={12} /> {withinBudget ? 'Within budget' : 'Above budget'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleProposeMatch(match)}
                            className="agent-btn agent-btn-sparkle"
                            style={{ padding: '6px 11px', fontSize: '0.75rem' }}
                          >
                            <Send size={12} /> Propose
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {aiMatches.length === 0 && (
                    <div className="ag-empty" style={{ paddingTop: 40 }}>
                      <Waypoints size={30} />
                      <p className="ag-empty-title">No matches to surface</p>
                      <p className="ag-empty-sub">Add listings or applications to generate candidate pairings.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Tertiary grid: listings + tasks */}
            <section className="ag-grid ag-grid--even">
              <div className="ag-panel">
                <div className="ag-panel-head">
                  <h2 className="ag-panel-title">
                    <Building2 size={17} /> Active listings
                  </h2>
                  <button type="button" className="ag-panel-action" onClick={() => setActiveView("properties")}>
                    Browse <ChevronRight size={14} />
                  </button>
                </div>
                <div className="ag-list">
                  {properties.slice(0, 3).map((prop) => {
                    const img = prop.image_urls?.[0] || prop.images?.[0] || DEFAULT_PROPERTY_IMAGE;
                    return (
                      <div
                        key={prop.id}
                        className="ag-list-item"
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveView("properties")}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveView("properties"); } }}
                      >
                        <img src={img} alt="Property" className="ag-list-thumb" />
                        <div className="ag-list-body">
                          <p className="ag-list-title">{prop.address || prop.title || "Rental property"}</p>
                          <p className="ag-list-sub">{prop.city || prop.area || "—"} • {prop.property_type || "Apartment"}</p>
                        </div>
                        <span className="ag-list-price">R{Number(prop.price).toLocaleString()}</span>
                      </div>
                    );
                  })}

                  {properties.length === 0 && (
                    <div className="ag-empty" style={{ padding: '32px 16px' }}>
                      <Building2 size={28} />
                      <p className="ag-empty-sub" style={{ margin: 0 }}>No active listings</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="ag-panel">
                <div className="ag-panel-head">
                  <h2 className="ag-panel-title">
                    <ListChecks size={17} /> Task queue
                  </h2>
                  <span className="ag-panel-meta">{tasks.filter(t => !t.completed).length} open</span>
                </div>

                <div className="ag-task-scroll">
                  {tasks.map((task) => {
                    const tone = PRIORITY_TONES[task.priority] || PRIORITY_TONES['Follow-up'];
                    return (
                      <div key={task.id} className="ag-task">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`ag-task-check${task.completed ? ' is-done' : ''}`}
                          title={task.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          {task.completed && <Check size={12} color="#fff" />}
                        </button>
                        <p className={`ag-task-title${task.completed ? ' is-done' : ''}`}>{task.title}</p>
                        <span className="ag-task-prio" style={{ background: tone.bg, color: tone.color }}>{task.priority}</span>
                        <button type="button" onClick={() => deleteTask(task.id)} className="ag-task-del" title="Delete task">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <div className="ag-empty" style={{ padding: '28px 16px' }}>
                      <ListChecks size={26} />
                      <p className="ag-empty-sub" style={{ margin: 0 }}>No reminders yet — add one below.</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddTask} className="ag-add-task">
                  <input
                    type="text"
                    placeholder="Add a reminder…"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                  <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Today">Today</option>
                    <option value="Follow-up">Follow-up</option>
                  </select>
                  <button type="submit" className="agent-btn agent-btn-primary" style={{ padding: '9px 14px' }}>Add</button>
                </form>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Application details */}
      {selectedApp && (
        <Modal
          isOpen={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          title={`Application #${String(selectedApp.id).slice(0, 8)}`}
          size="lg"
        >
          {(() => {
            const tenant = tenantById.get(selectedApp.tenant_id);
            const badge = getStatusBadge(selectedApp.status);
            const linkedProperty = selectedApp.property_id
              ? properties.find((p) => p.id === selectedApp.property_id)
              : null;
            const matchAnalysis = evaluateJobApplicationMatch({
              application: selectedApp,
              tenant,
              property: linkedProperty || undefined
            });
            const docsCount = Array.isArray(selectedApp.documents) ? selectedApp.documents.length : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--ag-text)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 18, borderBottom: '1px solid var(--ag-line)' }}>
                  <div className="agent-avatar" style={{ width: 48, height: 48, fontSize: '1.05rem' }}>
                    {tenant?.profile_picture ? (
                      <img src={tenant.profile_picture} alt="Applicant" />
                    ) : (
                      <span>{(tenant?.full_name || tenant?.email || "T")[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{tenant?.full_name || "Applicant"}</h3>
                    <p style={{ margin: '3px 0 0', fontSize: '0.83rem', color: 'var(--ag-muted)' }}>
                      {tenant?.email || "No email"} • {tenant?.phone || "No phone listed"}
                    </p>
                  </div>
                  <span className="agent-status-badge" style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}>
                    {badge.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    {
                      label: 'Monthly budget',
                      value: selectedApp.max_budget
                        ? (selectedApp.min_budget
                            ? `R${Number(selectedApp.min_budget).toLocaleString()} – R${Number(selectedApp.max_budget).toLocaleString()}`
                            : `Up to R${Number(selectedApp.max_budget).toLocaleString()}`)
                        : "Not specified",
                      accent: true
                    },
                    { label: 'Preferred areas', value: selectedApp.preferred_areas?.join(', ') || "Any area" },
                    { label: 'Move-in date', value: selectedApp.move_in_date ? new Date(selectedApp.move_in_date).toLocaleDateString() : "Flexible" },
                    { label: 'Lease duration', value: selectedApp.lease_duration_months ? `${selectedApp.lease_duration_months} months` : "Not specified" }
                  ].map((f) => (
                    <div key={f.label} style={{ padding: 14, background: 'var(--ag-panel)', border: '1px solid var(--ag-line)', borderRadius: 12 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ag-dim)' }}>{f.label}</span>
                      <p className="ag-mono" style={{ margin: '7px 0 0', fontSize: '0.92rem', fontWeight: 600, color: f.accent ? '#34d399' : '#fff' }}>{f.value}</p>
                    </div>
                  ))}
                </div>

                <div
                  onClick={() => setActiveJobApp(selectedApp)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    padding: '13px 15px', borderRadius: 12, cursor: 'pointer',
                    background: 'var(--ag-accent-soft)', border: '1px dashed var(--ag-accent-line)'
                  }}
                  title="Open job linking & commute analysis"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <span className="agent-score-pill" style={{ background: `${matchAnalysis.tierColor}20`, borderColor: matchAnalysis.tierColor, color: matchAnalysis.tierColor }}>
                      <Waypoints size={13} /> {matchAnalysis.compositeScore}%
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                        {matchAnalysis.employment.jobTitle} · {matchAnalysis.employment.employerName}
                      </p>
                      <span style={{ fontSize: '0.72rem', color: 'var(--ag-muted)' }}>
                        {matchAnalysis.affordability.multiplier}x rent coverage • ~{matchAnalysis.proximity.approxDistanceKm} km commute
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: matchAnalysis.tierColor, whiteSpace: 'nowrap' }}>
                    {matchAnalysis.verdict} →
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button type="button" className="agent-btn agent-btn-secondary" onClick={() => setActiveDocApp(selectedApp)} style={{ color: '#34d399' }}>
                    <FileCheck size={15} /> Documents ({docsCount})
                  </button>
                  <button type="button" className="agent-btn agent-btn-secondary" onClick={() => setActiveJobApp(selectedApp)} style={{ color: '#7da2ff' }}>
                    <Briefcase size={15} /> Job &amp; commute
                  </button>
                </div>

                {selectedApp.special_requirements && (
                  <div style={{ padding: 14, background: 'var(--ag-panel)', border: '1px solid var(--ag-line)', borderRadius: 12 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ag-dim)' }}>Notes</span>
                    <p style={{ margin: '7px 0 0', fontSize: '0.85rem', color: 'var(--ag-muted)', lineHeight: 1.55 }}>“{selectedApp.special_requirements}”</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ag-muted)' }}>Status</span>
                    {selectedApp.status === 'completed' ? (
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, padding: '5px 10px', background: 'rgba(16,185,129,0.15)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.35)' }}>
                        ✓ Completed (Admin Approved)
                      </span>
                    ) : (
                      <select
                        value={selectedApp.status || 'submitted'}
                        onChange={(e) => handleQuickStatusChange(selectedApp.id, e.target.value)}
                        style={{ background: '#101827', border: '1px solid var(--ag-line)', color: '#fff', padding: '7px 12px', borderRadius: 9, fontSize: '0.8rem' }}
                      >
                        {AGENT_SELECTABLE_APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>{applicationStatusLabel(s)}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="agent-btn agent-btn-secondary"
                      onClick={() => setContactModal({
                        isOpen: true,
                        contact: {
                          name: tenant?.full_name || 'Applicant',
                          role: 'Applicant',
                          email: tenant?.email || '',
                          phone: tenant?.phone || '',
                          unit: selectedApp.preferred_areas?.[0] || 'Rental application'
                        },
                        defaultSubject: `Update on Place4U application #${String(selectedApp.id).slice(0, 8)}`,
                        defaultMessage: `Hello ${tenant?.full_name || 'Applicant'}, I am reviewing your application on Place4U.`
                      })}
                      style={{ color: '#25D366' }}
                    >
                      <Phone size={14} /> Contact
                    </button>
                    <button type="button" className="agent-btn agent-btn-primary" onClick={() => setSelectedApp(null)}>Done</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Match tenant */}
      {isMatchModalOpen && (
        <Modal isOpen={isMatchModalOpen} onClose={() => setIsMatchModalOpen(false)} title="Matching engine" size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, color: 'var(--ag-text)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ag-muted)', lineHeight: 1.55 }}>
              Review candidate listings for an applicant based on budget, area preferences and unit specifications.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>Applicant</label>
              <select
                value={selectedMatchAppId || (applications[0]?.id || '')}
                onChange={(e) => setSelectedMatchAppId(e.target.value)}
                style={{ flex: 1, minWidth: 220, background: '#101827', border: '1px solid var(--ag-line)', color: '#fff', padding: '9px 12px', borderRadius: 10, fontSize: '0.85rem' }}
              >
                {applications.map(app => {
                  const t = tenantById.get(app.tenant_id);
                  return (
                    <option key={app.id} value={app.id}>
                      {t?.full_name || 'Applicant'} — R{Number(app.max_budget || 0).toLocaleString()} ({app.preferred_areas?.[0] || 'Any area'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const targetApp = applications.find(a => a.id === (selectedMatchAppId || applications[0]?.id)) || applications[0];
                if (!targetApp) return <p style={{ color: 'var(--ag-dim)' }}>No applicant selected</p>;

                const ranked = properties
                  .map(prop => ({ prop, score: calculateMatchScore(targetApp, prop) }))
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3);

                return ranked.map(({ prop, score }) => (
                  <div
                    key={prop.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 13, borderRadius: 12, background: 'var(--ag-panel)', border: '1px solid var(--ag-line)' }}
                  >
                    <img
                      src={prop.image_urls?.[0] || prop.images?.[0] || DEFAULT_PROPERTY_IMAGE}
                      alt="Listing"
                      style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{prop.address || prop.title || "Listing"}</h4>
                        <span className="agent-score-pill">{score}%</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--ag-muted)' }}>
                        {prop.city || prop.area || "—"} • R{Number(prop.price).toLocaleString()}/month
                      </p>
                    </div>
                    <button
                      type="button"
                      className="agent-btn agent-btn-sparkle"
                      style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                      onClick={() => {
                        handleQuickStatusChange(targetApp.id, 'matches_found');
                        setIsMatchModalOpen(false);
                      }}
                    >
                      Send
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Direct contact */}
      <DirectContactModal
        isOpen={contactModal.isOpen}
        onClose={() => setContactModal({ isOpen: false, contact: null, defaultSubject: "", defaultMessage: "" })}
        contact={contactModal.contact || {}}
        defaultSubject={contactModal.defaultSubject}
        defaultMessage={contactModal.defaultMessage}
      />

      {/* Documents */}
      {activeDocApp && (
        <ApplicationDocumentsModal
          isOpen={Boolean(activeDocApp)}
          onClose={() => setActiveDocApp(null)}
          application={activeDocApp}
          tenant={tenantById?.get(activeDocApp.tenant_id)}
        />
      )}

      {/* Job linkage */}
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
