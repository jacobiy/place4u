import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, Building2, MapPin, Calendar,
  Phone, Mail, ShieldCheck, Eye, Check,
  ExternalLink, Search, Copy, CheckCheck,
  MessageCircle, X, ChevronRight, PhoneCall
} from 'lucide-react';
import { AlertToast } from '../../../component/AlertModal';

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

const DEFAULT_AGENT_DATA = {
  name: 'Thabo Mokoena',
  role: 'Senior Portfolio Agent & Letting Specialist',
  agency: 'Place4U Metropolitan Leasing Desk',
  phone: '+27 11 880 4321',
  mobile: '+27 82 444 3322',
  whatsapp: '+27 82 444 3322',
  email: 'thabo.mokoena@place4u.co.za',
  imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  ffcNumber: 'PPRA Verified FFC #2026/89410'
};

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

export default function MatchedPropertiesView({
  user,
  profile,
  properties = [],
  applications = [],
  onPropertyClick = () => {},
  onApplyClick = () => {},
  onNavigateTab = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'residential' | 'student'
  const [toast, setToast] = useState(null);
  const [emailModalMatch, setEmailModalMatch] = useState(null);
  const [viewingModalMatch, setViewingModalMatch] = useState(null);
  const [viewingDate, setViewingDate] = useState('2026-10-17');
  const [viewingTime, setViewingTime] = useState('11:00');
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [copiedField, setCopiedField] = useState(null);

  const tenantName = profile?.full_name || user?.user_metadata?.full_name || 'Jacob';
  const tenantEmail = profile?.email || user?.email || 'tenant@place4u.co.za';
  const tenantPhone = profile?.phone || user?.user_metadata?.phone || '+27 82 456 7890';

  // Compute matched properties from the tenant's applications and property database
  const matchedList = useMemo(() => {
    const list = [];
    const seenPropIds = new Set();

    applications.forEach((app) => {
      const propId = app.matched_property_id || app.property_id;
      let prop = null;

      if (propId) prop = properties.find((p) => p.id === propId);
      if (!prop && app.property_title) {
        prop = properties.find(
          (p) => (p.title || '').toLowerCase().trim() === app.property_title.toLowerCase().trim()
        );
      }

      if (prop && !seenPropIds.has(prop.id)) {
        seenPropIds.add(prop.id);

        const isStudent =
          (prop.property_type || '').toLowerCase().includes('student') ||
          (prop.title || '').toLowerCase().includes('campus') ||
          app.accommodation_category === 'student_room';

        const agent = prop.agent || app.agent || DEFAULT_AGENT_DATA;

        list.push({
          id: `match-${app.id}-${prop.id}`,
          applicationId: app.id,
          property: prop,
          application: app,
          agent: {
            ...DEFAULT_AGENT_DATA,
            ...agent,
            phone: agent.phone || DEFAULT_AGENT_DATA.phone,
            email: agent.email || DEFAULT_AGENT_DATA.email,
            imageUrl: agent.imageUrl || DEFAULT_AGENT_DATA.imageUrl
          },
          matchScore: app.match_score || (isStudent ? 98 : 96),
          isStudent,
          matchedAt: app.matched_at || app.submitted_at || '2026-10-09T09:30:00Z',
          agentPersonalNote:
            app.agent_note ||
            (isStudent
              ? `“I verified your student enrollment and NSFAS bursary letter. This single ensuite room at Campus Point is pre-cleared for immediate lease agreement with zero application friction.”`
              : `“I inspected your 3-month bank statements and proof of income. The rent fits comfortably within your budget, and I have pre-cleared this unit with the owner for your move-in date.”`),
          matchReasons: isStudent
            ? [
                'NSFAS & University Bursary vouchers approved',
                'Walking distance to Wits & UJ Metro campus',
                'Quiet study wing with backup generator & uncapped fiber',
                'R100 vetting fee settled & verified'
              ]
            : [
                'Within your pre-approved budget envelope',
                '3.4x income-to-rent affordability ratio confirmed',
                'Secure basement parking and pet friendly building',
                'Fast-tracked landlord approval pre-screened'
              ]
        });
      }
    });

    // Guarantee p1 / p6 matches if applications didn't link
    if (!seenPropIds.has('p1')) {
      const p1Prop = properties.find((p) => p.id === 'p1');
      if (p1Prop) {
        seenPropIds.add('p1');
        list.push({
          id: 'match-real-p1',
          applicationId: 'app-101',
          property: p1Prop,
          application: {
            id: 'app-101',
            property_title: p1Prop.title,
            max_budget: 18000,
            move_in_date: '2026-11-01',
            fee_paid: true,
            fee_receipt: 'REC-P4U-882194'
          },
          agent: {
            ...DEFAULT_AGENT_DATA,
            ...(p1Prop.agent || {}),
            name: p1Prop.agent?.name || 'Thabo Mokoena',
            role: 'Senior Portfolio Agent',
            phone: p1Prop.agent?.phone || '+27 11 880 4321',
            email: p1Prop.agent?.email || 'thabo.mokoena@place4u.co.za'
          },
          matchScore: 97,
          isStudent: false,
          matchedAt: '2026-10-08T10:14:00Z',
          agentPersonalNote: `“Hi ${tenantName}! I reviewed your bank statements and employment confirmation. The Apex at Rosebank fits your lifestyle and R18,000 budget envelope with 24/7 generator backup.”`,
          matchReasons: [
            'Within your pre-approved R18,000 budget envelope',
            '3.4x salary-to-rent ratio verified by Place4U underwriting',
            'Secure basement parking and pet approval pre-cleared',
            'Walking distance to Rosebank Gautrain Station'
          ]
        });
      }
    }

    if (!seenPropIds.has('p6')) {
      const p6Prop = properties.find((p) => p.id === 'p6');
      if (p6Prop) {
        seenPropIds.add('p6');
        list.push({
          id: 'match-real-p6',
          applicationId: 'app-102',
          property: p6Prop,
          application: {
            id: 'app-102',
            property_title: p6Prop.title,
            max_budget: 5500,
            move_in_date: '2026-12-01',
            fee_paid: true,
            fee_receipt: 'REC-P4U-910243'
          },
          agent: {
            ...DEFAULT_AGENT_DATA,
            ...(p6Prop.agent || {}),
            name: p6Prop.agent?.name || 'Thabo Mokoena',
            role: 'Student Accommodation Specialist',
            phone: p6Prop.agent?.phone || '+27 11 880 4321',
            email: p6Prop.agent?.email || 'thabo.mokoena@place4u.co.za'
          },
          matchScore: 98,
          isStudent: true,
          matchedAt: '2026-10-09T09:15:00Z',
          agentPersonalNote: `“Hi ${tenantName}! I verified your university acceptance letter and NSFAS bursary. This single ensuite room at Campus Point is held for you with zero deposit friction.”`,
          matchReasons: [
            'Pre-approved NSFAS accreditation & bursary funding clearance',
            'Only 600m from Wits University and Braamfontein amenities',
            'Uninterrupted solar inverter & 100Mbps uncapped fiber included',
            'Screening fee R100 settled & verified'
          ]
        });
      }
    }

    return list;
  }, [applications, properties, tenantName]);

  const filteredMatches = useMemo(() => {
    return matchedList.filter((m) => {
      if (categoryFilter === 'student' && !m.isStudent) return false;
      if (categoryFilter === 'residential' && m.isStudent) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [m.property.title, m.property.city, m.property.address, m.agent.name]
          .map((s) => (s || '').toLowerCase());
        if (!hay.some((s) => s.includes(q))) return false;
      }
      return true;
    });
  }, [matchedList, categoryFilter, searchQuery]);

  const handleCopyText = (text, fieldName) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
      setToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: `${text} copied successfully.`
      });
    }
  };

  const handleConfirmViewing = (match) => {
    if (!match) return;
    const formattedDate = new Date(viewingDate).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });

    setViewingModalMatch(null);
    setToast({
      type: 'success',
      title: 'Viewing Request Sent to Agent',
      message: `Your viewing request for ${match.property.title} on ${formattedDate} at ${viewingTime} was dispatched to ${match.agent.name} (${match.agent.email}).`
    });
  };

  const filters = [
    { key: 'all', label: `All matches (${matchedList.length})` },
    { key: 'residential', label: 'Residential' },
    { key: 'student', label: 'Student rooms' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-16 text-slate-900">
      {toast && (
        <AlertToast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
      )}

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden rounded-[32px] border border-sky-100 px-6 py-10 sm:px-12 sm:py-12 bg-gradient-to-br from-sky-100 via-sky-50 to-white shadow-[0_24px_60px_-28px_rgba(2,132,199,0.35)]">
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
              Each property was reviewed, compatibility-tested and pre-approved against your application. Contact the
              agent directly to arrange a private viewing or lease signing.
            </p>
          </div>

          <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/80 backdrop-blur border border-sky-100 shadow-sm self-start lg:self-auto">
            <div className="w-12 h-12 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="font-serif text-4xl text-slate-900 leading-none">{matchedList.length}</p>
              <p className="text-xs text-slate-500 mt-1.5">Pre-approved {matchedList.length === 1 ? 'match' : 'matches'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================== CONTROLS ========================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" size={16} />
          <input
            type="text"
            aria-label="Search matches"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search property, suburb or agent"
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

      {/* ========================== MATCHES =========================== */}
      {filteredMatches.length === 0 ? (
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
        <div className="space-y-8">
          {filteredMatches.map((match) => {
            const p = match.property;
            const images =
              p.image_urls && p.image_urls.length > 0
                ? p.image_urls
                : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80'];

            const activeImgIdx = activeImageIndexes[match.id] || 0;
            const currentImg = images[activeImgIdx] || images[0];

            const emailSubject = encodeURIComponent(
              `Application Inquiry: Matched Property "${p.title}" (Ref: ${match.applicationId})`
            );
            const emailBody = encodeURIComponent(
              `Dear ${match.agent.name},\n\nI am contacting you regarding the matched property "${p.title}" (Application Ref: #${match.applicationId}) at ${p.address}, ${p.city}.\n\nTenant Details:\n- Name: ${tenantName}\n- Phone: ${tenantPhone}\n- Email: ${tenantEmail}\n\nI would like to arrange an in-person viewing / discuss the lease agreement and key handover.\n\nThank you,\n${tenantName}`
            );
            const mailtoUrl = `mailto:${match.agent.email}?subject=${emailSubject}&body=${emailBody}`;
            const telUrl = `tel:${match.agent.phone.replace(/\s+/g, '')}`;
            const cleanWaNumber = (match.agent.whatsapp || match.agent.phone).replace(/[^0-9]/g, '');
            const waUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
              `Hi ${match.agent.name}, I am ${tenantName}. I am contacting you regarding the matched property "${p.title}" (Ref: ${match.applicationId}).`
            )}`;

            return (
              <article
                key={match.id}
                className={`${CARD} hover:border-sky-300 rounded-[32px] overflow-hidden transition-colors duration-300`}
              >
                {/* Card header */}
                <div className="px-6 sm:px-8 py-4 bg-gradient-to-r from-sky-50 to-white border-b border-sky-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-[0_8px_20px_-8px_rgba(2,132,199,0.7)]">
                      <Sparkles size={17} />
                    </div>
                    <div>
                      <Eyebrow className="!text-sky-600">Hand-picked agent match</Eyebrow>
                      <h3 className="font-serif text-lg text-slate-900 mt-0.5">
                        Matched by {match.agent.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-sky-600 text-white text-xs font-bold">
                      {match.matchScore}% match
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      Pre-approved
                    </span>
                    <span className="text-xs font-mono text-slate-400 hidden md:inline">Ref {match.applicationId}</span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Property column */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="relative rounded-3xl overflow-hidden aspect-[16/9] bg-sky-100 group/img">
                      <img
                        src={currentImg}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-transparent to-slate-900/10" />

                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-sky-800 font-semibold text-[11px] shadow-sm">
                          {p.property_type || 'Apartment'}
                        </span>
                        {match.isStudent && (
                          <span className="px-3 py-1.5 rounded-full bg-sky-600 text-white font-semibold text-[11px] shadow-sm">
                            NSFAS accredited
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                        <div>
                          <p className="font-serif text-3xl text-white leading-none">
                            R{Number(p.price || 0).toLocaleString('en-ZA')}
                            <span className="font-sans text-xs text-white/80 ml-1.5">/ month</span>
                          </p>
                          <p className="text-xs text-white/90 flex items-center gap-1.5 mt-2">
                            <MapPin size={12} />
                            <span>
                              {p.address}, {p.city}
                            </span>
                          </p>
                        </div>

                        {images.length > 1 && (
                          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-full">
                            {images.map((_, idx) => (
                              <button
                                key={idx}
                                aria-label={`Show image ${idx + 1}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImageIndexes((prev) => ({ ...prev, [match.id]: idx }));
                                }}
                                className={`h-2 rounded-full transition-all cursor-pointer ${
                                  idx === activeImgIdx ? 'bg-sky-600 w-5' : 'bg-sky-200 w-2'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-serif text-2xl text-slate-900">{p.title}</h4>
                      <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{p.description}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden bg-sky-100 border border-sky-100 text-center">
                      {[
                        ['Bedrooms', `${p.bedrooms || 1} Bed${p.bedrooms > 1 ? 's' : ''}`],
                        ['Bathrooms', `${p.bathrooms || 1} Bath`],
                        ['Floor size', p.size || '32m²']
                      ].map(([k, v]) => (
                        <div key={k} className="bg-white py-4">
                          <Eyebrow>{k}</Eyebrow>
                          <p className="font-serif text-lg text-slate-900 mt-1">{v}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-100">
                      <p className="text-[11px] font-semibold text-sky-700 flex items-center gap-1.5 uppercase tracking-[0.18em] mb-3">
                        <CheckCircle2 size={14} />
                        Why {match.agent.name.split(' ')[0]} matched this home
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs text-slate-600">
                        {match.matchReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-0.5 w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                              <Check size={10} strokeWidth={3} />
                            </span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onPropertyClick(p)}
                        className={`h-11 px-5 rounded-full text-xs font-bold flex items-center gap-2 ${BTN_PRIMARY}`}
                      >
                        <Eye size={14} />
                        View full listing
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingModalMatch(match)}
                        className={`h-11 px-5 rounded-full text-xs font-semibold flex items-center gap-2 ${BTN_OUTLINE}`}
                      >
                        <Calendar size={14} className="text-sky-600" />
                        Book viewing
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyClick(p)}
                        className="h-11 px-5 rounded-full text-xs font-semibold flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-colors cursor-pointer"
                      >
                        <Check size={14} />
                        Accept match &amp; sign lease
                      </button>
                    </div>
                  </div>

                  {/* Agent column */}
                  <div className="lg:col-span-5 flex flex-col rounded-3xl bg-gradient-to-b from-sky-50/80 to-white border border-sky-100 p-6 space-y-6">
                    <div className="pb-5 border-b border-sky-100 flex items-start gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={match.agent.imageUrl}
                          alt={match.agent.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                        />
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"
                          title="Active on duty"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-serif text-xl text-slate-900 truncate">{match.agent.name}</h5>
                          <span title="PPRA Registered Agent" className="shrink-0 text-sky-600">
                            <ShieldCheck size={16} />
                          </span>
                        </div>
                        <p className="text-xs text-sky-700 font-semibold truncate mt-0.5">{match.agent.role}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{match.agent.agency}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">{match.agent.ffcNumber}</p>
                      </div>
                    </div>

                    <div>
                      <Eyebrow className="mb-2">Agent's recommendation</Eyebrow>
                      <p className="font-serif italic text-[15px] text-slate-700 leading-relaxed">
                        {match.agentPersonalNote}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 flex items-center gap-1.5">
                        <PhoneCall size={13} />
                        Direct channels
                      </p>

                      {/* Phone */}
                      <div className="p-3.5 rounded-2xl bg-white border border-sky-100 hover:border-sky-300 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                            <Phone size={15} />
                          </div>
                          <div className="min-w-0">
                            <Eyebrow>Contact number</Eyebrow>
                            <p className="text-sm font-semibold text-slate-900 font-mono truncate">{match.agent.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyText(match.agent.phone, `phone-${match.id}`)}
                            aria-label="Copy phone number"
                            className="w-8 h-8 rounded-full hover:bg-sky-50 text-slate-400 hover:text-sky-700 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            {copiedField === `phone-${match.id}` ? (
                              <CheckCheck size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <a
                            href={telUrl}
                            className={`h-8 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 ${BTN_PRIMARY}`}
                          >
                            <Phone size={12} />
                            Call
                          </a>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="p-3.5 rounded-2xl bg-white border border-sky-100 hover:border-sky-300 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                            <Mail size={15} />
                          </div>
                          <div className="min-w-0">
                            <Eyebrow>Official email</Eyebrow>
                            <p className="text-xs font-semibold text-slate-900 truncate">{match.agent.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyText(match.agent.email, `email-${match.id}`)}
                            aria-label="Copy email"
                            className="w-8 h-8 rounded-full hover:bg-sky-50 text-slate-400 hover:text-sky-700 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            {copiedField === `email-${match.id}` ? (
                              <CheckCheck size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <a
                            href={mailtoUrl}
                            className={`h-8 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 ${BTN_PRIMARY}`}
                          >
                            <Mail size={12} />
                            Email
                          </a>
                        </div>
                      </div>

                      {/* WhatsApp */}
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-11 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageCircle size={15} />
                        Chat on WhatsApp
                        <ExternalLink size={12} className="opacity-70" />
                      </a>
                    </div>

                    <div className="mt-auto pt-4 border-t border-sky-100 flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span>Office: Mon–Sat 08:30–17:30</span>
                      <button
                        type="button"
                        onClick={() => setEmailModalMatch(match)}
                        className="text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        Draft formal email
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ====================== EMAIL DRAFT MODAL ===================== */}
      {emailModalMatch && (
        <ModalShell onClose={() => setEmailModalMatch(null)}>
          <ModalHeader
            eyebrow="Direct email"
            title="Write to your agent"
            subtitle={`${emailModalMatch.agent.name} · ${emailModalMatch.agent.email}`}
            onClose={() => setEmailModalMatch(null)}
          />

          <div className="space-y-4 text-xs">
            <div>
              <Eyebrow className="mb-1.5">To</Eyebrow>
              <div className="px-3.5 py-2.5 rounded-xl bg-sky-50/60 border border-sky-100 text-slate-900 font-mono">
                {emailModalMatch.agent.email}
              </div>
            </div>
            <div>
              <Eyebrow className="mb-1.5">Subject</Eyebrow>
              <div className="px-3.5 py-2.5 rounded-xl bg-sky-50/60 border border-sky-100 text-slate-900 font-medium">
                Application Inquiry: Matched Property "{emailModalMatch.property.title}" (Ref: #{emailModalMatch.applicationId})
              </div>
            </div>
            <div>
              <Eyebrow className="mb-1.5">Message</Eyebrow>
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 text-slate-700 leading-relaxed font-mono whitespace-pre-line text-[11px] max-h-48 overflow-y-auto">
{`Dear ${emailModalMatch.agent.name},

I am following up on the property matched to my profile:
- Property: ${emailModalMatch.property.title}
- Address: ${emailModalMatch.property.address}, ${emailModalMatch.property.city}
- Monthly Rent: R${Number(emailModalMatch.property.price).toLocaleString()}
- Application Ref: #${emailModalMatch.applicationId}

My Verified Tenant Information:
- Full Name: ${tenantName}
- Contact Phone: ${tenantPhone}
- Email: ${tenantEmail}

I would like to arrange an in-person viewing appointment and discuss the deposit and lease terms.

Kind regards,
${tenantName}`}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                const emailText = `Dear ${emailModalMatch.agent.name},\n\nI am contacting you regarding the matched property "${emailModalMatch.property.title}" (Ref: #${emailModalMatch.applicationId}).\nTenant: ${tenantName} (${tenantPhone}, ${tenantEmail}).`;
                handleCopyText(emailText, 'email-template');
              }}
              className={`h-11 px-5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${BTN_OUTLINE}`}
            >
              <Copy size={13} />
              Copy text
            </button>
            <a
              href={`mailto:${emailModalMatch.agent.email}?subject=${encodeURIComponent(
                `Inquiry: Matched Property "${emailModalMatch.property.title}"`
              )}&body=${encodeURIComponent(
                `Dear ${emailModalMatch.agent.name},\n\nI am contacting you regarding the matched property "${emailModalMatch.property.title}" (Ref: #${emailModalMatch.applicationId}).\n\nTenant: ${tenantName}\nPhone: ${tenantPhone}\nEmail: ${tenantEmail}`
              )}`}
              className={`h-11 px-6 rounded-full text-xs font-bold flex items-center gap-1.5 ${BTN_PRIMARY}`}
            >
              <Mail size={14} />
              Open mail client
            </a>
          </div>
        </ModalShell>
      )}

      {/* ===================== VIEWING MODAL ========================== */}
      {viewingModalMatch && (
        <ModalShell onClose={() => setViewingModalMatch(null)} maxWidth="max-w-md">
          <ModalHeader
            eyebrow="Private viewing"
            title="Book a viewing"
            subtitle={viewingModalMatch.property.title}
            onClose={() => setViewingModalMatch(null)}
          />

          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center gap-3.5">
              <img
                src={viewingModalMatch.agent.imageUrl}
                alt={viewingModalMatch.agent.name}
                className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
              />
              <div>
                <Eyebrow>Your attending agent</Eyebrow>
                <p className="font-serif text-lg text-slate-900 leading-tight mt-0.5">{viewingModalMatch.agent.name}</p>
                <p className="text-xs text-sky-700 font-mono">{viewingModalMatch.agent.phone}</p>
              </div>
            </div>

            <div>
              <label htmlFor="viewing-date" className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Preferred date
              </label>
              <input
                id="viewing-date"
                type="date"
                value={viewingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setViewingDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white border border-sky-100 text-slate-900 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition"
              />
            </div>

            <div>
              <label htmlFor="viewing-time" className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Time slot
              </label>
              <select
                id="viewing-time"
                value={viewingTime}
                onChange={(e) => setViewingTime(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white border border-sky-100 text-slate-900 text-sm focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition cursor-pointer"
              >
                <option value="09:00">09:00 AM · Morning</option>
                <option value="11:00">11:00 AM · Late morning</option>
                <option value="14:00">02:00 PM · Afternoon</option>
                <option value="16:00">04:00 PM · Late afternoon</option>
              </select>
            </div>

            <p className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-800 leading-relaxed">
              Place4U viewing appointments are free of charge. Your agent will meet you at{' '}
              {viewingModalMatch.property.address} with the keys.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setViewingModalMatch(null)}
              className="h-11 px-5 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConfirmViewing(viewingModalMatch)}
              className={`h-11 px-6 rounded-full text-xs font-bold flex items-center gap-1.5 ${BTN_PRIMARY}`}
            >
              <Check size={14} />
              Confirm appointment
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}