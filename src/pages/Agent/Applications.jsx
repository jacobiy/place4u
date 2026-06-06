import React, { useMemo, useState } from "react";
import { Search, RefreshCw, MapPin, DollarSign, Calendar, FileText, User, Mail, ChevronDown } from "lucide-react";
import "./Applications.css";

export const Applications = ({ applications, tenantById, onRefresh, onUpdateStatus, loading }) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((a) => {
      const tenant = tenantById?.get(a.tenant_id);
      return (
        String(a.id).toLowerCase().includes(q) ||
        (a.status || "").toLowerCase().includes(q) ||
        (tenant?.full_name || "").toLowerCase().includes(q) ||
        (tenant?.email || "").toLowerCase().includes(q)
      );
    });
  }, [applications, query, tenantById]);

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
            <h1 className="applications-title">Applications</h1>
            <p className="applications-subtitle">Review tenant applications and update their status</p>
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

        {/* Search */}
        <div className="search-wrapper">
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by tenant name, email, or status..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading-state">
            <RefreshCw className="spinning loading-icon" size={32} />
            <p>Loading applications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-icon" size={48} />
            <p className="empty-text">No applications found</p>
            {query && <p className="empty-subtext">Try adjusting your search</p>}
          </div>
        ) : (
          <>
            <div className="applications-grid">
              {filtered.map((app) => {
                const tenant = tenantById?.get(app.tenant_id);
                return (
                  <div key={app.id} className="application-card">
                    <div className="card-status-bar" style={{ backgroundColor: getStatusColor(app.status) }} />
                    
                    <div className="card-content">
                      {/* Header */}
                      <div className="card-header">
                        <div className="tenant-info">
                          <div className="tenant-name">
                            <User size={16} className="tenant-icon" />
                            <h3>{tenant?.full_name || 'Unknown Tenant'}</h3>
                          </div>
                          <div className="tenant-email">
                            <Mail size={14} />
                            <span>{tenant?.email || 'No email provided'}</span>
                          </div>
                        </div>
                        <div className="application-meta">
                          <div className="app-id">#{String(app.id).slice(0, 8)}</div>
                          <div className="app-date">
                            {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'No date'}
                          </div>
                        </div>
                      </div>

                      {/* Preferred Areas */}
                      <div className="info-section">
                        <div className="section-label">
                          <MapPin size={14} />
                          <span>Preferred Areas</span>
                        </div>
                        <p className="section-value">
                          {app.preferred_areas?.join(', ') || 'Any Area'}
                        </p>
                      </div>

                      {/* Budget and Date Row */}
                      <div className="info-row">
                        <div className="info-box">
                          <div className="section-label">
                            <DollarSign size={14} />
                            <span>Monthly Budget</span>
                          </div>
                          <p className="budget-value">
                            R{app.max_budget?.toLocaleString() || 'Any'}
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

                      {/* Special Requirements */}
                      {app.special_requirements && (
                        <div className="info-section">
                          <div className="section-label">Special Requirements</div>
                          <p className="requirements-text">{app.special_requirements}</p>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="status-badge-container">
                        <span 
                          className="status-badge"
                          style={{
                            backgroundColor: `${getStatusColor(app.status)}15`,
                            color: getStatusColor(app.status),
                            borderColor: `${getStatusColor(app.status)}30`
                          }}
                        >
                          {getStatusLabel(app.status)}
                        </span>
                      </div>

                      {/* Update Status */}
                      <div className="update-status-section">
                        <label className="update-label">Update Application Status</label>
                        <div className="select-wrapper">
                          <select
                            value={app.status || 'submitted'}
                            onChange={(e) => onUpdateStatus?.(app.id, e.target.value)}
                            className="status-select"
                            style={{ 
                              borderColor: getStatusColor(app.status),
                              color: getStatusColor(app.status)
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
    </div>
  );
};