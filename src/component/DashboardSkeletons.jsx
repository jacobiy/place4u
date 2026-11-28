import React from "react";
import "./DashboardSkeletons.css";

/**
 * Base shimmer primitive. Defaults to light-surface palette; pass `dark` for
 * dark containers (such as the Agent KPI strip or Admin hero banner).
 */
export function Skel({
  w = "100%",
  h = 14,
  radius = 8,
  circle = false,
  pill = false,
  dark = false,
  className = "",
  style = {},
}) {
  const classes = [
    "p4u-skel-block",
    circle ? "p4u-skel-circle" : "",
    pill ? "p4u-skel-pill" : "",
    dark ? "is-dark" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      aria-hidden="true"
      className={classes}
      style={{
        width: typeof w === "number" ? `${w}px` : w,
        height: typeof h === "number" ? `${h}px` : h,
        ...(circle || pill ? {} : { borderRadius: typeof radius === "number" ? `${radius}px` : radius }),
        ...style,
      }}
    />
  );
}

/**
 * Shared 4-card KPI skeleton row used across light-surface dashboards.
 */
function LightKpiGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skel w="48%" h={11} />
            <Skel w={32} h={32} radius={10} />
          </div>
          <Skel w="36%" h={28} radius={8} />
          <Skel w="68%" h={10} />
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   1. Tenant Dashboard Skeleton
   ========================================================================== */
export function TenantDashboardSkeleton({ label = "Preparing tenant portal…" }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <span className="sr-only">{label}</span>

      {/* Welcome & quick action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skel w={110} h={11} />
          <Skel w={260} h={28} />
          <Skel w={320} h={13} />
        </div>
        <div className="flex items-center gap-3">
          <Skel w={132} h={40} radius={12} />
          <Skel w={156} h={40} radius={12} />
        </div>
      </div>

      {/* 4-card KPI strip */}
      <LightKpiGridSkeleton count={4} />

      {/* Main split: Live application tracker + Account/Saved summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skel w={180} h={18} />
              <Skel w={240} h={12} />
            </div>
            <Skel w={108} h={26} pill />
          </div>

          <div className="bg-slate-50/80 rounded-xl border border-slate-100 p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <Skel w={26} h={26} circle />
                <div className="flex-1 space-y-1.5">
                  <Skel w="42%" h={13} />
                  <Skel w="68%" h={10} />
                </div>
                <Skel w={72} h={22} pill />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <Skel w={140} h={18} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
              <Skel w={48} h={48} radius={10} />
              <div className="flex-1 space-y-2">
                <Skel w="75%" h={13} />
                <Skel w="50%" h={11} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended residences row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <Skel w="100%" h={160} radius={0} />
            <div className="p-4 space-y-2.5">
              <Skel w="65%" h={16} />
              <Skel w="48%" h={12} />
              <div className="flex items-center justify-between pt-2">
                <Skel w={88} h={18} />
                <Skel w={76} h={28} radius={10} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   2. Landlord Dashboard Skeleton
   ========================================================================== */
export function LandlordDashboardSkeleton({ label = "Loading landlord portal…" }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <span className="sr-only">{label}</span>

      {/* Top header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div className="space-y-2">
          <Skel w={120} h={11} />
          <Skel w={250} h={28} />
          <Skel w={290} h={13} />
        </div>
        <div className="flex items-center gap-3">
          <Skel w={118} h={40} radius={12} />
          <Skel w={144} h={40} radius={12} />
        </div>
      </div>

      {/* KPI strip */}
      <LightKpiGridSkeleton count={4} />

      {/* Property portfolio & activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skel w={175} h={18} />
            <Skel w={84} h={28} radius={8} />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50"
            >
              <Skel w={64} h={52} radius={10} />
              <div className="flex-1 space-y-2">
                <Skel w="58%" h={14} />
                <Skel w="40%" h={11} />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skel w={78} h={14} />
                <Skel w={74} h={22} pill />
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <Skel w={160} h={18} />
          <div className="space-y-3 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-b-0">
                <Skel w={32} h={32} circle />
                <div className="flex-1 space-y-1.5">
                  <Skel w="78%" h={13} />
                  <Skel w="46%" h={10} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. Agent Dashboard Skeleton (matches Dashboard.css dark navy KPI + panels)
   ========================================================================== */
export function AgentDashboardSkeleton({ label = "Loading agent portal…" }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="w-full min-h-screen bg-[#f8fafc]"
    >
      <span className="sr-only">{label}</span>

      {/* Topbar skeleton */}
      <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skel w={76} h={10} />
          <Skel w={180} h={22} />
        </div>
        <Skel w={280} h={38} radius={10} />
        <div className="flex items-center gap-2.5">
          <Skel w={106} h={36} radius={10} />
          <Skel w={118} h={36} radius={10} />
          <Skel w={96} h={36} radius={10} />
          <Skel w={32} h={32} circle />
        </div>
      </div>

      <div className="max-w-[1560px] mx-auto px-6 lg:px-10 py-6 space-y-6">
        {/* Dark navy KPI strip matching .agent-dashboard.is-verified .ag-kpi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[#141e2e] rounded-[14px] border border-white/10 overflow-hidden shadow-md">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-5 sm:p-6 border-t sm:border-t-0 sm:border-l border-white/10 first:border-t-0 first:border-l-0 space-y-3"
            >
              <Skel w="52%" h={11} dark />
              <Skel w="28%" h={32} radius={8} dark />
              <Skel w="70%" h={11} dark />
            </div>
          ))}
        </div>

        {/* Primary grid: Worklist table + Pipeline donut */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Skel w={210} h={18} />
              <Skel w={260} h={32} radius={8} />
            </div>
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Skel w={34} h={34} circle />
                    <div className="space-y-1.5 flex-1">
                      <Skel w="46%" h={13} />
                      <Skel w="34%" h={10} />
                    </div>
                  </div>
                  <Skel w={82} h={14} />
                  <Skel w={96} h={13} />
                  <Skel w={48} h={22} pill />
                  <Skel w={92} h={24} pill />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <Skel w={120} h={18} />
              <Skel w={64} h={12} />
            </div>
            <div className="py-2">
              <div className="p4u-skel-ring" aria-hidden="true" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skel w="44%" h={12} />
                  <Skel w={28} h={12} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. Agent Applications Ledger Skeleton (matches Applications.css rows)
   ========================================================================== */
export function AgentApplicationsSkeleton({ rows = 6, label = "Loading applications…" }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="applications-list">
      <span className="sr-only">{label}</span>
      <div className="row-head" aria-hidden="true">
        <span>Applicant</span>
        <span>Budget · area · move-in</span>
        <span>Fit</span>
        <span>Status</span>
        <span />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="application-row" style={{ cursor: "default" }}>
          <div className="row-identity">
            <Skel w={36} h={36} circle />
            <div className="row-identity-text" style={{ flex: 1 }}>
              <Skel w="62%" h={14} />
              <Skel w="48%" h={11} style={{ marginTop: 4 }} />
            </div>
          </div>
          <div className="row-facts">
            <Skel w={78} h={14} />
            <Skel w={94} h={14} />
            <Skel w={76} h={14} />
          </div>
          <div className="row-fit">
            <Skel w={48} h={24} pill />
          </div>
          <div className="row-status">
            <Skel w={104} h={26} pill />
          </div>
          <div className="row-actions">
            <Skel w={68} h={32} radius={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   5. Agent Properties Grid Skeleton
   ========================================================================== */
export function AgentPropertiesSkeleton({ count = 6, label = "Loading properties…" }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="properties-grid">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="property-card">
          <div className="property-card-image-wrapper">
            <Skel w="100%" h={180} radius={0} />
          </div>
          <div className="property-card-content" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skel w="36%" h={11} />
            <Skel w="68%" h={15} />
            <Skel w="84%" h={12} />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Skel w={84} h={24} pill />
              <Skel w={64} h={24} pill />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   6. Admin Dashboard Skeleton (matches Admin Dashboard hero + KPIs + table)
   ========================================================================== */
export function AdminDashboardSkeleton({ label = "Loading admin command center…" }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-6 pb-12">
      <span className="sr-only">{label}</span>

      {/* Dark navy hero banner */}
      <div className="bg-gradient-to-r from-[#0F1E35] via-[#132847] to-[#1A365D] rounded-2xl p-6 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <Skel w={140} h={12} dark />
            <Skel w={280} h={28} dark />
            <Skel w={360} h={13} dark />
          </div>
          <div className="flex items-center gap-3">
            <Skel w={118} h={38} radius={12} dark />
            <Skel w={132} h={38} radius={12} dark />
          </div>
        </div>
      </div>

      {/* 4 KPI cards */}
      <LightKpiGridSkeleton count={4} />

      {/* Filter strip + Applications table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skel key={i} w={92} h={32} radius={10} />
            ))}
          </div>
          <Skel w={240} h={36} radius={10} />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skel w={36} h={36} circle />
                <div className="space-y-1.5 flex-1">
                  <Skel w="40%" h={14} />
                  <Skel w="28%" h={11} />
                </div>
              </div>
              <Skel w={96} h={14} />
              <Skel w={112} h={14} />
              <Skel w={96} h={24} pill />
              <Skel w={84} h={32} radius={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   7. Tenant Applications View Skeleton
   ========================================================================== */
export function TenantApplicationsSkeleton({ count = 3, label = "Loading your applications…" }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="max-w-6xl mx-auto pb-16 px-4 sm:px-8 space-y-5">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-2">
          <Skel w={120} h={11} />
          <Skel w={220} h={26} />
        </div>
        <Skel w={148} h={40} radius={12} />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skel w="42%" h={18} />
              <Skel w="28%" h={12} />
            </div>
            <Skel w={108} h={26} pill />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <Skel w="55%" h={10} />
                <Skel w="78%" h={14} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   8. Agent Application Manager Draft Skeleton
   ========================================================================== */
export function AgentDraftMatchSkeleton({ count = 4, label = "Loading your draft…" }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-3 p-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200/80 bg-white">
          <Skel w={72} h={58} radius={10} />
          <div className="flex-1 space-y-2">
            <Skel w="52%" h={15} />
            <Skel w="36%" h={12} />
          </div>
          <div className="flex items-center gap-2">
            <Skel w={64} h={28} pill />
            <Skel w={84} h={32} radius={8} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   9. Landlord Records Table Skeleton (Tenants / Applications)
   ========================================================================== */
export function LandlordRecordsSkeleton({ rows = 5, label = "Loading records…" }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skel w={36} h={36} circle />
            <div className="space-y-1.5 flex-1">
              <Skel w="45%" h={14} />
              <Skel w="30%" h={11} />
            </div>
          </div>
          <Skel w={120} h={14} />
          <Skel w={96} h={14} />
          <Skel w={88} h={24} pill />
          <Skel w={76} h={30} radius={8} />
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   10. Profile & Settings Page Skeleton
   ========================================================================== */
export function ProfileSettingsSkeleton({ label = "Loading account settings…" }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <span className="sr-only">{label}</span>
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 flex items-center gap-4">
        <Skel w={64} h={64} circle />
        <div className="space-y-2 flex-1">
          <Skel w={200} h={22} />
          <Skel w={260} h={13} />
        </div>
        <Skel w={110} h={36} radius={10} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4">
            <Skel w={150} h={18} />
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="space-y-1.5">
                <Skel w={96} h={11} />
                <Skel w="100%" h={40} radius={10} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
