import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Bell,
  Globe,
  Sun,
  Eye,
  ShieldCheck,
  Download,
  Trash2,
  KeyRound,
  Mail,
  Smartphone,
  MessageCircle,
  BellRing,
  Home,
  Tag,
  Megaphone,
  UserX,
  CheckCircle2,
  Loader2,
  X,
  Clock,
  Languages,
  AlertTriangle,
  Sliders
} from 'lucide-react';
import { TenantQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import { AlertToast, ConfirmModal } from '../../component/AlertModal';

/* ------------------------------------------------------------------ */
/*  Palette: matches the tenant dashboard — white surfaces, sky-blue   */
/*  accents, DM Serif headings.                                        */
/* ------------------------------------------------------------------ */
const CARD = 'bg-white border border-sky-100 shadow-[0_12px_40px_-18px_rgba(2,132,199,0.22)]';
const BTN_PRIMARY =
  'bg-sky-600 hover:bg-sky-700 text-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.55)] transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
const BTN_OUTLINE =
  'border border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300 text-slate-700 transition-colors duration-200 cursor-pointer';

const Eyebrow = ({ children, className = '' }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 ${className}`}>{children}</p>
);

const DEFAULT_SETTINGS = {
  notify_email: true,
  notify_sms: false,
  notify_whatsapp: true,
  notify_push: false,
  notify_rent_reminders: true,
  notify_application_updates: true,
  notify_property_alerts: false,
  notify_marketing: false,
  contact_preference: 'email',
  language: 'en',
  currency: 'ZAR',
  timezone: 'Africa/Johannesburg',
  quiet_hours_start: '',
  quiet_hours_end: '',
  theme: 'system',
  profile_visibility: 'landlords_only',
  show_phone: false,
  show_email: false,
  two_factor_enabled: false,
  login_alerts: true,
  data_processing_consent: true,
  account_status: 'active'
};

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */
const Toggle = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
      checked ? 'bg-sky-600' : 'bg-slate-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const Segmented = ({ value, options, onChange }) => (
  <div className="flex p-1 rounded-full bg-sky-50 border border-sky-100">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
          value === o.value
            ? 'bg-white text-sky-700 shadow-sm border border-sky-100'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Select = ({ value, options, onChange }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    className="h-10 pl-3.5 pr-9 rounded-full bg-white border border-sky-100 text-xs text-slate-900 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition appearance-none cursor-pointer"
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

const SettingRow = ({ icon: Icon, label, hint, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
    <div className="flex items-start gap-3 min-w-0 flex-1">
      {Icon && <Icon size={16} className="text-sky-500 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {hint && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const SettingsCard = ({ icon: Icon, eyebrow, title, description, children, footer }) => (
  <section className={`${CARD} rounded-[28px] overflow-hidden`}>
    <header className="flex items-start gap-3.5 px-6 sm:px-8 py-5 border-b border-sky-100">
      <span className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="!text-sky-600 mb-1">{eyebrow}</Eyebrow>}
        <h2 className="font-serif text-xl text-slate-900 leading-tight">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>}
      </div>
    </header>

    <div className="px-6 sm:px-8 divide-y divide-sky-100">{children}</div>

    {footer && <div className="px-6 sm:px-8 py-4 border-t border-sky-100 bg-sky-50/40">{footer}</div>}
  </section>
);

const SkyModal = ({ isOpen, onClose, title, eyebrow, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-[28px] w-full ${maxWidth} shadow-[0_40px_100px_-20px_rgba(2,132,199,0.45)] overflow-hidden max-h-[92vh] flex flex-col`}
      >
        <div className="h-1.5 bg-gradient-to-r from-sky-300 via-sky-500 to-blue-600" />
        <div className="px-7 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-sky-100">
          <div>
            {eyebrow && <Eyebrow className="!text-sky-600 mb-1.5">{eyebrow}</Eyebrow>}
            <h3 className="font-serif text-2xl text-slate-900 tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full border border-sky-100 hover:bg-sky-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-7 py-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const Settings = ({ profile }) => {
  const { user } = useAuth();
  const userId = user?.id || profile?.user_id || profile?.id;
  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Resident Tenant');
  const email = profile?.email || user?.email || '';

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [canPersist, setCanPersist] = useState(true);
  const [toast, setToast] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ next: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const [showErasure, setShowErasure] = useState(false);
  const [erasureConfirm, setErasureConfirm] = useState('');
  const [submittingErasure, setSubmittingErasure] = useState(false);

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [togglingAccount, setTogglingAccount] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await TenantQueries.getTenantSettings(userId);
    if (res?.success && res.data) {
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
      setCanPersist(true);
    } else {
      setCanPersist(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  /* Optimistic write; falls back to a local-only toggle if the table is absent. */
  const persist = async (patch, okTitle, okMessage) => {
    setSettings((prev) => ({ ...prev, ...patch }));

    if (!userId || !canPersist) {
      return;
    }

    const res = await TenantQueries.updateTenantSettings(userId, patch);

    if (res?.success) {
      if (res.data) setSettings((prev) => ({ ...prev, ...res.data }));
      if (okTitle) setToast({ type: 'success', title: okTitle, message: okMessage });
    } else {
      setToast({ type: 'warning', title: 'Could not save', message: res?.error || 'Please try again in a moment.' });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.next.length < 6) {
      setToast({ type: 'danger', title: 'Password too short', message: 'Use at least 6 characters.' });
      return;
    }
    if (passwordData.next !== passwordData.confirm) {
      setToast({ type: 'danger', title: 'Passwords do not match', message: 'Please re-enter the same password.' });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.next });
      if (error) throw error;
      setShowPassword(false);
      setPasswordData({ next: '', confirm: '' });
      setToast({ type: 'success', title: 'Password updated', message: 'Your new password is now active.' });
      if (userId && canPersist) {
        const res = await TenantQueries.updateTenantSettings(userId, { last_password_change: new Date().toISOString() });
        if (res?.data) setSettings((prev) => ({ ...prev, last_password_change: res.data.last_password_change }));
      }
    } catch (err) {
      setToast({ type: 'danger', title: 'Could not update password', message: err.message || 'Please try again.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExportData = () => {
    setExporting(true);
    try {
      const payload = {
        exportDate: new Date().toISOString(),
        governingLaw: 'Protection of Personal Information Act, No. 4 of 2013 (POPIA)',
        dataSubjectId: userId || 'current-user',
        fullName: displayName,
        email,
        profile: profile || {},
        settings,
        disclaimer: 'Official Data Subject Access Request (DSAR) export provided under POPIA Section 23.'
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Place4U_POPIA_Data_Export_${userId || 'tenant'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({ type: 'success', title: 'Export ready', message: 'Your data export has been downloaded.' });
    } catch {
      setToast({ type: 'danger', title: 'Export failed', message: 'We could not generate your data export.' });
    } finally {
      setExporting(false);
    }
  };

  const handleErasureRequest = async () => {
    if (erasureConfirm.trim().toLowerCase() !== 'delete') return;
    setSubmittingErasure(true);
    try {
      if (userId) await TenantQueries.requestDataErasure(userId);
      setShowErasure(false);
      setErasureConfirm('');
      setToast({
        type: 'success',
        title: 'Erasure request registered',
        message: 'Our Information Officer has been notified per POPIA Section 24.'
      });
    } finally {
      setSubmittingErasure(false);
    }
  };

  const handleDeactivate = async () => {
    setTogglingAccount(true);
    try {
      const nextStatus = settings.account_status === 'deactivated' ? 'active' : 'deactivated';
      await persist(
        {
          account_status: nextStatus,
          deactivated_at: nextStatus === 'deactivated' ? new Date().toISOString() : null
        },
        nextStatus === 'deactivated' ? 'Account deactivated' : 'Account reactivated',
        nextStatus === 'deactivated'
          ? 'Your listings and applications are hidden until you return.'
          : 'Welcome back — your account is active again.'
      );
      setShowDeactivate(false);
    } finally {
      setTogglingAccount(false);
    }
  };

  const isDeactivated = settings.account_status === 'deactivated';

  return (
    <div className="max-w-[1100px] mx-auto pb-20 text-slate-900 space-y-8 sm:space-y-10">
      <AlertToast toast={toast} onClose={() => setToast(null)} />

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden rounded-[32px] border border-sky-100 px-6 py-9 sm:px-10 sm:py-11 bg-white/80 backdrop-blur-md shadow-[0_24px_60px_-28px_rgba(2,132,199,0.35)]">
        <div aria-hidden className="absolute -top-32 -right-24 w-[400px] h-[400px] rounded-full bg-sky-300/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 left-1/4 w-[320px] h-[320px] rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sky-200 text-[11px] font-semibold tracking-wide text-sky-700 shadow-sm">
                <Sliders size={13} />
                Account settings
              </span>
              {isDeactivated && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-700">
                  <AlertTriangle size={12} />
                  Deactivated
                </span>
              )}
              {!canPersist && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-500">
                  Local only
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[44px] leading-tight tracking-tight text-slate-900">
              Settings
            </h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-xl">
              Manage notifications, security, privacy and your POPIA data rights — all in one place for{' '}
              <span className="font-medium text-slate-900">{displayName}</span>.
            </p>
          </div>

          <div className="w-full lg:w-[300px] shrink-0">
            <div className="p-5 rounded-[24px] bg-sky-50/70 border border-sky-100">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-white border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                  <Mail size={18} />
                </span>
                <div className="min-w-0">
                  <Eyebrow>Signed in as</Eyebrow>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{email || 'Not available'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================== SECURITY ========================== */}
      <SettingsCard
        icon={Lock}
        eyebrow="Protection"
        title="Security"
        description="Keep your account locked down."
      >
        <SettingRow icon={KeyRound} label="Password" hint="Update your password regularly for better security.">
          <button type="button" onClick={() => setShowPassword(true)} className={`h-10 px-5 rounded-full text-xs font-bold ${BTN_PRIMARY}`}>
            Change password
          </button>
        </SettingRow>

        <SettingRow icon={ShieldCheck} label="Two-factor authentication" hint="Require a second step when signing in.">
          <Toggle
            checked={settings.two_factor_enabled}
            onChange={(v) =>
              persist({ two_factor_enabled: v }, v ? '2FA enabled' : '2FA disabled', v ? 'You will be asked for a code at sign-in.' : 'Two-factor authentication is now off.')
            }
          />
        </SettingRow>

        <SettingRow icon={BellRing} label="Login alerts" hint="Email me whenever a new device signs in.">
          <Toggle checked={settings.login_alerts} onChange={(v) => persist({ login_alerts: v })} />
        </SettingRow>

        <SettingRow icon={Clock} label="Last password change" hint="When your password was last updated.">
          <span className="text-xs font-medium text-slate-600">
            {settings.last_password_change ? new Date(settings.last_password_change).toLocaleDateString('en-ZA') : 'Not recorded'}
          </span>
        </SettingRow>
      </SettingsCard>

      {/* ======================== NOTIFICATIONS ======================= */}
      <SettingsCard
        icon={Bell}
        eyebrow="Stay in the loop"
        title="Notifications"
        description="Choose how and when Place4U reaches you."
      >
        <SettingRow icon={Mail} label="Email notifications" hint="Application updates, receipts and reminders.">
          <Toggle checked={settings.notify_email} onChange={(v) => persist({ notify_email: v })} />
        </SettingRow>
        <SettingRow icon={Smartphone} label="SMS notifications" hint="Text messages for time-sensitive alerts.">
          <Toggle checked={settings.notify_sms} onChange={(v) => persist({ notify_sms: v })} />
        </SettingRow>
        <SettingRow icon={MessageCircle} label="WhatsApp updates" hint="Chat with our verification desk and get alerts.">
          <Toggle checked={settings.notify_whatsapp} onChange={(v) => persist({ notify_whatsapp: v })} />
        </SettingRow>
        <SettingRow icon={BellRing} label="Push notifications" hint="Browser and mobile push alerts.">
          <Toggle checked={settings.notify_push} onChange={(v) => persist({ notify_push: v })} />
        </SettingRow>
        <SettingRow icon={Bell} label="Rent reminders" hint="Nudges before your rent due date.">
          <Toggle checked={settings.notify_rent_reminders} onChange={(v) => persist({ notify_rent_reminders: v })} />
        </SettingRow>
        <SettingRow icon={Tag} label="Application updates" hint="Status changes, approvals and agent matches.">
          <Toggle checked={settings.notify_application_updates} onChange={(v) => persist({ notify_application_updates: v })} />
        </SettingRow>
        <SettingRow icon={Home} label="New property alerts" hint="When a verified home matches your criteria.">
          <Toggle checked={settings.notify_property_alerts} onChange={(v) => persist({ notify_property_alerts: v })} />
        </SettingRow>
        <SettingRow icon={Megaphone} label="Marketing & promotions" hint="Occasional product news and offers.">
          <Toggle checked={settings.notify_marketing} onChange={(v) => persist({ notify_marketing: v })} />
        </SettingRow>
      </SettingsCard>

      {/* ==================== COMMUNICATION & LOCALE =================== */}
      <SettingsCard
        icon={Globe}
        eyebrow="Preference"
        title="Communication & locale"
        description="How we contact you and how things are displayed."
      >
        <SettingRow icon={MessageCircle} label="Preferred contact channel" hint="Where non-urgent messages are sent first.">
          <Segmented
            value={settings.contact_preference}
            onChange={(v) => persist({ contact_preference: v })}
            options={[
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
              { value: 'whatsapp', label: 'WhatsApp' }
            ]}
          />
        </SettingRow>

        <SettingRow icon={Languages} label="Language" hint="Interface language for your portal.">
          <Select
            value={settings.language}
            onChange={(v) => persist({ language: v })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'zu', label: 'isiZulu' },
              { value: 'xh', label: 'isiXhosa' },
              { value: 'af', label: 'Afrikaans' },
              { value: 'st', label: 'Sesotho' },
              { value: 'tn', label: 'Setswana' }
            ]}
          />
        </SettingRow>

        <SettingRow icon={Globe} label="Currency" hint="Used for budgets and pricing displays.">
          <Select
            value={settings.currency}
            onChange={(v) => persist({ currency: v })}
            options={[
              { value: 'ZAR', label: 'ZAR (R)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'GBP', label: 'GBP (£)' }
            ]}
          />
        </SettingRow>

        <SettingRow icon={Clock} label="Timezone" hint="Affects reminder and due-date timing.">
          <Select
            value={settings.timezone}
            onChange={(v) => persist({ timezone: v })}
            options={[
              { value: 'Africa/Johannesburg', label: 'SAST (Johannesburg)' },
              { value: 'Africa/Lagos', label: 'WAT (Lagos)' },
              { value: 'Africa/Nairobi', label: 'EAT (Nairobi)' },
              { value: 'Europe/London', label: 'GMT (London)' },
              { value: 'UTC', label: 'UTC' }
            ]}
          />
        </SettingRow>

        <SettingRow icon={Bell} label="Quiet hours" hint="Pause non-urgent alerts during these times.">
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={settings.quiet_hours_start || ''}
              onChange={(e) => setSettings((p) => ({ ...p, quiet_hours_start: e.target.value }))}
              onBlur={(e) => persist({ quiet_hours_start: e.target.value || null })}
              className="h-10 px-3 rounded-full bg-white border border-sky-100 text-xs text-slate-900 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="time"
              value={settings.quiet_hours_end || ''}
              onChange={(e) => setSettings((p) => ({ ...p, quiet_hours_end: e.target.value }))}
              onBlur={(e) => persist({ quiet_hours_end: e.target.value || null })}
              className="h-10 px-3 rounded-full bg-white border border-sky-100 text-xs text-slate-900 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition"
            />
          </div>
        </SettingRow>
      </SettingsCard>

      {/* ========================= APPEARANCE ========================= */}
      <SettingsCard icon={Sun} eyebrow="Look & feel" title="Appearance" description="Pick the theme that suits you.">
        <SettingRow icon={Sun} label="Theme" hint="Choose light, dark, or match your device.">
          <Segmented
            value={settings.theme}
            onChange={(v) => persist({ theme: v })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' }
            ]}
          />
        </SettingRow>
      </SettingsCard>

      {/* =========================== PRIVACY ========================== */}
      <SettingsCard
        icon={Eye}
        eyebrow="Visibility"
        title="Privacy & visibility"
        description="Control who can see your profile details."
      >
        <SettingRow icon={Eye} label="Profile visibility" hint="Who can view your tenant profile.">
          <Segmented
            value={settings.profile_visibility}
            onChange={(v) => persist({ profile_visibility: v })}
            options={[
              { value: 'public', label: 'Anyone' },
              { value: 'landlords_only', label: 'Landlords' },
              { value: 'private', label: 'Private' }
            ]}
          />
        </SettingRow>
        <SettingRow icon={Smartphone} label="Show phone number" hint="Reveal your phone to matched landlords.">
          <Toggle checked={settings.show_phone} onChange={(v) => persist({ show_phone: v })} />
        </SettingRow>
        <SettingRow icon={Mail} label="Show email address" hint="Reveal your email to matched landlords.">
          <Toggle checked={settings.show_email} onChange={(v) => persist({ show_email: v })} />
        </SettingRow>
      </SettingsCard>

      {/* ===================== POPIA & DATA RIGHTS ==================== */}
      <SettingsCard
        icon={ShieldCheck}
        eyebrow="Compliance"
        title="POPIA privacy & data subject rights"
        description="Your rights under the Protection of Personal Information Act."
      >
        <SettingRow icon={ShieldCheck} label="Data processing consent" hint="Allow Place4U to process your data to deliver the service.">
          <Toggle
            checked={settings.data_processing_consent}
            onChange={(v) =>
              persist(
                { data_processing_consent: v, consent_updated_at: new Date().toISOString() },
                v ? 'Consent given' : 'Consent withdrawn',
                'Your recorded consent has been updated.'
              )
            }
          />
        </SettingRow>

        <SettingRow icon={Download} label="Download my data (DSAR export)" hint="Machine-readable JSON copy of your profile and settings, per POPIA Section 23.">
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className={`h-10 px-5 rounded-full text-xs font-bold flex items-center gap-2 ${BTN_OUTLINE}`}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} className="text-sky-600" />}
            Export data
          </button>
        </SettingRow>

        <SettingRow icon={Trash2} label="Right to erasure" hint="Request permanent destruction of your personal records under POPIA Section 24.">
          <button
            type="button"
            onClick={() => setShowErasure(true)}
            className="h-10 px-5 rounded-full text-xs font-bold flex items-center gap-2 border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            Request erasure
          </button>
        </SettingRow>
      </SettingsCard>

      {/* ======================== ACCOUNT ============================= */}
      <SettingsCard
        icon={UserX}
        eyebrow="Account"
        title="Account settings"
        description="Manage the lifecycle of your tenant account."
      >
        <SettingRow icon={Mail} label="Email address" hint="Your sign-in email is managed by your account provider.">
          <span className="text-xs font-medium text-slate-600 truncate max-w-[220px]">{email || 'Not available'}</span>
        </SettingRow>

        <SettingRow
          icon={UserX}
          label={isDeactivated ? 'Reactivate account' : 'Deactivate account'}
          hint={
            isDeactivated
              ? 'Turn your account back on and restore your activity.'
              : 'Temporarily hide your listings and pause activity. You can return anytime.'
          }
        >
          <button
            type="button"
            onClick={() => setShowDeactivate(true)}
            disabled={togglingAccount}
            className={`h-10 px-5 rounded-full text-xs font-bold flex items-center gap-2 ${
              isDeactivated ? BTN_PRIMARY : 'border border-amber-200 bg-white hover:bg-amber-50 text-amber-700 transition-colors cursor-pointer'
            }`}
          >
            {isDeactivated ? <CheckCircle2 size={14} /> : <UserX size={14} />}
            {isDeactivated ? 'Reactivate' : 'Deactivate'}
          </button>
        </SettingRow>
      </SettingsCard>

      {/* ========================== MODALS =========================== */}
      <SkyModal isOpen={showPassword} onClose={() => setShowPassword(false)} title="Change password" eyebrow="Security">
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2.5">New password</label>
            <input
              type="password"
              value={passwordData.next}
              onChange={(e) => setPasswordData({ ...passwordData, next: e.target.value })}
              placeholder="At least 6 characters"
              className="w-full h-11 px-4 rounded-xl bg-white border border-sky-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2.5">Confirm new password</label>
            <input
              type="password"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              placeholder="Re-enter password"
              className="w-full h-11 px-4 rounded-xl bg-white border border-sky-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowPassword(false)} className="h-11 px-5 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={changingPassword}
              className={`h-11 px-6 rounded-full text-xs font-bold flex items-center gap-2 ${BTN_PRIMARY}`}
            >
              {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Update password
            </button>
          </div>
        </div>
      </SkyModal>

      <SkyModal isOpen={showErasure} onClose={() => setShowErasure(false)} title="Request data erasure" eyebrow="POPIA · Section 24">
        <div className="space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Pursuant to <strong className="text-slate-900">Section 24 of the Protection of Personal Information Act (POPIA)</strong>,
            you are submitting a formal request to destroy or delete personal information held by Place4U.
          </p>
          <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-xs text-rose-700 leading-relaxed">
              Once processed, your applications and verified profile records will be permanently expunged. This cannot be undone.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2.5">
              Type <strong className="text-slate-700">DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={erasureConfirm}
              onChange={(e) => setErasureConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full h-11 px-4 rounded-xl bg-white border border-sky-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={() => setShowErasure(false)} className="h-11 px-5 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleErasureRequest}
              disabled={erasureConfirm.trim().toLowerCase() !== 'delete' || submittingErasure}
              className="h-11 px-6 rounded-full text-xs font-bold flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
            >
              {submittingErasure ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Submit erasure request
            </button>
          </div>
        </div>
      </SkyModal>

      <ConfirmModal
        isOpen={showDeactivate}
        title={isDeactivated ? 'Reactivate your account?' : 'Deactivate your account?'}
        message={
          isDeactivated
            ? 'Your profile and activity will become visible again. You can deactivate at any time.'
            : 'Your listings and applications will be hidden and activity paused. This is reversible — you can reactivate anytime.'
        }
        confirmText={isDeactivated ? 'Yes, reactivate' : 'Yes, deactivate'}
        cancelText="Cancel"
        type={isDeactivated ? 'success' : 'warning'}
        isLoading={togglingAccount}
        onConfirm={handleDeactivate}
        onCancel={() => !togglingAccount && setShowDeactivate(false)}
      />
    </div>
  );
};

export default Settings;
