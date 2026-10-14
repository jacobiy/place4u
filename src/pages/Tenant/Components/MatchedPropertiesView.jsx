import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, Building2, MapPin, Calendar, Clock,
  Eye, Check, X, PackageCheck, ChevronRight, ShieldCheck, Key
} from 'lucide-react';
import { AlertToast } from '../../../component/AlertModal';
import { acceptMatchAsTenant } from '../../../services/matchWorkflowService';

/* ------------------------------------------------------------------ */
/*  Palette: white surfaces, light-blue washes, one confident blue.    */
/* ------------------------------------------------------------------ */
const CARD = 'bg-white border border-sky-100 shadow-[0_12px_40px_-18px_rgba(2,132,199,0.22)]';
const BTN_PRIMARY =
  'bg-sky-600 hover:bg-sky-700 text-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.55)] transition-colors duration-200 cursor-pointer';
const BTN_OUTLINE =
  'border border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300 text-slate-700 transition-colors duration-200 cursor-pointer';

const Eyebrow = ({ children, className = '' }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 ${className}`}>{children}</p>
);

const ModalShell = ({ onClose, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} rounded-[28px] bg-white shadow-[0_40px_100px_-20px_rgba(2,132,199,0.45)] overflow-hidden`}
      >
        <div className="h-1.5 bg-gradient-to-r from-sky-300 via-sky-500 to-blue-600" />
        <div className="p-6 sm:p-7 space-y-5">{children}</div>
      </div>
    </div>
  );
};

const ModalHeader = ({ eyebrow, title, subtitle, onClose }) => (
  <div className="flex items-start justify-between pb-5 border-b border-sky-100">
    <div>
      <Eyebrow className="!text-sky-600 mb-1.5">{eyebrow}</Eyebrow>
      <h3 className="font-serif text-2xl text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
    <button
      onClick={onClose}
      aria-label="Close"
      className="w-9 h-9 rounded-full border border-sky-100 hover:bg-sky-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
    >
      <X size={16} />
    </button>
  </div>
);

/* The tenant-facing label + colour for each point in the acceptance pipeline. */
const STATE_META = {
  shipped:            { label: 'Action needed', hint: 'Accept this match to request a viewing session.', tone: 'amber' },
  tenant_accepted:    { label: 'You accepted', hint: 'Your agent is forwarding your details to the landlord.', tone: 'sky' },
  agent_forwarded:    { label: 'With the landlord', hint: 'The landlord is reviewing your application.', tone: 'sky' },
  landlord_accepted:  { label: 'Landlord accepted', hint: 'Awaiting Place4U admin sign-off.', tone: 'indigo' },
  admin_approved:     { label: 'Approved — scheduling', hint: 'Your agent will confirm the session time.', tone: 'emerald' },
  scheduled:          { label: 'Session scheduled', hint: 'Your viewing is confirmed.', tone: 'emerald' },
  schedule_accepted:  { label: 'Meetup confirmed', hint: 'Schedule confirmed! After the meetup, the landlord will upload your lease.', tone: 'emerald' },
  lease_uploaded:     { label: 'Lease ready for signing', hint: 'The landlord uploaded your lease agreement. Review and upload your signed copy to secure your new home.', tone: 'indigo' },
  lease_signed:       { label: 'Lease active', hint: 'Your signed lease agreement has been submitted and your tenancy is active!', tone: 'emerald' },
  move_in_confirmed:  { label: 'Move-in confirmed', hint: 'Your move-in date and key collection schedule has been finalized!', tone: 'emerald' },
  tenant_declined:    { label: 'Declined by you', hint: '', tone: 'slate' },
  landlord_declined:  { label: 'Declined by landlord', hint: '', tone: 'slate' },
  admin_rejected:     { label: 'Not approved', hint: '', tone: 'slate' },
  cancelled:          { label: 'Cancelled', hint: '', tone: 'slate' }
};

const TONE_CLASSES = {
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  sky: 'bg-sky-50 border-sky-200 text-sky-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  slate: 'bg-slate-100 border-slate-200 text-slate-500'
};

const stateMeta = (state) => STATE_META[state] || { label: 'Matched', hint: '', tone: 'sky' };

/* Normalise whatever real property data we have for the "student" badge. */
const isStudentProperty = (p) =>
  (p?.property_type || '').toLowerCase().includes('student') ||
  (p?.title || '').toLowerCase().includes('campus');

const propertyLabel = (p) =>
  p?.title ||
  [p?.property_type, p?.area].filter(Boolean).join(' · ') ||
  p?.address ||
  'this home';

const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

export default function MatchedPropertiesView({
  user,
  profile,
  matches = [],
  onPropertyClick = () => {},
  onNavigateTab = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'residential' | 'student'
  const [toast, setToast] = useState(null);
  const [bookingMatch, setBookingMatch] = useState(null);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingBusy, setBookingBusy] = useState(false);

  // Every real match the agent has shipped/accepted for this tenant, newest first.
  const cards = useMemo(
    () =>
      matches
        .filter((m) => m && m.property)
        .map((m) => {
          const p = m.property;
          return {
            id: `match-${m.id}`,
            matchId: m.id,
            applicationId: m.applicationId,
            state: m.state,
            property: p,
            isStudent: isStudentProperty(p),
            isNewBatch: Boolean(m.isNewBatch),
            shippedAt: m.shippedAt,
            note: m.matchNote || '',
            sessionScheduledAt: m.sessionScheduledAt || null,
            sessionLocation: m.sessionLocation || null,
            moveInDate: m.moveInDate || null,
            moveInTime: m.moveInTime || null,
            moveInLocation: m.moveInLocation || null,
            moveInConfirmedAt: m.moveInConfirmedAt || null,
            updatedAt: m.updatedAt || null
          };
        }),
    [matches]
  );

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (categoryFilter === 'student' && !c.isStudent) return false;
      if (categoryFilter === 'residential' && c.isStudent) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [c.property.title, c.property.property_type, c.property.area, c.property.city, c.property.address]
          .map((s) => (s || '').toLowerCase());
        if (!hay.some((s) => s.includes(q))) return false;
      }
      return true;
    });
  }, [cards, categoryFilter, searchQuery]);

  const totalMatchCount = cards.length;

  // Accept a REAL shipped match through the acceptance pipeline
  // (database/match_.sql): the tenant opts into a viewing session here, which
  // notifies the agent to forward the applicant to the landlord.
  const handleConfirmBooking = async (card) => {
    if (!card?.matchId) return;
    setBookingBusy(true);
    const res = await acceptMatchAsTenant(card.matchId, {
      optInSession: true,
      sessionPrefs: { preferred_date: bookingDate, preferred_time: bookingTime }
    });
    setBookingBusy(false);

    if (res.success) {
      setBookingMatch(null);
      setToast({
        type: 'success',
        title: 'Match accepted',
        message: `You accepted ${propertyLabel(card.property)} and asked for a viewing on ${bookingDate} at ${bookingTime}. Your agent has been notified and will forward your details to the landlord.`
      });
      onNavigateTab('pipeline');
    } else {
      setToast({
        type: 'error',
        title: 'Could not accept match',
        message: res.error || 'Please try again.'
      });
    }
  };

  const filters = [
    { key: 'all', label: `All matches (${totalMatchCount})` },
    { key: 'residential', label: 'Residential' },
    { key: 'student', label: 'Student rooms' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-16 text-slate-900">
      <AlertToast toast={toast} onClose={() => setToast(null)} />

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden rounded-[32px] border border-sky-100 px-6 py-10 sm:px-12 sm:py-12 bg-white/80 backdrop-blur-md shadow-[0_24px_60px_-28px_rgba(2,132,199,0.35)]">
        <div aria-hidden className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-sky-300/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 left-1/3 w-[360px] h-[360px] rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sky-200 text-[11px] font-semibold tracking-wide text-sky-700 shadow-sm mb-6">
              <Sparkles size={13} />
              Agent matching desk
            </span>

            <h1 className="font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tight text-slate-900">
              Homes your agent
              <br />
              <span className="italic text-sky-600">hand-picked for you</span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Every property your agent has matched to your application, with its live status. Accept a match to request
              a viewing session, then follow it through the pipeline.
            </p>
          </div>

          <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/80 backdrop-blur border border-sky-100 shadow-sm self-start lg:self-auto">
            <div className="w-12 h-12 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="font-serif text-4xl text-slate-900 leading-none">{totalMatchCount}</p>
              <p className="text-xs text-slate-500 mt-1.5">Pre-approved {totalMatchCount === 1 ? 'match' : 'matches'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================== CONTROLS ========================== */}
      {totalMatchCount > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" size={16} />
            <input
              type="text"
              aria-label="Search matches"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search property, suburb or address"
              className="w-full h-11 pl-11 pr-10 rounded-full bg-white border border-sky-100 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-full bg-sky-50 border border-sky-100 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setCategoryFilter(f.key)}
                className={`h-9 px-4 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  categoryFilter === f.key
                    ? 'bg-white text-sky-700 shadow-sm border border-sky-100'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================== MATCHES =========================== */}
      {totalMatchCount === 0 ? (
        <div className="py-20 px-6 text-center rounded-[28px] bg-sky-50/50 border border-dashed border-sky-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-white border border-sky-100 flex items-center justify-center text-sky-500 mx-auto">
            <Building2 size={26} />
          </div>
          <h3 className="font-serif text-2xl text-slate-900">No matches yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your assigned Place4U agent is reviewing properties against your application. Every home they ship to you
            will appear here with its live status.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('applications')}
            className={`h-11 px-6 rounded-full text-xs font-bold inline-flex items-center gap-2 ${BTN_PRIMARY}`}
          >
            View my applications
            <ChevronRight size={14} />
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 px-6 text-center rounded-[28px] bg-sky-50/50 border border-dashed border-sky-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-white border border-sky-100 flex items-center justify-center text-sky-500 mx-auto">
            <Building2 size={26} />
          </div>
          <h3 className="font-serif text-2xl text-slate-900">No properties found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Nothing matches your search. Try a different term or clear the filters.
          </p>
        </div>
      ) : (
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <Eyebrow className="!text-sky-600">Matched by your agent</Eyebrow>
              <h2 className="font-serif text-3xl text-slate-900 mt-1.5">Your matched homes</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-xl">
                These homes were reviewed and shipped to you by your assigned Place4U agent.
              </p>
            </div>
            <span className="px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
              <PackageCheck size={14} />
              {totalMatchCount} {totalMatchCount === 1 ? 'home' : 'homes'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((card) => {
              const p = card.property;
              const meta = stateMeta(card.state);
              const cover =
                (p.image_urls && p.image_urls[0]) ||
                p.image_url ||
                p.image ||
                '/property-placeholder.svg';

              return (
                <article
                  key={card.id}
                  className={`${CARD} rounded-[28px] overflow-hidden flex flex-col hover:border-sky-300 transition-colors duration-300`}
                >
                  <div className="relative aspect-[16/10] bg-sky-100">
                    <img
                      src={cover}
                      alt={p.title || 'Property'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-transparent to-slate-900/10" />

                    <span
                      className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm inline-flex items-center gap-1.5 border ${TONE_CLASSES[meta.tone]}`}
                    >
                      {card.state === 'shipped' && <Sparkles size={12} />}
                      {card.state === 'scheduled' && <Calendar size={12} />}
                      {meta.label}
                    </span>

                    {card.isNewBatch && card.state === 'shipped' && (
                      <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-sm">
                        New
                      </span>
                    )}

                    <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl text-white leading-none">
                          R{Number(p.price || 0).toLocaleString('en-ZA')}
                          <span className="font-sans text-xs text-white/80 ml-1.5">/ month</span>
                        </p>
                        <p className="text-xs text-white/90 flex items-center gap-1.5 mt-2">
                          <MapPin size={12} />
                          {[p.address, p.city].filter(Boolean).join(', ') || p.area || 'Location on request'}
                        </p>
                      </div>
                      {card.isStudent && (
                        <span className="px-3 py-1.5 rounded-full bg-sky-600 text-white text-[11px] font-semibold shrink-0">
                          Student
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <div>
                      <h3 className="font-serif text-xl text-slate-900">
                        {p.title || p.property_type || 'Rental unit'}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {typeof p.bedrooms === 'number' && (
                          <span className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-100 text-[11px] font-semibold text-slate-600">
                            {p.bedrooms} bed
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-100 text-[11px] font-semibold text-slate-600">
                          {p.furnished ? 'Furnished' : 'Unfurnished'}
                        </span>
                        {p.property_type && (
                          <span className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-100 text-[11px] font-semibold text-slate-600">
                            {p.property_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {meta.hint && (
                      <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${TONE_CLASSES[meta.tone]}`}>
                        {meta.hint}
                      </div>
                    )}

                    {card.state === 'scheduled' && card.sessionScheduledAt && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-800 flex items-start gap-2">
                        <Clock size={14} className="mt-0.5 shrink-0" />
                        <span>
                          Viewing: {formatDateTime(card.sessionScheduledAt)}
                          {card.sessionLocation ? ` · ${card.sessionLocation}` : ''}
                        </span>
                      </div>
                    )}

                    {(card.state === 'lease_signed' || card.state === 'move_in_confirmed') && card.moveInDate && (
                      <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2 ${
                        card.moveInConfirmedAt
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50/80 border-amber-200 text-amber-900'
                      }`}>
                        <Calendar size={14} className="mt-0.5 shrink-0" />
                        <span>
                          <strong>Move-in {card.moveInConfirmedAt ? 'Confirmed' : 'Proposed'}:</strong>{' '}
                          {card.moveInDate}
                          {card.moveInTime ? ` at ${card.moveInTime}` : ''}
                          {card.moveInLocation ? ` · ${card.moveInLocation}` : ''}
                        </span>
                      </div>
                    )}

                    {card.note && (
                      <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100">
                        <Eyebrow className="!text-sky-700 mb-1.5">Agent&apos;s note</Eyebrow>
                        <p className="font-serif italic text-sm text-slate-700 leading-relaxed">
                          &ldquo;{card.note}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onPropertyClick(p)}
                        className={`h-10 px-4 rounded-full text-xs font-bold flex items-center gap-2 ${BTN_PRIMARY}`}
                      >
                        <Eye size={14} />
                        View listing
                      </button>

                      {card.state === 'shipped' ? (
                        <button
                          type="button"
                          onClick={() => setBookingMatch(card)}
                          className="h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-colors cursor-pointer"
                        >
                          <Calendar size={14} />
                          Accept &amp; book session
                        </button>
                      ) : card.state === 'scheduled' ? (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('pipeline')}
                          className="h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          Accept schedule
                          <ChevronRight size={12} />
                        </button>
                      ) : card.state === 'lease_uploaded' ? (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('pipeline')}
                          className="h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition-colors cursor-pointer"
                        >
                          <ShieldCheck size={14} />
                          Review &amp; upload signed lease
                          <ChevronRight size={12} />
                        </button>
                      ) : card.state === 'lease_signed' || card.state === 'move_in_confirmed' ? (
                        card.moveInConfirmedAt ? (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('pipeline')}
                            className="h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-colors cursor-pointer"
                          >
                            <Key size={14} />
                            Move-in confirmed
                            <ChevronRight size={12} />
                          </button>
                        ) : card.moveInDate ? (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('pipeline')}
                            className="h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-[0_8px_20px_-8px_rgba(245,158,11,0.55)] transition-colors cursor-pointer"
                          >
                            <Calendar size={14} />
                            Confirm move-in date
                            <ChevronRight size={12} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('pipeline')}
                            className="h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-colors cursor-pointer"
                          >
                            <ShieldCheck size={14} />
                            View signed lease
                            <ChevronRight size={12} />
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('pipeline')}
                          className={`h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-2 ${BTN_OUTLINE}`}
                        >
                          <ShieldCheck size={14} className="text-sky-600" />
                          Track progress
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================== ACCEPT & BOOK SESSION ================== */}
      {bookingMatch && (
        <ModalShell onClose={() => !bookingBusy && setBookingMatch(null)} maxWidth="max-w-md">
          <ModalHeader
            eyebrow="Accept match"
            title="Accept & book a session"
            subtitle={propertyLabel(bookingMatch.property)}
            onClose={() => !bookingBusy && setBookingMatch(null)}
          />

          <div className="space-y-5">
            <p className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-800 leading-relaxed">
              Accepting notifies your agent, who forwards your details to the landlord for review. Once the landlord and
              Place4U approve, your viewing is scheduled and confirmed with you.
            </p>

            <div>
              <label htmlFor="booking-date" className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Preferred date
              </label>
              <input
                id="booking-date"
                type="date"
                value={bookingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white border border-sky-100 text-slate-900 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition"
              />
            </div>

            <div>
              <label htmlFor="booking-time" className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Preferred time
              </label>
              <select
                id="booking-time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white border border-sky-100 text-slate-900 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition cursor-pointer"
              >
                <option value="09:00">09:00 AM · Morning</option>
                <option value="11:00">11:00 AM · Late morning</option>
                <option value="14:00">02:00 PM · Afternoon</option>
                <option value="16:00">04:00 PM · Late afternoon</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setBookingMatch(null)}
              disabled={bookingBusy}
              className="h-11 px-5 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConfirmBooking(bookingMatch)}
              disabled={bookingBusy}
              className={`h-11 px-6 rounded-full text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 ${BTN_PRIMARY}`}
            >
              <Check size={14} />
              {bookingBusy ? 'Accepting…' : 'Accept match'}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
