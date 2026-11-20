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
import FeeAmount from '../../../component/FeeAmount';
import { useFeeQuote } from '../../../hooks/useFeeQuote';
import { formatZarAmount } from '../../../services/promotionService';

/* One-line explanation per pipeline stage, shown under each step title in the
   "Live progress" tracker on the tenant dashboard. */
const PIPELINE_STAGE_NOTES = {
  shipped: 'Accept the match to proceed.',
  tenant_accepted: 'Your agent is handing this to the landlord.',
  agent_forwarded: 'Forwarded to the landlord for review.',
  landlord_accepted: 'Landlord accepted. Place4U sign-off is next.',
  admin_approved: 'Approved. Your agent will book a viewing.',
  scheduled: 'Viewing booked. Confirm your attendance.',
  schedule_accepted: 'Confirmed. The landlord is preparing your lease.',
  lease_uploaded: 'Lease ready. Review and upload your signed copy.',
  lease_signed: 'Lease signed. Tenancy active.',
  move_in_confirmed: 'Move-in and key handover confirmed.',
  redistribution: 'You declined after the viewing. Your agent is finding alternatives.'
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
        : 'Match closed. Your agent will line up alternatives.',
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
const BTN_PRIMARY =
  'bg-sky-700 hover:bg-sky-800 text-white transition-colors duration-200 cursor-pointer';
const BTN_OUTLINE =
  'border border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300 text-slate-700 transition-colors duration-200 cursor-pointer';

const Eyebrow = ({ children, className = '' }) => (
  <p className={`text-xs font-semibold tracking-wide text-slate-500 ${className}`}>{children}</p>
);

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <div>
    {eyebrow && <Eyebrow className="!text-sky-600 mb-2">{eyebrow}</Eyebrow>}
    <h2 className="font-sans text-xl sm:text-2xl font-semibold leading-tight tracking-tight text-slate-900">{title}</h2>
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
        receipt.card_last4 || receipt.cardLast4
          ? ` ending ${receipt.card_last4 || receipt.cardLast4}`
          : ''
      }`
    ],
    ['Date', formattedDate]
  ];

  if (receipt.promotion_code || receipt.is_free) {
    rows.push(['Promotion', receipt.promotion_code || 'Application fee waiver']);
  }

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
          <div className="text-center py-6 border-y border-slate-200">
            <Eyebrow>Application vetting fee</Eyebrow>
            <div className="mt-2 flex justify-center">
              <FeeAmount
                amount={receipt.amount ?? 100}
                quote={{
                  originalAmount: receipt.original_amount ?? 100,
                  finalAmount: receipt.amount ?? 100,
                  discountAmount: Math.max(
                    (receipt.original_amount ?? 100) - (receipt.amount ?? 100),
                    0
                  ),
                  promotionApplied:
                    Boolean(receipt.is_free) ||
                    Number(receipt.amount ?? 100) < Number(receipt.original_amount ?? 100),
                  isFree: Boolean(receipt.is_free) || Number(receipt.amount) === 0,
                  lineItems: []
                }}
                size="xl"
                className="justify-center"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 mt-4 text-emerald-700 text-[11px] font-semibold">
              <CheckCircle2 size={12} />
              {receipt.is_free || Number(receipt.amount) === 0 ? 'Fee waived' : 'Paid & settled'}
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
            Confirms the non-refundable tenant screening and background vetting fee (Rental Housing Act).
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
  const { quote: feeQuote } = useFeeQuote();
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
        amount: paidApp.fee_amount ?? 100,
        original_amount: paidApp.fee_original_amount ?? 100,
        is_free: Boolean(paidApp.fee_is_free),
        promotion_code: paidApp.promotion_code || null,
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

  const feeSettled = Boolean(
    latestApplication?.fee_paid ||
    latestApplication?.fee_receipt ||
    latestApplication?.fee_is_free ||
    latestPayment
  );
  const feeWaived = Boolean(latestApplication?.fee_is_free || feeQuote?.isFree);

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

  const MILESTONES = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'review', label: 'Vetting & Review' },
    { key: 'viewing', label: 'Match & Viewing' },
    { key: 'lease', label: 'Lease & Handover' }
  ];

  const currentMilestoneIndex = useMemo(() => {
    if (!latestApplication) return -1;
    if (pipelineMatch) {
      const s = pipelineMatch.state || '';
      if (['lease_uploaded', 'lease_signed', 'move_in_confirmed'].includes(s)) return 3;
      if (['shipped', 'tenant_accepted', 'agent_forwarded', 'landlord_accepted', 'admin_approved', 'scheduled', 'schedule_accepted'].includes(s)) return 2;
      return 1;
    }
    const status = normalizeApplicationStatus(latestApplication.status);
    if (status === 'completed') return 3;
    if (status === 'matches_found') return 2;
    if (status === 'under_review' || reviewStarted || feeSettled) return 1;
    return 0;
  }, [latestApplication, pipelineMatch, reviewStarted, feeSettled]);

  return (
    <div className="max-w-[1320px] mx-auto space-y-8 sm:space-y-10 pb-16 text-slate-900">
      <AlertToast toast={toast} onClose={() => setToast(null)} />

      {activeReceiptModal && (
        <ReceiptVoucherModal receipt={activeReceiptModal} onClose={() => setActiveReceiptModal(null)} />
      )}

      {/* ============================ HERO ============================ */}
      <section className="px-0 py-2 sm:py-3">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-wide text-slate-500 mb-3">{todayLabel}</p>

            <h1 className="font-sans text-3xl sm:text-4xl lg:text-[44px] font-semibold leading-tight tracking-tight text-slate-900">
              {timeGreeting}, <span className="text-sky-700">{firstName}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenCustomApplication}
              className={`group h-11 px-5 rounded-lg font-semibold text-sm flex items-center gap-2.5 ${BTN_PRIMARY}`}
            >
              <FileText size={16} />
              Submit application
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <button
              type="button"
              onClick={scrollToListings}
              className={`h-11 px-5 rounded-lg font-medium text-sm flex items-center gap-2 ${BTN_OUTLINE}`}
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
          className="group cursor-pointer border-l-[3px] border-sky-700 bg-white/70 px-5 py-4 transition-colors duration-200 hover:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        >
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
              <Home size={19} />
            </div>
            <div className="min-w-0">
              <Eyebrow className="!text-sky-600">
                {matchBanner.shipped ? 'New agent match' : 'Agent match'}
              </Eyebrow>
              <h4 className="font-sans text-base sm:text-lg font-semibold text-slate-900 mt-1">
                {matchBanner.shipped ? 'Your agent matched a property' : matchBanner.stateLabel}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate">{matchBanner.propertyLabel}</span>
                {matchBanner.location && <span className="text-slate-400">{matchBanner.location}</span>}
                {matchBanner.agentName && <span className="text-slate-400">Agent {matchBanner.agentName}</span>}
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700">
            View match
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </section>
      )}

      {/* ======================= QUICK STATUS PILLS ========================== */}
      <section className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={go('applications')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-xs"
        >
          <FileText size={14} className="text-sky-600" />
          <span><strong>{activeApplications.length}</strong> Active {activeApplications.length === 1 ? 'application' : 'applications'}</span>
        </button>

        <button
          type="button"
          onClick={go('applications')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-xs"
        >
          <ShieldCheck size={14} className="text-emerald-600" />
          <span><strong>{totalVerifiedDocs}</strong> Documents on file</span>
        </button>

        <button
          type="button"
          onClick={openLatestReceipt}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-xs"
        >
          <Receipt size={14} className="text-slate-400" />
          <span>Fee:{' '}
            <strong className={feeWaived || feeQuote?.isFree ? 'text-emerald-700 font-bold' : 'text-slate-900'}>
              {feeWaived || feeQuote?.isFree ? 'FREE (Waived)' : latestPayment ? `R ${Number(latestPayment.amount).toLocaleString('en-ZA')}` : 'R100'}
            </strong>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowSavedOnly(!showSavedOnly)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs ${
            showSavedOnly
              ? 'bg-sky-100 text-sky-800 border border-sky-300 font-semibold'
              : 'bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-slate-700'
          }`}
        >
          <Heart size={14} className={savedPropertyIds.length > 0 ? 'text-rose-500 fill-rose-500' : 'text-slate-400'} />
          <span><strong>{savedPropertyIds.length}</strong> Saved</span>
          {showSavedOnly && <span className="text-[10px] bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded-md font-bold">Active Filter</span>}
        </button>
      </section>

      {/* ================= ACTIVE APPLICATION ACTION HUB ================= */}
      {latestApplication ? (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700">
                  Application Status
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 border border-sky-100 text-sky-800">
                  {latestApplication.accommodation_category === 'student_room'
                    ? 'Student Accommodation'
                    : 'Residential Lease'}
                </span>
                {pipelineMatch && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      isDeclined(pipelineMatch.state)
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    {stateLabel(pipelineMatch.state)}
                  </span>
                )}
              </div>
              <h3 className="font-sans text-lg sm:text-xl font-semibold text-slate-900 mt-1">
                {latestTarget.label || (latestApplication ? 'General Application' : 'Rental Application')}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin size={13} className="text-sky-500 shrink-0" />
                <span>{latestTarget.location || 'Preferred areas not specified'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              {latestApplication?.fee_receipt && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveReceiptModal({
                      receipt_number: latestApplication.fee_receipt,
                      amount: latestApplication.fee_amount ?? 100,
                      original_amount: latestApplication.fee_original_amount ?? 100,
                      is_free: Boolean(latestApplication.fee_is_free),
                      promotion_code: latestApplication.promotion_code || null,
                      payer_name: displayName,
                      property_title: latestTarget.label || 'Rental Application Screening',
                      paidAt: latestApplication.submitted_at
                    })
                  }
                  className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Receipt size={13} className="text-slate-500" />
                  <span>Receipt</span>
                </button>
              )}
              {latestTarget.property && onPropertyClick && (
                <button
                  type="button"
                  onClick={() => onPropertyClick(latestTarget.property)}
                  className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Building2 size={13} className="text-sky-600" />
                  <span>View unit</span>
                </button>
              )}
              <button
                type="button"
                onClick={pipelineMatch ? go('pipeline') : go('applications')}
                className={`h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${BTN_PRIMARY}`}
              >
                <span>{pipelineMatch ? 'Track pipeline' : 'Manage application'}</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          {/* Horizontal 4-Milestone Progress Track */}
          <div className="pt-5">
            <div className="grid grid-cols-4 gap-2 relative">
              {MILESTONES.map((m, idx) => {
                const isDone = currentMilestoneIndex > idx;
                const isCurrent = currentMilestoneIndex === idx;
                return (
                  <div key={m.key} className="flex flex-col">
                    <div className="flex items-center mb-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-sky-600 text-white'
                            : isCurrent
                              ? 'bg-sky-50 text-sky-700 border-2 border-sky-600 ring-2 ring-sky-100'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
                      </div>
                      {idx < 3 && (
                        <div
                          className={`flex-1 h-1 mx-2 rounded-full ${
                            isDone ? 'bg-sky-600' : 'bg-slate-100'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs font-medium leading-tight ${
                        isCurrent
                          ? 'text-sky-900 font-semibold'
                          : isDone
                            ? 'text-slate-700'
                            : 'text-slate-400'
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current Stage Note Callout */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <Clock size={13} className="text-sky-600 shrink-0" />
                <span className="truncate">
                  {pipelineMatch
                    ? PIPELINE_STAGE_NOTES[pipelineMatch.state] || 'Match processing in pipeline.'
                    : reviewStarted
                      ? 'The property manager is reviewing your criteria and unit availability.'
                      : feeSettled
                        ? 'Application fee settled. Background vetting in progress.'
                        : 'Awaiting vetting fee settlement to begin application processing.'}
                </span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 hidden sm:inline">
                Live Status
              </span>
            </div>
          </div>
        </section>
      ) : (
        /* Empty State Prompt: Clean single-strip banner instead of big empty boxes */
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/40 via-white to-sky-50/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Home size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Find your ideal home</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse reviewed listings below and submit one verified application covering all your target homes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCustomApplication}
            className={`h-10 px-5 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer ${BTN_PRIMARY}`}
          >
            <FileText size={14} />
            <span>Start application</span>
            <ArrowUpRight size={14} />
          </button>
        </section>
      )}

      {/* ===================== ACTIVE TENANCY (ONLY WHEN LEASE EXISTS) ===================== */}
      {activeLease && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Eyebrow className="!text-sky-600 mb-1">Your tenancy</Eyebrow>
              <h3 className="font-sans text-xl font-semibold text-slate-900">{activeLease.property_title}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin size={12} className="text-sky-500" />
                {activeLease.address || 'Address on file'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {activeLease.status || 'Active Tenancy'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-y border-slate-100 my-4">
            <div>
              <Eyebrow>Monthly rent</Eyebrow>
              <p className="text-lg font-semibold text-slate-900 mt-1 tabular-nums">
                {activeLease.monthly_rent != null
                  ? `R ${Number(activeLease.monthly_rent).toLocaleString('en-ZA')}`
                  : '—'}
              </p>
            </div>
            <div>
              <Eyebrow>Next due</Eyebrow>
              <p className="text-sm font-semibold text-slate-900 mt-1.5">
                {activeLease.next_due_date || '—'}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Eyebrow>Property manager</Eyebrow>
              <p className="text-sm font-semibold text-slate-900 mt-1.5">
                {activeLease.landlord_name || 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              className={`h-9 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${BTN_PRIMARY}`}
            >
              <Phone size={13} />
              <span>Contact desk</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMaintenanceModal(true)}
              className={`h-9 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${BTN_OUTLINE}`}
            >
              <Wrench size={13} className="text-sky-600" />
              <span>Log repair</span>
            </button>
          </div>
        </section>
      )}

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
          <div className="py-14 px-3 border-y border-slate-200 text-center space-y-4">
            <Home size={36} className="mx-auto text-sky-300" />
            <h3 className="font-sans text-xl font-semibold text-slate-900">No properties match your criteria</h3>
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
          <div className="border-y border-slate-200">
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
                  className="group flex flex-col sm:flex-row gap-4 sm:gap-6 py-5 border-b border-slate-200 last:border-b-0 cursor-pointer transition-colors duration-150 hover:bg-white/70"
                >
                  <div className="relative h-48 sm:h-36 sm:w-56 shrink-0 overflow-hidden rounded-lg">
                    <img
                      src={imgUrl}
                      alt={p.title || 'Property'}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />

                    <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-sky-800 shadow-sm">
                      {isStudent ? <GraduationCap size={13} /> : <Home size={13} />}
                      {isStudent ? 'Student room' : p.property_type || 'Apartment'}
                    </span>

                    <button
                      type="button"
                      aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                      onClick={(e) => handleToggleSave(p, e)}
                      className={`absolute top-2 right-2 w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isSaved ? 'bg-sky-600 text-white' : 'bg-white/90 text-slate-600 hover:text-sky-600'
                      }`}
                    >
                      <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>

                  </div>

                  <div className="py-1 flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h4 className="font-sans text-lg font-semibold text-slate-900 group-hover:text-sky-800 transition-colors truncate">
                          {p.title || p.name || 'Rental Residence'}
                        </h4>
                        <p className="text-base font-semibold text-slate-900 tabular-nums">
                          R {Number(p.price || 0).toLocaleString('en-ZA')} <span className="text-xs font-normal text-slate-500">/ month</span>
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-sky-500 shrink-0" />
                        <span className="truncate">
                          {[p.address, p.city].filter(Boolean).join(', ') || 'Location not specified'}
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center gap-5 py-3 my-3 border-y border-slate-200 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Bed size={14} className="text-sky-500" />
                          {p.bedrooms || 1} bed
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Bath size={14} className="text-sky-500" />
                          {p.bathrooms || 1} bath
                        </span>
                        {p.size && <span className="text-slate-400">{p.size}</span>}
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <FeeAmount
                            quote={feeQuote}
                            amount={feeQuote?.originalAmount ?? 100}
                            size="xs"
                            tone="muted"
                          />
                          vetting
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-sky-700 group-hover:text-sky-800 flex items-center gap-1 transition-colors">
                        View details
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onApplyClick) onApplyClick(p);
                        }}
                        className={`h-9 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${BTN_PRIMARY}`}
                      >
                        Apply
                        <ArrowUpRight size={13} />
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
