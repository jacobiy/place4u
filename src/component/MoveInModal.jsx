import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, MapPin, Key, CheckCircle2, AlertCircle,
  Home, User, Check, Send, Sparkles, ShieldCheck, ArrowRight
} from 'lucide-react';
import { setMoveInDate, confirmMoveInDate } from '../services/matchWorkflowService';

export default function MoveInModal({
  isOpen,
  onClose,
  match,
  currentUserId,
  userRole = 'landlord', // 'landlord' | 'tenant' | 'agent' | 'admin'
  onSuccess,
  theme = 'light'
}) {
  const isDark = theme === 'dark';
  const colors = isDark
    ? {
        bg: '#0f172a',
        card: '#1e293b',
        border: '#334155',
        text: '#f8fafc',
        muted: '#94a3b8',
        accent: '#38bdf8',
        accentSoft: 'rgba(56,189,248,0.12)',
        ok: '#34d399',
        okSoft: 'rgba(52,211,153,0.12)',
        input: '#1e293b'
      }
    : {
        bg: '#ffffff',
        card: '#f8fafc',
        border: '#e2e8f0',
        text: '#0f172a',
        muted: '#64748b',
        accent: '#0284c7',
        accentSoft: '#e0f2fe',
        ok: '#059669',
        okSoft: '#ecfdf5',
        input: '#ffffff'
      };

  const property = match?.property || {};
  const tenant = match?.tenant || match?.application?.tenant || {};
  const landlord = match?.landlord || {};
  const terms = match?.leaseTerms || {};

  const isConfirmed = Boolean(match?.moveInConfirmedAt || match?.leaseTerms?.moveInConfirmedAt);
  const isProposed = Boolean(match?.moveInDate || match?.leaseTerms?.moveInDate);

  const defaultDate =
    match?.moveInDate ||
    match?.leaseTerms?.moveInDate ||
    terms?.startDate ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const defaultTime = match?.moveInTime || match?.leaseTerms?.moveInTime || '10:00';
  const defaultLocation =
    match?.moveInLocation ||
    match?.leaseTerms?.moveInLocation ||
    property?.address ||
    'At the property entrance';

  const defaultInstructions =
    match?.moveInInstructions ||
    match?.leaseTerms?.moveInInstructions ||
    'Please bring a valid photo ID and proof of deposit payment. We will conduct the initial key handover and walk-through inspection.';

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [location, setLocation] = useState(defaultLocation);
  const [instructions, setInstructions] = useState(defaultInstructions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync state when match changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate);
      setTime(defaultTime);
      setLocation(defaultLocation);
      setInstructions(defaultInstructions);
      setError(null);
    }
  }, [isOpen, match?.moveInDate, match?.moveInTime, match?.moveInLocation, match?.moveInInstructions]);

  if (!isOpen || !match) return null;

  const handleLandlordSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!date) {
      setError('Please choose a valid move-in date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await setMoveInDate(match.id, {
        moveInDate: date,
        moveInTime: time,
        moveInLocation: location.trim(),
        moveInInstructions: instructions.trim(),
        note: `Landlord scheduled move-in date for ${date} at ${time}`
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to set move-in date.');
      }
    } catch (err) {
      setError(err?.message || 'Error occurred while saving move-in date.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTenantConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await confirmMoveInDate(match.id, {
        note: `Tenant confirmed move-in for ${match.moveInDate || date}`
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to confirm move-in date.');
      }
    } catch (err) {
      setError(err?.message || 'Error occurred while confirming.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-ZA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return val;
    }
  };

  // Determine if this is landlord proposing/editing or tenant confirming
  const isLandlordAction = userRole === 'landlord' || userRole === 'admin';
  const isTenantConfirmationAction = userRole === 'tenant' && isProposed && !isConfirmed;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 24,
          width: '100%',
          maxWidth: 600,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: colors.card
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: isConfirmed ? colors.okSoft : colors.accentSoft,
                color: isConfirmed ? colors.ok : colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isConfirmed ? <Key size={22} /> : <Calendar size={22} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: colors.text }}>
                {isConfirmed
                  ? 'Move-In Date Confirmed'
                  : isTenantConfirmationAction
                  ? 'Confirm Your Move-In Date'
                  : 'Schedule Move-In & Key Handover'}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: colors.muted }}>
                {isConfirmed
                  ? `Keys handover confirmed for ${formatDate(match.moveInDate || date)}`
                  : isTenantConfirmationAction
                  ? 'Review the move-in schedule set by the landlord and confirm attendance'
                  : `Set the official move-in date and handover instructions for ${tenant.full_name || 'the tenant'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.muted,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Property Reference */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              background: colors.card,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Home size={18} color={colors.accent} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.text }}>
                  {property.title || property.address || 'Property Premise'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: colors.muted }}>
                  {[property.address, property.city].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase' }}>
                Tenant
              </span>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: colors.text }}>
                {tenant.full_name || tenant.email || 'Applicant'}
              </p>
            </div>
          </div>

          {/* If Move-In is Confirmed: Status Card */}
          {isConfirmed && (
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 16,
                background: colors.okSoft,
                border: `1px solid ${colors.ok}55`,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={24} color={colors.ok} />
                <div>
                  <strong style={{ color: colors.ok, fontSize: 15, display: 'block' }}>
                    Move-In Date Finalized &amp; Confirmed
                  </strong>
                  <span style={{ fontSize: 12, color: colors.text }}>
                    Both landlord and tenant have agreed to this move-in appointment.
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 10,
                  marginTop: 6
                }}
              >
                <div style={{ padding: 10, borderRadius: 10, background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff', border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase', fontWeight: 700 }}>
                    Move-in Date
                  </span>
                  <strong style={{ fontSize: 13, color: colors.text, display: 'block', marginTop: 2 }}>
                    {formatDate(match.moveInDate || date)}
                  </strong>
                </div>

                <div style={{ padding: 10, borderRadius: 10, background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff', border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase', fontWeight: 700 }}>
                    Handover Time
                  </span>
                  <strong style={{ fontSize: 13, color: colors.text, display: 'block', marginTop: 2 }}>
                    {match.moveInTime || time}
                  </strong>
                </div>

                <div style={{ padding: 10, borderRadius: 10, background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff', border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase', fontWeight: 700 }}>
                    Meeting Location
                  </span>
                  <strong style={{ fontSize: 12, color: colors.text, display: 'block', marginTop: 2 }}>
                    {match.moveInLocation || location}
                  </strong>
                </div>
              </div>

              {(match.moveInInstructions || instructions) && (
                <div style={{ padding: 12, borderRadius: 10, background: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff', border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                    Handover Instructions
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.text, lineHeight: 1.5 }}>
                    {match.moveInInstructions || instructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PROPOSED MOVE-IN SCHEDULE (Tenant confirming, OR Agent / Observer reviewing) */}
          {isProposed && !isConfirmed && !isLandlordAction && (
            <div
              style={{
                padding: 18,
                borderRadius: 16,
                background: colors.accentSoft,
                border: `1.5px solid ${colors.accent}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} color={colors.accent} />
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
                    Landlord&apos;s Proposed Move-In Schedule
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.muted }}>
                    {isTenantConfirmationAction
                      ? 'Please review the proposed date and time for key collection and walk-through inspection.'
                      : 'Proposed by landlord · Awaiting tenant confirmation.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.accent }}>
                    <Calendar size={14} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Proposed Date</span>
                  </div>
                  <strong style={{ fontSize: 14, color: colors.text, display: 'block', marginTop: 4 }}>
                    {formatDate(match.moveInDate || date)}
                  </strong>
                </div>

                <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.accent }}>
                    <Clock size={14} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Handover Time</span>
                  </div>
                  <strong style={{ fontSize: 14, color: colors.text, display: 'block', marginTop: 4 }}>
                    {match.moveInTime || time}
                  </strong>
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.accent }}>
                  <MapPin size={14} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Handover Location</span>
                </div>
                <strong style={{ fontSize: 13, color: colors.text, display: 'block', marginTop: 4 }}>
                  {match.moveInLocation || location}
                </strong>
              </div>

              {(match.moveInInstructions || instructions) && (
                <div style={{ padding: 12, borderRadius: 12, background: colors.card, border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.accent }}>
                    <Key size={14} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Special Instructions</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.text, lineHeight: 1.5 }}>
                    {match.moveInInstructions || instructions}
                  </p>
                </div>
              )}

              {isTenantConfirmationAction && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleTenantConfirm}
                    disabled={isSubmitting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '11px 24px',
                      borderRadius: 12,
                      background: colors.ok,
                      color: '#fff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isSubmitting ? 'wait' : 'pointer'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {isSubmitting ? 'Confirming Move-in...' : 'Confirm Move-in Date'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* INFORMATIONAL VIEW: When neither proposed nor confirmed for Agent / observer */}
          {!isProposed && !isConfirmed && !isLandlordAction && (
            <div
              style={{
                padding: '24px 20px',
                borderRadius: 16,
                background: colors.card,
                border: `1px dashed ${colors.border}`,
                textAlign: 'center'
              }}
            >
              <Calendar size={32} color={colors.muted} style={{ margin: '0 auto 8px', opacity: 0.7 }} />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
                Move-In Date Not Set Yet
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.muted }}>
                The landlord has not proposed a move-in date and handover schedule yet. Once the lease is signed, the landlord will set the handover appointment.
              </p>
            </div>
          )}

          {/* LANDLORD FORM: Set or Edit Move-in Date */}
          {isLandlordAction && !isConfirmed && (
            <form onSubmit={handleLandlordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: colors.muted,
                      marginBottom: 5,
                      letterSpacing: '0.05em'
                    }}
                  >
                    Move-In Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      background: colors.input,
                      color: colors.text,
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: colors.muted,
                      marginBottom: 5,
                      letterSpacing: '0.05em'
                    }}
                  >
                    Handover Time *
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      background: colors.input,
                      color: colors.text,
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: colors.muted,
                    marginBottom: 5,
                    letterSpacing: '0.05em'
                  }}
                >
                  Key Collection &amp; Handover Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Main security gate or apartment reception"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.input,
                    color: colors.text,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: colors.muted,
                    marginBottom: 5,
                    letterSpacing: '0.05em'
                  }}
                >
                  Move-In Instructions &amp; Handover Requirements
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Please bring original ID and proof of deposit payment. Security guard will hand over keys and access tags."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.input,
                    color: colors.text,
                    fontSize: 13,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 22px',
                    borderRadius: 10,
                    background: colors.accent,
                    color: '#fff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer'
                  }}
                >
                  <Send size={14} />
                  {isSubmitting ? 'Saving Schedule...' : 'Set & Send Move-In Schedule'}
                </button>
              </div>
            </form>
          )}

          {/* If Landlord already has confirmed date, allow updating */}
          {isLandlordAction && isConfirmed && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  // toggle back to editing if landlord wants to adjust
                  handleLandlordSubmit();
                }}
                style={{
                  display: 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.card,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span style={{ fontSize: 11, color: colors.muted }}>
            Place4U Tenancy Move-In Confirmation
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
