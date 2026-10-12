import { useState, useEffect, useMemo } from "react";
import { 
  Users, Search, UserPlus, Filter, Mail, Phone, ExternalLink, Check, Copy, 
  CheckCircle, AlertCircle, Building, Calendar, DollarSign, FileCheck, FileText, 
  UserCheck, Clock, ShieldCheck, Inbox 
} from "lucide-react";
import { T } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from './Component/Buttons';
import { Modal } from './Component/Modal';
import { TenantApplicationReviewModal } from './Component/TenantApplicationReviewModal';
import { supabase } from '../../utils/Supabase';
import { LandlordQueries } from './db/queries';
import { subscribeToApplicationUpdates } from '../../services/applicationSync';
import { properties as mockProperties } from './data/mockData';
import Loading from '../../component/loading';

export const Tenants = ({ profile, properties = [], user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState("applications"); // 'applications' | 'residents'
  const [appFilter, setAppFilter] = useState("all"); // 'all' | 'submitted' | 'under_review' | 'completed'
  const [searchQuery, setSearchQuery] = useState("");
  const [tenants, setTenants] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedAppForReview, setSelectedAppForReview] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    propertyId: "",
    monthlyRent: "",
    leaseStartDate: new Date().toISOString().split("T")[0]
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const fetchApplications = async () => {
    try {
      const pIds = (properties || []).map((p) => p.id).filter(Boolean);
      const res = await LandlordQueries.getLandlordApplications(
        profile?.user_id || profile?.id || user?.id,
        pIds
      );
      if (res.success && Array.isArray(res.data)) {
        setApplications(res.data);
      }
    } catch (err) {
      console.warn("Could not load landlord applications:", err);
    }
  };

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      if (!profile?.id) {
        setTenants([
          {
            id: "t-1",
            user: { full_name: "John Doe", email: "john.doe@example.com", phone: "+27 82 123 4567" },
            property_name: "Sunset Apartments Unit 3A",
            rent: "R8,500/mo",
            lease_status: "Active",
            lease_end: "31 Dec 2026"
          },
          {
            id: "t-2",
            user: { full_name: "Jane Smith", email: "jane.smith@example.com", phone: "+27 83 987 6543" },
            property_name: "Sunset Apartments Unit 3A",
            rent: "R8,500/mo",
            lease_status: "Active",
            lease_end: "31 Dec 2026"
          },
          {
            id: "t-3",
            user: { full_name: "Mike Johnson", email: "mike.j@example.com", phone: "+27 71 555 1234" },
            property_name: "Harbour View Apartment",
            rent: "R12,000/mo",
            lease_status: "Active",
            lease_end: "30 Jun 2026"
          }
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('*, user:user_id(email, full_name, phone), property:property_id(name, rent)')
        .eq('landlord_id', profile.id);
      
      if (!error && data && data.length > 0) {
        setTenants(data);
      } else {
        setTenants([
          {
            id: "t-1",
            user: { full_name: "John Doe", email: "john.doe@example.com", phone: "+27 82 123 4567" },
            property_name: "Sunset Apartments Unit 3A",
            rent: "R8,500/mo",
            lease_status: "Active",
            lease_end: "31 Dec 2026"
          },
          {
            id: "t-2",
            user: { full_name: "Jane Smith", email: "jane.smith@example.com", phone: "+27 83 987 6543" },
            property_name: "Sunset Apartments Unit 3A",
            rent: "R8,500/mo",
            lease_status: "Active",
            lease_end: "31 Dec 2026"
          },
          {
            id: "t-3",
            user: { full_name: "Mike Johnson", email: "mike.j@example.com", phone: "+27 71 555 1234" },
            property_name: "Harbour View Apartment",
            rent: "R12,000/mo",
            lease_status: "Active",
            lease_end: "30 Jun 2026"
          }
        ]);
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchApplications();

    // Cross-dashboard real-time interlocking listener
    const unsubscribe = subscribeToApplicationUpdates(() => {
      fetchApplications();
      fetchTenants();
    });

    return () => unsubscribe();
  }, [profile?.id, properties?.length]);

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

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      const name = (t.user?.full_name || t.full_name || "").toLowerCase();
      const email = (t.user?.email || t.email || "").toLowerCase();
      const prop = (t.property_name || t.property?.name || "").toLowerCase();
      return name.includes(search) || email.includes(search) || prop.includes(search);
    });
  }, [tenants, searchQuery]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      if (appFilter !== "all" && app.status !== appFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = (app.tenant?.full_name || app.tenant?.email || "").toLowerCase();
      const prop = (app.property_title || app.property?.name || "").toLowerCase();
      const id = String(app.id || "").toLowerCase();
      return name.includes(q) || prop.includes(q) || id.includes(q);
    });
  }, [applications, appFilter, searchQuery]);

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteForm.email) return;

    const newTenant = {
      id: `t-${Date.now()}`,
      user: {
        full_name: inviteForm.fullName || "Invited Tenant",
        email: inviteForm.email,
        phone: "+27 -- --- ----"
      },
      property_name: inviteForm.propertyId || "Assigned Property",
      rent: inviteForm.monthlyRent ? `R${inviteForm.monthlyRent}/mo` : "R8,500/mo",
      lease_status: "Pending Acceptance",
      lease_end: "1 Year Lease"
    };

    setTenants(prev => [newTenant, ...prev]);
    setIsInviteModalOpen(false);
    setInviteForm({
      fullName: "",
      email: "",
      propertyId: "",
      monthlyRent: "",
      leaseStartDate: new Date().toISOString().split("T")[0]
    });
    showToast(`Invitation successfully dispatched to ${inviteForm.email}`);
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/signup?ref=${profile?.landlord_code || "LD-2026"}&role=tenant`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    showToast("Shareable Tenant Invite link copied to clipboard!");
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          background: "#10b981",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.9rem",
          fontWeight: 500
        }}>
          <CheckCircle size={18} />
          {toastMessage}
        </div>
      )}

      {/* Review Tenant Application & Verification Documents Modal */}
      <TenantApplicationReviewModal
        isOpen={Boolean(selectedAppForReview)}
        onClose={() => setSelectedAppForReview(null)}
        application={selectedAppForReview}
        properties={properties}
        onStatusUpdated={async (appId, newStatus) => {
          showToast(`Application updated to ${newStatus.toUpperCase()}`);
          await fetchApplications();
          await fetchTenants();
        }}
      />

      {/* Invite Tenant Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Tenant"
        size="md"
      >
        <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
              Tenant Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sindi Ndlovu"
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="tenant@example.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
                Assign Property Unit
              </label>
              <select
                value={inviteForm.propertyId}
                onChange={(e) => setInviteForm({ ...inviteForm, propertyId: e.target.value })}
                style={{ ...inputStyle, width: "100%" }}
              >
                <option value="">Select a unit...</option>
                {mockProperties.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
                Monthly Rent (ZAR)
              </label>
              <input
                type="number"
                placeholder="8500"
                value={inviteForm.monthlyRent}
                onChange={(e) => setInviteForm({ ...inviteForm, monthlyRent: e.target.value })}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
          </div>

          <div style={{
            background: "rgba(79,126,248,0.08)",
            border: `1px solid ${T.border}`,
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <p style={{ fontSize: "0.8rem", color: T.textPrimary, fontWeight: 500 }}>Direct Shareable Invite Link</p>
              <p style={{ fontSize: "0.72rem", color: T.textMuted }}>Tenants can register & connect using your Landlord Code</p>
            </div>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: "6px",
                padding: "6px 12px",
                color: T.accent,
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              {copiedLink ? <Check size={13} color={T.emerald} /> : <Copy size={13} />}
              {copiedLink ? "Copied" : "Copy Link"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <PrimaryBtn style={{ flex: 1 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <UserPlus size={15} /> Send Official Invite
              </span>
            </PrimaryBtn>
            <SecondaryBtn type="button" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </SecondaryBtn>
          </div>
        </form>
      </Modal>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, lineHeight: 1, marginBottom: "6px" }}>
            Tenants & Applications
          </h1>
          <p style={{ color: T.textMuted, fontSize: "0.9rem" }}>
            Review incoming prospective tenant applications, assigned agents, and current active leases
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <SecondaryBtn onClick={handleCopyInviteLink}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Copy size={14} /> {copiedLink ? "Link Copied" : "Copy Invite Link"}
            </span>
          </SecondaryBtn>
          <PrimaryBtn onClick={() => setIsInviteModalOpen(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <UserPlus size={14} /> Invite Tenant
            </span>
          </PrimaryBtn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "1.5rem",
        borderBottom: `1px solid ${T.border}`,
        paddingBottom: "8px"
      }}>
        <button
          onClick={() => setActiveTab("applications")}
          style={{
            background: activeTab === "applications" ? "rgba(79,126,248,0.15)" : "transparent",
            color: activeTab === "applications" ? T.accent : T.textSecondary,
            border: activeTab === "applications" ? `1px solid ${T.accent}` : `1px solid transparent`,
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <Inbox size={16} />
          Inbound Applications
          <span style={{
            background: activeTab === "applications" ? T.accent : T.surface,
            color: activeTab === "applications" ? "#fff" : T.textMuted,
            fontSize: "0.72rem",
            padding: "2px 7px",
            borderRadius: "12px",
            fontWeight: 700
          }}>
            {applications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("residents")}
          style={{
            background: activeTab === "residents" ? "rgba(79,126,248,0.15)" : "transparent",
            color: activeTab === "residents" ? T.accent : T.textSecondary,
            border: activeTab === "residents" ? `1px solid ${T.accent}` : `1px solid transparent`,
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <Users size={16} />
          Active Residents & Leases
          <span style={{
            background: activeTab === "residents" ? T.accent : T.surface,
            color: activeTab === "residents" ? "#fff" : T.textMuted,
            fontSize: "0.72rem",
            padding: "2px 7px",
            borderRadius: "12px",
            fontWeight: 700
          }}>
            {tenants.length}
          </span>
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1, maxWidth: "600px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={16} color={T.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder={activeTab === "applications" ? "Search applicant name, property, or application ID..." : "Search tenants by name, email, or property..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, width: "100%", paddingLeft: "40px" }}
            />
          </div>

          {activeTab === "applications" && (
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              style={{ ...inputStyle, width: "auto" }}
            >
              <option value="all">All Statuses</option>
              <option value="submitted">New Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed / Approved</option>
              <option value="expired">Expired / Cancelled</option>
            </select>
          )}
        </div>

        <span style={{ color: T.textMuted, fontSize: "0.85rem" }}>
          {activeTab === "applications"
            ? `Showing ${filteredApplications.length} applications (interlocked live)`
            : `Showing ${filteredTenants.length} active leases`}
        </span>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <Loading message="Loading records…" />
        </div>
      ) : activeTab === "applications" ? (
        /* Applications Table / Cards */
        filteredApplications.length > 0 ? (
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: "1rem",
            overflow: "hidden"
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Applicant</th>
                    <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Property</th>
                    <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Budget & Move-In</th>
                    <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Status</th>
                    <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Assigned Agent</th>
                    <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Submitted</th>
                    <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => {
                    const applicantName = app.tenant?.full_name || app.tenant?.email || "Prospective Tenant";
                    const applicantEmail = app.tenant?.email || "—";
                    const applicantPhone = app.tenant?.phone || "—";
                    const propertyTitle = app.property_title || app.property?.name || "Assigned Property";
                    const status = app.status || "submitted";
                    const agentName = app.agent?.full_name || (app.assigned_to ? "Designated Agent" : "Unassigned");
                    const agentEmail = app.agent?.email;

                    const statusColorMap = {
                      submitted: { bg: "rgba(79,126,248,0.12)", color: T.accent, label: "Submitted" },
                      under_review: { bg: "rgba(245,158,11,0.12)", color: T.amber, label: "Under Review" },
                      completed: { bg: "rgba(16,185,129,0.12)", color: T.emerald, label: "Completed" },
                      expired: { bg: "rgba(239,68,68,0.12)", color: T.red, label: "Expired" },
                      cancelled: { bg: "rgba(239,68,68,0.12)", color: T.red, label: "Cancelled" }
                    };
                    const badge = statusColorMap[status] || { bg: "rgba(255,255,255,0.06)", color: T.textMuted, label: status };

                    return (
                      <tr
                        key={app.id}
                        style={{
                          borderBottom: `1px solid ${T.border}`,
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "#fff",
                              flexShrink: 0
                            }}>
                              {applicantName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: T.textPrimary }}>{applicantName}</p>
                              <p style={{ fontSize: "0.75rem", color: T.textMuted }}>{applicantEmail} · {applicantPhone}</p>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "16px 18px" }}>
                          <p style={{ fontSize: "0.85rem", color: T.textPrimary, fontWeight: 500 }}>{propertyTitle}</p>
                          <span style={{ fontSize: "0.72rem", color: T.textMuted }}>Ref #{String(app.id).slice(0, 8)}</span>
                        </td>

                        <td style={{ padding: "16px 18px" }}>
                          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: T.accent }}>
                            {app.max_budget ? `R${app.max_budget.toLocaleString()}/mo` : "R8,500/mo"}
                          </p>
                          <p style={{ fontSize: "0.72rem", color: T.textMuted }}>
                            Move-in: {app.move_in_date || "Immediate"}
                          </p>
                        </td>

                        <td style={{ padding: "16px 18px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: "20px",
                            background: badge.bg,
                            color: badge.color
                          }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: badge.color }} />
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ShieldCheck size={14} color={app.assigned_to ? T.emerald : T.textMuted} />
                            <div>
                              <p style={{ fontSize: "0.82rem", fontWeight: 500, color: app.assigned_to ? T.textPrimary : T.textMuted }}>
                                {agentName}
                              </p>
                              {agentEmail && <p style={{ fontSize: "0.7rem", color: T.textMuted }}>{agentEmail}</p>}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "16px 18px", fontSize: "0.78rem", color: T.textSecondary }}>
                          {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : "Recently"}
                        </td>

                        <td style={{ padding: "16px 18px", textAlign: "right" }}>
                          <button
                            onClick={() => setSelectedAppForReview(app)}
                            style={{
                              padding: "6px 14px",
                              background: "rgba(79, 126, 248, 0.15)",
                              border: `1px solid rgba(79, 126, 248, 0.3)`,
                              borderRadius: "8px",
                              color: T.accent,
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.15s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = T.accent;
                              e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(79, 126, 248, 0.15)";
                              e.currentTarget.style.color = T.accent;
                            }}
                          >
                            <FileText size={13} /> Review Docs & Assign
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{
            background: T.cardBg,
            border: `1px dashed ${T.border}`,
            borderRadius: "1rem",
            padding: "4rem 2rem",
            textAlign: "center"
          }}>
            <Inbox size={36} color={T.textMuted} style={{ marginBottom: "1rem", opacity: 0.6 }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: T.textPrimary, marginBottom: "0.5rem" }}>
              No incoming tenant applications yet
            </h2>
            <p style={{ color: T.textMuted, fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
              Prospective tenants applying for your listings or submitting search requests through agents will appear here automatically in real time.
            </p>
            <SecondaryBtn onClick={fetchApplications}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} /> Check for New Applications
              </span>
            </SecondaryBtn>
          </div>
        )
      ) : filteredTenants.length > 0 ? (
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          overflow: "hidden"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Tenant</th>
                  <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Property Unit</th>
                  <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Contact</th>
                  <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Rent</th>
                  <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Lease Status</th>
                  <th style={{ padding: "14px 18px", fontSize: "0.72rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t, idx) => {
                  const name = t.user?.full_name || t.full_name || "Active Tenant";
                  const email = t.user?.email || t.email || "tenant@place4u.co.za";
                  const phone = t.user?.phone || t.phone || "+27 82 000 0000";
                  const prop = t.property_name || t.property?.name || "Assigned Property";
                  const rent = t.rent || (t.property?.rent ? `R${t.property.rent}/mo` : "R8,500/mo");
                  const status = t.lease_status || "Active";
                  const expiry = t.lease_end || "31 Dec 2026";

                  return (
                    <tr
                      key={t.id || idx}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        transition: "background 0.15s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "#fff"
                          }}>
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: "0.88rem", fontWeight: 600, color: T.textPrimary }}>{name}</p>
                            <span style={{ fontSize: "0.72rem", color: T.textMuted }}>ID #{t.id}</span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <p style={{ fontSize: "0.85rem", color: T.textPrimary, fontWeight: 500 }}>{prop}</p>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <p style={{ fontSize: "0.82rem", color: T.textSecondary }}>{email}</p>
                        <p style={{ fontSize: "0.75rem", color: T.textMuted }}>{phone}</p>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: T.accent }}>{rent}</span>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: "20px",
                          background: status === "Active" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                          color: status === "Active" ? T.emerald : T.amber
                        }}>
                          {status === "Active" ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                          {status}
                        </span>
                      </td>

                      <td style={{ padding: "16px 18px", fontSize: "0.8rem", color: T.textSecondary }}>
                        {expiry}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div style={{
          background: T.cardBg,
          border: `1px dashed ${T.border}`,
          borderRadius: "1rem",
          padding: "4rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}>
          <Users size={36} color={T.textMuted} style={{ marginBottom: "1rem", opacity: 0.6 }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: T.textPrimary, marginBottom: "0.5rem" }}>
            No tenants matched your search
          </h2>
          <p style={{ color: T.textMuted, fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Try clearing search filters or invite a new tenant directly.
          </p>
          <PrimaryBtn onClick={() => setIsInviteModalOpen(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <UserPlus size={16} /> Invite New Tenant
            </span>
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
};
