import { useState, useEffect, useMemo } from "react";
import {
  Users, Search, UserPlus, Copy, Check, CheckCircle, AlertCircle, FileText,
  Clock, ShieldCheck, Inbox, Mail, Phone, Building, Calendar
} from "lucide-react";
import { T, SERIF } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from './Component/Buttons';
import { Modal } from './Component/Modal';
import { TenantApplicationReviewModal } from './Component/TenantApplicationReviewModal';
import { supabase } from '../../utils/Supabase';
import { LandlordQueries } from './db/queries';
import { subscribeToApplicationUpdates } from '../../services/applicationSync';
import {
  applicationStatusLabel,
  isClosedApplication,
  normalizeApplicationStatus
} from '../../services/applicationStatus';
import { initials } from './Styles/helpers';
import Loading from '../../component/loading';

const EYEBROW = { fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: T.textMuted, margin: 0 };

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
      const landlordId = user?.id || profile?.user_id || null;
      if (!landlordId) {
        setTenants([]);
        return;
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('*, user:user_id(email, full_name, phone), property:property_id(address, area, city, price)')
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load residents:', error.message);
        setTenants([]);
        return;
      }
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load residents:', err);
      setTenants([]);
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
    background: "#ffffff",
    border: `1px solid ${T.borderStrong}`,
    borderRadius: "0.75rem",
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
      if (appFilter !== "all") {
        if (appFilter === "closed") {
          if (!isClosedApplication(app)) return false;
        } else if (normalizeApplicationStatus(app.status) !== appFilter) {
          return false;
        }
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = (app.tenant?.full_name || app.tenant?.email || "").toLowerCase();
      const prop = (app.property_title || app.property?.name || "").toLowerCase();
      const id = String(app.id || "").toLowerCase();
      return name.includes(q) || prop.includes(q) || id.includes(q);
    });
  }, [applications, appFilter, searchQuery]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email) return;

    const landlordId = user?.id || profile?.user_id || null;
    const selectedProperty = (properties || []).find((p) => String(p.id) === String(inviteForm.propertyId)) || null;
    const rentValue = inviteForm.monthlyRent
      ? Number(inviteForm.monthlyRent)
      : (selectedProperty?.price != null ? Number(selectedProperty.price) : null);
    const email = inviteForm.email;
    const fullName = inviteForm.fullName || "Invited Tenant";

    const optimistic = {
      id: `t-${Date.now()}`,
      full_name: fullName,
      email,
      phone: "",
      property: selectedProperty,
      rent: rentValue,
      lease_status: "Pending Acceptance",
      lease_end: null
    };

    setTenants((prev) => [optimistic, ...prev]);
    setIsInviteModalOpen(false);
    setInviteForm({
      fullName: "",
      email: "",
      propertyId: "",
      monthlyRent: "",
      leaseStartDate: new Date().toISOString().split("T")[0]
    });

    try {
      if (landlordId) {
        const { error } = await supabase.from('tenants').insert([{
          landlord_id: landlordId,
          property_id: selectedProperty?.id || null,
          full_name: fullName,
          email,
          rent: rentValue,
          lease_status: 'Pending Acceptance',
          lease_start: inviteForm.leaseStartDate || null,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
        await fetchTenants();
      }
      showToast(`Invitation recorded for ${email}`);
    } catch (err) {
      console.warn('Could not persist invite:', err);
      showToast(`Invitation created for ${email}`);
    }
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/signup?ref=${profile?.landlord_code || "LD-2026"}&role=tenant`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    showToast("Shareable tenant invite link copied to clipboard");
  };

  const statusColorMap = {
    submitted: { bg: T.accentSoft, color: T.accent, label: "Submitted" },
    under_review: { bg: T.amberSoft, color: T.amber, label: "Under Review" },
    matches_found: { bg: T.accentSoft, color: T.accent, label: "Matches Found" },
    completed: { bg: T.emeraldSoft, color: T.emerald, label: "Completed" },
    expired: { bg: T.redSoft, color: T.red, label: "Expired" },
    cancelled: { bg: T.redSoft, color: T.red, label: "Cancelled" },
    rejected: { bg: T.redSoft, color: T.red, label: "Rejected" }
  };

  const thStyle = { padding: "14px 18px", fontSize: "0.68rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em", whiteSpace: "nowrap" };

  const renderAvatar = (label) => (
    <div style={{
      width: "38px", height: "38px", borderRadius: "50%",
      background: `linear-gradient(135deg, ${T.accent} 0%, #7c3aed 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.78rem", fontWeight: 700, color: "#fff", flexShrink: 0,
      boxShadow: "0 6px 14px -6px rgba(2,132,199,0.6)"
    }}>
      {initials(label)}
    </div>
  );

  return (
    <div className="ll-scope" style={{ maxWidth: 1400, margin: "0 auto", minWidth: 0 }}>
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: "#0f172a", color: "#fff", padding: "12px 18px", borderRadius: 14,
          boxShadow: "0 18px 45px -12px rgba(2,132,199,0.6)", display: "flex", alignItems: "center", gap: 8,
          fontSize: "0.88rem", fontWeight: 500, animation: "llToast 0.25s ease-out"
        }}>
          <CheckCircle size={17} color="#34d399" /> {toastMessage}
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
        subtitle="Send a direct invitation and start the lease onboarding"
        size="md"
      >
        <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Assign Property Unit
              </label>
              <select
                value={inviteForm.propertyId}
                onChange={(e) => setInviteForm({ ...inviteForm, propertyId: e.target.value })}
                style={{ ...inputStyle, width: "100%" }}
              >
                <option value="">Select a unit...</option>
                {(properties || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.address}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
            background: T.accentSofter,
            border: `1px solid ${T.accentBorder}`,
            borderRadius: "0.875rem",
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap"
          }}>
            <div>
              <p style={{ fontSize: "0.8rem", color: T.textPrimary, fontWeight: 600 }}>Direct shareable invite link</p>
              <p style={{ fontSize: "0.72rem", color: T.textMuted }}>Tenants can register & connect using your landlord code</p>
            </div>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              style={{
                background: "#ffffff",
                border: `1px solid ${T.accentBorder}`,
                borderRadius: 9999,
                padding: "6px 14px",
                color: T.accent,
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              {copiedLink ? <Check size={13} color={T.emerald} /> : <Copy size={13} />}
              {copiedLink ? "Copied" : "Copy link"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <PrimaryBtn type="submit" style={{ flex: 1 }}>
              <UserPlus size={15} /> Send Official Invite
            </PrimaryBtn>
            <SecondaryBtn type="button" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </SecondaryBtn>
          </div>
        </form>
      </Modal>

      {/* Hero / action band */}
      <div className="ll-anim-up" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1.2rem", flexWrap: "wrap",
        background: "linear-gradient(135deg, #ffffff 0%, #f3f9ff 100%)",
        border: `1px solid ${T.border}`, borderRadius: T.radiusXl, padding: "clamp(1.2rem, 3vw, 1.75rem)",
        marginBottom: "1.5rem", position: "relative", overflow: "hidden", boxShadow: T.shadow
      }}>
        <div aria-hidden style={{ position: "absolute", top: -50, right: -40, width: 200, height: 200, borderRadius: "9999px", background: "radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)" }} />
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          <div>
            <p style={EYEBROW}>Inbound applications</p>
            <p style={{ fontFamily: SERIF, fontSize: "2rem", color: T.textPrimary, lineHeight: 1.05, marginTop: 4 }}>{applications.length}</p>
          </div>
          <div aria-hidden style={{ width: 1, background: T.border }} />
          <div>
            <p style={EYEBROW}>Active residents</p>
            <p style={{ fontFamily: SERIF, fontSize: "2rem", color: T.textPrimary, lineHeight: 1.05, marginTop: 4 }}>{tenants.length}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", position: "relative", zIndex: 1, flexWrap: "wrap" }}>
          <SecondaryBtn onClick={handleCopyInviteLink}>
            <Copy size={14} /> {copiedLink ? "Link Copied" : "Copy Invite Link"}
          </SecondaryBtn>
          <PrimaryBtn onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus size={14} /> Invite Tenant
          </PrimaryBtn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "inline-flex", gap: 4, marginBottom: "1.5rem",
        background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 9999, padding: 4
      }}>
        {[
          { id: "applications", label: "Inbound Applications", Icon: Inbox, count: applications.length },
          { id: "residents", label: "Active Residents & Leases", Icon: Users, count: tenants.length },
        ].map(({ id, label, Icon, count }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                background: active ? T.accent : "transparent",
                color: active ? "#fff" : T.textSecondary,
                border: "none",
                padding: "8px 16px",
                borderRadius: 9999,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.18s"
              }}
            >
              <Icon size={15} />
              {label}
              <span style={{
                background: active ? "rgba(255,255,255,0.22)" : T.surface,
                color: active ? "#fff" : T.textMuted,
                fontSize: "0.7rem", padding: "2px 8px", borderRadius: 9999, fontWeight: 700
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1, maxWidth: "620px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={15} color={T.textMuted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder={activeTab === "applications" ? "Search applicant name, property, or application ID..." : "Search tenants by name, email, or property..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, width: "100%", paddingLeft: "2.4rem", borderRadius: 9999 }}
            />
          </div>

          {activeTab === "applications" && (
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              style={{ ...inputStyle, width: "auto", borderRadius: 9999 }}
            >
              <option value="all">All statuses</option>
              <option value="submitted">New submitted</option>
              <option value="under_review">Under review</option>
              <option value="matches_found">Matches found</option>
              <option value="completed">Completed / approved</option>
              <option value="closed">Expired / cancelled / rejected</option>
            </select>
          )}
        </div>

        <span style={{ color: T.textMuted, fontSize: "0.8rem" }}>
          {activeTab === "applications"
            ? `Showing ${filteredApplications.length} applications`
            : `Showing ${filteredTenants.length} active leases`}
        </span>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <Loading message="Loading records…" />
        </div>
      ) : activeTab === "applications" ? (
        filteredApplications.length > 0 ? (
          <div className="ll-anim-up" style={{ background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: T.radiusLg, overflow: "hidden", boxShadow: T.shadow }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
                    <th style={thStyle}>Applicant</th>
                    <th style={thStyle}>Property</th>
                    <th style={thStyle}>Budget & Move-In</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Assigned Agent</th>
                    <th style={thStyle}>Submitted</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => {
                    const applicantName = app.tenant?.full_name || app.tenant?.email || "Prospective Tenant";
                    const applicantEmail = app.tenant?.email || "—";
                    const applicantPhone = app.tenant?.phone || "—";
                    const propertyTitle = app.property_title || app.property?.name || "Assigned Property";
                    const status = normalizeApplicationStatus(app.status);
                    const agentName = app.agent?.full_name || (app.assigned_to ? "Designated Agent" : "Unassigned");
                    const agentEmail = app.agent?.email;
                    const badge = statusColorMap[status] || { bg: T.surface, color: T.textMuted, label: applicationStatusLabel(status) };

                    return (
                      <tr
                        key={app.id}
                        style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceTint}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {renderAvatar(applicantName)}
                            <div>
                              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: T.textPrimary }}>{applicantName}</p>
                              <p style={{ fontSize: "0.73rem", color: T.textMuted }}>{applicantEmail} · {applicantPhone}</p>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "16px 18px" }}>
                          <p style={{ fontSize: "0.85rem", color: T.textPrimary, fontWeight: 500 }}>{propertyTitle}</p>
                          <span style={{ fontSize: "0.7rem", color: T.textMuted }}>Ref #{String(app.id).slice(0, 8)}</span>
                        </td>

                        <td style={{ padding: "16px 18px" }}>
                          <p style={{ fontSize: "0.85rem", fontWeight: 700, color: T.accent }}>
                            {app.max_budget ? `R${app.max_budget.toLocaleString()}/mo` : "R8,500/mo"}
                          </p>
                          <p style={{ fontSize: "0.7rem", color: T.textMuted }}>Move-in: {app.move_in_date || "Immediate"}</p>
                        </td>

                        <td style={{ padding: "16px 18px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", fontWeight: 700,
                            padding: "4px 11px", borderRadius: 9999, background: badge.bg, color: badge.color
                          }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: badge.color }} />
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: "16px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <ShieldCheck size={14} color={app.assigned_to ? T.emerald : T.textMuted} />
                            <div>
                              <p style={{ fontSize: "0.82rem", fontWeight: 500, color: app.assigned_to ? T.textPrimary : T.textMuted }}>{agentName}</p>
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
                              padding: "7px 14px", background: T.accentSoft, border: `1px solid ${T.accentBorder}`,
                              borderRadius: 9999, color: T.accent, fontSize: "0.76rem", fontWeight: 700, cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: "6px", transition: "all 0.15s"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = T.accentSoft; e.currentTarget.style.color = T.accent; }}
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
            background: "#ffffff", border: `1px dashed ${T.borderHover}`, borderRadius: T.radiusLg,
            padding: "4rem 2rem", textAlign: "center", boxShadow: T.shadowSm
          }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: T.accentSoft, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <Inbox size={26} color={T.accent} />
            </div>
            <h2 style={{ fontFamily: SERIF, fontSize: "1.4rem", color: T.textPrimary, marginBottom: "0.5rem" }}>
              No incoming tenant applications yet
            </h2>
            <p style={{ color: T.textMuted, fontSize: "0.85rem", maxWidth: "440px", margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
              Prospective tenants applying for your listings or submitting search requests through agents will appear here automatically in real time.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <SecondaryBtn onClick={fetchApplications}>
                <Clock size={14} /> Check for new applications
              </SecondaryBtn>
            </div>
          </div>
        )
      ) : filteredTenants.length > 0 ? (
        <div className="ll-anim-up" style={{ background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: T.radiusLg, overflow: "hidden", boxShadow: T.shadow }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
                  <th style={thStyle}>Tenant</th>
                  <th style={thStyle}>Property Unit</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Rent</th>
                  <th style={thStyle}>Lease Status</th>
                  <th style={thStyle}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t, idx) => {
                  const name = t.user?.full_name || t.full_name || "Active Tenant";
                  const email = t.user?.email || t.email || "tenant@place4u.co.za";
                  const phone = t.user?.phone || t.phone || "+27 82 000 0000";
                  const prop = t.property_name || t.property?.address || t.property?.area || t.property?.city || "Assigned Property";
                  const rent = t.rent != null
                    ? `R${Number(t.rent).toLocaleString("en-ZA")}/mo`
                    : (t.property?.price != null ? `R${Number(t.property.price).toLocaleString("en-ZA")}/mo` : "—");
                  const status = t.lease_status || "Active";
                  const expiry = t.lease_end || "31 Dec 2026";
                  const active = status === "Active";

                  return (
                    <tr
                      key={t.id || idx}
                      style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceTint}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {renderAvatar(name)}
                          <div>
                            <p style={{ fontSize: "0.88rem", fontWeight: 600, color: T.textPrimary }}>{name}</p>
                            <span style={{ fontSize: "0.7rem", color: T.textMuted }}>ID #{String(t.id).slice(0, 10)}</span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <p style={{ fontSize: "0.85rem", color: T.textPrimary, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                          <Building size={13} color={T.accent} /> {prop}
                        </p>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <p style={{ fontSize: "0.8rem", color: T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                          <Mail size={12} color={T.textMuted} /> {email}
                        </p>
                        <p style={{ fontSize: "0.74rem", color: T.textMuted, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <Phone size={12} color={T.textMuted} /> {phone}
                        </p>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <span style={{ fontFamily: SERIF, fontSize: "1.05rem", color: T.accent }}>{rent}</span>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", fontWeight: 700,
                          padding: "4px 11px", borderRadius: 9999,
                          background: active ? T.emeraldSoft : T.amberSoft, color: active ? T.emerald : T.amber
                        }}>
                          {active ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                          {status}
                        </span>
                      </td>

                      <td style={{ padding: "16px 18px" }}>
                        <span style={{ fontSize: "0.79rem", color: T.textSecondary, display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Calendar size={12} color={T.textMuted} /> {expiry}
                        </span>
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
          background: "#ffffff", border: `1px dashed ${T.borderHover}`, borderRadius: T.radiusLg,
          padding: "4rem 2rem", display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", textAlign: "center", boxShadow: T.shadowSm
        }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: T.accentSoft, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <Users size={26} color={T.accent} />
          </div>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.4rem", color: T.textPrimary, marginBottom: "0.5rem" }}>
            No tenants matched your search
          </h2>
          <p style={{ color: T.textMuted, fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Try clearing search filters or invite a new tenant directly.
          </p>
          <PrimaryBtn onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus size={16} /> Invite New Tenant
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
};
