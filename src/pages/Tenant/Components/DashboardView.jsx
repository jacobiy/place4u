import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Home,
  Heart,
  Search,
  MapPin,
  Bed,
  Bath,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Wrench,
  X,
  ChevronDown,
  Check,
  Phone,
  GraduationCap,
  Printer,
  Receipt,
  Lock,
  Building2
} from 'lucide-react';
import { AlertToast } from '../../../component/AlertModal';
import DirectContactModal from '../../../component/DirectContactModal';
import { isActiveApplication, normalizeApplicationStatus, APPLICATION_STATUS } from '../../../services/applicationStatus';
import {
  resolveApplicationProperty,
  describeProperty,
  describePropertyLocation,
  isGenericPropertyTitle
} from '../../../utils/propertyLabel';
import { PIPELINE_STAGES, stateLabel, stageIndex, isDeclined } from '../../../services/matchWorkflowService';

/* One-line explanation per pipeline stage, shown under each step title in the
   "Live progress" tracker on the tenant dashboard. */
const PIPELINE_STAGE_NOTES = {
  shipped: 'Your agent has shipped a property shortlist — accept the match to proceed.',
  tenant_accepted: 'You accepted the match; your agent will hand it to the landlord.',
  agent_forwarded: 'Your profile and application have been forwarded to the landlord.',
  landlord_accepted: 'The landlord accepted your application; Place4U sign-off is next.',
  admin_approved: 'Place4U approved the meetup — your agent will schedule a viewing.',
  scheduled: 'A viewing / meetup is booked. Confirm your attendance to keep it moving.',
  schedule_accepted: 'Meetup confirmed — the landlord is preparing your lease agreement.',
  lease_uploaded: 'Your lease is ready. Review it and upload your signed copy.',
  lease_signed: 'Your signed lease is executed and the tenancy is active.',
  move_in_confirmed: 'Move-in and key handover are confirmed.'
};

/* Map of timestamp column → pipeline stage, used to reconstruct how far a match
   got when it ended in an off-ramp (declined states are not in STAGE_ORDER). */
const PIPELINE_TIMESTAMP_STAGES = [
  ['shippedAt', 'shipped'],
  ['tenantAcceptedAt', 'tenant_accepted'],
  ['agentForwardedAt', 'agent_forwarded'],
  ['landlordAcceptedAt', 'landlord_accepted'],
  ['adminApprovedAt', 'admin_approved'],
  ['sessionScheduledAt', 'scheduled'],
  ['tenantScheduleAcceptedAt', 'schedule_accepted'],
  ['leaseUploadedAt', 'lease_uploaded'],
  ['leaseSignedAt', 'lease_signed'],
  ['moveInConfirmedAt', 'move_in_confirmed']
];

/** How far along the pipeline a match has reached (-1 = not shipped yet). */
function pipelineProgressIndex(match) {
  if (!match) return -1;
  const direct = stageIndex(match.state);
  if (direct >= 0) return direct;
  return PIPELINE_TIMESTAMP_STAGES.reduce(
    (best, [field, key]) => (match[field] ? Math.max(best, stageIndex(key)) : best),
    -1
  );
}

/** Turn a pipeline match into the step objects the tracker renders. */
function buildPipelineSteps(match) {
  if (!match) return null;
  const declined = isDeclined(match.state);
  const current = pipelineProgressIndex(match);

  const steps = PIPELINE_STAGES.map((stage, i) => {
    const done = declined ? i <= current : current > i;
    const isCurrent = !declined && current === i;
    return {
      title: stage.label,
      note: PIPELINE_STAGE_NOTES[stage.key] || '',
      tag: done ? 'Complete' : isCurrent ? stateLabel(match.state) : 'Upcoming',
      state: done ? 'done' : isCurrent ? 'active' : 'todo'
    };
  });

  if (declined) {
    steps.push({
      title: stateLabel(match.state),
      note: match.declineReason
        ? `Reason: ${match.declineReason}`
        : 'This match was closed. Your agent will line up alternatives.',
      tag: 'Closed',
      state: 'declined'
    });
  }

  return steps;
}

/* ------------------------------------------------------------------ */
/*  Palette: white surfaces, light-blue washes, one confident blue.    */
/*  Primary  sky-600 / blue-600   Soft  sky-50 / sky-100               */
/*  Ink      slate-900            Muted slate-500                      */
/* ------------------------------------------------------------------ */
const CARD = 'bg-white border border-sky-100 shadow-[0_12px_40px_-18px_rgba(2,132,199,0.22)]';
const BTN_PRIMARY =
  'bg-sky-600 hover:bg-sky-700 text-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.55)] transition-colors duration-200 cursor-pointer';
const BTN_OUTLINE =
  'border border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300 text-slate-700 transition-colors duration-200 cursor-pointer';

const Eyebrow = ({ children, className = '' }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 ${className}`}>{children}</p>
);

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <div>
    {eyebrow && <Eyebrow className="!text-sky-600 mb-2">{eyebrow}</Eyebrow>}
    <h2 className="font-serif text-2xl sm:text-[32px] leading-tight tracking-tight text-slate-900">{title}</h2>
    {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Filter dropdown                                                    */
/* ------------------------------------------------------------------ */
const FilterDropdown = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => e.key === 'Escape' && setOpen(false);
    if (open) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const isActive = open || value !== options[0].value;

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-2 h-10 pl-3.5 pr-3 rounded-full text-xs font-medium border transition-colors duration-200 cursor-pointer ${
          isActive
            ? 'border-sky-400 bg-sky-50 text-sky-800'
            : 'border-sky-100 bg-white text-slate-600 hover:border-sky-300 hover:text-slate-900'
        }`}
      >
        {label && <span className="text-slate-400">{label}</span>}
        <span>{selectedOption?.label || value}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-180 text-sky-600' : 'text-slate-400'}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-2 min-w-[190px] bg-white border border-sky-100 rounded-2xl p-1.5 shadow-[0_24px_50px_-12px_rgba(2,132,199,0.3)] z-50"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                  isSelected ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-slate-600 hover:bg-sky-50/60 hover:text-slate-900'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Receipt modal                                                      */
/* ------------------------------------------------------------------ */
const ReceiptVoucherModal = ({ receipt, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!receipt) return null;

  const rawDate = receipt.paidAt || receipt.created_at || receipt.timestamp;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  const rows = [
    ['Applicant', receipt.payer_name || receipt.applicantName || 'Resident Tenant'],
    ['Property', receipt.property_title || receipt.propertyTitle || 'Place4U Rental Unit'],
    [
      'Payment method',
      `${receipt.card_brand || receipt.cardBrand || 'Card'}${
        receipt.card_last4 || receipt.cardLast4 ? ` •••• ${receipt.card_last4 || receipt.cardLast4}` : ''
      }`
    ],
    ['Date', formattedDate]
  ];

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[140] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-[28px] w-full max-w-md shadow-[0_40px_100px_-20px_rgba(2,132,199,0.45)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="h-1.5 bg-gradient-to-r from-sky-300 via-sky-500 to-blue-600" />

        <div className="px-7 pt-6 pb-5 flex items-start justify-between">
          <div>
            <span className="font-serif text-2xl text-slate-900 tracking-tight">
              Place<span className="text-sky-600">4U</span>
            </span>
            <Eyebrow className="mt-1.5">Official payment receipt</Eyebrow>
          </div>
          <button
            onClick={onClose}
            aria-label="Close receipt"
            className="w-9 h-9 rounded-full border border-sky-100 hover:bg-sky-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-7 pb-6 space-y-6 overflow-y-auto">
          <div className="text-center py-6 rounded-2xl bg-gradient-to-b from-sky-50 to-white border border-sky-100">
            <Eyebrow>Application vetting fee</Eyebrow>
            <div className="font-serif text-5xl text-slate-900 mt-2 tracking-tight">
              <span className="text-2xl text-slate-400 mr-1">R</span>
              {Number(receipt.amount || 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </div>
            <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
              <CheckCircle2 size={12} />
              Paid &amp; settled
            </div>
          </div>

          <dl className="text-xs">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-3 border-b border-sky-100">
                <dt className="text-slate-400">{k}</dt>
                <dd className="font-medium text-slate-900 text-right truncate max-w-[230px]">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-6 py-3 border-b border-sky-100">
              <dt className="text-slate-400">Receipt no.</dt>
              <dd className="font-mono text-slate-700">
                {receipt.receipt_number || receipt.receiptNumber || 'REC-P4U-VERIFIED'}
              </dd>
            </div>
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-slate-400">Status</dt>
              <dd className="font-semibold text-emerald-600">Completed</dd>
            </div>
          </dl>

          <p className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
            <Lock size={12} className="mt-0.5 shrink-0" />
            This electronic voucher confirms payment of the non-refundable tenant screening and background vetting fee
            in accordance with the Rental Housing Act.
          </p>
        </div>

        <div className="px-7 py-4 border-t border-sky-100 bg-sky-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className={`px-5 h-10 rounded-full text-xs font-bold flex items-center gap-2 ${BTN_PRIMARY}`}
          >
            <Printer size={14} />
            Print receipt
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
/* ------------------------------------------------------------------ */
export default function DashboardView({
  profile,
  user,
  properties = [],
  applications = [],
  payments = [],
  savedPropertyIds = [],
  pipelineMatches = [],
  onToggleSaveProperty,
  onPropertyClick,
  onApplyClick,
  onOpenCustomApplication,
  onNavigateTab
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedBedrooms, setSelectedBedrooms] = useState('All');
  const [selectedPriceTier, setSelectedPriceTier] = useState('All');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState(false);
  const [maintenanceIssue, setMaintenanceIssue] = useState('');
  const [maintenancePriority, setMaintenancePriority] = useState('Normal');
  const [toast, setToast] = useState(null);
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);
  const [contactModal, setContactModal] = useState({
    isOpen: false,
    contact: null,
    defaultSubject: '',
    defaultMessage: ''
  });

  /* Browse + dashboard are now a single view: the "Browse properties" action
     simply scrolls down to the verified listings section below. */
  const listingsRef = useRef(null);
  const scrollToListings = () => {
    const el = listingsRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Resident Tenant');
  const firstName = displayName.split(' ')[0];

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const title = (p.title || p.name || `${p.bedrooms || 1} Bed ${p.property_type || 'Home'}`).toLowerCase();
      const city = (p.city || p.location || '').toLowerCase();
      const address = (p.address || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesQuery = !query || title.includes(query) || city.includes(query) || address.includes(query);

      const matchesType =
        selectedType === 'All' ||
        (p.property_type || '').toLowerCase() === selectedType.toLowerCase() ||
        (selectedType === 'Student Room' && (title.includes('student') || title.includes('campus')));

      const beds = Number(p.bedrooms || 1);
      const matchesBeds =
        selectedBedrooms === 'All' || (selectedBedrooms === '3+' ? beds >= 3 : beds === Number(selectedBedrooms));

      const price = Number(p.price || 0);
      let matchesPrice = true;
      if (selectedPriceTier === 'under10k') matchesPrice = price > 0 && price < 10000;
      else if (selectedPriceTier === '10k-15k') matchesPrice = price >= 10000 && price <= 15000;
      else if (selectedPriceTier === 'above15k') matchesPrice = price > 15000;

      const matchesSaved = !showSavedOnly || savedPropertyIds.includes(p.id);

      return matchesQuery && matchesType && matchesBeds && matchesPrice && matchesSaved;
    });
  }, [properties, searchQuery, selectedType, selectedBedrooms, selectedPriceTier, showSavedOnly, savedPropertyIds]);

  const activeApplications = useMemo(
    () => applications.filter(isActiveApplication),
    [applications]
  );

  /* Distinct locations among the properties currently shown, so the listings
     heading reflects where the homes actually are rather than a fixed string. */
  const listingLocations = useMemo(() => {
    const seen = new Set();
    filteredProperties.forEach((p) => {
      const place = (p.city || p.location || '').trim();
      if (place) seen.add(place);
    });
    return Array.from(seen);
  }, [filteredProperties]);

  const locationLabel = useMemo(() => {
    if (listingLocations.length === 0) return 'South Africa';
    if (listingLocations.length === 1) return listingLocations[0];
    return `${listingLocations.slice(0, -1).join(', ')} & ${listingLocations[listingLocations.length - 1]}`;
  }, [listingLocations]);

  const latestApplication = useMemo(() => {
    if (!applications || applications.length === 0) return null;
    return applications[0];
  }, [applications]);

  /* Which property the latest application is actually for. Resolved from the
     property_id link, then the stored title snapshot. A general application
     has no linked unit, so we say that rather than inventing a property name. */
  const latestTarget = useMemo(() => {
    if (!latestApplication) {
      return { kind: 'none', property: null, label: null, location: null };
    }
    const resolution = resolveApplicationProperty(latestApplication, properties);
    const label =
      resolution.label ||
      (!isGenericPropertyTitle(latestApplication.property_title)
        ? latestApplication.property_title
        : null);
    const location =
      describePropertyLocation(resolution.property) ||
      latestApplication.preferred_areas?.join(', ') ||
      null;

    const kind = resolution.property
      ? 'property'
      : resolution.isLinked || label
        ? 'linked-unresolved'
        : 'general';

    return { kind, property: resolution.property, label, location };
  }, [latestApplication, properties]);

  /* Active tenancy derived from a real matched application + property. There is
     no demo lease any more: when nothing is matched, the concierge renders an
     empty state. */
  const activeLease = useMemo(() => {
    const app = applications.find((a) => a.matched_property_id);
    if (!app) return null;
    const property =
      properties.find((p) => String(p.id) === String(app.matched_property_id)) || null;
    return {
      status: 'Active lease',
      property_title:
        describeProperty(property) ||
        (!isGenericPropertyTitle(app.property_title) ? app.property_title : null) ||
        'Matched property',
      address:
        describePropertyLocation(property) ||
        [property?.address, property?.city || property?.location].filter(Boolean).join(', ') ||
        '',
      monthly_rent: property?.price ?? app.max_budget ?? null,
      next_due_date: null,
      landlord_name: property?.landlord?.full_name || property?.agent?.name || null,
      landlord_email: property?.landlord?.email || property?.agent?.email || null,
      landlord_phone: property?.landlord?.phone || property?.agent?.phone || null
    };
  }, [applications, properties]);

  /* The acceptance-pipeline match that belongs to the tenant's latest
     application. Falls back to their most recently updated match so the tracker
     still shows real progress when the latest application isn't the matched one. */
  const pipelineMatch = useMemo(() => {
    if (!Array.isArray(pipelineMatches) || pipelineMatches.length === 0) return null;
    const appIds = new Set(
      [latestApplication?.id, latestApplication?.application_id, latestApplication?.matched_application_id]
        .filter(Boolean)
        .map(String)
    );
    const forLatest = appIds.size
      ? pipelineMatches.find((m) => appIds.has(String(m.applicationId)))
      : null;
    return forLatest || pipelineMatches[0] || null;
  }, [pipelineMatches, latestApplication]);

  /* The match surfaced in the top banner: a freshly shipped match awaiting the
     tenant's decision, otherwise the most recently updated one. Null when the
     tenant has nothing in the pipeline, so the banner is hidden entirely. */
  const newestMatch = useMemo(() => {
    if (!Array.isArray(pipelineMatches) || pipelineMatches.length === 0) return null;
    return pipelineMatches.find((m) => m.state === 'shipped') || pipelineMatches[0];
  }, [pipelineMatches]);

  const matchBanner = useMemo(() => {
    if (!newestMatch) return null;
    const property = newestMatch.property || null;
    const snapshotTitle =
      newestMatch.application && !isGenericPropertyTitle(newestMatch.application.property_title)
        ? newestMatch.application.property_title
        : null;
    return {
      shipped: newestMatch.state === 'shipped',
      stateLabel: stateLabel(newestMatch.state),
      propertyLabel: describeProperty(property) || snapshotTitle || 'Matched property',
      location: describePropertyLocation(property),
      agentName: newestMatch.agent?.full_name || null
    };
  }, [newestMatch]);

  const totalVerifiedDocs = useMemo(() => {
    let count = 0;
    applications.forEach((app) => {
      if (Array.isArray(app.documents)) count += app.documents.length;
    });
    return count;
  }, [applications]);

  /* Whether the tenant has any student-accommodation application — drives which
     document checklist the "Documents in vault" KPI advertises. */
  const hasStudentApplication = useMemo(
    () =>
      applications.some(
        (a) => a.accommodation_category === 'student_room' || a.category === 'student_room'
      ),
    [applications]
  );

  const latestPayment = useMemo(() => {
    if (payments && payments.length > 0) return payments[0];
    const paidApp = applications.find((a) => a.fee_paid && a.fee_receipt);
    if (paidApp) {
      const paidProperty = properties.find((p) => String(p.id) === String(paidApp.property_id));
      return {
        receipt_number: paidApp.fee_receipt,
        amount: paidApp.fee_amount || 100,
        currency: paidApp.fee_currency || 'ZAR',
        payer_name: displayName,
        property_title:
          describeProperty(paidProperty) ||
          (!isGenericPropertyTitle(paidApp.property_title) ? paidApp.property_title : null) ||
          'Rental Application Screening',
        paidAt: paidApp.submitted_at || new Date().toISOString(),
        card_brand: paidApp.payment_method?.includes('PayPal') ? 'PayPal Card' : 'Card',
        card_last4: null,
        status: 'completed'
      };
    }
    return null;
  }, [payments, applications, properties, displayName]);

  const hasActiveFilters =
    searchQuery || selectedType !== 'All' || selectedBedrooms !== 'All' || selectedPriceTier !== 'All' || showSavedOnly;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('All');
    setSelectedBedrooms('All');
    setSelectedPriceTier('All');
    setShowSavedOnly(false);
  };

  const handleToggleSave = (p, e) => {
    if (e) e.stopPropagation();
    const wasSaved = savedPropertyIds.includes(p.id);
    if (onToggleSaveProperty) onToggleSaveProperty(p.id);
    setToast({
      type: 'success',
      title: wasSaved ? 'Removed from Wishlist' : 'Saved to Wishlist',
      message: wasSaved
        ? `Removed "${p.title || p.name || 'Property'}" from your shortlist.`
        : `Saved "${p.title || p.name || 'Property'}" to your wishlist.`
    });
  };

  const handleMaintenanceSubmit = (e) => {
    e.preventDefault();
    if (!maintenanceIssue.trim()) return;
    setMaintenanceSuccess(true);
    setToast({
      type: 'success',
      title: 'Maintenance Ticket Logged',
      message: 'Your ticket has been dispatched with high priority to your property desk.'
    });
    setTimeout(() => {
      setMaintenanceSuccess(false);
      setShowMaintenanceModal(false);
      setMaintenanceIssue('');
    }, 1800);
  };

  const go = (tab) => () => (onNavigateTab ? onNavigateTab(tab) : null);

  const openLatestReceipt = () => {
    if (latestPayment) {
      setActiveReceiptModal(latestPayment);
    } else {
      setToast({
        type: 'info',
        title: 'No Payments Yet',
        message: 'Application fee receipts will appear here once settled via card.'
      });
    }
  };

  const feeSettled = Boolean(latestApplication?.fee_paid || latestApplication?.fee_receipt || latestPayment);

  /* Real document/state facts for the fallback tracker. Nothing is assumed:
     "Documents attached" only reads as complete when files actually exist. */
  const appDocs = Array.isArray(latestApplication?.documents) ? latestApplication.documents : [];
  const docsAttached = appDocs.length > 0;
  const isStudentApp = latestApplication?.accommodation_category === 'student_room';
  const appStatus = normalizeApplicationStatus(latestApplication?.status);
  const reviewStarted =
    appStatus === APPLICATION_STATUS.UNDER_REVIEW ||
    appStatus === APPLICATION_STATUS.MATCHES_FOUND ||
    appStatus === APPLICATION_STATUS.COMPLETED;

  const lifecycleSteps = [
    {
      title: 'Application fee settled',
      note: feeSettled
        ? 'Cleared via card payment. Receipt issued.'
        : 'Awaiting your R100 vetting fee to begin processing.',
      tag: feeSettled ? 'Complete' : 'Action needed',
      state: feeSettled ? 'done' : 'active'
    },
    {
      title: 'Documents attached',
      note: docsAttached
        ? isStudentApp
          ? 'University acceptance letter and bursary confirmation recorded.'
          : 'Bank statements and ID documentation on file.'
        : isStudentApp
          ? 'Upload your university acceptance letter, bursary/NSFAS proof and ID.'
          : 'Upload 3 months bank statements, your ID and latest payslip.',
      tag: docsAttached ? `${appDocs.length} file${appDocs.length === 1 ? '' : 's'}` : 'Pending',
      state: docsAttached ? 'done' : feeSettled ? 'active' : 'todo'
    },
    {
      title: 'Landlord & agent review',
      note: 'The property manager is reviewing your criteria and unit availability.',
      tag: reviewStarted ? 'In review' : 'Upcoming',
      state: reviewStarted ? 'active' : 'todo'
    },
    { title: 'Lease & keys', note: 'Digital lease dispatch upon landlord approval.', tag: 'Upcoming', state: 'todo' }
  ];

  /* Once a match enters the acceptance pipeline, the tracker mirrors that real
     pipeline (shipped → … → move-in confirmed). Until then it falls back to the
     generic application lifecycle above. */
  const steps = buildPipelineSteps(pipelineMatch) || lifecycleSteps;

  const kpis = [
    {
      key: 'apps',
      icon: FileText,
      value: activeApplications.length,
      label: 'Active applications',
      note: activeApplications.length > 0 ? `${activeApplications.length} in progress with landlords` : 'Ready to submit',
      onClick: go('applications')
    },
    {
      key: 'docs',
      icon: ShieldCheck,
      value: totalVerifiedDocs,
      label: 'Documents in vault',
      note:
        totalVerifiedDocs > 0
          ? hasStudentApplication
            ? 'Acceptance, NSFAS & ID documents'
            : 'Bank statements, ID & payslips'
          : 'No documents uploaded yet',
      onClick: go('applications')
    },
    {
      key: 'receipts',
      icon: Receipt,
      value: latestPayment ? `R ${Number(latestPayment.amount || 100).toLocaleString('en-ZA')}` : 'R 0',
      label: 'Fees settled',
      note: latestPayment ? latestPayment.receipt_number || 'Fee settled' : 'R100 card fee per application',
      onClick: openLatestReceipt,
      mono: true
    },
    {
      key: 'saved',
      icon: Heart,
      value: savedPropertyIds.length,
      label: 'Saved properties',
      note: showSavedOnly ? 'Filter on · click to show all' : 'Click to filter your wishlist',
      onClick: () => setShowSavedOnly(!showSavedOnly),
      active: showSavedOnly
    }
  ];

  return (
    <div className="max-w-[1360px] mx-auto space-y-10 sm:space-y-14 pb-20 text-slate-900">
      <AlertToast toast={toast} onClose={() => setToast(null)} />

      {activeReceiptModal && (
        <ReceiptVoucherModal receipt={activeReceiptModal} onClose={() => setActiveReceiptModal(null)} />
      )}

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden rounded-[32px] border border-sky-100 px-6 py-10 sm:px-12 sm:py-14 bg-white/80 backdrop-blur-md shadow-[0_24px_60px_-28px_rgba(2,132,199,0.35)]">
        <div aria-hidden className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-sky-300/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 left-1/3 w-[360px] h-[360px] rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              {profile?.is_verified ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold tracking-wide text-emerald-700 shadow-sm">
                  <ShieldCheck size={13} />
                  Verified resident
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sky-200 text-[11px] font-semibold tracking-wide text-sky-700 shadow-sm">
                  <ShieldCheck size={13} />
                  Verification pending
                </span>
              )}
              <span className="text-[11px] text-slate-500 tracking-wide hidden sm:inline">{todayLabel}</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[64px] leading-[1.05] tracking-tight text-slate-900">
              {timeGreeting},
              <br />
              <span className="italic text-sky-600">{firstName}</span>
            </h1>

            <p className="mt-6 text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg">
              Track applications and verified documents, keep your receipts at hand, manage your tenancy, and discover
              vetted homes across South Africa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenCustomApplication}
              className={`group h-12 px-6 rounded-full font-bold text-sm flex items-center gap-2.5 ${BTN_PRIMARY}`}
            >
              <Sparkles size={16} />
              Submit application
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <button
              type="button"
              onClick={scrollToListings}
              className={`h-12 px-6 rounded-full font-semibold text-sm flex items-center gap-2 ${BTN_OUTLINE}`}
            >
              <Search size={15} className="text-sky-600" />
              Browse properties
            </button>
          </div>
        </div>
      </section>

      {/* ======================= AGENT MATCH ========================== */}
      {matchBanner && (
        <section
          onClick={go('matches')}
          className="group cursor-pointer rounded-[24px] border border-sky-200 hover:border-sky-400 bg-gradient-to-r from-sky-50 to-white px-6 py-5 transition-colors duration-300 shadow-[0_12px_40px_-22px_rgba(2,132,199,0.4)] flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        >
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-12 h-12 rounded-full bg-sky-600 flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_-8px_rgba(2,132,199,0.7)]">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <Eyebrow className="!text-sky-600">
                {matchBanner.shipped ? 'New agent match · Verified' : `Agent match · ${matchBanner.stateLabel}`}
              </Eyebrow>
              <h4 className="font-serif text-lg sm:text-xl text-slate-900 mt-1">
                {matchBanner.shipped
                  ? 'Your agent has matched a property to your application'
                  : `Match progress: ${matchBanner.stateLabel}`}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                {[matchBanner.propertyLabel, matchBanner.location, matchBanner.agentName ? `handled by ${matchBanner.agentName}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700">
            View match
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </section>
      )}

      {/* =========================== KPIs ============================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ key, icon: Icon, value, label, note, onClick, active, mono }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={`group text-left p-6 rounded-[24px] border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[190px] hover:-translate-y-0.5 ${
              active
                ? 'border-sky-500 bg-sky-50 shadow-[0_16px_40px_-18px_rgba(2,132,199,0.5)]'
                : `${CARD} hover:border-sky-300`
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <Icon size={18} fill={key === 'saved' && savedPropertyIds.length > 0 ? '#0284c7' : 'none'} />
              </div>
              <ArrowUpRight
                size={16}
                className="text-slate-300 group-hover:text-sky-600 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </div>
            <div className="mt-8">
              <div className="font-serif text-4xl text-slate-900 tracking-tight leading-none">{value}</div>
              <div className="text-sm font-medium text-slate-700 mt-3">{label}</div>
              <div className={`text-xs text-slate-400 mt-1 truncate ${mono ? 'font-mono' : ''}`}>{note}</div>
            </div>
          </button>
        ))}
      </section>

      {/* ================= STEPPER + CONCIERGE ======================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Stepper */}
        <div className={`lg:col-span-7 ${CARD} rounded-[28px] p-7 sm:p-9 flex flex-col justify-between`}>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
              <div>
                <Eyebrow className="!text-sky-600 mb-2">Live progress</Eyebrow>
                <h3 className="font-serif text-2xl text-slate-900">Application status</h3>
              </div>
              {latestApplication && (
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-sky-50 border border-sky-100 text-sky-700">
                    {latestApplication.accommodation_category === 'student_room'
                      ? 'Student accommodation'
                      : 'Residential lease'}
                  </span>
                  {pipelineMatch && (
                    <span
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
                        isDeclined(pipelineMatch.state)
                          ? 'bg-rose-50 border-rose-200 text-rose-600'
                          : 'bg-white border-sky-200 text-sky-700'
                      }`}
                    >
                      {stateLabel(pipelineMatch.state)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {!latestApplication ? (
              <div className="py-10 px-6 rounded-2xl bg-sky-50/60 border border-dashed border-sky-200 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-white border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
                  <FileText size={24} />
                </div>
                <h4 className="font-serif text-xl text-slate-900">No application yet</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  Start an application and this tracker will follow it from the vetting fee through to your signed
                  lease.
                </p>
                <button
                  type="button"
                  onClick={onOpenCustomApplication}
                  className={`mt-5 h-11 px-6 rounded-full text-sm font-bold flex items-center gap-2 ${BTN_PRIMARY}`}
                >
                  <Sparkles size={15} />
                  Submit application
                </button>
              </div>
            ) : (
              <>
            <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-100 mb-9">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Eyebrow>{latestTarget.kind === 'general' ? 'Application scope' : 'Latest target property'}</Eyebrow>
                  <h4 className="font-serif text-xl text-slate-900 mt-1.5 truncate">
                    {latestTarget.label ||
                      (latestTarget.kind === 'linked-unresolved'
                        ? 'Linked listing'
                        : latestApplication
                          ? 'General application'
                          : 'No application yet')}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <MapPin size={13} className="text-sky-500 shrink-0" />
                    <span className="truncate">
                      {latestTarget.location || 'Preferred areas not specified'}
                    </span>
                  </p>
                  {latestTarget.kind === 'general' && latestTarget.location && (
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      No specific unit chosen — your agent will shortlist matching listings from these areas.
                    </p>
                  )}
                  {latestTarget.kind === 'linked-unresolved' && (
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      This listing is no longer in your feed, but it is still attached to your application.
                    </p>
                  )}
                  {latestTarget.property && onPropertyClick && (
                    <button
                      type="button"
                      onClick={() => onPropertyClick(latestTarget.property)}
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-4 cursor-pointer"
                    >
                      <Building2 size={12} />
                      View property
                    </button>
                  )}
                </div>
                {latestApplication?.fee_receipt && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReceiptModal({
                        receipt_number: latestApplication.fee_receipt,
                        amount: latestApplication.fee_amount || 100,
                        payer_name: displayName,
                        property_title: latestTarget.label || 'Rental Application Screening',
                        paidAt: latestApplication.submitted_at
                      })
                    }
                    className="shrink-0 h-9 px-4 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Receipt size={13} />
                    Receipt
                  </button>
                )}
              </div>
            </div>

            <ol className="relative">
              {steps.map((s, i) => {
                const isLast = i === steps.length - 1;
                const declined = s.state === 'declined';
                const circle =
                  s.state === 'done'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : s.state === 'active'
                      ? 'border-sky-500 text-sky-600 bg-sky-50'
                      : declined
                        ? 'border-rose-200 text-rose-600 bg-rose-50'
                        : 'border-sky-100 text-slate-300 bg-white';
                return (
                  <li key={s.title} className="relative flex gap-5 pb-8 last:pb-0">
                    {!isLast && (
                      <span
                        aria-hidden
                        className={`absolute left-[15px] top-9 bottom-0 w-px ${
                          s.state === 'done' ? 'bg-sky-400' : declined ? 'bg-rose-200' : 'bg-sky-100'
                        }`}
                      />
                    )}
                    <div className={`relative w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${circle}`}>
                      {s.state === 'done' ? (
                        <Check size={15} strokeWidth={3} />
                      ) : s.state === 'active' ? (
                        <Clock size={14} />
                      ) : declined ? (
                        <X size={14} />
                      ) : (
                        <Home size={14} />
                      )}
                      {s.state === 'active' && (
                        <span className="absolute inset-0 rounded-full border border-sky-400 animate-ping opacity-40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={`text-sm font-semibold ${
                            s.state === 'todo' ? 'text-slate-400' : declined ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {s.title}
                        </p>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            s.state === 'done'
                              ? 'text-sky-600'
                              : s.state === 'active'
                                ? 'text-amber-500'
                                : declined
                                  ? 'text-rose-500'
                                  : 'text-slate-300'
                          }`}
                        >
                          {s.tag}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          s.state === 'todo' ? 'text-slate-300' : declined ? 'text-rose-500' : 'text-slate-500'
                        }`}
                      >
                        {s.note}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
              </>
            )}
          </div>

          <div className="pt-6 mt-9 border-t border-sky-100 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {pipelineMatch
                ? 'Follow every hand-off through to your signed lease.'
                : latestApplication
                  ? 'Need to update your application details?'
                  : 'Ready to get started?'}
            </span>
            <button
              type="button"
              onClick={pipelineMatch ? go('pipeline') : latestApplication ? go('applications') : onOpenCustomApplication}
              className="shrink-0 text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {pipelineMatch ? 'Track match pipeline' : latestApplication ? 'Manage applications' : 'Submit application'}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Concierge */}
        <div
          className={`lg:col-span-5 ${CARD} rounded-[28px] p-7 sm:p-9 flex flex-col justify-between bg-gradient-to-b from-white to-sky-50/60`}
        >
          {activeLease ? (
            <>
              <div>
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <Eyebrow className="!text-sky-600 mb-2">Your tenancy</Eyebrow>
                    <h3 className="font-serif text-2xl text-slate-900">Concierge</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {activeLease.status}
                  </span>
                </div>

                <div className="space-y-5 mb-7">
                  <div>
                    <Eyebrow>Allocated unit</Eyebrow>
                    <h4 className="font-serif text-xl text-slate-900 mt-1.5">{activeLease.property_title}</h4>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                      <MapPin size={12} className="text-sky-500" />
                      {activeLease.address || 'Address on file'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-px rounded-2xl overflow-hidden bg-sky-100 border border-sky-100">
                    <div className="bg-white p-4">
                      <Eyebrow>Monthly rent</Eyebrow>
                      <p className="font-serif text-2xl text-sky-700 mt-1.5">
                        {activeLease.monthly_rent != null
                          ? `R ${Number(activeLease.monthly_rent).toLocaleString('en-ZA')}`
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-white p-4">
                      <Eyebrow>Next due</Eyebrow>
                      <p className="text-sm font-semibold text-slate-900 mt-2.5">
                        {activeLease.next_due_date || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building2 size={13} className="text-sky-500" /> Property manager
                    </span>
                    <span className="font-semibold text-slate-900">{activeLease.landlord_name || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setContactModal({
                        isOpen: true,
                        contact: {
                          name: activeLease.landlord_name || 'Property Manager',
                          role: 'Property Manager',
                          email: activeLease.landlord_email || 'support@place4u.xyz',
                          phone: activeLease.landlord_phone || '',
                          unit: activeLease.property_title || 'Your unit'
                        },
                        defaultSubject: `Tenancy Inquiry for ${activeLease.property_title || 'my unit'}`,
                        defaultMessage: `Hello ${(activeLease.landlord_name || 'there').split(' ')[0]}, this is ${displayName} regarding my tenancy.`
                      })
                    }
                    className={`h-11 rounded-full text-xs font-bold flex items-center justify-center gap-2 ${BTN_PRIMARY}`}
                  >
                    <Phone size={14} />
                    Contact desk
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMaintenanceModal(true)}
                    className={`h-11 rounded-full text-xs font-semibold flex items-center justify-center gap-2 ${BTN_OUTLINE}`}
                  >
                    <Wrench size={14} className="text-sky-600" />
                    Log repair
                  </button>
                </div>
              </div>

              {activeLease.landlord_phone && (
                <p className="pt-6 mt-8 border-t border-sky-100 text-center text-xs text-slate-400">
                  Property manager: <strong className="text-slate-700 font-semibold">{activeLease.landlord_phone}</strong>
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center py-8">
              <Eyebrow className="!text-sky-600 mb-2">Your tenancy</Eyebrow>
              <h3 className="font-serif text-2xl text-slate-900">Concierge</h3>
              <p className="text-sm text-slate-500 mt-3 max-w-xs leading-relaxed">
                You don't have an active tenancy yet. Once a landlord approves your application and a lease is issued, your unit details, rent schedule, and property manager will appear here.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
                <button
                  type="button"
                  onClick={go('applications')}
                  className={`h-11 px-6 rounded-full text-xs font-bold flex items-center justify-center gap-2 ${BTN_PRIMARY}`}
                >
                  View applications
                </button>
                <button
                  type="button"
                  onClick={scrollToListings}
                  className={`h-11 px-6 rounded-full text-xs font-semibold flex items-center justify-center gap-2 ${BTN_OUTLINE}`}
                >
                  Browse properties
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================= LISTINGS =========================== */}
      <section id="verified-listings" ref={listingsRef} className="space-y-8 scroll-mt-24">
        <SectionTitle
          eyebrow="Curated"
          title={showSavedOnly ? 'Your shortlisted homes' : 'Verified available properties'}
          subtitle={`${filteredProperties.length} vetted ${filteredProperties.length === 1 ? 'unit' : 'units'} across ${locationLabel}`}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1 sm:flex-none sm:w-[280px]">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" />
            <input
              type="text"
              aria-label="Search by suburb or city"
              placeholder="Search suburb or city"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-full bg-white border border-sky-100 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <FilterDropdown
            label="Type"
            value={selectedType}
            options={[
              { value: 'All', label: 'All' },
              { value: 'Student Room', label: 'Student rooms' },
              { value: 'Apartment', label: 'Apartments' },
              { value: 'House', label: 'Houses' },
              { value: 'Studio', label: 'Studios' }
            ]}
            onChange={setSelectedType}
          />

          <FilterDropdown
            label="Beds"
            value={selectedBedrooms}
            options={[
              { value: 'All', label: 'Any' },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3+', label: '3+' }
            ]}
            onChange={setSelectedBedrooms}
          />

          <FilterDropdown
            label="Budget"
            value={selectedPriceTier}
            options={[
              { value: 'All', label: 'Any' },
              { value: 'under10k', label: 'Under R10,000' },
              { value: '10k-15k', label: 'R10k – R15k' },
              { value: 'above15k', label: 'Above R15,000' }
            ]}
            onChange={setSelectedPriceTier}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 px-4 rounded-full text-xs font-semibold text-sky-700 hover:text-sky-900 underline-offset-4 hover:underline transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {filteredProperties.length === 0 ? (
          <div className="py-20 px-6 rounded-[28px] border border-dashed border-sky-200 bg-sky-50/50 text-center space-y-4">
            <Home size={36} className="mx-auto text-sky-300" />
            <h3 className="font-serif text-2xl text-slate-900">No properties match your criteria</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Try clearing a filter or broadening your search to see more accommodation.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className={`h-10 px-6 rounded-full text-xs font-bold ${BTN_PRIMARY}`}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((p) => {
              const isSaved = savedPropertyIds.includes(p.id);
              const isStudent =
                (p.title || p.property_type || '').toLowerCase().includes('student') ||
                (p.title || '').toLowerCase().includes('campus');
              const imgUrl =
                p.image_urls && p.image_urls.length > 0
                  ? p.image_urls[0]
                  : p.images && p.images.length > 0
                    ? p.images[0]
                    : '/property-placeholder.svg';

              return (
                <article
                  key={p.id}
                  onClick={() => (onPropertyClick ? onPropertyClick(p) : null)}
                  className={`group ${CARD} hover:border-sky-300 rounded-[28px] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-24px_rgba(2,132,199,0.4)] flex flex-col cursor-pointer`}
                >
                  <div className="relative h-60 overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={p.title || 'Property'}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-slate-900/10" />

                    <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-sky-800 shadow-sm">
                      {isStudent ? <GraduationCap size={13} /> : <Home size={13} />}
                      {isStudent ? 'Student room' : p.property_type || 'Apartment'}
                    </span>

                    <button
                      type="button"
                      aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                      onClick={(e) => handleToggleSave(p, e)}
                      className={`absolute top-4 right-4 w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer shadow-sm ${
                        isSaved ? 'bg-sky-600 text-white' : 'bg-white/90 text-slate-600 hover:text-sky-600'
                      }`}
                    >
                      <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>

                    <div className="absolute bottom-4 left-5 right-5">
                      <div className="font-serif text-3xl text-white leading-none">
                        R {Number(p.price || 0).toLocaleString('en-ZA')}
                        <span className="font-sans text-xs text-white/80 ml-1.5">/ month</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-xl text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                        {p.title || p.name || 'Rental Residence'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-sky-500 shrink-0" />
                        <span className="truncate">
                          {[p.address, p.city].filter(Boolean).join(', ') || 'Location not specified'}
                        </span>
                      </p>

                      <div className="flex items-center gap-5 py-4 my-4 border-y border-sky-100 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Bed size={14} className="text-sky-500" />
                          {p.bedrooms || 1} bed
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Bath size={14} className="text-sky-500" />
                          {p.bathrooms || 1} bath
                        </span>
                        {p.size && <span className="text-slate-400">{p.size}</span>}
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400">R100 vetting</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onPropertyClick) onPropertyClick(p);
                        }}
                        className={`h-11 rounded-full text-xs font-semibold ${BTN_OUTLINE}`}
                      >
                        View details
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onApplyClick) onApplyClick(p);
                        }}
                        className={`h-11 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 ${BTN_PRIMARY}`}
                      >
                        Apply
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================== MAINTENANCE MODAL ====================== */}
      {showMaintenanceModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[130] p-4"
          onClick={() => setShowMaintenanceModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-[28px] max-w-lg w-full shadow-[0_40px_100px_-20px_rgba(2,132,199,0.45)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 bg-gradient-to-r from-sky-300 via-sky-500 to-blue-600" />
            <div className="p-7 sm:p-8">
              <div className="flex items-start justify-between pb-6 mb-6 border-b border-sky-100">
                <div>
                  <Eyebrow className="!text-sky-600 mb-2">Maintenance</Eyebrow>
                  <h3 className="font-serif text-2xl text-slate-900">Log a repair</h3>
                  <p className="text-xs text-slate-500 mt-1">We'll dispatch it to your property desk.</p>
                </div>
                <button
                  onClick={() => setShowMaintenanceModal(false)}
                  aria-label="Close"
                  className="w-9 h-9 rounded-full border border-sky-100 hover:bg-sky-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {maintenanceSuccess ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 mx-auto">
                    <Check size={28} />
                  </div>
                  <h4 className="font-serif text-2xl text-slate-900">Ticket created</h4>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Your property manager has received your maintenance request.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleMaintenanceSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2.5">
                      Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Normal', 'High', 'Emergency'].map((prio) => (
                        <button
                          key={prio}
                          type="button"
                          onClick={() => setMaintenancePriority(prio)}
                          className={`h-10 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                            maintenancePriority === prio
                              ? prio === 'Emergency'
                                ? 'bg-rose-50 border-rose-400 text-rose-600'
                                : 'bg-sky-50 border-sky-500 text-sky-700'
                              : 'border-sky-100 text-slate-500 hover:border-sky-300 hover:text-slate-900'
                          }`}
                        >
                          {prio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="repair-description"
                      className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2.5"
                    >
                      Description
                    </label>
                    <textarea
                      id="repair-description"
                      rows={4}
                      required
                      placeholder="Describe the issue, e.g. geyser pressure, leaking tap, electrical trip…"
                      value={maintenanceIssue}
                      onChange={(e) => setMaintenanceIssue(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-white border border-sky-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMaintenanceModal(false)}
                      className="h-11 px-5 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit" className={`h-11 px-6 rounded-full text-xs font-bold ${BTN_PRIMARY}`}>
                      Submit ticket
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <DirectContactModal
        isOpen={contactModal.isOpen}
        onClose={() => setContactModal({ isOpen: false, contact: null, defaultSubject: '', defaultMessage: '' })}
        contact={contactModal.contact || {}}
        defaultSubject={contactModal.defaultSubject}
        defaultMessage={contactModal.defaultMessage}
      />
    </div>
  );
}