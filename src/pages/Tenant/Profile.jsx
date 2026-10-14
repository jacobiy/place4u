import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Pencil,
  Save,
  ShieldCheck,
  CalendarDays,
  Banknote,
  Heart,
  Building2,
  Sparkles,
  Camera,
  Loader2
} from 'lucide-react';
import { TenantQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { AlertToast } from '../../component/AlertModal';

/* ------------------------------------------------------------------ */
/*  Palette: matches the tenant dashboard — white surfaces, light-blue */
/*  washes, one confident sky-blue accent.                             */
/* ------------------------------------------------------------------ */
const CARD = 'bg-white border border-sky-100 shadow-[0_12px_40px_-18px_rgba(2,132,199,0.22)]';
const BTN_PRIMARY =
  'bg-sky-600 hover:bg-sky-700 text-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.55)] transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
const BTN_OUTLINE =
  'border border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300 text-slate-700 transition-colors duration-200 cursor-pointer';

const Eyebrow = ({ children, className = '' }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 ${className}`}>{children}</p>
);

const initialsOf = (nameOrEmail) => {
  const raw = (nameOrEmail || '').trim();
  if (!raw) return 'TR';
  if (raw.includes('@')) return raw.slice(0, 2).toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/* ------------------------------------------------------------------ */
/*  Read-only / editable field                                         */
/* ------------------------------------------------------------------ */
const InfoField = ({ label, value, icon: Icon, isEditing, onChange, fieldName, type = 'text', placeholder }) => (
  <div>
    <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2.5">
      {label}
    </label>

    {isEditing ? (
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" />
        )}
        <input
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(fieldName, e.target.value)}
          className={`w-full h-11 rounded-xl bg-white border border-sky-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition ${
            Icon ? 'pl-11 pr-4' : 'px-4'
          }`}
        />
      </div>
    ) : (
      <div className="flex items-center gap-2.5 h-11 px-4 rounded-xl bg-sky-50/60 border border-sky-100">
        {Icon && <Icon size={15} className="text-sky-600 shrink-0" />}
        <span className={`text-sm truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || 'Not provided'}
        </span>
      </div>
    )}
  </div>
);

const SelectField = ({ label, value, isEditing, onChange, fieldName, options, icon: Icon }) => (
  <div>
    <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2.5">
      {label}
    </label>
    {isEditing ? (
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" />
        )}
        <select
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          className={`w-full h-11 appearance-none rounded-xl bg-white border border-sky-100 text-sm text-slate-900 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition ${
            Icon ? 'pl-11 pr-9' : 'px-4'
          }`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ) : (
      <div className="flex items-center gap-2.5 h-11 px-4 rounded-xl bg-sky-50/60 border border-sky-100">
        {Icon && <Icon size={15} className="text-sky-600 shrink-0" />}
        <span className="text-sm text-slate-900 truncate">
          {options.find((o) => o.value === value)?.label || 'Not provided'}
        </span>
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section card with inline edit / save / cancel                      */
/* ------------------------------------------------------------------ */
const SectionCard = ({ title, eyebrow, icon: Icon, isEditing, onEdit, onCancel, saving, children }) => (
  <section className={`${CARD} rounded-[28px] overflow-hidden`}>
    <header className="flex flex-wrap items-center justify-between gap-3 px-6 sm:px-8 py-5 border-b border-sky-100">
      <div className="flex items-center gap-3.5">
        <span className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          {eyebrow && <Eyebrow className="!text-sky-600 mb-1">{eyebrow}</Eyebrow>}
          <h2 className="font-serif text-xl text-slate-900 leading-tight">{title}</h2>
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-xs font-semibold transition-colors ${
          isEditing
            ? 'bg-sky-600 text-white hover:bg-sky-700 border border-sky-600'
            : 'bg-white border border-sky-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300'
        }`}
      >
        {isEditing ? <Save size={14} /> : <Pencil size={14} />}
        {isEditing ? 'Save' : 'Edit'}
      </button>
    </header>

    <div className="px-6 sm:px-8 py-6 sm:py-7">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{children}</div>

      {isEditing && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-6 mt-6 border-t border-sky-100">
          <button type="button" onClick={onCancel} className={`h-10 px-5 rounded-full text-xs font-semibold ${BTN_OUTLINE}`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={saving}
            className={`h-10 px-6 rounded-full text-xs font-bold flex items-center gap-2 ${BTN_PRIMARY}`}
          >
            {saving ? (
              'Saving…'
            ) : (
              <>
                <Save size={14} />
                Save changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  </section>
);

export const Profile = ({ profile: initialProfile, user }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState({
    personal: false,
    contact: false,
    address: false
  });
  const [editedData, setEditedData] = useState(initialProfile || {});
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const { user: authUser } = useAuth();

  // Keep local state in sync when the parent finishes loading the profile,
  // without clobbering fields the tenant is actively editing.
  useEffect(() => {
    if (!initialProfile) return;
    const anyEditing = Object.values(isEditing).some(Boolean);
    if (anyEditing) return;
    setProfile(initialProfile);
    setEditedData(initialProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProfile]);

  const displayName =
    profile?.full_name ||
    initialProfile?.full_name ||
    user?.user_metadata?.full_name ||
    authUser?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Resident Tenant');

  const email = profile?.email || user?.email || authUser?.email || '';
  const tier = profile?.account_tier
    ? `${profile.account_tier[0].toUpperCase()}${profile.account_tier.slice(1)} Tenant`
    : 'Verified Tenant';

  const completeness = useMemo(() => {
    const fields = [
      'id_number',
      'date_of_birth',
      'employment_status',
      'monthly_income',
      'phone',
      'emergency_contact_name',
      'emergency_contact_phone',
      'current_address',
      'city',
      'state',
      'postal_code'
    ];
    const filled = fields.filter((f) => {
      const v = profile?.[f];
      return v !== undefined && v !== null && String(v).trim() !== '';
    }).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const handleEdit = (section) => {
    if (isEditing[section]) handleSave(section);
    else setIsEditing({ ...isEditing, [section]: true });
  };

  const handleSave = async (section) => {
    setIsSaving(true);

    const targetId = profile?.id || profile?.user_id || user?.id || authUser?.id;

    try {
      let result;
      switch (section) {
        case 'personal':
          result = await TenantQueries.updatePersonalInfo(targetId, {
            fullName: editedData.full_name,
            dateOfBirth: editedData.date_of_birth,
            idNumber: editedData.id_number,
            employmentStatus: editedData.employment_status,
            monthlyIncome: editedData.monthly_income
          });
          break;
        case 'contact':
          result = await TenantQueries.updateContactInfo(targetId, {
            phone: editedData.phone,
            emergencyContactName: editedData.emergency_contact_name,
            emergencyContactPhone: editedData.emergency_contact_phone
          });
          break;
        case 'address':
          result = await TenantQueries.updateAddressInfo(targetId, {
            currentAddress: editedData.current_address,
            city: editedData.city,
            state: editedData.state,
            postalCode: editedData.postal_code,
            hasPets: editedData.has_pets
          });
          break;
        default:
          result = await TenantQueries.updateTenantProfile(targetId, editedData);
      }

      if (result && result.success) {
        setProfile(result.data);
        setEditedData(result.data);
        setToast({ type: 'success', title: 'Profile updated', message: 'Your changes have been saved successfully.' });
      } else {
        const merged = { ...profile, ...editedData };
        setProfile(merged);
        setEditedData(merged);
        setToast({
          type: 'warning',
          title: 'Saved locally',
          message: result?.error || 'We could not reach the server, so these changes are kept locally for now.'
        });
      }

      setIsEditing({ ...isEditing, [section]: false });
    } catch (err) {
      const merged = { ...profile, ...editedData };
      setProfile(merged);
      setEditedData(merged);
      setIsEditing({ ...isEditing, [section]: false });
      setToast({
        type: 'warning',
        title: 'Saved locally',
        message: err?.message || 'We could not reach the server, so these changes are kept locally for now.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (section) => {
    setEditedData(profile);
    setIsEditing({ ...isEditing, [section]: false });
  };

  const handleFieldChange = (field, value) => {
    setEditedData({ ...editedData, [field]: value });
  };

  /* ------------------------------------------------------------------ */
  /*  Profile picture upload                                             */
  /*  Mirrors the landlord flow: validate → upload to the 'profiles'     */
  /*  bucket → persist the public URL on the tenant profile row.         */
  /* ------------------------------------------------------------------ */
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({ type: 'danger', title: 'Unsupported file', message: 'Please choose a JPG, PNG or WEBP image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'danger', title: 'Image too large', message: 'Profile pictures must be under 5 MB.' });
      return;
    }

    const uploaderId = user?.id || authUser?.id;
    if (!uploaderId) {
      setToast({ type: 'danger', title: 'Not signed in', message: 'Please sign in again to update your photo.' });
      return;
    }

    setUploadingImage(true);
    try {
      const upload = await TenantQueries.uploadProfileImage(uploaderId, file);
      if (!upload.success) throw new Error(upload.error || 'Upload failed');

      const targetId = profile?.id || profile?.user_id || uploaderId;
      const saved = await TenantQueries.updateProfileImage(targetId, upload.url);

      const next = saved?.success && saved.data ? saved.data : { ...profile, profile_image_url: upload.url };
      setProfile(next);
      setEditedData((prev) => ({ ...prev, profile_image_url: upload.url }));

      setToast({ type: 'success', title: 'Profile photo updated', message: 'Your new profile picture is live.' });
    } catch (err) {
      setToast({
        type: 'danger',
        title: 'Upload failed',
        message: err.message || 'Could not upload your photo. Please try again.'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const statItems = [
    {
      icon: ShieldCheck,
      label: 'Verification',
      value: profile?.is_verified ? 'Verified' : tier,
      accent: 'text-emerald-600'
    },
    {
      icon: FileText,
      label: 'ID on file',
      value: editedData?.id_number || profile?.id_number ? 'Captured' : 'Pending',
      accent: editedData?.id_number || profile?.id_number ? 'text-sky-600' : 'text-amber-500'
    },
    {
      icon: Banknote,
      label: 'Monthly income',
      value: profile?.monthly_income
        ? `R ${Number(profile.monthly_income).toLocaleString('en-ZA')}`
        : 'Not set',
      accent: 'text-slate-900'
    }
  ];

  return (
    <div className="max-w-[1100px] mx-auto pb-20 text-slate-900 space-y-8 sm:space-y-10">
      <AlertToast toast={toast} onClose={() => setToast(null)} />

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden rounded-[32px] border border-sky-100 px-6 py-9 sm:px-10 sm:py-11 bg-white/80 backdrop-blur-md shadow-[0_24px_60px_-28px_rgba(2,132,199,0.35)]">
        <div aria-hidden className="absolute -top-32 -right-24 w-[400px] h-[400px] rounded-full bg-sky-300/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 left-1/4 w-[320px] h-[320px] rounded-full bg-blue-200/30 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-9">
          <div className="flex items-center gap-6 min-w-0">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white font-serif text-3xl shadow-[0_16px_36px_-14px_rgba(2,132,199,0.7)]">
                {editedData?.profile_image_url || profile?.profile_image_url ? (
                  <img
                    src={editedData?.profile_image_url || profile?.profile_image_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initialsOf(displayName)
                )}
              </div>

              {/* Change-photo overlay */}
              <button
                type="button"
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Change profile photo"
                aria-label="Change profile photo"
                className="absolute inset-0 rounded-full flex items-center justify-center bg-slate-900/45 text-white opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
              >
                {uploadingImage ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
              </button>

              <span
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-sky-100 flex items-center justify-center text-emerald-600 shadow-sm pointer-events-none"
                title="Verified resident"
              >
                <ShieldCheck size={16} />
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sky-200 text-[11px] font-semibold tracking-wide text-sky-700 shadow-sm">
                  <ShieldCheck size={13} />
                  {tier}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl leading-tight tracking-tight text-slate-900 truncate">
                {displayName}
              </h1>
              {email && (
                <p className="mt-2 text-sm text-slate-500 flex items-center gap-2 truncate">
                  <Mail size={14} className="text-sky-500 shrink-0" />
                  <span className="truncate">{email}</span>
                </p>
              )}
            </div>
          </div>

          <div className="w-full lg:w-[300px] shrink-0">
            <div className="p-5 rounded-[24px] bg-sky-50/70 border border-sky-100">
              <div className="flex items-end justify-between mb-3">
                <Eyebrow>Profile completeness</Eyebrow>
                <span className="font-serif text-2xl text-sky-700 leading-none">{completeness}%</span>
              </div>
              <div className="h-2 rounded-full bg-sky-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                A complete profile lets landlords pre-approve you faster — no repeated paperwork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ STATS =========================== */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statItems.map(({ icon: Icon, label, value, accent }) => (
          <div key={label} className={`${CARD} rounded-[24px] p-5 flex items-center gap-4`}>
            <span className="w-11 h-11 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <Eyebrow>{label}</Eyebrow>
              <p className={`text-sm font-semibold mt-1 truncate ${accent}`}>{value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ===================== PERSONAL INFORMATION =================== */}
      <SectionCard
        eyebrow="Identity"
        title="Personal information"
        icon={User}
        isEditing={isEditing.personal}
        onEdit={() => handleEdit('personal')}
        onCancel={() => handleCancel('personal')}
        saving={isSaving}
      >
        <InfoField
          label="Full name"
          value={editedData.full_name}
          icon={User}
          isEditing={isEditing.personal}
          onChange={handleFieldChange}
          fieldName="full_name"
          placeholder="e.g. Thabo Mokoena"
        />
        <InfoField
          label="ID / Passport number"
          value={editedData.id_number}
          icon={FileText}
          isEditing={isEditing.personal}
          onChange={handleFieldChange}
          fieldName="id_number"
          placeholder="e.g. 9201015098087"
        />
        <InfoField
          label="Date of birth"
          type="date"
          value={editedData.date_of_birth}
          icon={CalendarDays}
          isEditing={isEditing.personal}
          onChange={handleFieldChange}
          fieldName="date_of_birth"
        />
        <InfoField
          label="Employment status"
          value={editedData.employment_status}
          icon={Briefcase}
          isEditing={isEditing.personal}
          onChange={handleFieldChange}
          fieldName="employment_status"
          placeholder="e.g. Permanently Employed"
        />
        <InfoField
          label="Monthly income (R)"
          type="number"
          value={editedData.monthly_income}
          icon={Banknote}
          isEditing={isEditing.personal}
          onChange={handleFieldChange}
          fieldName="monthly_income"
          placeholder="e.g. 42000"
        />
        <div className="hidden sm:block" aria-hidden />
      </SectionCard>

      {/* ===================== CONTACT INFORMATION ==================== */}
      <SectionCard
        eyebrow="Reach you"
        title="Contact information"
        icon={Phone}
        isEditing={isEditing.contact}
        onEdit={() => handleEdit('contact')}
        onCancel={() => handleCancel('contact')}
        saving={isSaving}
      >
        <InfoField
          label="Phone number"
          value={editedData.phone}
          icon={Phone}
          isEditing={isEditing.contact}
          onChange={handleFieldChange}
          fieldName="phone"
          placeholder="+27 82 456 7890"
        />
        <InfoField
          label="Emergency contact name"
          value={editedData.emergency_contact_name}
          icon={User}
          isEditing={isEditing.contact}
          onChange={handleFieldChange}
          fieldName="emergency_contact_name"
          placeholder="e.g. Thandi Nkosi"
        />
        <InfoField
          label="Emergency contact phone"
          value={editedData.emergency_contact_phone}
          icon={Phone}
          isEditing={isEditing.contact}
          onChange={handleFieldChange}
          fieldName="emergency_contact_phone"
          placeholder="+27 83 111 2222"
        />
        <div className="hidden sm:block" aria-hidden />
      </SectionCard>

      {/* ================== ADDRESS & PREFERENCES ===================== */}
      <SectionCard
        eyebrow="Where you are"
        title="Address & preferences"
        icon={MapPin}
        isEditing={isEditing.address}
        onEdit={() => handleEdit('address')}
        onCancel={() => handleCancel('address')}
        saving={isSaving}
      >
        <InfoField
          label="Current address"
          value={editedData.current_address}
          icon={MapPin}
          isEditing={isEditing.address}
          onChange={handleFieldChange}
          fieldName="current_address"
          placeholder="Street, suburb"
        />
        <InfoField
          label="City"
          value={editedData.city}
          icon={Building2}
          isEditing={isEditing.address}
          onChange={handleFieldChange}
          fieldName="city"
          placeholder="e.g. Johannesburg"
        />
        <InfoField
          label="Province"
          value={editedData.state}
          icon={MapPin}
          isEditing={isEditing.address}
          onChange={handleFieldChange}
          fieldName="state"
          placeholder="e.g. Gauteng"
        />
        <InfoField
          label="Postal code"
          value={editedData.postal_code}
          icon={MapPin}
          isEditing={isEditing.address}
          onChange={handleFieldChange}
          fieldName="postal_code"
          placeholder="e.g. 2001"
        />
        <SelectField
          label="Do you have pets?"
          value={editedData.has_pets ? 'yes' : 'no'}
          isEditing={isEditing.address}
          onChange={(field, val) => handleFieldChange(field, val === 'yes')}
          fieldName="has_pets"
          icon={Heart}
          options={[
            { value: 'no', label: 'No pets' },
            { value: 'yes', label: 'Yes, I have pets' }
          ]}
        />
        <div className="hidden sm:block" aria-hidden />
      </SectionCard>

      {/* ============================ NOTE ============================ */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-[20px] bg-sky-50/60 border border-sky-100">
        <Sparkles size={16} className="text-sky-500 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Your information is encrypted and POPIA-compliant. It is only ever shared with a landlord when you submit an
          application — never sold or used for marketing.
        </p>
      </div>
    </div>
  );
};

export default Profile;
