import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X, Loader2, ShieldAlert } from 'lucide-react';

/**
 * Type-specific color palette and iconography matching the Place4U design tokens
 */
const TYPE_CONFIG = {
  danger: {
    icon: AlertTriangle,
    iconColor: '#f87171',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconRing: 'rgba(239, 68, 68, 0.3)',
    confirmBg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    confirmShadow: '0 8px 24px -4px rgba(239, 68, 68, 0.45)',
    borderColor: 'rgba(239, 68, 68, 0.32)',
    badgeBg: 'rgba(239, 68, 68, 0.1)',
    badgeColor: '#fca5a5'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: '#fbbf24',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconRing: 'rgba(245, 158, 11, 0.3)',
    confirmBg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
    confirmShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.45)',
    borderColor: 'rgba(245, 158, 11, 0.32)',
    badgeBg: 'rgba(245, 158, 11, 0.1)',
    badgeColor: '#fde68a'
  },
  info: {
    icon: Info,
    iconColor: '#60a5fa',
    iconBg: 'rgba(79, 126, 248, 0.15)',
    iconRing: 'rgba(79, 126, 248, 0.3)',
    confirmBg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    confirmShadow: '0 8px 24px -4px rgba(59, 130, 246, 0.45)',
    borderColor: 'rgba(79, 126, 248, 0.32)',
    badgeBg: 'rgba(79, 126, 248, 0.1)',
    badgeColor: '#93c5fd'
  },
  success: {
    icon: CheckCircle,
    iconColor: '#34d399',
    iconBg: 'rgba(16, 185, 129, 0.15)',
    iconRing: 'rgba(16, 185, 129, 0.3)',
    confirmBg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    confirmShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.45)',
    borderColor: 'rgba(16, 185, 129, 0.32)',
    badgeBg: 'rgba(16, 185, 129, 0.1)',
    badgeColor: '#a7f3d0'
  }
};

/**
 * Custom Confirmation Modal to replace native window.confirm ("localhost says")
 */
export function ConfirmModal({
  isOpen,
  title = "Are you sure?",
  message = "Please confirm your action to proceed.",
  itemName,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // 'danger' | 'warning' | 'info' | 'success'
  isLoading = false,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.danger;
  const Icon = config.icon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(5, 8, 16, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0.5rem, 3vw, 1.25rem)',
        animation: 'alertBackdropFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{
          background: 'linear-gradient(180deg, #18223c 0%, #0f1629 100%)',
          border: `1px solid ${config.borderColor}`,
          borderRadius: '1.25rem',
          maxWidth: '480px',
          width: '100%',
          padding: 'clamp(1.2rem, 4vw, 1.75rem)',
          boxShadow: `0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 40px ${config.iconBg}`,
          position: 'relative',
          color: '#f8fafc',
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          animation: 'alertModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow accent at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: config.confirmBg
          }}
        />

        {/* Close Icon Button */}
        {!isLoading && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f8fafc';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <X size={16} />
          </button>
        )}

        <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'flex-start' }}>
          {/* Status Icon */}
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: config.iconBg,
              border: `1px solid ${config.iconRing}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: config.iconColor,
              flexShrink: 0,
              boxShadow: `0 8px 16px -4px ${config.iconBg}`
            }}
          >
            <Icon size={26} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, paddingRight: '1.25rem' }}>
            <h3
              id="confirm-modal-title"
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#f8fafc',
                margin: '0 0 0.45rem 0',
                lineHeight: 1.3,
                letterSpacing: '-0.01em'
              }}
            >
              {title}
            </h3>

            {itemName && (
              <div
                style={{
                  display: 'inline-block',
                  background: config.badgeBg,
                  color: config.badgeColor,
                  border: `1px solid ${config.borderColor}`,
                  borderRadius: '6px',
                  padding: '3px 9px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '0.6rem',
                  wordBreak: 'break-word',
                  maxWidth: '100%'
                }}
              >
                {itemName}
              </div>
            )}

            <p
              style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.55
              }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            style={{
              flex: '1 1 auto',
              minWidth: '100px',
              padding: '0.65rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.color = '#cbd5e1';
              }
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            style={{
              flex: '1 1 auto',
              minWidth: '120px',
              padding: '0.65rem 1.45rem',
              background: config.confirmBg,
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer',
              boxShadow: config.confirmShadow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.transform = 'none';
            }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom Alert Dialog to replace native window.alert ("localhost says")
 */
export function AlertModal({
  isOpen,
  title = "Notice",
  message = "",
  itemName,
  buttonText = "Got it",
  type = "info", // 'info' | 'warning' | 'danger' | 'success'
  onClose
}) {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(5, 8, 16, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0.5rem, 3vw, 1.25rem)',
        animation: 'alertBackdropFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        style={{
          background: 'linear-gradient(180deg, #18223c 0%, #0f1629 100%)',
          border: `1px solid ${config.borderColor}`,
          borderRadius: '1.25rem',
          maxWidth: '460px',
          width: '100%',
          padding: 'clamp(1.2rem, 4vw, 1.75rem)',
          boxShadow: `0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 40px ${config.iconBg}`,
          position: 'relative',
          color: '#f8fafc',
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          animation: 'alertModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: config.confirmBg
          }}
        />

        <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: config.iconBg,
              border: `1px solid ${config.iconRing}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: config.iconColor,
              flexShrink: 0
            }}
          >
            <Icon size={26} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, paddingRight: '0.5rem' }}>
            <h3
              id="alert-modal-title"
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#f8fafc',
                margin: '0 0 0.45rem 0',
                lineHeight: 1.3
              }}
            >
              {title}
            </h3>

            {itemName && (
              <div
                style={{
                  display: 'inline-block',
                  background: config.badgeBg,
                  color: config.badgeColor,
                  border: `1px solid ${config.borderColor}`,
                  borderRadius: '6px',
                  padding: '3px 9px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '0.6rem'
                }}
              >
                {itemName}
              </div>
            )}

            <p
              style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.55
              }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Single Action Button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.6rem',
              background: config.confirmBg,
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: config.confirmShadow,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom Toast notification to replace native window.alert ("localhost says")
 */
export function AlertToast({
  toast,
  onClose
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'clamp(12px, 3vw, 24px)',
        right: 'clamp(12px, 3vw, 24px)',
        zIndex: 10100,
        maxWidth: '420px',
        width: 'calc(100vw - clamp(24px, 6vw, 48px))',
        background: 'linear-gradient(180deg, #18223c 0%, #0f1629 100%)',
        border: `1px solid ${config.borderColor}`,
        borderRadius: '1rem',
        padding: '1rem 1.25rem',
        boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px ${config.iconBg}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        animation: 'alertToastSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}
    >
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '9px',
          background: config.iconBg,
          border: `1px solid ${config.iconRing}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.iconColor,
          flexShrink: 0
        }}
      >
        <Icon size={18} strokeWidth={2.2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.45 }}>
          {toast.message}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f8fafc')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default ConfirmModal;
