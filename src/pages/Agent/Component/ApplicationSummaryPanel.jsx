import React, { useState } from 'react';
import {
  ChevronLeft,
  User,
  Wallet,
  MapPin,
  Home,
  Briefcase,
  Banknote,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  ClipboardList
} from 'lucide-react';

const fmtR = (v) => (v === null || v === undefined || v === '' ? null : `R${Number(v).toLocaleString('en-ZA')}`);

const titleCaseCategory = (c) => {
  if (!c) return 'Standard room';
  return c
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
};

/** Turns a free-text requirements blob into a scannable bullet list. */
function toRequirementList(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/\r?\n|(?:^|\s)[•·]\s*|\.\s+(?=[A-Z])/)
    .map((s) => s.trim().replace(/^[-*•·]\s*/, ''))
    .filter((s) => s.length > 1);
}

export default function ApplicationSummaryPanel({ application, tenant, onBack = () => {}, onViewFullApplication = () => {} }) {
  const [docsOpen, setDocsOpen] = useState(false);

  const app = application || {};
  const name = tenant?.full_name || app.tenant_name || 'Verified Applicant';
  const email = tenant?.email || app.tenant_email || '';
  const initial = (name || 'T')[0].toUpperCase();

  const budget =
    app.min_budget && app.max_budget
      ? `${fmtR(app.min_budget)} – ${fmtR(app.max_budget)}`
      : fmtR(app.max_budget || app.min_budget) || 'Not stated';

  const preferredAreas =
    Array.isArray(app.preferred_areas) && app.preferred_areas.length
      ? app.preferred_areas.join(', ')
      : 'Not stated';

  const employmentStatus = tenant?.employment_status || app.employment_status || 'Not stated';
  const income = fmtR(tenant?.monthly_income || app.monthly_income) || 'Not stated';
  const occupation = tenant?.occupation || app.job_title || '';
  const employer = tenant?.employer || tenant?.employer_name || app.employer_name || '';

  const documents = Array.isArray(app.documents) ? app.documents : [];
  const requirements = toRequirementList(app.special_requirements);

  return (
    <div className="apm-summary">
      <div className="apm-summary-top">
        <button type="button" className="apm-back" onClick={onBack}>
          <ChevronLeft size={16} />
          Assigned applications
        </button>

        <div className="apm-summary-tenant">
          <div className="apm-summary-avatar">{initial}</div>
          <div>
            <p className="apm-summary-name">{name}</p>
            {email && <p className="apm-summary-email">{email}</p>}
          </div>
        </div>
        <div className="apm-summary-id">Application #{String(app.id || '').slice(0, 8)}</div>
      </div>

      <div className="apm-summary-scroll">
        <div className="apm-summary-grid">
          <div className="apm-summary-box">
            <span className="apm-summary-label">
              <Wallet size={13} /> Budget
            </span>
            <span className="apm-summary-value accent">{budget}</span>
          </div>
          <div className="apm-summary-box">
            <span className="apm-summary-label">
              <Home size={13} /> Category
            </span>
            <span className="apm-summary-value">{titleCaseCategory(app.accommodation_category || app.category)}</span>
          </div>
        </div>

        <div className="apm-summary-section">
          <span className="apm-summary-label">
            <MapPin size={13} /> Preferred areas
          </span>
          <p className="apm-summary-text">{preferredAreas}</p>
        </div>

        <div className="apm-summary-section">
          <span className="apm-summary-label">
            <Briefcase size={13} /> Employment
          </span>
          <p className="apm-summary-text">{employmentStatus}</p>
          {(occupation || employer) && (
            <p className="apm-summary-sub">{[occupation, employer].filter(Boolean).join(' · ')}</p>
          )}
        </div>

        <div className="apm-summary-section">
          <span className="apm-summary-label">
            <Banknote size={13} /> Monthly income
          </span>
          <p className="apm-summary-text">{income}</p>
        </div>

        <div className="apm-summary-section">
          <button
            type="button"
            className="apm-summary-toggle"
            onClick={() => setDocsOpen((v) => !v)}
            aria-expanded={docsOpen}
          >
            <span className="apm-summary-label">
              <FileText size={13} /> Documents ({documents.length})
            </span>
            {docsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {docsOpen && (
            <div className="apm-doc-list">
              {documents.length === 0 ? (
                <p className="apm-summary-sub">No documents attached.</p>
              ) : (
                documents.map((doc, i) => (
                  <div key={doc.id || i} className="apm-doc-item">
                    <CheckCircle2 size={13} className={doc.verified === false ? 'pending' : 'ok'} />
                    <span>{doc.title || doc.shortLabel || 'Document'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="apm-summary-section">
          <span className="apm-summary-label">
            <ClipboardList size={13} /> Stated requirements
          </span>
          {requirements.length === 0 ? (
            <p className="apm-summary-sub">None stated.</p>
          ) : (
            <ul className="apm-req-list">
              {requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="apm-summary-footer">
        <button type="button" className="apm-link-btn" onClick={() => onViewFullApplication(app)}>
          <ExternalLink size={14} /> View full application
        </button>
      </div>
    </div>
  );
}
