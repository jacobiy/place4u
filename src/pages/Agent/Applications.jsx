import React, { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  User,
  Mail,
  ChevronDown,
  Briefcase,
  Sparkles,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  Navigation,
  UserCheck
} from "lucide-react";
import Loading from "../../component/loading";
import { ApplicationDocumentsModal } from "./Component/ApplicationDocumentsModal";
import { JobLinkApproximationModal } from "./Component/JobLinkApproximationModal";
import { evaluateJobApplicationMatch } from "../../utils/jobAffordabilityMatcher";
import "./Applications.css";

export const Applications = ({
  applications = [],
  properties = [],
  tenantById = new Map(),
  currentUserId = null,
  onRefresh = () => {},
  onUpdateStatus = () => {},
  loading = false
}) => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modals state
  const [activeDocApp, setActiveDocApp] = useState(null);
  const [activeJobApp, setActiveJobApp] = useState(null);

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

  const getStatusColor = (status) => {
    switch(status) {
      case 'submitted': return '#10b981';
      case 'under_review': return '#f59e0b';
      case 'matches_found': return '#8b5cf6';
      case 'completed': return '#10b981';
      case 'expired': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'submitted': return 'Submitted';
      case 'under_review': return 'Under Review';
      case 'matches_found': return 'Matches Found';
      case 'completed': return 'Completed';
      case 'expired': return 'Expired';
      default: return status || 'Submitted';
    }
  };

  return (
    <div className="applications-container">
      <div className="applications-wrapper">
        
        {/* Header */}
        <div className="applications-header">
          <div>
            <h1 className="applications-title">Assigned Applications</h1>
            <p className="applications-subtitle">
              Review rental applications assigned directly to you, inspect attached FICA verification documents, and run job-to-property affordability matching
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

                // Find linked or matching property
                const linkedProperty = properties.find(p => p.id === app.property_id) || properties[0] || {
                  title: app.property_title || 'Rental Unit',
                  price: app.max_budget || 8500,
                  address: app.preferred_areas?.[0] || 'Johannesburg'
                };

                // Run real-time job-application approximation
                const matchAnalysis = evaluateJobApplicationMatch({
                  application: app,
                  tenant,
                  property: linkedProperty
                });

                const docsCount = (app.documents && Array.isArray(app.documents)) ? app.documents.length : 3;

                return (
                  <div key={app.id} className="application-card">
                    <div className="card-status-bar" style={{ backgroundColor: getStatusColor(app.status) }} />
                    
                    <div className="card-content">
                      
                      {/* Header */}
                      <div className="card-header">
                        <div className="tenant-info">
                          <div className="tenant-name">
                            <div className="tenant-avatar-badge">
                              {(tenant?.full_name || tenant?.email || "T")[0].toUpperCase()}
                            </div>
                            <div>
                              <h3>{tenant?.full_name || 'Verified Applicant'}</h3>
                              <div className="tenant-email">
                                <Mail size={13} />
                                <span>{tenant?.email || 'tenant@place4u.co.za'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="application-meta">
                          <span className="assigned-to-you-badge">
                            <UserCheck size={11} /> Assigned to You
                          </span>
                          <div className="app-id">#{String(app.id).slice(0, 8)}</div>
                          <div className="app-date">
                            {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'Recent'}
                          </div>
                        </div>
                      </div>

                      {/* Property Application Banner */}
                      {app.property_title && (
                        <div className="applied-property-banner">
                          <Building size={14} className="banner-icon" />
                          <div className="banner-text">
                            <span className="banner-label">Applying for:</span>
                            <span className="banner-title">{app.property_title}</span>
                          </div>
                        </div>
                      )}

                      {/* Job & Employment Profile Snippet */}
                      <div className="job-profile-snippet">
                        <div className="job-snippet-header">
                          <div className="job-snippet-title">
                            <Briefcase size={14} />
                            <span>{matchAnalysis.employment.jobTitle}</span>
                          </div>
                          <span className="job-income-badge">
                            R{matchAnalysis.affordability.monthlyIncome.toLocaleString()} / mo
                          </span>
                        </div>
                        <div className="job-employer-line">
                          <span>{matchAnalysis.employment.employerName}</span>
                          <span className="bullet">&bull;</span>
                          <span className="status-tag">{matchAnalysis.employment.employmentStatus}</span>
                        </div>
                      </div>

                      {/* Job-Application Linking & Approximation Widget */}
                      <div 
                        className="job-match-badge-container"
                        onClick={() => setActiveJobApp(app)}
                        role="button"
                        tabIndex={0}
                        title="Click to view full job linking & commute proximity analysis"
                      >
                        <div className="match-score-pill" style={{ background: `${matchAnalysis.tierColor}18`, borderColor: matchAnalysis.tierColor, color: matchAnalysis.tierColor }}>
                          <Sparkles size={14} />
                          <strong>{matchAnalysis.compositeScore}% Match</strong>
                        </div>
                        <div className="match-pill-details">
                          <span className="match-ratio">
                            {matchAnalysis.affordability.multiplier}x Rent Coverage &middot; ~{matchAnalysis.proximity.approxDistanceKm} km
                          </span>
                          <span className="match-verdict" style={{ color: matchAnalysis.tierColor }}>
                            {matchAnalysis.verdict}
                          </span>
                        </div>
                      </div>

                      {/* Budget and Move-in Date Row */}
                      <div className="info-row">
                        <div className="info-box">
                          <div className="section-label">
                            <DollarSign size={14} />
                            <span>Budget</span>
                          </div>
                          <p className="budget-value">
                            R{app.max_budget ? Number(app.max_budget).toLocaleString() : '8,500'}
                          </p>
                        </div>
                        <div className="info-box">
                          <div className="section-label">
                            <Calendar size={14} />
                            <span>Move-in Date</span>
                          </div>
                          <p className="section-value">
                            {app.move_in_date ? new Date(app.move_in_date).toLocaleDateString() : 'Flexible'}
                          </p>
                        </div>
                      </div>

                      {/* Preferred Areas */}
                      <div className="info-section">
                        <div className="section-label">
                          <MapPin size={14} />
                          <span>Preferred Areas</span>
                        </div>
                        <p className="section-value">
                          {app.preferred_areas?.join(', ') || 'Johannesburg / Sandton'}
                        </p>
                      </div>

                      {/* Special Requirements */}
                      {app.special_requirements && (
                        <div className="info-section requirements-box">
                          <div className="section-label">Special Notes</div>
                          <p className="requirements-text">{app.special_requirements}</p>
                        </div>
                      )}

                      {/* Action Buttons: Documents & Job Analysis */}
                      <div className="app-card-actions">
                        <button
                          type="button"
                          onClick={() => setActiveDocApp(app)}
                          className="action-btn action-btn-docs"
                        >
                          <FileCheck size={15} />
                          <span>View Documents ({docsCount})</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setActiveJobApp(app)}
                          className="action-btn action-btn-job"
                        >
                          <Navigation size={15} />
                          <span>Job &amp; Commute Check</span>
                        </button>
                      </div>

                      {/* Status Badge & Selector */}
                      <div className="update-status-section">
                        <div className="status-label-row">
                          <label className="update-label">Status</label>
                          <span 
                            className="status-badge"
                            style={{
                              backgroundColor: `${getStatusColor(app.status)}18`,
                              color: getStatusColor(app.status),
                              borderColor: `${getStatusColor(app.status)}35`
                            }}
                          >
                            {getStatusLabel(app.status)}
                          </span>
                        </div>
                        <div className="select-wrapper">
                          <select
                            value={app.status || 'submitted'}
                            onChange={(e) => onUpdateStatus?.(app.id, e.target.value)}
                            className="status-select"
                            style={{ 
                              borderColor: getStatusColor(app.status),
                              color: '#fff'
                            }}
                          >
                            <option value="submitted">✓ Submitted</option>
                            <option value="under_review">🔍 Under Review</option>
                            <option value="matches_found">🏠 Matches Found</option>
                            <option value="completed">✅ Completed</option>
                            <option value="expired">⏰ Expired</option>
                          </select>
                          <ChevronDown size={16} className="select-icon" />
                        </div>
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

    </div>
  );
};