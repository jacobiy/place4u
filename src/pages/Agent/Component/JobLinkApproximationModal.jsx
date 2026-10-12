import React, { useState, useMemo } from 'react';
import {
  X,
  Briefcase,
  MapPin,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  Navigation,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { evaluateJobApplicationMatch } from '../../../utils/jobAffordabilityMatcher';
import './JobLinkApproximationModal.css';

export const JobLinkApproximationModal = ({
  isOpen,
  onClose,
  application,
  tenant,
  properties = [],
  onOpenDocuments = () => {},
  onUpdateStatus = () => {}
}) => {
  // Find linked property if any, or default to first property / application info
  const initialProperty = useMemo(() => {
    if (!application) return null;
    if (application.property_id) {
      const match = properties.find(p => p.id === application.property_id);
      if (match) return match;
    }
    // Fallback if applied to a specific property name or area
    return properties[0] || {
      id: 'default-prop',
      title: application.property_title || 'Selected Rental Property',
      price: application.max_budget || 8500,
      address: application.preferred_areas?.[0] || 'Johannesburg',
      city: 'Johannesburg'
    };
  }, [application, properties]);

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    initialProperty?.id || (properties[0]?.id || '')
  );

  // Active property under evaluation
  const activeProperty = useMemo(() => {
    const found = properties.find(p => p.id === selectedPropertyId);
    return found || initialProperty || {
      title: application?.property_title || 'Rental Unit',
      price: application?.max_budget || 8500,
      address: application?.preferred_areas?.[0] || 'Johannesburg'
    };
  }, [selectedPropertyId, properties, initialProperty, application]);

  // Run the linking and approximation algorithm
  const matchResult = useMemo(() => {
    if (!application) return null;
    return evaluateJobApplicationMatch({
      application,
      tenant,
      property: activeProperty
    });
  }, [application, tenant, activeProperty]);

  if (!isOpen || !application || !matchResult) return null;

  const applicantName = tenant?.full_name || 'Applicant';
  const { affordability, proximity, employment, insights, compositeScore, tier, tierColor, verdict } = matchResult;

  return (
    <div className="job-link-modal-overlay" onClick={onClose}>
      <div className="job-link-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="job-link-modal-header">
          <div className="job-link-header-left">
            <div className="job-link-header-badge">
              <Sparkles size={14} />
              <span>Place4U Underwriting Engine</span>
            </div>
            <h2 className="job-link-modal-title">
              Job & Commute Compatibility Analysis
            </h2>
            <p className="job-link-modal-subtitle">
              Evaluating <strong style={{ color: '#fff' }}>{applicantName}</strong> &middot; #{String(application.id).slice(0, 8)}
            </p>
          </div>
          <button className="job-link-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Property Selector Bar */}
        <div className="job-link-property-bar">
          <div className="property-bar-label">
            <Building size={16} />
            <span>Target Property:</span>
          </div>
          <div className="property-select-wrapper">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="property-select"
            >
              {properties.length > 0 ? (
                properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title || p.name} — R{Number(p.price || 0).toLocaleString()}/mo ({p.city || p.location || 'Metro'})
                  </option>
                ))
              ) : (
                <option value={activeProperty.id}>
                  {activeProperty.title} — R{Number(activeProperty.price || 0).toLocaleString()}/mo
                </option>
              )}
            </select>
            <ChevronDown size={16} className="select-arrow-icon" />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="job-link-modal-body">
          
          {/* Top Score Banner */}
          <div className="job-score-banner" style={{ borderColor: `${tierColor}40` }}>
            <div className="job-score-circle" style={{ background: `${tierColor}18`, borderColor: tierColor, color: tierColor }}>
              <span className="score-number">{compositeScore}%</span>
              <span className="score-subtext">Match</span>
            </div>
            <div className="job-score-details">
              <div className="score-tag" style={{ background: `${tierColor}20`, color: tierColor }}>
                {tier}
              </div>
              <h3 className="score-verdict">{verdict}</h3>
              <p className="score-summary">
                Multi-factor assessment based on South African 33% affordability guidelines, 
                geographic commute distance approximation, and verified FICA employment records.
              </p>
            </div>
          </div>

          {/* 3 Pillar Cards Grid */}
          <div className="job-pillars-grid">
            
            {/* 1. Affordability Pillar */}
            <div className="pillar-card">
              <div className="pillar-header">
                <div className="pillar-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <h4 className="pillar-title">Rent-to-Income Affordability</h4>
                  <span className="pillar-subtitle">{affordability.badge}</span>
                </div>
              </div>

              <div className="pillar-stat-row">
                <div className="pillar-stat">
                  <span className="stat-label">Coverage Multiplier</span>
                  <span className="stat-value" style={{ color: '#10b981' }}>{affordability.multiplier}x</span>
                  <span className="stat-hint">Min 3.0x recommended</span>
                </div>
                <div className="pillar-stat">
                  <span className="stat-label">Rent-to-Income</span>
                  <span className="stat-value">{affordability.rentToIncomePercent}%</span>
                  <span className="stat-hint">Standard ceiling: 33.3%</span>
                </div>
              </div>

              {/* Affordability Progress Bar */}
              <div className="pillar-meter-section">
                <div className="meter-labels">
                  <span>Current Rent Burden ({affordability.rentToIncomePercent}%)</span>
                  <span>Max Limit (33%)</span>
                </div>
                <div className="meter-track">
                  <div
                    className="meter-fill"
                    style={{
                      width: `${Math.min(100, (affordability.rentToIncomePercent / 50) * 100)}%`,
                      backgroundColor: affordability.rentToIncomePercent <= 33 ? '#10b981' : '#f59e0b'
                    }}
                  />
                  <div className="meter-benchmark" style={{ left: '66%' }} title="33% Standard Cap" />
                </div>
              </div>

              <div className="pillar-financial-chips">
                <div className="financial-chip">
                  <span>Gross Income:</span>
                  <strong>R{affordability.monthlyIncome.toLocaleString()}</strong>
                </div>
                <div className="financial-chip">
                  <span>Monthly Rent:</span>
                  <strong>R{affordability.monthlyRent.toLocaleString()}</strong>
                </div>
                <div className="financial-chip highlight">
                  <span>Surplus Buffer:</span>
                  <strong>R{affordability.disposableBuffer.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* 2. Commute Proximity Pillar */}
            <div className="pillar-card">
              <div className="pillar-header">
                <div className="pillar-icon" style={{ background: 'rgba(79, 126, 248, 0.15)', color: '#4f7ef8' }}>
                  <Navigation size={20} />
                </div>
                <div>
                  <h4 className="pillar-title">Commute & Proximity</h4>
                  <span className="pillar-subtitle">{proximity.commuteRating}</span>
                </div>
              </div>

              <div className="pillar-stat-row">
                <div className="pillar-stat">
                  <span className="stat-label">Approx Distance</span>
                  <span className="stat-value" style={{ color: '#4f7ef8' }}>~{proximity.approxDistanceKm} km</span>
                  <span className="stat-hint">Cluster distance</span>
                </div>
                <div className="pillar-stat">
                  <span className="stat-label">Estimated Commute</span>
                  <span className="stat-value">~{proximity.commuteDurationMins} min</span>
                  <span className="stat-hint">{proximity.transitType}</span>
                </div>
              </div>

              <div className="commute-route-box">
                <div className="route-point">
                  <div className="route-dot origin" />
                  <div className="route-text">
                    <span className="route-label">Workplace / Employer:</span>
                    <span className="route-value">{proximity.workplaceLocation}</span>
                  </div>
                </div>
                <div className="route-connector" />
                <div className="route-point">
                  <div className="route-dot destination" />
                  <div className="route-text">
                    <span className="route-label">Property Location:</span>
                    <span className="route-value">{proximity.propertyLocation}</span>
                  </div>
                </div>
              </div>

              <p className="pillar-summary-note">
                {proximity.summary}
              </p>
            </div>

            {/* 3. Employment & Verification Pillar */}
            <div className="pillar-card">
              <div className="pillar-header">
                <div className="pillar-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                  <Briefcase size={20} />
                </div>
                <div>
                  <h4 className="pillar-title">Employment & Stability</h4>
                  <span className="pillar-subtitle">{employment.employmentStatus}</span>
                </div>
              </div>

              <div className="employment-profile-box">
                <div className="emp-row">
                  <span className="emp-label">Occupation:</span>
                  <span className="emp-value">{employment.jobTitle}</span>
                </div>
                <div className="emp-row">
                  <span className="emp-label">Employer:</span>
                  <span className="emp-value">{employment.employerName}</span>
                </div>
                <div className="emp-row">
                  <span className="emp-label">Status Category:</span>
                  <span className="emp-value">{employment.employmentStatus}</span>
                </div>
              </div>

              {/* FICA Documents Checklist */}
              <div className="fica-checklist">
                <div className="checklist-header">
                  <span>Attached Verification Proof</span>
                  <span className="doc-count-tag">{employment.docsCount} attached</span>
                </div>
                <div className="checklist-item">
                  <CheckCircle2 size={15} color={employment.hasPayslip ? '#10b981' : '#64748b'} />
                  <span style={{ color: employment.hasPayslip ? '#fff' : '#94a3b8' }}>
                    Latest Payslip / Proof of Income
                  </span>
                </div>
                <div className="checklist-item">
                  <CheckCircle2 size={15} color={employment.hasBankStatement ? '#10b981' : '#64748b'} />
                  <span style={{ color: employment.hasBankStatement ? '#fff' : '#94a3b8' }}>
                    3-Month Bank Statements (e-Stamped)
                  </span>
                </div>
                <div className="checklist-item">
                  <CheckCircle2 size={15} color={employment.hasId ? '#10b981' : '#64748b'} />
                  <span style={{ color: employment.hasId ? '#fff' : '#94a3b8' }}>
                    Certified RSA ID / Passport Copy
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Underwriting Explanatory Insights */}
          <div className="underwriting-insights-box">
            <h4 className="insights-heading">
              <FileText size={16} />
              <span>Underwriting Summary & Actionable Recommendations</span>
            </h4>
            <ul className="insights-list">
              {insights.map((item, idx) => (
                <li key={idx} className="insight-item">
                  <span className="insight-bullet" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="job-link-modal-footer">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDocuments(application);
            }}
            className="job-footer-btn job-btn-docs"
          >
            <FileText size={16} />
            <span>View Attached Documents</span>
          </button>

          <div className="job-footer-right">
            <button
              type="button"
              onClick={onClose}
              className="job-footer-btn job-btn-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateStatus?.(application.id, 'matches_found', {
                  property_id: activeProperty?.id,
                  property_title: activeProperty?.title,
                  matched_property_id: activeProperty?.id,
                  matched_property: activeProperty,
                  match_score: compositeScore || 96,
                  match_verdict: verdict || 'Affordability & Commute Verified',
                  matched_at: new Date().toISOString()
                });
                onClose();
              }}
              className="job-footer-btn job-btn-approve"
            >
              <CheckCircle2 size={16} />
              <span>Pre-Approve Match</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
