import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  Flag,
  SkipForward,
  Send,
  EyeOff,
  Search,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import Loading from '../../component/loading';
import ApplicationSummaryPanel from './Component/ApplicationSummaryPanel';
import PropertyMatchCard from './Component/PropertyMatchCard';
import { SkipReasonModal } from './Component/SkipReasonModal';
import { ShipConfirmModal } from './Component/ShipConfirmModal';
import { ApplicationDocumentsModal } from './Component/ApplicationDocumentsModal';
import { JobResponseModal } from './Component/JobResponseModal';
import PropertyDetailView from './PropertyDetailView';
import {
  MATCH_STATE,
  listMatches,
  setMatchState,
  saveMatchNote,
  markWorking,
  shipMatches,
  subscribeToMatchUpdates
} from '../../services/applicationMatchService';
import './ApplicationManager.css';

const DEFAULT_FILTERS = {
  province: '',
  suburb: '',
  maxRent: '',
  furnished: 'any',
  category: 'any',
  bedrooms: '',
  petFriendly: false
};

/** Pull property titles safely (title is not guaranteed on every row). */
const propTitle = (p) => p?.title || p?.name || p?.property_type || 'Rental unit';

/** Seed the filter bar from the application so the agent starts oriented. */
function deriveSeed(application, properties = []) {
  const seed = { ...DEFAULT_FILTERS };
  const auto = new Set();

  const category = application?.accommodation_category || application?.category;
  if (category === 'student_room') {
    seed.category = 'student';
    auto.add('category');
  } else if (category) {
    seed.category = 'residential';
    auto.add('category');
  }

  if (application?.max_budget) {
    seed.maxRent = String(application.max_budget);
    auto.add('maxRent');
  }

  const areas = Array.isArray(application?.preferred_areas) ? application.preferred_areas : [];
  if (areas.length) {
    seed.suburb = areas[0];
    auto.add('suburb');

    const lowered = areas.map((a) => String(a).toLowerCase()).filter(Boolean);
    const hit = properties.find((p) => {
      const hay = [p.area, p.city, p.address].filter(Boolean).map((s) => String(s).toLowerCase());
      return lowered.some((a) => hay.some((h) => h.includes(a) || a.includes(h)));
    });
    if (hit?.province) {
      seed.province = hit.province;
      auto.add('province');
    }
  }

  return { seed, auto };
}

const FilterField = ({ label, auto, touched, children }) => (
  <div className="apm-filter">
    <div className="apm-filter-top">
      <span className="apm-filter-label">{label}</span>
      {auto && !touched && <span className="apm-filter-badge auto">Auto</span>}
      {touched && <span className="apm-filter-badge edited">Edited</span>}
    </div>
    {children}
  </div>
);

export default function ApplicationManager({
  application,
  tenant,
  properties = [],
  currentUserId,
  onBack = () => {},
  onRejectJob = async () => ({ success: true }),
  onShipped = () => {}
}) {
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState('working');
  const [showSkipped, setShowSkipped] = useState(false);
  const [busyPropertyId, setBusyPropertyId] = useState(null);

  const [filters, setFilters] = useState(() => deriveSeed(application, properties).seed);
  const [autoKeys, setAutoKeys] = useState(() => deriveSeed(application, properties).auto);
  const [touchedKeys, setTouchedKeys] = useState(() => new Set());
  const [showMore, setShowMore] = useState(false);

  const [skipTarget, setSkipTarget] = useState(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [shipSubmitting, setShipSubmitting] = useState(false);
  const [shipError, setShipError] = useState('');

  const [viewProperty, setViewProperty] = useState(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  const noteTimers = useRef({});

  const applicationId = application?.id;

  /* ---------------- Load + realtime ---------------- */
  const reload = useCallback(async () => {
    if (!applicationId) return;
    const res = await listMatches(applicationId);
    if (res.success) setMatches(res.data || []);
    if (res.offline) {
      setError('Working offline — changes are saved locally and will sync when the database is reachable.');
    }
  }, [applicationId]);

  useEffect(() => {
    let mounted = true;
    setLoadingMatches(true);
    setError('');
    (async () => {
      await reload();
      if (applicationId && currentUserId) markWorking(applicationId);
      if (mounted) setLoadingMatches(false);
    })();
    return () => {
      mounted = false;
    };
  }, [applicationId, currentUserId, reload]);

  useEffect(() => {
    // Re-seed the filter bar when the application changes.
    const { seed, auto } = deriveSeed(application, propertiesRef.current);
    setFilters(seed);
    setAutoKeys(auto);
    setTouchedKeys(new Set());
    setTab('working');
    setShowSkipped(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  useEffect(() => {
    const unsubscribe = subscribeToMatchUpdates((detail) => {
      if (detail?.applicationId && applicationId && detail.applicationId !== applicationId) return;
      reload();
    });
    return () => unsubscribe();
  }, [applicationId, reload]);

  /* ---------------- Derived maps ---------------- */
  const matchByPropertyId = useMemo(() => {
    const map = new Map();
    matches.forEach((m) => {
      if (m?.propertyId) map.set(m.propertyId, m);
    });
    return map;
  }, [matches]);

  const flagged = useMemo(() => matches.filter((m) => m.state === MATCH_STATE.FLAGGED), [matches]);
  const shipped = useMemo(() => matches.filter((m) => m.state === MATCH_STATE.SHIPPED), [matches]);
  const skipped = useMemo(() => matches.filter((m) => m.state === MATCH_STATE.SKIPPED), [matches]);

  const provinceOptions = useMemo(() => {
    const set = new Set(properties.map((p) => p.province).filter(Boolean));
    return [...set].sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    const q = filters.suburb.trim().toLowerCase();
    return properties.filter((p) => {
      if (filters.province && (p.province || '') !== filters.province) return false;

      if (q) {
        const hay = [p.area, p.city, p.address, p.province]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase())
          .join(' ');
        if (!hay.includes(q)) return false;
      }

      if (filters.maxRent && Number(p.price || 0) > Number(filters.maxRent)) return false;

      if (filters.furnished === 'furnished' && !p.furnished) return false;
      if (filters.furnished === 'unfurnished' && p.furnished) return false;

      const isStudentProp = (p.property_type || '').toLowerCase().includes('student');
      if (filters.category === 'student' && !isStudentProp) return false;
      if (filters.category === 'residential' && isStudentProp) return false;

      if (filters.bedrooms && Number(p.bedrooms || 0) < Number(filters.bedrooms)) return false;
      if (filters.petFriendly && p.pet_friendly !== true) return false;

      return true;
    });
  }, [properties, filters]);

  const workingList = useMemo(() => {
    return filteredProperties.filter((p) => {
      const state = matchByPropertyId.get(p.id)?.state;
      if (state === MATCH_STATE.SHIPPED) return false;
      if (state === MATCH_STATE.SKIPPED && !showSkipped) return false;
      return true;
    });
  }, [filteredProperties, matchByPropertyId, showSkipped]);

  const flaggedProperties = useMemo(
    () =>
      flagged
        .map((m) => ({ match: m, property: properties.find((p) => p.id === m.propertyId) }))
        .filter((x) => x.property),
    [flagged, properties]
  );

  const shippedProperties = useMemo(
    () =>
      shipped
        .map((m) => ({ match: m, property: properties.find((p) => p.id === m.propertyId) }))
        .filter((x) => x.property),
    [shipped, properties]
  );

  /* ---------------- Filter helpers ---------------- */
  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setTouchedKeys((prev) => new Set(prev).add(key));
  };

  const applyPreset = (preset) => {
    setFilters((prev) => ({ ...prev, ...preset }));
    setTouchedKeys((prev) => new Set(prev).add('suburb'));
  };

  const resetFilters = () => {
    const { seed, auto } = deriveSeed(application, properties);
    setFilters(seed);
    setAutoKeys(auto);
    setTouchedKeys(new Set());
  };

  /* ---------------- Match actions ---------------- */
  const upsertLocal = (propertyId, row) => {
    setMatches((prev) => {
      const next = prev.filter((m) => m.propertyId !== propertyId);
      if (row) next.push(row);
      return next;
    });
  };

  const handleFlag = async (property) => {
    if (!currentUserId) return;
    setBusyPropertyId(property.id);
    const row = {
      applicationId,
      propertyId: property.id,
      agentId: currentUserId,
      state: MATCH_STATE.FLAGGED,
      skipReason: '',
      matchNote: '',
      updatedAt: new Date().toISOString()
    };
    upsertLocal(property.id, row);
    await setMatchState({ applicationId, propertyId: property.id, agentId: currentUserId, state: MATCH_STATE.FLAGGED });
    setBusyPropertyId(null);
  };

  const handleSkip = async (reason) => {
    if (!currentUserId || !skipTarget) return;
    const property = skipTarget;
    setBusyPropertyId(property.id);
    const row = {
      applicationId,
      propertyId: property.id,
      agentId: currentUserId,
      state: MATCH_STATE.SKIPPED,
      skipReason: reason || '',
      matchNote: '',
      updatedAt: new Date().toISOString()
    };
    upsertLocal(property.id, row);
    await setMatchState({
      applicationId,
      propertyId: property.id,
      agentId: currentUserId,
      state: MATCH_STATE.SKIPPED,
      skipReason: reason
    });
    setSkipTarget(null);
    setBusyPropertyId(null);
  };

  const handleClear = async (property) => {
    if (!currentUserId) return;
    setBusyPropertyId(property.id);
    upsertLocal(property.id, null);
    await setMatchState({ applicationId, propertyId: property.id, agentId: currentUserId, state: null });
    setBusyPropertyId(null);
  };

  const handleNoteChange = (property, value) => {
    upsertLocal(property.id, { ...(matchByPropertyId.get(property.id) || {}), matchNote: value });
    clearTimeout(noteTimers.current[property.id]);
    noteTimers.current[property.id] = setTimeout(() => {
      saveMatchNote(applicationId, property.id, value);
    }, 600);
  };

  const handleShip = async () => {
    setShipSubmitting(true);
    setShipError('');
    const res = await shipMatches(applicationId);
    setShipSubmitting(false);
    if (!res.success) {
      setShipError(res.error || 'Could not ship the shortlist.');
      return;
    }
    setShipOpen(false);
    await reload();
    onShipped?.(res.count || 0);
  };

  const handleReject = async (reason) => {
    setRejecting(true);
    setRejectError('');
    const res = await onRejectJob(reason);
    setRejecting(false);
    if (res && res.success === false) {
      setRejectError(res.error || 'Could not reject this job.');
      return;
    }
    setRejectOpen(false);
    // The job is now in the admin reassignment queue; return to the list.
    onBack();
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.province) n++;
    if (filters.suburb) n++;
    if (filters.maxRent) n++;
    if (filters.furnished !== 'any') n++;
    if (filters.category !== 'any') n++;
    if (filters.bedrooms) n++;
    if (filters.petFriendly) n++;
    return n;
  }, [filters]);

  /* ---------------- Render ---------------- */
  return (
    <div className="apm-root">
      {/* LEFT: pinned application summary */}
      <div className="apm-panel-left">
        <ApplicationSummaryPanel
          application={application}
          tenant={tenant}
          onBack={onBack}
          onViewFullApplication={() => setDocsOpen(true)}
        />
      </div>

      {/* RIGHT: filters + results / draft */}
      <div className="apm-panel-right">
        <div className="apm-tabs">
          <button
            type="button"
            className={`apm-tab ${tab === 'working' ? 'active' : ''}`}
            onClick={() => setTab('working')}
          >
            <SlidersHorizontal size={15} /> Working list
          </button>
          <button
            type="button"
            className={`apm-tab ${tab === 'draft' ? 'active' : ''}`}
            onClick={() => setTab('draft')}
          >
            <Flag size={15} /> Draft &amp; ship
            {flagged.length > 0 && <span className="apm-tab-count">{flagged.length}</span>}
          </button>
        </div>

        {error && (
          <div className="apm-inline-note warn">
            <AlertTriangle size={14} /> <span>{error}</span>
          </div>
        )}

        {tab === 'working' ? (
          <>
            <div className="apm-filters">
              <div className="apm-filters-head">
                <div className="apm-filters-title">
                  <SlidersHorizontal size={14} /> Filters
                  {activeFilterCount > 0 && <span className="apm-filter-count">{activeFilterCount}</span>}
                </div>
                <button type="button" className="apm-reset" onClick={resetFilters}>
                  <RotateCcw size={13} /> Reset to application
                </button>
              </div>

              <div className="apm-filter-grid">
                <FilterField label="Province" auto={autoKeys.has('province')} touched={touchedKeys.has('province')}>
                  <div className="apm-select-wrap">
                    <select value={filters.province} onChange={(e) => setFilter('province', e.target.value)}>
                      <option value="">Any province</option>
                      {provinceOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="apm-select-icon" />
                  </div>
                </FilterField>

                <FilterField label="Suburb / area" auto={autoKeys.has('suburb')} touched={touchedKeys.has('suburb')}>
                  <div className="apm-input-wrap">
                    <Search size={14} className="apm-input-icon" />
                    <input
                      type="text"
                      value={filters.suburb}
                      placeholder="Any area"
                      onChange={(e) => setFilter('suburb', e.target.value)}
                    />
                  </div>
                </FilterField>

                <FilterField label="Max rent /mo" auto={autoKeys.has('maxRent')} touched={touchedKeys.has('maxRent')}>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={filters.maxRent}
                    placeholder="Any"
                    onChange={(e) => setFilter('maxRent', e.target.value)}
                  />
                </FilterField>

                <FilterField label="Furnished" auto={autoKeys.has('furnished')} touched={touchedKeys.has('furnished')}>
                  <div className="apm-select-wrap">
                    <select value={filters.furnished} onChange={(e) => setFilter('furnished', e.target.value)}>
                      <option value="any">Any</option>
                      <option value="furnished">Furnished</option>
                      <option value="unfurnished">Unfurnished</option>
                    </select>
                    <ChevronDown size={15} className="apm-select-icon" />
                  </div>
                </FilterField>

                <FilterField label="Category" auto={autoKeys.has('category')} touched={touchedKeys.has('category')}>
                  <div className="apm-select-wrap">
                    <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
                      <option value="any">Any</option>
                      <option value="residential">Residential</option>
                      <option value="student">Student</option>
                    </select>
                    <ChevronDown size={15} className="apm-select-icon" />
                  </div>
                </FilterField>

                <div className="apm-filter apm-filter-more">
                  <button type="button" className="apm-more-btn" onClick={() => setShowMore((v) => !v)}>
                    <SlidersHorizontal size={13} /> More {showMore ? '▴' : '▾'}
                  </button>
                </div>
              </div>

              {showMore && (
                <div className="apm-filter-grid apm-filter-grid-more">
                  <FilterField label="Min bedrooms" auto={autoKeys.has('bedrooms')} touched={touchedKeys.has('bedrooms')}>
                    <div className="apm-select-wrap">
                      <select value={filters.bedrooms} onChange={(e) => setFilter('bedrooms', e.target.value)}>
                        <option value="">Any</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                      </select>
                      <ChevronDown size={15} className="apm-select-icon" />
                    </div>
                  </FilterField>

                  <FilterField label="Pet friendly" auto={autoKeys.has('petFriendly')} touched={touchedKeys.has('petFriendly')}>
                    <label className="apm-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.petFriendly}
                        onChange={(e) => setFilter('petFriendly', e.target.checked)}
                      />
                      <span>Only pet-friendly listings</span>
                    </label>
                  </FilterField>
                </div>
              )}

              {filters.suburb && (
                <div className="apm-quick-areas">
                  <span>Try:</span>
                  {[...new Set(properties.map((p) => p.area).filter(Boolean))].slice(0, 5).map((area) => (
                    <button key={area} type="button" onClick={() => applyPreset({ suburb: area })}>
                      {area}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="apm-results-head">
              <span className="apm-results-count">
                {loadingMatches ? 'Loading…' : `${workingList.length} propert${workingList.length === 1 ? 'y' : 'ies'}`}
                {skipped.length > 0 && <span className="apm-dot"> · {skipped.length} skipped</span>}
              </span>
              <div className="apm-results-actions">
                <button
                  type="button"
                  className={`apm-toggle ${showSkipped ? 'on' : ''}`}
                  onClick={() => setShowSkipped((v) => !v)}
                >
                  <EyeOff size={13} /> {showSkipped ? 'Hide skipped' : 'Show skipped'}
                </button>
                <button type="button" className="apm-goto-draft" onClick={() => setTab('draft')}>
                  <Flag size={13} /> Draft ({flagged.length})
                </button>
              </div>
            </div>

            <div className="apm-results">
              {loadingMatches ? (
                <div className="apm-loading">
                  <Loading message="Loading your draft…" />
                </div>
              ) : workingList.length === 0 ? (
                <div className="apm-empty">
                  <Search size={34} />
                  <p>No properties match the current filters.</p>
                  <span>Relax a filter or reset to the application's preferences.</span>
                </div>
              ) : (
                workingList.map((property) => (
                  <PropertyMatchCard
                    key={property.id}
                    property={property}
                    match={matchByPropertyId.get(property.id) || null}
                    variant="result"
                    busy={busyPropertyId === property.id}
                    onFlag={handleFlag}
                    onUnflag={handleClear}
                    onSkip={(p) => setSkipTarget(p)}
                    onUnskip={handleClear}
                    onView={setViewProperty}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          /* ---------------- DRAFT & SHIP ---------------- */
          <div className="apm-draft">
            <div className="apm-draft-head">
              <div>
                <h2>
                  <Sparkles size={17} /> Your draft shortlist
                </h2>
                <p>
                  {flagged.length} flagged · {shipped.length} shipped
                  {skipped.length > 0 ? ` · You skipped ${skipped.length} propert${skipped.length === 1 ? 'y' : 'ies'}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="apm-btn ship-solid"
                onClick={() => {
                  setShipError('');
                  setShipOpen(true);
                }}
                disabled={flagged.length === 0}
              >
                <Send size={15} /> Ship shortlist
              </button>
            </div>

            {flagged.length === 0 && shipped.length === 0 && (
              <div className="apm-empty-draft">
                <Flag size={30} />
                <p>You haven't flagged any properties yet.</p>
                <span>Flag properties from the working list to build a shortlist, or reject this job if nothing fits.</span>
              </div>
            )}

            {flagged.length === 0 && (
              <div className="apm-zero-flags">
                <div className="apm-zero-left">
                  <AlertTriangle size={16} />
                  <span>
                    Shipping is blocked with an empty draft. Either flag at least one property, or reject this job
                    with a reason so the administrator can reassign it.
                  </span>
                </div>
                <div className="apm-zero-actions">
                  <button type="button" className="apm-btn ghost" onClick={() => setTab('working')}>
                    <Flag size={14} /> Go flag properties
                  </button>
                  <button type="button" className="apm-btn reject" onClick={() => setRejectOpen(true)}>
                    <SkipForward size={14} /> Reject job
                  </button>
                </div>
              </div>
            )}

            {flaggedProperties.length > 0 && (
              <div className="apm-draft-list">
                {flaggedProperties.map(({ property, match }) => (
                  <PropertyMatchCard
                    key={property.id}
                    property={property}
                    match={match}
                    variant="draft"
                    busy={busyPropertyId === property.id}
                    onUnflag={handleClear}
                    onView={setViewProperty}
                    onNoteChange={handleNoteChange}
                  />
                ))}
              </div>
            )}

            {shippedProperties.length > 0 && (
              <div className="apm-shipped-section">
                <div className="apm-shipped-head">
                  <PackageCheck size={16} /> Shipped to tenant ({shippedProperties.length})
                </div>
                <div className="apm-draft-list">
                  {shippedProperties.map(({ property, match }) => (
                    <PropertyMatchCard
                      key={property.id}
                      property={property}
                      match={match}
                      variant="shipped"
                      isNewBatch={Boolean(match.shippedAt)}
                      onView={setViewProperty}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------- Modals ------------- */}
      <SkipReasonModal
        isOpen={Boolean(skipTarget)}
        onClose={() => setSkipTarget(null)}
        property={skipTarget}
        submitting={Boolean(skipTarget) && busyPropertyId === skipTarget?.id}
        onConfirm={handleSkip}
      />

      <ShipConfirmModal
        isOpen={shipOpen}
        onClose={() => setShipOpen(false)}
        application={application}
        tenant={tenant}
        flaggedCount={flagged.length}
        submitting={shipSubmitting}
        error={shipError}
        onConfirm={handleShip}
      />

      <ApplicationDocumentsModal
        isOpen={docsOpen}
        onClose={() => setDocsOpen(false)}
        application={application}
        tenant={tenant}
      />

      <JobResponseModal
        isOpen={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectError('');
        }}
        application={application}
        tenant={tenant}
        submitting={rejecting}
        error={rejectError}
        onSubmit={handleReject}
      />

      {viewProperty && (
        <PropertyDetailView
          variant="modal"
          property={viewProperty}
          onBack={() => setViewProperty(null)}
        />
      )}
    </div>
  );
}
