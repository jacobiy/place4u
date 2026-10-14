import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, CheckCircle2, XCircle, ArrowRight, Send, CalendarClock,
  ShieldCheck, Home, User, Users, MapPin, ChevronDown, ChevronUp, Clock, Sparkles,
  FileText, Upload, PenTool, Eye, ExternalLink, Calendar, DollarSign, Check, Key
} from 'lucide-react';
import {
  MATCH_STATES,
  PIPELINE_STAGES,
  listPipelineMatches,
  listMatchEvents,
  acceptMatchAsTenant,
  declineMatchAsTenant,
  forwardMatchAsAgent,
  acceptMatchAsLandlord,
  declineMatchAsLandlord,
  approveMatchAsAdmin,
  rejectMatchAsAdmin,
  scheduleMatchSession,
  acceptScheduleAsTenant,
  cancelMatch,
  pendingActionForRole,
  actionLabel,
  stateLabel,
  isDeclined,
  isScheduled,
  stageIndex,
  subscribeToMatchPipeline
} from '../services/matchWorkflowService';
import TenantApplicationModal from './TenantApplicationModal';
import LeaseUploadModal from './LeaseUploadModal';
import LeaseSigningModal from './LeaseSigningModal';
import MoveInModal from './MoveInModal';

/* Neutral, theme-aware palette so one component renders correctly on the
 * light (tenant/landlord/admin) and dark (agent) dashboards. */
const THEMES = {
  light: {
    card: '#ffffff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b',
    soft: '#f8fafc', chip: '#f1f5f9', accent: '#0284c7', accentSoft: '#e0f2fe',
    ok: '#059669', okSoft: '#ecfdf5', warn: '#d97706', warnSoft: '#fffbeb',
    danger: '#dc2626', dangerSoft: '#fef2f2', shadow: '0 12px 30px -18px rgba(15,23,42,0.35)'
  },
  dark: {
    card: '#111827', border: '#1f2937', text: '#e5e7eb', muted: '#94a3b8',
    soft: '#0b1220', chip: '#1e293b', accent: '#38bdf8', accentSoft: 'rgba(56,189,248,0.14)',
    ok: '#34d399', okSoft: 'rgba(52,211,153,0.14)', warn: '#fbbf24', warnSoft: 'rgba(251,191,36,0.14)',
    danger: '#f87171', dangerSoft: 'rgba(248,113,113,0.14)', shadow: '0 12px 30px -18px rgba(0,0,0,0.6)'
  }
};

const money = (v) => (v === null || v === undefined || v === '' ? null : `R${Number(v).toLocaleString('en-ZA')}`);

// public.properties has no `title` column; compose a readable name instead.
const propertyName = (p = {}) =>
  p.title ||
  p.name ||
  [p.property_type, p.area].filter(Boolean).join(' · ') ||
  p.address ||
  'Property';
const dt = (v) => {
  if (!v) return null;
  try {
    return new Date(v).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return v; }
};

const stateTone = (state) => {
  if (state === MATCH_STATES.LEASE_SIGNED) return 'ok';
  if (state === MATCH_STATES.LEASE_UPLOADED) return 'accent';
  if (state === MATCH_STATES.SCHEDULE_ACCEPTED) return 'ok';
  if (isScheduled(state)) return 'ok';
  if (isDeclined(state)) return 'danger';
  if (state === MATCH_STATES.ADMIN_APPROVED) return 'ok';
  if (state === MATCH_STATES.LANDLORD_ACCEPTED) return 'accent';
  return 'warn';
};

export default function MatchPipelineView({
  role = 'tenant',
  currentUserId,
  title,
  subtitle,
  theme
}) {
  const t = THEMES[theme || (role === 'agent' ? 'dark' : 'light')];
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [openPanel, setOpenPanel] = useState(null); // { matchId, action }
  const [timeline, setTimeline] = useState({}); // matchId -> events[]
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);

  // Modal inspection & lease interaction states
  const [selectedAppMatch, setSelectedAppMatch] = useState(null);
  const [uploadLeaseMatch, setUploadLeaseMatch] = useState(null);
  const [signLeaseMatch, setSignLeaseMatch] = useState(null);
  const [moveInMatch, setMoveInMatch] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listPipelineMatches();
    if (res.success) {
      setMatches(res.data);
      setError(null);
    } else {
      setError(res.error || 'Could not load matches.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const unsub = subscribeToMatchPipeline(() => load());
    return () => unsub();
  }, [load]);

  const byAction = useMemo(() => {
    const actionable = matches.filter((m) => pendingActionForRole(m.state, role, m));
    return { actionable, count: actionable.length };
  }, [matches, role]);

  const run = async (matchId, fn, successMsg) => {
    setBusyId(matchId);
    const res = await fn();
    setBusyId(null);
    if (res.success) {
      setToast({ type: 'success', message: successMsg });
      setOpenPanel(null);
      setForm({});
      await load();
    } else {
      setToast({ type: 'error', message: res.error || 'Action failed.' });
    }
  };

  const openTimeline = async (matchId) => {
    if (timeline[matchId]) {
      setTimeline((prev) => ({ ...prev, [matchId]: undefined }));
      return;
    }
    const res = await listMatchEvents(matchId);
    setTimeline((prev) => ({ ...prev, [matchId]: res.data || [] }));
  };

  const pendingFor = (m) => pendingActionForRole(m.state, role, m);

  const renderStages = (m) => {
    const current = stageIndex(m.state);
    const declined = isDeclined(m.state);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {PIPELINE_STAGES.map((s, i) => {
          const done = !declined && current >= i;
          const active = !declined && current === i;
          return (
            <div
              key={s.key}
              title={`${s.label} (${s.actor})`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                border: `1px solid ${done ? t.ok : t.border}`,
                background: done ? t.okSoft : t.soft,
                color: done ? t.ok : t.muted,
                opacity: active ? 1 : 0.95
              }}
            >
              {done ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              {s.label}
            </div>
          );
        })}
      </div>
    );
  };

  const renderActionPanel = (m) => {
    if (!openPanel || openPanel.matchId !== m.id) return null;
    const action = openPanel.action;
    const key = (k) => `${m.id}:${k}`;
    const val = (k) => form[key(k)] || '';
    const set = (k, v) => setForm((prev) => ({ ...prev, [key(k)]: v }));

    // ---- action-specific forms ----
    if (role === 'tenant' && action === 'accept') {
      return (
        <Panel t={t}>
          <label style={label(t)}>
            <input
              type="checkbox"
              checked={form[key('optIn')] !== false}
              onChange={(e) => set('optIn', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            I want to schedule a viewing session for this property
          </label>
          <TextArea t={t} placeholder="Preferred dates / times, or anything the agent should know" value={val('note')} onChange={(e) => set('note', e.target.value)} />
          <div style={rowActions}>
            <PrimaryBtn t={t} busy={busyId === m.id} onClick={() => run(m.id, () => acceptMatchAsTenant(m.id, { optInSession: form[key('optIn')] !== false, note: val('note') || null }), 'Match accepted — the agent has been notified.')}>
              <CheckCircle2 size={14} /> Confirm acceptance
            </PrimaryBtn>
            <GhostBtn t={t} onClick={() => setOpenPanel(null)}>Cancel</GhostBtn>
          </div>
        </Panel>
      );
    }

    if (role === 'agent' && action === 'forward') {
      return (
        <Panel t={t}>
          <p style={hint(t)}>Share the tenant's details with the landlord for review.</p>
          <TextArea t={t} placeholder="Note to the landlord (optional)" value={val('note')} onChange={(e) => set('note', e.target.value)} />
          <div style={rowActions}>
            <PrimaryBtn t={t} busy={busyId === m.id} onClick={() => run(m.id, () => forwardMatchAsAgent(m.id, val('note') || null), 'Forwarded to the landlord for review.')}>
              <Send size={14} /> Forward to landlord
            </PrimaryBtn>
            <GhostBtn t={t} onClick={() => setOpenPanel(null)}>Cancel</GhostBtn>
          </div>
        </Panel>
      );
    }

    if (role === 'agent' && action === 'schedule') {
      return (
        <Panel t={t}>
          <p style={hint(t)}>All parties accepted. Book the viewing / meeting slot.</p>
          <label style={label(t)}>Date &amp; time</label>
          <input type="datetime-local" value={val('when')} onChange={(e) => set('when', e.target.value)} style={input(t)} />
          <label style={label(t)}>Location / link</label>
          <input type="text" placeholder="e.g. 14 Juta Street, Braamfontein" value={val('location')} onChange={(e) => set('location', e.target.value)} style={input(t)} />
          <TextArea t={t} placeholder="Notes for the tenant (optional)" value={val('notes')} onChange={(e) => set('notes', e.target.value)} />
          <div style={rowActions}>
            <PrimaryBtn
              t={t}
              busy={busyId === m.id}
              disabled={!val('when')}
              onClick={() => run(m.id, () => scheduleMatchSession(m.id, { scheduledAt: new Date(val('when')).toISOString(), location: val('location') || null, notes: val('notes') || null }), 'Session scheduled — the tenant will be called to confirm.')}
            >
              <CalendarClock size={14} /> Confirm session
            </PrimaryBtn>
            <GhostBtn t={t} onClick={() => setOpenPanel(null)}>Cancel</GhostBtn>
          </div>
        </Panel>
      );
    }

    if (role === 'landlord' && action === 'accept') {
      return (
        <Panel t={t}>
          <p style={hint(t)}>The agent forwarded this applicant for your review.</p>
          <div style={{ marginBottom: 10 }}>
            <GhostBtn t={t} onClick={() => setSelectedAppMatch(m)}>
              <FileText size={13} /> View Applicant's Full Application &amp; FICA Docs
            </GhostBtn>
          </div>
          <TextArea t={t} placeholder="Note to agent and admin (optional)" value={val('note')} onChange={(e) => set('note', e.target.value)} />
          <div style={rowActions}>
            <PrimaryBtn t={t} busy={busyId === m.id} onClick={() => run(m.id, () => acceptMatchAsLandlord(m.id, val('note') || null), 'Accepted — sent to Place4U for sign-off.')}>
              <CheckCircle2 size={14} /> Accept applicant
            </PrimaryBtn>
            <DangerBtn t={t} busy={busyId === m.id} onClick={() => run(m.id, () => declineMatchAsLandlord(m.id, val('note') || null), 'Match declined.')}>
              <XCircle size={14} /> Decline
            </DangerBtn>
            <GhostBtn t={t} onClick={() => setOpenPanel(null)}>Cancel</GhostBtn>
          </div>
        </Panel>
      );
    }

    if (role === 'admin' && action === 'approve') {
      const app = m.application || {};
      const tnt = m.tenant || app.tenant || {};
      const lnd = m.landlord || {};
      const prp = m.property || {};
      return (
        <Panel t={t}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color={t.accent} /> Meetup Review — Parties Overview
            </h4>
            <p style={{ margin: 0, fontSize: 12, color: t.muted }}>
              Review the prospective tenant and property landlord before signing off to permit the agent to schedule the meetup.
            </p>
          </div>

          {/* Dual Tenant & Landlord Card Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 14 }}>
            {/* Tenant Review Card */}
            <div style={{ padding: 12, borderRadius: 12, background: t.card, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: t.accent, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <User size={13} /> Tenant Applicant
                </span>
                {app.id && (
                  <button
                    type="button"
                    onClick={() => setSelectedAppMatch(m)}
                    style={{ background: 'transparent', border: 'none', color: t.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                  >
                    <FileText size={11} /> View App
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text }}>
                {tnt.full_name || tnt.email || 'Applicant'}
              </p>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>Email: {tnt.email || '—'}</span>
                <span>Phone: {tnt.phone || '—'}</span>
                {(app.min_budget || app.max_budget) && (
                  <span>Budget: {money(app.min_budget)} – {money(app.max_budget)}/mo</span>
                )}
                {app.move_in_date && (
                  <span>Target move-in: {dt(app.move_in_date)}</span>
                )}
                {m.tenantSessionPrefs && (
                  <span style={{ color: t.accent, fontWeight: 500 }}>
                    Requested slot: {m.tenantSessionPrefs.preferred_date || ''} {m.tenantSessionPrefs.preferred_time || ''}
                  </span>
                )}
              </div>
            </div>

            {/* Landlord Review Card */}
            <div style={{ padding: 12, borderRadius: 12, background: t.card, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: t.ok, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Users size={13} /> Property Landlord
                </span>
                {prp.price != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.ok }}>
                    {money(prp.price)}/mo
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.text }}>
                {lnd.full_name || 'Landlord'}
              </p>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>Email: {lnd.email || '—'}</span>
                <span>Phone: {lnd.phone || '—'}</span>
                <span>Property: {propertyName(prp)}</span>
                {prp.address && <span>Address: {prp.address}</span>}
                {m.landlordAcceptedAt && (
                  <span style={{ color: t.ok }}>Accepted on: {dt(m.landlordAcceptedAt)}</span>
                )}
              </div>
            </div>
          </div>

          <TextArea t={t} placeholder="Admin sign-off note (optional)" value={val('note')} onChange={(e) => set('note', e.target.value)} />
          <div style={rowActions}>
            <PrimaryBtn t={t} busy={busyId === m.id} onClick={() => run(m.id, () => approveMatchAsAdmin(m.id, val('note') || null), 'Meetup approved — the agent can now schedule the session.')}>
              <ShieldCheck size={14} /> Approve meetup &amp; unlock schedule
            </PrimaryBtn>
            <DangerBtn t={t} busy={busyId === m.id} onClick={() => run(m.id, () => rejectMatchAsAdmin(m.id, val('note') || null), 'Match rejected.')}>
              <XCircle size={14} /> Reject
            </DangerBtn>
            <GhostBtn t={t} onClick={() => setOpenPanel(null)}>Cancel</GhostBtn>
          </div>
        </Panel>
      );
    }

    if (role === 'tenant' && action === 'accept_schedule') {
      return (
        <Panel t={t}>
          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: t.text, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarClock size={15} color={t.ok} /> Confirm Scheduled Meetup
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: t.muted }}>
              The agent has booked your viewing session for {dt(m.sessionScheduledAt)} {m.sessionLocation ? `at ${m.sessionLocation}` : ''}. Confirm attendance to proceed to lease preparation.
            </p>
          </div>
          <TextArea t={t} placeholder="Note to agent and landlord (optional)" value={val('note')} onChange={(e) => set('note', e.target.value)} />
          <div style={rowActions}>
            <PrimaryBtn t={t} busy={busyId === m.id} onClick={() => run(m.id, () => acceptScheduleAsTenant(m.id, val('note') || null), 'Meetup schedule confirmed!')}>
              <CheckCircle2 size={14} /> Accept &amp; confirm meetup
            </PrimaryBtn>
            <GhostBtn t={t} onClick={() => setOpenPanel(null)}>Cancel</GhostBtn>
          </div>
        </Panel>
      );
    }

    // Generic decline form (tenant)
    return (
      <Panel t={t}>
        <TextArea t={t} placeholder="Reason (optional)" value={val('note')} onChange={(e) => set('note', e.target.value)} />
        <div style={rowActions}>
          <DangerBtn t={t} busy={busyId === m.id} onClick={() => run(m.id, () => declineMatchAsTenant(m.id, val('note') || null), 'Match declined.')}>
            <XCircle size={14} /> Confirm decline
          </DangerBtn>
          <GhostBtn t={t} onClick={() => setOpenPanel(null)}>Cancel</GhostBtn>
        </div>
      </Panel>
    );
  };

  const renderCard = (m) => {
    const p = m.property || {};
    const pending = pendingFor(m);
    const tone = stateTone(m.state);
    const toneColor = { ok: t.ok, danger: t.danger, accent: t.accent, warn: t.warn }[tone];
    const toneBg = { ok: t.okSoft, danger: t.dangerSoft, accent: t.accentSoft, warn: t.warnSoft }[tone];
    const showTimeline = Boolean(timeline[m.id]);

    const landlordHasAccepted = Boolean(m.landlordAcceptedAt) ||
      ['landlord_accepted', 'admin_approved', 'scheduled', 'schedule_accepted', 'lease_uploaded', 'lease_signed'].includes(m.state);

    return (
      <div key={m.id} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, padding: 18, boxShadow: t.shadow }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Home size={15} color={t.accent} />
              <strong style={{ color: t.text, fontSize: '1rem' }}>{propertyName(p)}</strong>
            </div>
            <div style={{ color: t.muted, fontSize: 12, marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(p.address || p.city) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{[p.address, p.city].filter(Boolean).join(', ')}</span>}
              {p.price != null && <span>{money(p.price)}/mo</span>}
              {m.application && <span>App #{String(m.applicationId).slice(0, 8)}</span>}
            </div>
          </div>
          <span style={{ alignSelf: 'flex-start', padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: toneColor, background: toneBg, border: `1px solid ${toneColor}33` }}>
            {stateLabel(m.state)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, color: t.muted, fontSize: 12, alignItems: 'center' }}>
          {m.tenant && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><User size={12} />{m.tenant.full_name || m.tenant.email || 'Tenant'}</span>}
          {m.landlord && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Users size={12} />{m.landlord.full_name || 'Landlord'}</span>}
          {m.agent && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Sparkles size={12} />{m.agent.full_name || 'Agent'}</span>}

          {/* Landlord requirement: If landlord accepted the match, view the tenant application */}
          {role === 'landlord' && landlordHasAccepted && m.application && (
            <button
              type="button"
              onClick={() => setSelectedAppMatch(m)}
              style={{
                background: t.accentSoft,
                border: `1px solid ${t.accent}44`,
                color: t.accent,
                borderRadius: 999,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <FileText size={11} /> View Tenant Application
            </button>
          )}
        </div>

        {/* Admin pre-approval comparison strip right on the card */}
        {role === 'admin' && m.state === 'landlord_accepted' && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: t.accentSoft, border: `1px solid ${t.accent}33`, color: t.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.accent }}>
                Meetup Awaiting Sign-Off — Tenant &amp; Landlord
              </span>
              {m.application && (
                <button
                  type="button"
                  onClick={() => setSelectedAppMatch(m)}
                  style={{ background: 'transparent', border: 'none', color: t.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                >
                  <FileText size={12} /> Inspect Application &amp; FICA
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
              <div>
                <strong>Tenant:</strong> {m.tenant?.full_name || 'Applicant'} ({m.tenant?.email || '—'})
                {m.application?.min_budget != null && <div style={{ color: t.muted }}>Budget: {money(m.application.min_budget)} – {money(m.application.max_budget)}/mo</div>}
              </div>
              <div>
                <strong>Landlord:</strong> {m.landlord?.full_name || 'Landlord'} ({m.landlord?.email || '—'})
                <div style={{ color: t.muted }}>{propertyName(p)} · {money(p.price)}/mo</div>
              </div>
            </div>
          </div>
        )}

        {renderStages(m)}

        {/* Scheduled Session Banner */}
        {isScheduled(m.state) && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: t.okSoft, border: `1px solid ${t.ok}33`, color: t.text, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CalendarClock size={14} color={t.ok} />
                {m.state === MATCH_STATES.SCHEDULE_ACCEPTED ? 'Meetup Confirmed by Tenant' : 'Viewing / Meetup Scheduled'}
              </strong>
              {m.tenantScheduleAcceptedAt && (
                <span style={{ fontSize: 11, color: t.ok, fontWeight: 600 }}>
                  Confirmed: {dt(m.tenantScheduleAcceptedAt)}
                </span>
              )}
            </div>
            <div style={{ marginTop: 4, color: t.muted }}>
              {dt(m.sessionScheduledAt)}{m.sessionLocation ? ` · ${m.sessionLocation}` : ''}
            </div>
            {m.sessionNotes && <div style={{ marginTop: 4, color: t.muted }}>Note: {m.sessionNotes}</div>}
          </div>
        )}

        {/* Lease Uploaded Banner */}
        {m.state === MATCH_STATES.LEASE_UPLOADED && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: t.accentSoft, border: `1px solid ${t.accent}33`, color: t.text, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} color={t.accent} /> Official Lease Agreement Uploaded
              </strong>
              {m.leaseTerms?.rent && (
                <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>
                  {money(m.leaseTerms.rent)}/mo
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: t.muted }}>
              {m.leaseTitle || 'Residential Lease Agreement'} — Ready for tenant review and signed lease upload.
            </p>
          </div>
        )}

        {/* Lease Signed Banner */}
        {(m.state === MATCH_STATES.LEASE_SIGNED || m.state === MATCH_STATES.MOVE_IN_CONFIRMED) && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: t.okSoft, border: `1px solid ${t.ok}44`, color: t.text, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={15} color={t.ok} /> Signed Lease Executed &amp; Tenancy Active
              </strong>
              {m.leaseSignedAt && (
                <span style={{ fontSize: 11, color: t.ok, fontWeight: 600 }}>
                  Signed &amp; Uploaded: {dt(m.leaseSignedAt)}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: t.muted }}>
              Executed agreement uploaded by {m.leaseSignature?.signerName || m.tenant?.full_name || 'Tenant'}. Tenancy active.
            </p>
          </div>
        )}

        {/* Move-In Milestone Banner */}
        {(m.state === MATCH_STATES.LEASE_SIGNED || m.state === MATCH_STATES.MOVE_IN_CONFIRMED) && (
          m.moveInConfirmedAt ? (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: t.okSoft, border: `1.5px solid ${t.ok}`, color: t.text, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.ok }}>
                  <Key size={15} /> Move-In Confirmed &amp; Handover Scheduled
                </strong>
                <span style={{ fontSize: 11, color: t.ok, fontWeight: 700 }}>
                  Confirmed: {dt(m.moveInConfirmedAt)}
                </span>
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                <span><strong>Date:</strong> {dt(m.moveInDate)}</span>
                {m.moveInTime && <span><strong>Time:</strong> {m.moveInTime}</span>}
                {m.moveInLocation && <span><strong>Meeting Spot:</strong> {m.moveInLocation}</span>}
              </div>
              {m.moveInInstructions && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: t.muted }}>
                  <strong>Instructions:</strong> {m.moveInInstructions}
                </p>
              )}
            </div>
          ) : m.moveInDate ? (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: t.accentSoft, border: `1.5px solid ${t.accent}66`, color: t.text, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.accent }}>
                  <Calendar size={15} /> Move-In Date Proposed by Landlord
                </strong>
                <span style={{ fontSize: 11, color: t.accent, fontWeight: 700 }}>
                  Awaiting Tenant Confirmation
                </span>
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                <span><strong>Date:</strong> {dt(m.moveInDate)}</span>
                {m.moveInTime && <span><strong>Time:</strong> {m.moveInTime}</span>}
                {m.moveInLocation && <span><strong>Location:</strong> {m.moveInLocation}</span>}
              </div>
              {m.moveInInstructions && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: t.muted }}>
                  <strong>Instructions:</strong> {m.moveInInstructions}
                </p>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: t.soft, border: `1px dashed ${t.border}`, color: t.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} />
              <span>
                {role === 'landlord'
                  ? 'Next step: Set the official move-in date and key collection instructions for the tenant.'
                  : 'Next step: Landlord will schedule the official move-in date and key collection instructions.'}
              </span>
            </div>
          )
        )}

        {isDeclined(m.state) && m.declineReason && (
          <div style={{ marginTop: 12, color: t.danger, fontSize: 12 }}>Reason: {m.declineReason}</div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
          {pending === 'accept' && role === 'tenant' && (
            <>
              <PrimaryBtn t={t} onClick={() => setOpenPanel({ matchId: m.id, action: 'accept' })}><CheckCircle2 size={14} /> Accept &amp; schedule session</PrimaryBtn>
              <GhostBtn t={t} onClick={() => setOpenPanel({ matchId: m.id, action: 'decline' })}>Decline</GhostBtn>
            </>
          )}
          {pending === 'forward' && (
            <PrimaryBtn t={t} onClick={() => setOpenPanel({ matchId: m.id, action: 'forward' })}><Send size={14} /> {actionLabel(pending)}</PrimaryBtn>
          )}
          {pending === 'schedule' && (
            <PrimaryBtn t={t} onClick={() => setOpenPanel({ matchId: m.id, action: 'schedule' })}><CalendarClock size={14} /> {actionLabel(pending)}</PrimaryBtn>
          )}
          {pending === 'accept' && role === 'landlord' && (
            <>
              <PrimaryBtn t={t} onClick={() => setOpenPanel({ matchId: m.id, action: 'accept' })}><CheckCircle2 size={14} /> Review &amp; accept</PrimaryBtn>
              <GhostBtn t={t} onClick={() => setSelectedAppMatch(m)}><FileText size={14} /> View application</GhostBtn>
            </>
          )}
          {pending === 'approve' && (
            <PrimaryBtn t={t} onClick={() => setOpenPanel({ matchId: m.id, action: 'approve' })}><ShieldCheck size={14} /> Review &amp; approve meetup</PrimaryBtn>
          )}

          {/* Tenant accept schedule action */}
          {role === 'tenant' && m.state === MATCH_STATES.SCHEDULED && (
            <PrimaryBtn t={t} onClick={() => setOpenPanel({ matchId: m.id, action: 'accept_schedule' })}>
              <CheckCircle2 size={14} /> Accept schedule &amp; confirm meet
            </PrimaryBtn>
          )}

          {/* Landlord upload lease action */}
          {role === 'landlord' && (m.state === MATCH_STATES.SCHEDULED || m.state === MATCH_STATES.SCHEDULE_ACCEPTED) && (
            <PrimaryBtn t={t} onClick={() => setUploadLeaseMatch(m)}>
              <Upload size={14} /> Upload lease agreement
            </PrimaryBtn>
          )}

          {/* Tenant view & upload signed lease action */}
          {role === 'tenant' && m.state === MATCH_STATES.LEASE_UPLOADED && (
            <PrimaryBtn t={t} onClick={() => setSignLeaseMatch(m)}>
              <Upload size={14} /> Review &amp; upload signed lease
            </PrimaryBtn>
          )}

          {/* Landlord set/update move-in date */}
          {role === 'landlord' && (m.state === MATCH_STATES.LEASE_SIGNED || m.state === MATCH_STATES.MOVE_IN_CONFIRMED) && (
            <PrimaryBtn t={t} onClick={() => setMoveInMatch(m)}>
              <Calendar size={14} /> {m.moveInDate ? 'Update move-in schedule' : 'Set move-in date'}
            </PrimaryBtn>
          )}

          {/* Tenant confirm move-in date */}
          {role === 'tenant' && (m.state === MATCH_STATES.LEASE_SIGNED || m.state === MATCH_STATES.MOVE_IN_CONFIRMED) && m.moveInDate && !m.moveInConfirmedAt && (
            <PrimaryBtn t={t} onClick={() => setMoveInMatch(m)}>
              <CheckCircle2 size={14} /> Confirm move-in date
            </PrimaryBtn>
          )}

          {/* View move-in details when confirmed or for admin/agent */}
          {(m.state === MATCH_STATES.LEASE_SIGNED || m.state === MATCH_STATES.MOVE_IN_CONFIRMED) && m.moveInDate && (m.moveInConfirmedAt || role === 'admin' || role === 'agent') && (
            <GhostBtn t={t} onClick={() => setMoveInMatch(m)}>
              <Key size={14} /> Move-in details
            </GhostBtn>
          )}

          {/* View lease if uploaded or signed */}
          {(m.state === MATCH_STATES.LEASE_UPLOADED || m.state === MATCH_STATES.LEASE_SIGNED || m.state === MATCH_STATES.MOVE_IN_CONFIRMED) && (
            <GhostBtn t={t} onClick={() => setSignLeaseMatch(m)}>
              {m.state === MATCH_STATES.LEASE_SIGNED || m.state === MATCH_STATES.MOVE_IN_CONFIRMED ? <ShieldCheck size={14} /> : <Eye size={14} />}
              {m.state === MATCH_STATES.LEASE_SIGNED || m.state === MATCH_STATES.MOVE_IN_CONFIRMED ? 'View signed lease' : 'View lease'}
            </GhostBtn>
          )}

          {/* Landlord viewing tenant application button (after accepted) */}
          {role === 'landlord' && landlordHasAccepted && m.application && (
            <GhostBtn t={t} onClick={() => setSelectedAppMatch(m)}>
              <FileText size={14} /> Tenant application
            </GhostBtn>
          )}

          <button
            type="button"
            onClick={() => openTimeline(m.id)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: t.muted, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            {showTimeline ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Activity
          </button>
        </div>

        {renderActionPanel(m)}

        {showTimeline && (
          <div style={{ marginTop: 14, borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
            {(timeline[m.id] || []).length === 0 ? (
              <p style={{ color: t.muted, fontSize: 12, margin: 0 }}>No activity yet.</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 18, color: t.muted, fontSize: 12 }}>
                {timeline[m.id].map((e) => (
                  <li key={e.id} style={{ marginBottom: 4 }}>
                    <strong style={{ color: t.text }}>{stateLabel(e.to_state || e.event_type)}</strong>
                    {' · '}{e.actor_role || 'system'}{e.created_at ? ` · ${dt(e.created_at)}` : ''}
                    {e.note ? ` — ${e.note}` : ''}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    );
  };

  const heading = title || (role === 'tenant' ? 'My match pipeline' : role === 'agent' ? 'Match pipeline' : role === 'landlord' ? 'Applicant pipeline' : 'Match oversight');
  const sub = subtitle || 'Track every accepted match from shipment through to a scheduled session and signed lease.';

  return (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', color: t.text }}>
      {toast && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, fontSize: 13, background: toast.type === 'error' ? t.dangerSoft : t.okSoft, color: toast.type === 'error' ? t.danger : t.ok, border: `1px solid ${(toast.type === 'error' ? t.danger : t.ok)}33` }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{heading}</h2>
          <p style={{ margin: '4px 0 0', color: t.muted, fontSize: 13 }}>{sub}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {byAction.count > 0 && (
            <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: t.accentSoft, color: t.accent, border: `1px solid ${t.accent}33` }}>
              {byAction.count} awaiting you
            </span>
          )}
          <button type="button" onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.border}`, color: t.text, borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: t.muted }}>Loading matches…</div>
      ) : error ? (
        <div style={{ padding: 20, borderRadius: 14, background: t.warnSoft, border: `1px solid ${t.warn}33`, color: t.warn, fontSize: 13 }}>
          {error}
          <div style={{ marginTop: 6, color: t.muted }}>Run <code>database/match_.sql</code> and <code>database/match_lease_pipeline.sql</code> in Supabase to enable the match pipeline.</div>
        </div>
      ) : matches.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: t.muted, border: `1px dashed ${t.border}`, borderRadius: 16 }}>
          No matches in the pipeline yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {byAction.count > 0 && (
            <div>
              <SectionTitle t={t} label="Awaiting your action" />
              <div style={{ display: 'grid', gap: 14 }}>{byAction.actionable.map(renderCard)}</div>
            </div>
          )}
          <div>
            <SectionTitle t={t} label={byAction.count > 0 ? 'All matches' : 'Matches'} />
            <div style={{ display: 'grid', gap: 14 }}>{matches.map(renderCard)}</div>
          </div>
        </div>
      )}

      {/* Tenant Application Inspection Modal */}
      <TenantApplicationModal
        isOpen={Boolean(selectedAppMatch)}
        onClose={() => setSelectedAppMatch(null)}
        application={selectedAppMatch?.application}
        tenant={selectedAppMatch?.tenant}
        property={selectedAppMatch?.property}
        theme={theme || (role === 'agent' ? 'dark' : 'light')}
      />

      {/* Landlord Lease Upload Modal */}
      <LeaseUploadModal
        isOpen={Boolean(uploadLeaseMatch)}
        onClose={() => setUploadLeaseMatch(null)}
        match={uploadLeaseMatch}
        currentUserId={currentUserId}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Lease agreement uploaded and sent to tenant.' });
          load();
        }}
        theme={theme || (role === 'agent' ? 'dark' : 'light')}
      />

      {/* Tenant Lease Signing / Review Modal */}
      <LeaseSigningModal
        isOpen={Boolean(signLeaseMatch)}
        onClose={() => setSignLeaseMatch(null)}
        match={signLeaseMatch}
        currentUserId={currentUserId}
        userRole={role}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Signed lease agreement submitted and tenancy activated!' });
          load();
        }}
        theme={theme || (role === 'agent' ? 'dark' : 'light')}
      />

      {/* Move-in Date Proposal & Confirmation Modal */}
      <MoveInModal
        isOpen={Boolean(moveInMatch)}
        onClose={() => setMoveInMatch(null)}
        match={moveInMatch}
        currentUserId={currentUserId}
        userRole={role}
        onSuccess={() => {
          setToast({
            type: 'success',
            message:
              role === 'tenant'
                ? 'Move-in date confirmed! Keys handover is scheduled.'
                : 'Move-in schedule saved and sent to tenant.'
          });
          load();
        }}
        theme={theme || (role === 'agent' ? 'dark' : 'light')}
      />
    </div>
  );
}

/* ---- tiny presentational helpers (keep the component dependency-free) ---- */
const label = (t) => ({ display: 'block', color: t.muted, fontSize: 12, margin: '10px 0 4px' });
const hint = (t) => ({ color: t.muted, fontSize: 12, margin: '0 0 8px' });
const input = (t) => ({ width: '100%', background: t.soft, border: `1px solid ${t.border}`, color: t.text, borderRadius: 10, padding: '9px 11px', fontSize: 13, boxSizing: 'border-box' });
const rowActions = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 };

function Panel({ t, children }) {
  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: t.soft, border: `1px solid ${t.border}` }}>
      {children}
    </div>
  );
}

function TextArea({ t, ...props }) {
  return <textarea rows={2} {...props} style={{ ...input(t), marginTop: 8, resize: 'vertical' }} />;
}

function SectionTitle({ t, label: text }) {
  return <p style={{ margin: '0 0 8px', color: t.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{text}</p>;
}

function PrimaryBtn({ t, busy, children, ...rest }) {
  return (
    <button type="button" {...rest} disabled={busy || rest.disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: rest.disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

function GhostBtn({ t, children, ...rest }) {
  return (
    <button type="button" {...rest} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: t.text, border: `1px solid ${t.border}`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

function DangerBtn({ t, busy, children, ...rest }) {
  return (
    <button type="button" {...rest} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.dangerSoft, color: t.danger, border: `1px solid ${t.danger}44`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>
      {children}
    </button>
  );
}
