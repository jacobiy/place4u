import React from 'react';
import { X, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Confirmation gate before shipping the current draft. Shipping is one-shot per
 * batch and cannot be un-shipped, so we make the consequence explicit.
 */
export const ShipConfirmModal = ({
  isOpen,
  onClose,
  application,
  tenant,
  flaggedCount = 0,
  onConfirm = () => {},
  submitting = false,
  error = ''
}) => {
  if (!isOpen) return null;

  const name = tenant?.full_name || application?.tenant_name || 'this applicant';

  return (
    <div className="apm-modal-overlay" onClick={onClose} role="presentation">
      <div className="apm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="apm-modal-header">
          <div className="apm-modal-titlewrap">
            <span className="apm-modal-icon emerald">
              <Send size={18} />
            </span>
            <div>
              <h3>Ship shortlist to tenant</h3>
              <p>{name} · #{String(application?.id || '').slice(0, 8)}</p>
            </div>
          </div>
          <button type="button" className="apm-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="apm-modal-body">
          <div className="apm-ship-count">
            <CheckCircle2 size={18} />
            <span>
              <strong>{flaggedCount}</strong> flagged {flaggedCount === 1 ? 'property' : 'properties'} will
              become visible to the tenant.
            </span>
          </div>

          <div className="apm-warning">
            <AlertTriangle size={15} />
            <span>
              Shipping is a one-shot action. Once shipped, a match cannot be un-shipped. If you flag more
              properties later you can ship again — the tenant sees one appended list.
            </span>
          </div>

          {error && (
            <div className="apm-modal-error">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="apm-modal-footer">
          <div className="apm-modal-footer-right">
            <button type="button" className="apm-btn ghost" onClick={onClose} disabled={submitting}>
              Keep editing
            </button>
            <button
              type="button"
              className="apm-btn ship-solid"
              onClick={onConfirm}
              disabled={submitting || flaggedCount === 0}
            >
              <Send size={14} />
              {submitting ? 'Shipping…' : 'Ship shortlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipConfirmModal;
