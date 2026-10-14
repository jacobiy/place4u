import React, { useEffect, useState } from 'react';
import { X, SkipForward, Send } from 'lucide-react';

const QUICK_REASONS = [
  'Over budget for the tenant',
  'Outside preferred area / too far',
  'Wrong accommodation type',
  'Not available for move-in date',
  'Not suitable for tenant requirements'
];

/**
 * Optional reason capture when an agent skips a property for an application.
 * Persisted privately on the (application, property) pair.
 */
export const SkipReasonModal = ({ isOpen, onClose, property, onConfirm = () => {}, submitting = false }) => {
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setSelected('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const title = property?.title || property?.name || property?.property_type || 'this property';

  const handleSelect = (value) => {
    setSelected(value);
    setReason(value);
  };

  return (
    <div className="apm-modal-overlay" onClick={onClose} role="presentation">
      <div className="apm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="apm-modal-header">
          <div className="apm-modal-titlewrap">
            <span className="apm-modal-icon amber">
              <SkipForward size={18} />
            </span>
            <div>
              <h3>Skip this property</h3>
              <p>{title}</p>
            </div>
          </div>
          <button type="button" className="apm-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="apm-modal-body">
          <p className="apm-modal-intro">
            This rejects the property for this application. It stays private to you and can be reversed
            from “Show skipped”.
          </p>

          <div className="apm-chip-row">
            {QUICK_REASONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`apm-chip ${selected === option ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <label className="apm-field-label" htmlFor="apm-skip-reason">
            Reason (optional)
          </label>
          <textarea
            id="apm-skip-reason"
            className="apm-textarea"
            rows={3}
            maxLength={400}
            placeholder="e.g. Rent exceeds the tenant's stated budget."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setSelected('');
            }}
          />
        </div>

        <div className="apm-modal-footer">
          <button
            type="button"
            className="apm-btn ghost"
            onClick={() => onConfirm(null)}
            disabled={submitting}
          >
            Skip without reason
          </button>
          <div className="apm-modal-footer-right">
            <button type="button" className="apm-btn ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="apm-btn skip-solid"
              onClick={() => onConfirm(reason.trim() || null)}
              disabled={submitting}
            >
              <Send size={14} />
              {submitting ? 'Saving…' : 'Skip property'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkipReasonModal;
