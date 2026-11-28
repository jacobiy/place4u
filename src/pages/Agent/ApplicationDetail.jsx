import React, { useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Wallet,
  Briefcase,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Clock,
  Building,
  Sparkles,
  ChevronRight,
  X
} from "lucide-react";
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
import "./ApplicationDetail.css";

const TIER_TONES = {
  "#10b981": "ok",
  "#4f7ef8": "accent",
  "#f59e0b": "warn",
  "#ef4444": "danger"
};

const toneForTier = (hex) => TIER_TONES[String(hex || "").toLowerCase()] || "warn";

const DEFAULT_PROPERTY_IMAGE = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=60";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
    : "Flexible";

const formatRand = (value) =>
  Number.isFinite(Number(value)) && Number(value) > 0
    ? `R${Number(value).toLocaleString("en-ZA")}`
    : null;

/**
 * Full-page application record. Replaces the old detail modal: the agent can
 * read the profile, affordability and property on one surface, then act.
 */
export const ApplicationDetail = ({
  application,
  tenant,
  properties = [],
  onBack = () => {},
  onUpdateStatus = () => {},
  onRequestCompletion = async () => ({ success: true }),
  onRespondToAssignment = async () => ({ success: true }),
  onManageApplication = () => {}
}) => {
  const [docsOpen, setDocsOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [responding, setResponding] = useState(false);
  const [responseError, setResponseError] = useState("");
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [completionFeedback, setCompletionFeedback] = useState("");
  const [completionSubmitting, setCompletionSubmitting] = useState(false);

  if (!application) {
    return (
      <div className="application-detail">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" /> All applications
        </button>
        <div className="detail-missing">
          <FileCheck size={30} aria-hidden="true" />
          <p className="detail-missing-title">Application not available</p>
          <p className="detail-missing-sub">
            It may have been reassigned or removed. Go back to the pipeline to pick another one.
          </p>
          <button type="button" className="btn-action primary" onClick={onBack}>
            Back to applications
          </button>
        </div>
      </div>
    );
  }

  const resolution = resolveApplicationProperty(application, properties);
  const linkedProperty = resolution.property;
  const propertyLabel =
    resolution.label || (isGenericPropertyTitle(application.property_title) ? null : application.property_title);
  const propertyLocation = describePropertyLocation(linkedProperty);
  const propertyPrice = formatRand(linkedProperty?.price);

  const matchAnalysis = evaluateJobApplicationMatch({
    application,
    tenant,
    property: linkedProperty || undefined
  });
  const tierTone = toneForTier(matchAnalysis.tierColor);

  const statusMeta = getApplicationStatusMeta(application.status);
  const statusTone = statusMeta.tone || "slate";
  const assignmentStatus =
    application.assignment_status || (application.assigned_to ? "assigned" : "unassigned");
  const isPendingAssignment = assignmentStatus !== "accepted" && assignmentStatus !== "rejected";
  const isRejectedAssignment = assignmentStatus === "rejected";

  const docs = Array.isArray(application.documents) ? application.documents : [];
  const isStudent = application.accommodation_category === "student_room" || application.category === "student_room";
  const initial = (tenant?.full_name || tenant?.email || "T")[0].toUpperCase();
  const budgetValue = application.max_budget
    ? application.min_budget
      ? `${formatRand(application.min_budget)} – ${formatRand(application.max_budget)}`
      : `Up to ${formatRand(application.max_budget)}`
    : "Flexible";

  const acceptJob = async () => {
    setResponding(true);
    setResponseError("");
    const res = await onRespondToAssignment(application.id, "accepted", null);
    if (res && res.success === false) setResponseError(res.error || "Could not accept this assignment.");
    setResponding(false);
  };

  const rejectJob = async (reason) => {
    setResponding(true);
    setResponseError("");
    const res = await onRespondToAssignment(application.id, "rejected", reason);
    if (res && res.success === false) {
      setResponseError(res.error || "Could not decline this assignment.");
    } else {
      setRejectOpen(false);
    }
    setResponding(false);
  };

  const submitCompletion = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    setCompletionSubmitting(true);
    setCompletionFeedback("");
    try {
      const ok = await onRequestCompletion(application.id, completionNote.trim() || null);
      if (ok) {
        setCompletionFeedback("Completion review requested.");
        setTimeout(() => {
          setCompletionOpen(false);
          setCompletionNote("");
          setCompletionFeedback("");
        }, 1600);
      } else {
        setCompletionFeedback("Could not request review. Try again.");
      }
    } catch (err) {
      setCompletionFeedback(err?.message || "Error submitting request");
    } finally {
      setCompletionSubmitting(false);
    }
  };

  const facts = [
    {
      icon: <Wallet size={13} aria-hidden="true" />,
      label: "Monthly budget",
      value: budgetValue,
      sub: propertyPrice ? `Listing ${propertyPrice}/mo` : "Tenant ceiling"
    },
    {
      icon: <Calendar size={13} aria-hidden="true" />,
      label: "Move-in target",
      value: formatDate(application.move_in_date),
      sub: application.lease_duration_months
        ? `${application.lease_duration_months} month lease`
        : "Standard 12 month lease"
    },
    {
      icon: <MapPin size={13} aria-hidden="true" />,
      label: "Preferred areas",
      value:
        application.preferred_areas?.length
          ? application.preferred_areas.join(", ")
          : application.location || "Any area",
      sub: application.preferred_types?.length
        ? application.preferred_types.join(", ")
        : isStudent
        ? "Student accommodation"
        : "Residential lease"
    },
    {
      icon: <Briefcase size={13} aria-hidden="true" />,
      label: "Employment",
      value: matchAnalysis.employment.jobTitle || tenant?.occupation || "Not provided",
      sub: [matchAnalysis.employment.employerName || tenant?.employer, tenant?.employment_status]
        .filter(Boolean)
        .join(" · ") || "Employment not stated"
    }
  ];

  const affordabilityFacts = [
    {
      label: "Rent coverage",
      value: matchAnalysis.affordability.multiplier != null
        ? `${matchAnalysis.affordability.multiplier}x`
        : "Not provided",
      sub: "Target 3x monthly income"
    },
    {
      label: "Monthly income",
      value: matchAnalysis.affordability.monthlyIncome
        ? `${formatRand(matchAnalysis.affordability.monthlyIncome)}/mo`
        : "Not stated",
      sub: "Verified documents"
    },
    {
      label: "Commute",
      value: matchAnalysis.proximity.approxDistanceKm != null
        ? `~${matchAnalysis.proximity.approxDistanceKm} km`
        : "Not provided",
      sub: matchAnalysis.proximity.commuteDurationMins
        ? `${matchAnalysis.proximity.commuteDurationMins} min ${matchAnalysis.proximity.transitType || "transit"}`
        : matchAnalysis.proximity.commuteRating || "Location not provided"
    },
    {
      label: "Deposit guidance",
      value:
        matchAnalysis.affordability.multiplier == null
          ? "Unverified"
          : matchAnalysis.affordability.multiplier >= 3
          ? "Standard"
          : "Double deposit",
      sub: "Based on rent coverage"
    }
  ];

  return (
    <div className="application-detail">
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" /> All applications
      </button>

      <header className="detail-header">
        <div className="detail-identity">
          <span className="applicant-avatar" aria-hidden="true">
            {initial}
          </span>
          <div className="detail-identity-text">
            <span className="detail-eyebrow">
              Application #{String(application.id).slice(0, 8)}
              <span className="detail-eyebrow-sep">·</span>
              Submitted {formatDate(application.submitted_at) === "Flexible" ? "recently" : formatDate(application.submitted_at)}
            </span>
            <h1 className="detail-title">{tenant?.full_name || "Verified applicant"}</h1>
            <div className="detail-contact">
              {tenant?.email ? (
                <a href={`mailto:${tenant.email}`} className="detail-contact-link">
                  <Mail size={13} aria-hidden="true" /> {tenant.email}
                </a>
              ) : (
                <span className="detail-contact-link is-muted">
                  <Mail size={13} aria-hidden="true" /> No email provided
                </span>
              )}
              {tenant?.phone ? (
                <a href={`tel:${tenant.phone}`} className="detail-contact-link">
                  <Phone size={13} aria-hidden="true" /> {tenant.phone}
                </a>
              ) : (
                <span className="detail-contact-link is-muted">
                  <Phone size={13} aria-hidden="true" /> No phone listed
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="detail-header-actions">
          <span className={`status-pill tone-${statusTone}`}>
            <span className="status-dot" aria-hidden="true" />
            {statusMeta.label}
          </span>
          <button
            type="button"
            className="btn-action primary"
            onClick={() => onManageApplication(application)}
          >
            <Building size={14} aria-hidden="true" />
            Manage matches
          </button>
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section">
            <div className="detail-section-head">
              <h2 className="detail-section-title">Application</h2>
              {isStudent && <span className="detail-section-tag">Student</span>}
            </div>
            <div className="detail-fact-grid">
              {facts.map((fact) => (
                <div className="detail-fact" key={fact.label}>
                  <span className="detail-fact-label">
                    {fact.icon}
                    {fact.label}
                  </span>
                  <span className="detail-fact-value">{fact.value}</span>
                  <span className="detail-fact-sub">{fact.sub}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <div className="detail-section-head">
              <h2 className="detail-section-title">
                <Sparkles size={15} aria-hidden="true" /> Affordability &amp; commute
              </h2>
              <button type="button" className="detail-section-action" onClick={() => setJobOpen(true)}>
                Full analysis <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>

            <div className={`detail-score-strip is-${tierTone}`}>
              <span className="detail-score-value ag-num">{matchAnalysis.compositeScore}%</span>
              <div className="detail-score-copy">
                <span className={`detail-score-verdict is-${tierTone}`}>{matchAnalysis.verdict}</span>
                <span className="detail-score-note">
                  Weighted score across affordability, commute and employment stability.
                </span>
              </div>
            </div>

            <div className="detail-fact-grid is-compact">
              {affordabilityFacts.map((fact) => (
                <div className="detail-fact" key={fact.label}>
                  <span className="detail-fact-label">{fact.label}</span>
                  <span className="detail-fact-value ag-num">{fact.value}</span>
                  <span className="detail-fact-sub">{fact.sub}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <div className="detail-section-head">
              <h2 className="detail-section-title">Target property</h2>
            </div>

            {linkedProperty ? (
              <div className="detail-property">
                <img
                  className="detail-property-image"
                  src={linkedProperty.image_urls?.[0] || linkedProperty.images?.[0] || DEFAULT_PROPERTY_IMAGE}
                  alt="Target property"
                />
                <div className="detail-property-body">
                  <p className="detail-property-title" title={propertyLabel || "Listing"}>
                    {propertyLabel || linkedProperty.address || linkedProperty.title || "Listing"}
                  </p>
                  <p className="detail-property-sub">
                    {propertyLocation || linkedProperty.city || linkedProperty.area || "Location not stated"}
                  </p>
                  <div className="detail-property-tags">
                    {linkedProperty.property_type && <span>{linkedProperty.property_type}</span>}
                    {linkedProperty.bedrooms ? <span>{linkedProperty.bedrooms} bed</span> : null}
                    {linkedProperty.bathrooms ? <span>{linkedProperty.bathrooms} bath</span> : null}
                  </div>
                </div>
                {propertyPrice && <span className="detail-property-price ag-num">{propertyPrice}<span>/mo</span></span>}
              </div>
            ) : (
              <div className="detail-property is-empty">
                <div className="detail-property-body">
                  <p className="detail-property-title">General search</p>
                  <p className="detail-property-sub">
                    No listing locked yet. The applicant wants{" "}
                    {application.preferred_areas?.length ? application.preferred_areas.join(", ") : "any area"}.
                  </p>
                </div>
              </div>
            )}
          </section>

          {application.special_requirements && (
            <section className="detail-section">
              <div className="detail-section-head">
                <h2 className="detail-section-title">Applicant notes</h2>
              </div>
              <blockquote className="detail-quote">“{application.special_requirements}”</blockquote>
            </section>
          )}

          <section className="detail-section">
            <div className="detail-section-head">
              <h2 className="detail-section-title">
                <FileCheck size={15} aria-hidden="true" /> Documents
              </h2>
              <button type="button" className="detail-section-action" onClick={() => setDocsOpen(true)}>
                Open viewer <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
            <p className="detail-doc-line">
              {docs.length > 0
                ? `${docs.length} document${docs.length === 1 ? "" : "s"} attached — identity and proof of income.`
                : "No documents attached yet."}
            </p>
          </section>
        </div>

        <aside className="detail-rail">
          <section className="detail-rail-card">
            <h3 className="detail-rail-title">Assignment</h3>

            {isPendingAssignment && (
              <>
                <p className="detail-rail-text">
                  <AlertTriangle size={13} aria-hidden="true" /> Awaiting your response. Accept to start
                  matching, or decline with a reason so the admin can reassign.
                </p>
                <div className="detail-rail-actions">
                  <button type="button" className="btn-action primary" onClick={acceptJob} disabled={responding}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {responding ? "Saving…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="btn-action danger"
                    onClick={() => {
                      setResponseError("");
                      setRejectOpen(true);
                    }}
                    disabled={responding}
                  >
                    <XCircle size={14} aria-hidden="true" /> Decline
                  </button>
                </div>
              </>
            )}

            {!isPendingAssignment && !isRejectedAssignment && (
              <p className="detail-rail-text is-ok">
                <CheckCircle2 size={13} aria-hidden="true" /> Accepted
                {application.assignment_responded_at
                  ? ` ${formatDate(application.assignment_responded_at)}`
                  : ""}
                . You own this placement.
              </p>
            )}

            {isRejectedAssignment && (
              <>
                <p className="detail-rail-text is-danger">
                  <XCircle size={13} aria-hidden="true" /> Declined and queued for reassignment.
                </p>
                {application.assignment_rejection_reason && (
                  <p className="detail-rail-note">“{application.assignment_rejection_reason}”</p>
                )}
                <div className="detail-rail-actions">
                  <button type="button" className="btn-action secondary" onClick={acceptJob} disabled={responding}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {responding ? "Saving…" : "Re-accept"}
                  </button>
                </div>
              </>
            )}

            {responseError && (
              <p className="detail-rail-error">
                <AlertTriangle size={13} aria-hidden="true" /> {responseError}
              </p>
            )}
          </section>

          <section className="detail-rail-card">
            <h3 className="detail-rail-title">Status</h3>
            {application.status === APPLICATION_STATUS.COMPLETED ? (
              <div className="static-completed-badge">
                <CheckCircle2 size={13} aria-hidden="true" /> Completed · approved
              </div>
            ) : (
              <div className="select-wrapper">
                <select
                  id={`detail-status-${application.id}`}
                  value={application.status || APPLICATION_STATUS.SUBMITTED}
                  onChange={(e) => onUpdateStatus?.(application.id, e.target.value)}
                  className="styled-status-select"
                  aria-label="Application status"
                >
                  {AGENT_SELECTABLE_APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {applicationStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-chevron" aria-hidden="true" />
              </div>
            )}
            <p className="detail-rail-hint">
              Status changes sync to the tenant, landlord and admin dashboards.
            </p>
          </section>

          <section className="detail-rail-card">
            <h3 className="detail-rail-title">Placement sign-off</h3>
            {application.status === APPLICATION_STATUS.COMPLETED ? (
              <div className="completion-badge completed">
                <CheckCircle2 size={12} aria-hidden="true" /> R50 commission unlocked
              </div>
            ) : application.completion_requested_at ? (
              <div className="completion-badge pending" title={application.completion_request_note || "Awaiting admin sign-off"}>
                <Clock size={12} aria-hidden="true" /> Review pending (R50)
              </div>
            ) : (
              <button type="button" className="completion-request-btn" onClick={() => setCompletionOpen(true)}>
                <CheckCircle2 size={12} aria-hidden="true" /> Request sign-off (R50)
              </button>
            )}
            <p className="detail-rail-hint">
              Admin approval credits the R50 agent placement fee to your wallet.
            </p>
          </section>
        </aside>
      </div>

      {docsOpen && (
        <ApplicationDocumentsModal
          isOpen={docsOpen}
          onClose={() => setDocsOpen(false)}
          application={application}
          tenant={tenant}
        />
      )}

      {jobOpen && (
        <JobLinkApproximationModal
          isOpen={jobOpen}
          onClose={() => setJobOpen(false)}
          application={application}
          tenant={tenant}
          properties={properties}
          onOpenDocuments={() => setDocsOpen(true)}
          onUpdateStatus={onUpdateStatus}
        />
      )}

      <JobResponseModal
        isOpen={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setResponseError("");
        }}
        application={application}
        tenant={tenant}
        submitting={responding}
        error={responseError}
        onSubmit={rejectJob}
      />

      {completionOpen && (
        <div
          className="job-response-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !completionSubmitting) {
              setCompletionOpen(false);
            }
          }}
        >
          <div
            className="job-response-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
          >
            <div className="job-response-header">
              <div className="job-response-title">
                <span className="job-response-icon is-accent">
                  <CheckCircle2 size={17} aria-hidden="true" />
                </span>
                <div>
                  <h3 id="completion-title">Request completion review</h3>
                  <p>Admin sign-off credits your R50 placement fee.</p>
                </div>
              </div>
              <button
                type="button"
                className="job-response-close"
                onClick={() => setCompletionOpen(false)}
                aria-label="Close"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submitCompletion}>
              <div className="job-response-body">
                <p className="job-response-intro">
                  Confirm the lease is signed and the tenant is moving in. Once an admin approves,
                  R50 is added to your wallet balance.
                </p>

                <label htmlFor="detail-completion-note" className="job-response-label">
                  Placement notes (optional)
                </label>
                <textarea
                  id="detail-completion-note"
                  className="job-response-textarea"
                  rows={3}
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  placeholder="e.g. Lease signed by landlord and tenant, deposit paid, move-in scheduled."
                />

                {completionFeedback && (
                  <div
                    className={"completion-feedback " + (completionFeedback.includes("requested") ? "is-ok" : "is-error")}
                  >
                    {completionFeedback}
                  </div>
                )}
              </div>

              <div className="job-response-footer">
                <button
                  type="button"
                  className="job-response-btn secondary"
                  onClick={() => setCompletionOpen(false)}
                  disabled={completionSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="job-response-btn primary" disabled={completionSubmitting}>
                  {completionSubmitting ? "Submitting…" : "Submit for approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetail;
