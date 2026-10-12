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
import { DEMO_ACTIVE_LEASE } from '../Data/constants';
import { AlertToast } from '../../../component/AlertModal';
import DirectContactModal from '../../../component/DirectContactModal';

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
      `${receipt.card_brand || receipt.cardBrand || 'Card'} •••• ${receipt.card_last4 || receipt.cardLast4 || '4242'}`
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
    () => applications.filter((app) => app.status !== 'expired' && app.status !== 'cancelled'),
    [applications]
  );

  const latestApplication = useMemo(() => {
    if (!applications || applications.length === 0) return null;
    return applications[0];
  }, [applications]);

  const totalVerifiedDocs = useMemo(() => {
    let count = 0;
    applications.forEach((app) => {
      if (Array.isArray(app.documents)) count += app.documents.length;
    });
    return Math.max(count, applications.length > 0 ? 2 : 0);
  }, [applications]);

  const latestPayment = useMemo(() => {
    if (payments && payments.length > 0) return payments[0];
    const paidApp = applications.find((a) => a.fee_paid && a.fee_receipt);
    if (paidApp) {
      return {
        receipt_number: paidApp.fee_receipt,
        amount: paidApp.fee_amount || 100,
        currency: paidApp.fee_currency || 'ZAR',
        payer_name: displayName,
        property_title: paidApp.property_title || 'Rental Application Screening',
        paidAt: paidApp.submitted_at || new Date().toISOString(),
        card_brand: paidApp.payment_method?.includes('PayPal') ? 'PayPal Card' : 'Card',
        card_last4: '4242',
        status: 'completed'
      };
    }
    return null;
  }, [payments, applications, displayName]);

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

  const steps = [
    { title: 'Application fee settled', note: 'Cleared via card payment. Receipt issued.', tag: 'Complete', state: 'done' },
    {
      title: 'Documents attached',
      note:
        latestApplication?.accommodation_category === 'student_room'
          ? 'University acceptance letter and bursary confirmation recorded.'
          : 'Bank statements and ID documentation on file.',
      tag:
        Array.isArray(latestApplication?.documents) && latestApplication.documents.length > 0
          ? `${latestApplication.documents.length} files`
          : 'Verified',
      state: 'done'
    },
    {
      title: 'Landlord & agent review',
      note: 'The property manager is reviewing your criteria and unit availability.',
      tag: 'In review',
      state: 'active'
    },
    { title: 'Lease & keys', note: 'Digital lease dispatch upon landlord approval.', tag: 'Upcoming', state: 'todo' }
  ];

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
      note: 'Acceptance, NSFAS & ID documents',
      onClick: go('applications')
    },
    {
      key: 'receipts',
      icon: Receipt,
      value: latestPayment ? `R ${Number(latestPayment.amount || 100).toLocaleString('en-ZA')}` : 'R 0',
      label: 'Fees settled',
      note: latestPayment ? latestPayment.receipt_number || 'REC-P4U-VERIFIED' : 'R100 card fee per application',
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
      <section className="relative overflow-hidden rounded-[32px] border border-sky-100 px-6 py-10 sm:px-12 sm:py-14 bg-gradient-to-br from-sky-100 via-sky-50 to-white shadow-[0_24px_60px_-28px_rgba(2,132,199,0.35)]">
        <div aria-hidden className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-sky-300/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 left-1/3 w-[360px] h-[360px] rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sky-200 text-[11px] font-semibold tracking-wide text-sky-700 shadow-sm">
                <ShieldCheck size={13} />
                Verified resident
              </span>
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
              onClick={go('browse')}
              className={`h-12 px-6 rounded-full font-semibold text-sm flex items-center gap-2 ${BTN_OUTLINE}`}
            >
              <Search size={15} className="text-sky-600" />
              Browse properties
            </button>
          </div>
        </div>
      </section>

      {/* ======================= AGENT MATCH ========================== */}
      <section
        onClick={go('matches')}
        className="group cursor-pointer rounded-[24px] border border-sky-200 hover:border-sky-400 bg-gradient-to-r from-sky-50 to-white px-6 py-5 transition-colors duration-300 shadow-[0_12px_40px_-22px_rgba(2,132,199,0.4)] flex flex-col sm:flex-row sm:items-center justify-between gap-5"
      >
        <div className="flex items-center gap-5 min-w-0">
          <div className="w-12 h-12 rounded-full bg-sky-600 flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_-8px_rgba(2,132,199,0.7)]">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <Eyebrow className="!text-sky-600">New agent match · Verified</Eyebrow>
            <h4 className="font-serif text-lg sm:text-xl text-slate-900 mt-1">
              Your agent has matched a property to your application
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Campus Point Residence · Single Ensuite, pre-approved by Agent Thabo Mokoena.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700">
          View match
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
        </span>
      </section>

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
                <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-sky-50 border border-sky-100 text-sky-700">
                  {latestApplication.accommodation_category === 'student_room'
                    ? 'Student accommodation'
                    : 'Residential lease'}
                </span>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-100 mb-9">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Eyebrow>Latest target property</Eyebrow>
                  <h4 className="font-serif text-xl text-slate-900 mt-1.5 truncate">
                    {latestApplication?.property_title || 'Braamfontein Student Residence Hub'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <MapPin size={13} className="text-sky-500 shrink-0" />
                    <span className="truncate">
                      {latestApplication?.preferred_areas?.join(', ') || 'Metro Campus Corridor'}
                    </span>
                  </p>
                </div>
                {latestApplication?.fee_receipt && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReceiptModal({
                        receipt_number: latestApplication.fee_receipt,
                        amount: latestApplication.fee_amount || 100,
                        payer_name: displayName,
                        property_title: latestApplication.property_title,
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
                const circle =
                  s.state === 'done'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : s.state === 'active'
                      ? 'border-sky-500 text-sky-600 bg-sky-50'
                      : 'border-sky-100 text-slate-300 bg-white';
                return (
                  <li key={s.title} className="relative flex gap-5 pb-8 last:pb-0">
                    {!isLast && (
                      <span
                        aria-hidden
                        className={`absolute left-[15px] top-9 bottom-0 w-px ${s.state === 'done' ? 'bg-sky-400' : 'bg-sky-100'}`}
                      />
                    )}
                    <div className={`relative w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${circle}`}>
                      {s.state === 'done' ? (
                        <Check size={15} strokeWidth={3} />
                      ) : s.state === 'active' ? (
                        <Clock size={14} />
                      ) : (
                        <Home size={14} />
                      )}
                      {s.state === 'active' && (
                        <span className="absolute inset-0 rounded-full border border-sky-400 animate-ping opacity-40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className={`text-sm font-semibold ${s.state === 'todo' ? 'text-slate-400' : 'text-slate-900'}`}>
                          {s.title}
                        </p>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            s.state === 'done' ? 'text-sky-600' : s.state === 'active' ? 'text-amber-500' : 'text-slate-300'
                          }`}
                        >
                          {s.tag}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${s.state === 'todo' ? 'text-slate-300' : 'text-slate-500'}`}>
                        {s.note}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="pt-6 mt-9 border-t border-sky-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Need to update your application details?</span>
            <button
              type="button"
              onClick={go('applications')}
              className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Manage applications
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Concierge */}
        <div
          className={`lg:col-span-5 ${CARD} rounded-[28px] p-7 sm:p-9 flex flex-col justify-between bg-gradient-to-b from-white to-sky-50/60`}
        >
          <div>
            <div className="flex items-start justify-between mb-8">
              <div>
                <Eyebrow className="!text-sky-600 mb-2">Your tenancy</Eyebrow>
                <h3 className="font-serif text-2xl text-slate-900">Concierge</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {DEMO_ACTIVE_LEASE.status || 'Active lease'}
              </span>
            </div>

            <div className="space-y-5 mb-7">
              <div>
                <Eyebrow>Allocated unit</Eyebrow>
                <h4 className="font-serif text-xl text-slate-900 mt-1.5">{DEMO_ACTIVE_LEASE.property_title}</h4>
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                  <MapPin size={12} className="text-sky-500" />
                  {DEMO_ACTIVE_LEASE.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-px rounded-2xl overflow-hidden bg-sky-100 border border-sky-100">
                <div className="bg-white p-4">
                  <Eyebrow>Monthly rent</Eyebrow>
                  <p className="font-serif text-2xl text-sky-700 mt-1.5">
                    R {Number(DEMO_ACTIVE_LEASE.monthly_rent || 4500).toLocaleString('en-ZA')}
                  </p>
                </div>
                <div className="bg-white p-4">
                  <Eyebrow>Next due</Eyebrow>
                  <p className="text-sm font-semibold text-slate-900 mt-2.5">
                    {DEMO_ACTIVE_LEASE.next_due_date || '01 November 2026'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 size={13} className="text-sky-500" /> Property manager
                </span>
                <span className="font-semibold text-slate-900">{DEMO_ACTIVE_LEASE.landlord_name || 'Nelson Khumalo'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setContactModal({
                    isOpen: true,
                    contact: {
                      name: DEMO_ACTIVE_LEASE.landlord?.name || 'Nelson Khumalo',
                      role: 'Property Manager',
                      email: DEMO_ACTIVE_LEASE.landlord?.email || 'nelson.khumalo@place4u.co.za',
                      phone: DEMO_ACTIVE_LEASE.landlord?.phone || '+27 82 444 3322',
                      unit: DEMO_ACTIVE_LEASE.unitNumber || 'Unit 402'
                    },
                    defaultSubject: `Tenancy Inquiry for ${DEMO_ACTIVE_LEASE.unitNumber || 'Unit 402'}`,
                    defaultMessage: `Hello Nelson, this is ${displayName} regarding my tenancy.`
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

          <p className="pt-6 mt-8 border-t border-sky-100 text-center text-xs text-slate-400">
            Emergency after-hours dispatch: <strong className="text-slate-700 font-semibold">+27 82 444 3322</strong>
          </p>
        </div>
      </section>

      {/* ========================= LISTINGS =========================== */}
      <section className="space-y-8">
        <SectionTitle
          eyebrow="Curated"
          title={showSavedOnly ? 'Your shortlisted homes' : 'Verified available properties'}
          subtitle={`${filteredProperties.length} vetted ${filteredProperties.length === 1 ? 'unit' : 'units'} across Pretoria, Johannesburg & the Western Cape`}
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
                    : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=60';

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
                          {p.address ? `${p.address}, ${p.city || ''}` : p.city || 'Johannesburg'}
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