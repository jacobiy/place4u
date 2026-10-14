import React, { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  Mail,
  ChevronDown,
  Briefcase,
  Sparkles,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  ChevronRight,
  UserCheck,
  Clock
} from "lucide-react";
import Loading from "../../component/loading";
import { Modal } from "./Component/Modal";
import { ApplicationDocumentsModal } from "./Component/ApplicationDocumentsModal";
import { JobLinkApproximationModal } from "./Component/JobLinkApproximationModal";
import { JobResponseModal } from "./Component/JobResponseModal";
import { evaluateJobApplicationMatch } from "../../utils/jobAffordabilityMatcher";
import {
  APPLICATION_STATUS,
  AGENT_SELECTABLE_APPLICATION_STATUSES,
  applicationStatusLabel,
  getApplicationStatusMeta
} from "../../services/applicationStatus";
import {
  resolveApplicationProperty,
  describePropertyLocation,
  isGenericPropertyTitle
} from "../../utils/propertyLabel";
import "./Applications.css";

export const Applications = ({
  applications = [],
  properties = [],
  tenantById = new Map(),
  currentUserId = null,
  onRefresh = () => {},
  onUpdateStatus = () => {},
  onRequestCompletion = async () => ({ success: true }),
  onRespondToAssignment = async () => ({ success: true }),
  onManageApplication = () => {},
  loading = false
}) => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modals state
  const [activeDocApp, setActiveDocApp] = useState(null);
  const [activeJobApp, setActiveJobApp] = useState(null);
  const [rejectApp, setRejectApp] = useState(null);
  const [completionModalApp, setCompletionModalApp] = useState(null);
  const [completionNote, setCompletionNote] = useState("");
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [completionFeedback, setCompletionFeedback] = useState("");
  const [respondingId, setRespondingId] = useState(null);
  const [responseError, setResponseError] = useState("");

  const assignmentStatusOf = (app) =>
    app?.assignment_status || (app?.assigned_to ? "assigned" : "unassigned");

  const handleAcceptJob = async (app) => {
    setRespondingId(app.id);
    setResponseError("");
    const res = await onRespondToAssignment(app.id, "accepted", null);
    if (res && res.success === false) {
      setResponseError(res.error || "Could not accept this job. Please try again.");
    }
    setRespondingId(null);
  };

  const handleRejectJob = async (reason) => {
    if (!rejectApp) return;
    setRespondingId(rejectApp.id);
    setResponseError("");
    const res = await onRespondToAssignment(rejectApp.id, "rejected", reason);
    if (res && res.success === false) {
      setResponseError(res.error || "Could not reject this job. Please try again.");
    } else {
      setRejectApp(null);
    }
    setRespondingId(null);
  };

  const handleSubmitCompletionRequest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!completionModalApp) return;
    setIsSubmittingCompletion(true);
    setCompletionFeedback("");
    try {
      const ok = await onRequestCompletion(completionModalApp.id, completionNote.trim() || null);
      if (ok) {
        setCompletionFeedback("Completion review requested! The administrator will review and approve the placement.");
        setTimeout(() => {
          setCompletionModalApp(null);
          setCompletionNote("");
          setCompletionFeedback("");
        }, 1800);
      } else {
        setCompletionFeedback("Failed to request completion review. Please try again.");
      }
    } catch (err) {
      setCompletionFeedback(err?.message || "Error submitting request");
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (applications || []).filter((a) => {
      // Strictly enforce that the application is assigned to this agent
      if (currentUserId && a.assigned_to && String(a.assigned_to) !== String(currentUserId)) {
        return false;
      }

      const tenant = tenantById?.get(a.tenant_id);
      
      const matchesCategory = 
        selectedCategory === 'all' || 
        (selectedCategory === 'student' && (a.accommodation_category === 'student_room' || a.category === 'student_room')) ||
        (selectedCategory === 'residential' && (a.accommodation_category !== 'student_room' && a.category !== 'student_room'));

      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        String(a.id).toLowerCase().includes(q) ||
        (a.status || "").toLowerCase().includes(q) ||
        (a.property_title || "").toLowerCase().includes(q) ||
        (tenant?.full_name || "").toLowerCase().includes(q) ||
        (tenant?.email || "").toLowerCase().includes(q) ||
        (tenant?.occupation || "").toLowerCase().includes(q) ||
        (tenant?.employer || "").toLowerCase().includes(q)
      );
    });
  }, [applications, query, tenantById, selectedCategory]);

  const getStatusColor = (status) => getApplicationStatusMeta(status).hex;
  const getStatusLabel = (status) => applicationStatusLabel(status);

  return (
    <div className="applications-container">
      <div className="applications-wrapper">
        
        {/* Header */}
        <div className="applications-header">
          <div>
            <span className="ag-eyebrow">Assigned work</span>
            <h1 className="applications-title" style={{ marginTop: 8 }}>Assigned applications</h1>
            <p className="applications-subtitle">
              Review rental applications assigned directly to you, inspect attached FICA verification documents, and run job-to-property affordability matching.
            </p>
          </div>
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="refresh-button"
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} /> 
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Assignment response error */}
        {responseError && (
          <div className="assignment-response-error" style={{ marginBottom: "1.25rem" }}>
            <AlertTriangle size={15} />
            <span>{responseError}</span>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="search-filter-row">
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by tenant name, employer, area, or ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="category-filter-buttons">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`cat-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            >
              Assigned to You ({applications.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('residential')}
              className={`cat-btn ${selectedCategory === 'residential' ? 'active' : ''}`}
            >
              Residential Rentals
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('student')}
              className={`cat-btn ${selectedCategory === 'student' ? 'active' : ''}`}
            >
              Student Housing
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loading message="Loading application dossiers & documents..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-icon" size={48} />
            <p className="empty-text">No applications assigned to you</p>
            <p className="empty-subtext">
              {query ? 'Try adjusting your search query.' : 'When an administrator assigns a rental application to your agent profile, it will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="applications-grid">
              {filtered.map((app) => {
                const tenant = tenantById?.get(app.tenant_id);

                // Only evaluate against the listing the application is actually linked to —
                // never borrow an unrelated property to produce a score.
                const resolution = resolveApplicationProperty(app, properties);
                const linkedProperty = resolution.property;
                const propertyLabel =
                  resolution.label ||
                  (isGenericPropertyTitle(app.property_title) ? null : app.property_title);
                const propertyLocation = describePropertyLocation(linkedProperty);
                const resolvedRent = Number(linkedProperty?.price);
                const propertyPrice =
                  Number.isFinite(resolvedRent) && resolvedRent > 0
                    ? `R${resolvedRent.toLocaleString('en-ZA')}/mo`
                    : null;

                const matchAnalysis = evaluateJobApplicationMatch({
                  application: app,
                  tenant,
                  property: linkedProperty || undefined
                });

                const docsCount = Array.isArray(app.documents) ? app.documents.length : 0;

                return (
                  <div key={app.id} className="application-card">
                    <span
                      className="card-accent"
                      style={{ background: getStatusColor(app.status) }}
                      aria-hidden="true"
                    />

                    <div className="card-body">

                      {/* Identity + status */}
                      <header className="card-head">
                        <div className="applicant">
                          <span className="applicant-avatar" aria-hidden="true">
                            {(tenant?.full_name || tenant?.email || "T")[0].toUpperCase()}
                          </span>
                          <div className="applicant-details">
                            <h3
                              className="applicant-name"
                              title={tenant?.full_name || 'Verified Applicant'}
                            >
                              {tenant?.full_name || 'Verified Applicant'}
                            </h3>
                            <a
                              className="applicant-email"
                              href={tenant?.email ? `mailto:${tenant.email}` : undefined}
                              title={tenant?.email || 'No email provided'}
                            >
                              <Mail size={13} aria-hidden="true" />
                              <span>{tenant?.email || 'No email provided'}</span>
                            </a>
                          </div>
                        </div>

                        <span
                          className="status-chip"
                          style={{
                            color: getStatusColor(app.status),
                            background: `${getStatusColor(app.status)}18`,
                            borderColor: `${getStatusColor(app.status)}35`
                          }}
                        >
                          <span
                            className="status-dot"
                            style={{ background: getStatusColor(app.status) }}
                            aria-hidden="true"
                          />
                          {getStatusLabel(app.status)}
                        </span>
                      </header>

                      {/* Quiet metadata */}
                      <div className="card-meta">
                        <span className="meta-id ag-num">#{String(app.id).slice(0, 8)}</span>
                        <span className="meta-sep" aria-hidden="true">&bull;</span>
                        <span className="meta-date">
                          {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'Recent'}
                        </span>
                        <span className="assigned-to-you-badge">
                          <UserCheck size={11} aria-hidden="true" /> Assigned to you
                        </span>
                        {app.agent_working_status === 'draft_complete' && (
                          <span className="working-status-badge draft_complete">Draft in progress</span>
                        )}
                        {app.agent_working_status === 'shipped' && (
                          <span className="working-status-badge shipped">Shortlist shipped</span>
                        )}
                      </div>

                      {/* Which property the tenant applied for */}
                      {propertyLabel && (
                        <div className="applied-property-banner">
                          <Building size={14} className="banner-icon" aria-hidden="true" />
                          <span className="banner-label">Applying for</span>
                          <span className="banner-title" title={propertyLabel}>{propertyLabel}</span>
                        </div>
                      )}

                      {linkedProperty && (propertyLocation || propertyPrice) && (
                        <div className="applied-property-meta">
                          {propertyLocation && (
                            <span className="applied-property-meta-item">
                              <MapPin size={12} aria-hidden="true" />
                              {propertyLocation}
                            </span>
                          )}
                          {propertyPrice && (
                            <span className="applied-property-meta-item">
                              <DollarSign size={12} aria-hidden="true" />
                              {propertyPrice}
                            </span>
                          )}
                        </div>
                      )}

                      {!linkedProperty && resolution.isLinked && (
                        <div className="applied-property-meta is-unresolved">
                          <AlertTriangle size={12} aria-hidden="true" />
                          <span>
                            Linked listing is not in your inventory — the name above comes from the
                            application snapshot.
                          </span>
                        </div>
                      )}

                      {/* Employment & income snapshot */}
                      <div className="job-profile-snippet">
                        <div className="job-snippet-header">
                          <span className="job-snippet-title">
                            <Briefcase size={14} aria-hidden="true" />
                            <span title={matchAnalysis.employment.jobTitle}>
                              {matchAnalysis.employment.jobTitle}
                            </span>
                          </span>
                          <span className="job-income-badge ag-num">
                            R{matchAnalysis.affordability.monthlyIncome.toLocaleString()}
                            <span className="per-mo">/mo</span>
                          </span>
                        </div>
                        <div className="job-employer-line">
                          <span>{matchAnalysis.employment.employerName}</span>
                          <span className="bullet" aria-hidden="true">&bull;</span>
                          <span className="status-tag">{matchAnalysis.employment.employmentStatus}</span>
                        </div>
                      </div>

                      {/* Affordability & commute analysis — single entry point */}
                      <button
                        type="button"
                        className="match-widget"
                        style={{ '--match-tint': matchAnalysis.tierColor }}
                        onClick={() => setActiveJobApp(app)}
                        aria-label={`Open job linking and commute proximity analysis. ${matchAnalysis.compositeScore}% match. ${matchAnalysis.verdict}.`}
                        title="View full job linking & commute proximity analysis"
                      >
                        <span className="match-score">
                          <Sparkles size={14} aria-hidden="true" />
                          <strong className="ag-num">{matchAnalysis.compositeScore}%</strong>
                          <span className="match-score-label">match</span>
                        </span>
                        <span className="match-details">
                          <span className="match-ratio">
                            {matchAnalysis.affordability.multiplier}x rent coverage &middot; ~{matchAnalysis.proximity.approxDistanceKm} km
                          </span>
                          <span className="match-verdict" style={{ color: matchAnalysis.tierColor }}>
                            {matchAnalysis.verdict}
                          </span>
                        </span>
                        <ChevronRight size={16} className="match-chevron" aria-hidden="true" />
                      </button>

                      {/* Key requirements */}
                      <dl className="facts">
                        <div className="fact">
                          <dt className="fact-label">
                            <DollarSign size={13} aria-hidden="true" />
                            <span>Budget</span>
                          </dt>
                          <dd className="fact-value fact-money ag-num">
                            {app.max_budget ? `R${Number(app.max_budget).toLocaleString()}` : 'Not specified'}
                          </dd>
                        </div>
                        <div className="fact">
                          <dt className="fact-label">
                            <Calendar size={13} aria-hidden="true" />
                            <span>Move-in</span>
                          </dt>
                          <dd className="fact-value">
                            {app.move_in_date ? new Date(app.move_in_date).toLocaleDateString() : 'Flexible'}
                          </dd>
                        </div>
                        <div className="fact fact-wide">
                          <dt className="fact-label">
                            <MapPin size={13} aria-hidden="true" />
                            <span>Preferred areas</span>
                          </dt>
                          <dd className="fact-value">
                            {app.preferred_areas?.length ? app.preferred_areas.join(', ') : 'Any area'}
                          </dd>
                        </div>
                        {app.special_requirements && (
                          <div className="fact fact-wide">
                            <dt className="fact-label"><span>Special notes</span></dt>
                            <dd className="fact-value fact-notes">{app.special_requirements}</dd>
                          </div>
                        )}
                      </dl>

                      {/* Actions — one primary CTA, one secondary */}
                      <div className="card-actions">
                        <button
                          type="button"
                          onClick={() => setActiveDocApp(app)}
                          className="btn btn-secondary"
                        >
                          <FileCheck size={15} aria-hidden="true" />
                          <span>Documents</span>
                          <span className="btn-count ag-num">{docsCount}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onManageApplication(app)}
                          className="btn btn-primary"
                          title="Filter the inventory, flag potential matches, and build a shortlist to ship to the tenant"
                        >
                          <Sparkles size={16} aria-hidden="true" />
                          <span>Manage Application</span>
                        </button>
                      </div>

                      {/* Application status */}
                      <div className="status-block">
                        <label className="field-label" htmlFor={`status-${app.id}`}>
                          Application status
                        </label>
                        {app.status === APPLICATION_STATUS.COMPLETED ? (
                          <div className="status-complete">
                            <CheckCircle2 size={14} aria-hidden="true" />
                            Completed &middot; Admin approved
                          </div>
                        ) : (
                          <div className="select-wrapper">
                            <select
                              id={`status-${app.id}`}
                              value={app.status || APPLICATION_STATUS.SUBMITTED}
                              onChange={(e) => onUpdateStatus?.(app.id, e.target.value)}
                              className="status-select"
                              style={{ borderColor: getStatusColor(app.status) }}
                            >
                              {AGENT_SELECTABLE_APPLICATION_STATUSES.map((s) => (
                                <option key={s} value={s}>{applicationStatusLabel(s)}</option>
                              ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      {/* Completion approval request */}
                      {app.status !== APPLICATION_STATUS.COMPLETED && (
                        <div className={`completion-box${app.completion_requested_at ? ' is-requested' : ''}`}>
                          {app.completion_requested_at ? (
                            <>
                              <p className="completion-heading">
                                <Clock size={13} aria-hidden="true" /> Completion review requested
                              </p>
                              <p className="completion-note">
                                Awaiting administrator approval to finalise the file and unlock your R50 commission share.
                              </p>
                              {app.completion_request_note && (
                                <p className="completion-quote">Note: &ldquo;{app.completion_request_note}&rdquo;</p>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="completion-prompt">Placement finished?</span>
                              <button
                                type="button"
                                onClick={() => setCompletionModalApp(app)}
                                className="btn btn-success btn-sm"
                              >
                                <CheckCircle2 size={13} aria-hidden="true" />
                                <span>Request completion</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Assignment response */}
                      <div className="assignment-response-box">
                        {assignmentStatusOf(app) === 'accepted' ? (
                          <div className="assignment-response-badge accepted">
                            <CheckCircle2 size={16} aria-hidden="true" />
                            <span>Job accepted · the administrator has been notified</span>
                          </div>
                        ) : assignmentStatusOf(app) === 'rejected' ? (
                          <>
                            <div className="assignment-response-badge rejected">
                              <XCircle size={16} aria-hidden="true" />
                              <span>Job rejected · awaiting admin reassignment</span>
                            </div>
                            {app.assignment_rejection_reason && (
                              <p className="assignment-response-reason">
                                Reason: {app.assignment_rejection_reason}
                              </p>
                            )}
                            <div className="assignment-response-actions">
                              <button
                                type="button"
                                className="resp-btn accept"
                                onClick={() => handleAcceptJob(app)}
                                disabled={respondingId === app.id}
                              >
                                <CheckCircle2 size={15} aria-hidden="true" />
                                {respondingId === app.id ? 'Saving…' : 'Accept instead'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="assignment-response-prompt">
                              <Briefcase size={15} aria-hidden="true" />
                              <span>
                                An administrator assigned this job to you. Accept it to start working the
                                brief, or reject it so it can be reassigned.
                              </span>
                            </div>
                            <div className="assignment-response-actions">
                              <button
                                type="button"
                                className="resp-btn accept"
                                onClick={() => handleAcceptJob(app)}
                                disabled={respondingId === app.id}
                              >
                                <CheckCircle2 size={15} aria-hidden="true" />
                                {respondingId === app.id ? 'Saving…' : 'Accept job'}
                              </button>
                              <button
                                type="button"
                                className="resp-btn reject"
                                onClick={() => {
                                  setResponseError('');
                                  setRejectApp(app);
                                }}
                                disabled={respondingId === app.id}
                              >
                                <XCircle size={15} aria-hidden="true" />
                                Reject job
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Results Count */}
            <div className="results-count">
              Showing {filtered.length} application{filtered.length !== 1 ? 's' : ''}
              {query && ` matching "${query}"`}
            </div>
          </>
        )}
      </div>

      {/* Document Inspection Modal */}
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

      {/* Reject Job Modal (captures a reassignment reason for the admin) */}
      <JobResponseModal
        isOpen={Boolean(rejectApp)}
        onClose={() => {
          setRejectApp(null);
          setResponseError('');
        }}
        application={rejectApp}
        tenant={rejectApp ? tenantById?.get(rejectApp.tenant_id) : null}
        submitting={Boolean(rejectApp) && respondingId === rejectApp.id}
        error={responseError}
        onSubmit={handleRejectJob}
      />

      {/* Completion Request Modal */}
      {completionModalApp && (
        <Modal
          isOpen={Boolean(completionModalApp)}
          onClose={() => {
            setCompletionModalApp(null);
            setCompletionNote("");
            setCompletionFeedback("");
          }}
          title="Submit Placement for Admin Completion Review"
          size="sm"
        >
          <form onSubmit={handleSubmitCompletionRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              padding: '0.85rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              color: '#cbd5e1'
            }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#10b981' }}>
                Admin Completion Approval
              </p>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>
                To maintain regulatory compliance and audit trails, Place4U requires administrators to sign off on completed tenant placements before commission shares are unlocked for withdrawal.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Placement Notes for Admin (Optional)
              </label>
              <textarea
                rows={3}
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="e.g. Tenant signed lease on property and move-in confirmed."
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  background: '#151d31',
                  border: '1px solid var(--wallet-border, #334155)',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {completionFeedback && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                background: completionFeedback.includes('requested') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: completionFeedback.includes('requested') ? '#10b981' : '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {completionFeedback}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setCompletionModalApp(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingCompletion}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  cursor: isSubmittingCompletion ? 'not-allowed' : 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  opacity: isSubmittingCompletion ? 0.6 : 1
                }}
              >
                {isSubmittingCompletion ? "Submitting…" : "Submit for Approval"}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};