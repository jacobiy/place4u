import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, ThumbsDown, Send } from 'lucide-react';

const QUICK_REASONS = [
  'Outside my coverage area',
  'Not my property specialisation',
  'Already at capacity with current briefs',
  'Client budget below my fee threshold',
  'Conflict of interest'
];

/**
 * Rejection reason capture for an administrator-assigned job.
 * The reason is optional but strongly encouraged so the admin can reassign well.
 */
export const JobResponseModal = ({
  isOpen,
  onClose,
  application,
  tenant,
  submitting = false,
  error = '',
  onSubmit = () => {}
}) => {
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setSelected('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (value) => {
    setSelected(value);
    setReason(value);
  };

  const handleConfirm = () => {
    const value = reason.trim();
    onSubmit(value || null);
  };

  return (
    <div className="job-response-overlay" onClick={onClose} role="presentation">
      <div
        className="job-response-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Reject assigned job"
      >
        <div className="job-response-header">
          <div className="job-response-title">
            <span className="job-response-icon">
              <ThumbsDown size={18} />
            </span>
            <div>
              <h3>Reject this Job</h3>
              <p>
                {tenant?.full_name ? `${tenant.full_name} · ` : ''}
                #{String(application?.id || '').slice(0, 8)}
              </p>
            </div>
          </div>
          <button type="button" className="job-response-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="job-response-body">
          <p className="job-response-intro">
            The administrator will be notified that you cannot take this job and will be prompted to
            reassign it to another agent. A short reason helps them pick the right person.
          </p>

          <div className="job-response-quick">
            {QUICK_REASONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`job-response-chip ${selected === option ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <label className="job-response-label" htmlFor="job-reject-reason">
            Reason (optional)
          </label>
          <textarea
            id="job-reject-reason"
            className="job-response-textarea"
            rows={3}
            maxLength={500}
            placeholder="e.g. This brief falls outside my coverage area — please reassign."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setSelected('');
            }}
          />

          {error && (
            <div className="job-response-error">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="job-response-footer">
          <button
            type="button"
            className="job-response-btn secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Keep Job
          </button>
          <button
            type="button"
            className="job-response-btn danger"
            onClick={handleConfirm}
            disabled={submitting}
          >
            <Send size={15} />
            {submitting ? 'Sending…' : 'Reject Job & Notify Admin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobResponseModal;
