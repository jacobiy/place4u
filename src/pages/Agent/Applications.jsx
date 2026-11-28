import React, { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  FileText,
  Mail,
  ChevronRight
} from "lucide-react";
import { AgentApplicationsSkeleton } from "../../component/DashboardSkeletons";
import { evaluateJobApplicationMatch } from "../../utils/jobAffordabilityMatcher";
import { resolveApplicationProperty } from "../../utils/propertyLabel";
import { getApplicationStatusMeta } from "../../services/applicationStatus";
import "./Applications.css";

const TIER_TONES = {
  "#10b981": "ok",
  "#4f7ef8": "accent",
  "#f59e0b": "warn",
  "#ef4444": "danger"
};

const toneForTier = (hex) => TIER_TONES[String(hex || "").toLowerCase()] || "warn";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
    : "Flexible";

/**
 * Assigned applications — a scannable list. Each row carries the identity, the
 * basics an agent triages on, and a View action that opens the full-page
 * record (ApplicationDetail) rather than a modal.
 */
export const Applications = ({
  applications = [],
  properties = [],
  tenantById = new Map(),
  currentUserId = null,
  onRefresh = () => {},
  onViewApplication = () => {},
  loading = false
}) => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (applications || []).filter((a) => {
      // Strictly enforce that the application is assigned to this agent
      if (currentUserId && a.assigned_to && String(a.assigned_to) !== String(currentUserId)) {
        return false;
      }

      const tenant = tenantById?.get(a.tenant_id);

      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "student" &&
          (a.accommodation_category === "student_room" || a.category === "student_room")) ||
        (selectedCategory === "residential" &&
          a.accommodation_category !== "student_room" &&
          a.category !== "student_room");

      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        String(a.id).toLowerCase().includes(q) ||
        (a.status || "").toLowerCase().includes(q) ||
        (a.property_title || "").toLowerCase().includes(q) ||
        (tenant?.full_name || "").toLowerCase().includes(q) ||
        (tenant?.email || "").toLowerCase().includes(q) ||
        (tenant?.occupation || "").toLowerCase().includes(q) ||
        (tenant?.employer || "").toLowerCase().includes(q) ||
        (a.preferred_areas || []).join(" ").toLowerCase().includes(q)
      );
    });
  }, [applications, query, tenantById, selectedCategory, currentUserId]);

  const categoryCounts = useMemo(() => {
    const base = (applications || []).filter(
      (a) => !currentUserId || !a.assigned_to || String(a.assigned_to) === String(currentUserId)
    );
    const isStudent = (a) =>
      a.accommodation_category === "student_room" || a.category === "student_room";
    return {
      all: base.length,
      residential: base.filter((a) => !isStudent(a)).length,
      student: base.filter(isStudent).length
    };
  }, [applications, currentUserId]);

  const awaitingResponse = useMemo(
    () =>
      (applications || []).filter((a) => {
        // Only count work actually allocated to this agent (unassigned rows are
        // still visible, but they are not "awaiting your response").
        if (currentUserId && a.assigned_to && String(a.assigned_to) !== String(currentUserId)) {
          return false;
        }
        const status = a.assignment_status || (a.assigned_to ? "assigned" : "unassigned");
        return status !== "accepted" && status !== "rejected";
      }).length,
    [applications, currentUserId]
  );

  const hasActiveFilters = Boolean(query.trim()) || selectedCategory !== "all";

  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("all");
  };

  return (
    <div className="applications-container">
      <div className="applications-wrapper">
        {/* Header */}
        <header className="applications-header">
          <div>
            <span className="applications-eyebrow">Pipeline</span>
            <h1 className="applications-title">Assigned applications</h1>
            <p className="applications-subtitle">
              {categoryCounts.all} application{categoryCounts.all === 1 ? "" : "s"} allocated to you.
              {awaitingResponse > 0 && (
                <span className="applications-summary"> {awaitingResponse} awaiting your response.</span>
              )}
            </p>
          </div>
          <button onClick={onRefresh} disabled={loading} className="refresh-button" type="button">
            <RefreshCw size={15} className={loading ? "spinning" : ""} />
            <span>{loading ? "Refreshing…" : "Refresh"}</span>
          </button>
        </header>

        {/* Search & Category Filter */}
        <div className="search-filter-row">
          <div className="search-container">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Search tenant, employer, area or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
              aria-label="Search applications"
            />
          </div>

          <div className="category-filter-buttons" role="group" aria-label="Application category">
            <button
              type="button"
              aria-pressed={selectedCategory === "all"}
              onClick={() => setSelectedCategory("all")}
              className={`cat-btn ${selectedCategory === "all" ? "active" : ""}`}
            >
              All <span className="cat-count">{categoryCounts.all}</span>
            </button>
            <button
              type="button"
              aria-pressed={selectedCategory === "residential"}
              onClick={() => setSelectedCategory("residential")}
              className={`cat-btn ${selectedCategory === "residential" ? "active" : ""}`}
            >
              Residential <span className="cat-count">{categoryCounts.residential}</span>
            </button>
            <button
              type="button"
              aria-pressed={selectedCategory === "student"}
              onClick={() => setSelectedCategory("student")}
              className={`cat-btn ${selectedCategory === "student" ? "active" : ""}`}
            >
              Student <span className="cat-count">{categoryCounts.student}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && filtered.length === 0 ? (
          <AgentApplicationsSkeleton label="Loading applications…" />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-icon" size={34} />
            <p className="empty-text">No applications found</p>
            <p className="empty-subtext">
              {hasActiveFilters
                ? "Nothing matches this search or category."
                : "New assignments will appear here once allocated."}
            </p>
            {hasActiveFilters && (
              <button type="button" className="empty-reset" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="applications-list">
              <div className="row-head" aria-hidden="true">
                <span>Applicant</span>
                <span>Budget · area · move-in</span>
                <span>Fit</span>
                <span>Status</span>
                <span />
              </div>

              {filtered.map((app) => {
                const tenant = tenantById?.get(app.tenant_id);
                const statusMeta = getApplicationStatusMeta(app.status);
                const assignmentStatus =
                  app.assignment_status || (app.assigned_to ? "assigned" : "unassigned");
                const awaiting = assignmentStatus !== "accepted" && assignmentStatus !== "rejected";
                const linkedProperty = resolveApplicationProperty(app, properties).property;
                const matchAnalysis = evaluateJobApplicationMatch({
                  application: app,
                  tenant,
                  property: linkedProperty || undefined
                });
                const tierTone = toneForTier(matchAnalysis.tierColor);
                const initial = (tenant?.full_name || tenant?.email || "T")[0].toUpperCase();
                const isStudent =
                  app.accommodation_category === "student_room" || app.category === "student_room";
                const targetArea = linkedProperty
                  ? linkedProperty.city || linkedProperty.area || linkedProperty.location
                  : null;

                return (
                  <article
                    key={app.id}
                    className="application-row"
                    onClick={() => onViewApplication(app)}
                  >
                    <div className="row-identity">
                      <span className="applicant-avatar" aria-hidden="true">
                        {initial}
                      </span>
                      <div className="row-identity-text">
                        <span className="applicant-name" title={tenant?.full_name || "Verified Applicant"}>
                          {tenant?.full_name || "Verified Applicant"}
                        </span>
                        <span className="applicant-email" title={tenant?.email || "No email provided"}>
                          <Mail size={11} aria-hidden="true" />
                          <span>{tenant?.email || "No email provided"}</span>
                        </span>
                        {awaiting && <span className="row-flag">Awaiting response</span>}
                      </div>
                    </div>

                    <div className="row-facts">
                      <span className="row-fact">
                        <span className="row-fact-label">Budget</span>
                        <span className="row-fact-value ag-num">
                          {app.max_budget
                            ? `R${Number(app.max_budget).toLocaleString("en-ZA")}/mo`
                            : "Flexible"}
                        </span>
                      </span>
                      <span className="row-fact">
                        <span className="row-fact-label">Area</span>
                        <span className="row-fact-value">
                          {targetArea || app.preferred_areas?.[0] || app.location || "Any area"}
                        </span>
                      </span>
                      <span className="row-fact">
                        <span className="row-fact-label">Move-in</span>
                        <span className="row-fact-value">{formatDate(app.move_in_date)}</span>
                      </span>
                    </div>

                    <div className="row-fit">
                      <span className={`match-score-pill is-${tierTone}`} title={matchAnalysis.verdict}>
                        {matchAnalysis.compositeScore}%
                      </span>
                      <span className="row-fit-label">{isStudent ? "Student" : "Residential"}</span>
                    </div>

                    <div className="row-status">
                      <span className={`status-pill tone-${statusMeta.tone || "slate"}`}>
                        <span className="status-dot" aria-hidden="true" />
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="row-actions">
                      <button
                        type="button"
                        className="row-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewApplication(app);
                        }}
                        aria-label={`View application for ${tenant?.full_name || "applicant"}`}
                      >
                        View <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="results-count-bar">
              Showing {filtered.length} of {categoryCounts.all} application
              {categoryCounts.all !== 1 ? "s" : ""}
              {query && ` matching “${query}”`}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Applications;
