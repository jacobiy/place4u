import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { LandlordApplicationModal } from './LandlordApplicationModal';
import { LandlordQueries } from '../db/queries';
import { T } from '../Styles/designTokens';

export const LandlordActivationView = ({
  profile,
  user,
  onRefresh
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const applicationStatus = profile?.application_status || 'not_applied';
  const isPending = applicationStatus === 'pending_review';
  const isApproved = applicationStatus === 'approved';
  const isRejected = applicationStatus === 'rejected';

  // If already approved, do not show onboarding / accreditation banner
  if (isApproved) {
    return null;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Application Modal */}
      <LandlordApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        profile={profile}
        onSuccess={async () => {
          if (onRefresh) await onRefresh();
        }}
      />

      {/* Main Activation Banner / Card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${T.navyMid} 0%, #151d36 100%)`,
          border: `1px solid ${T.border}`,
          borderRadius: '16px',
          padding: '1.75rem',
          marginBottom: '1.75rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 500px', minWidth: 0 }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isApproved
                  ? 'rgba(16, 185, 129, 0.15)'
                  : isPending
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(79, 126, 248, 0.15)',
                color: isApproved ? T.emerald : isPending ? '#f59e0b' : T.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isApproved ? <CheckCircle2 size={26} /> : isPending ? <Clock size={26} /> : <ShieldCheck size={26} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: T.textPrimary, margin: 0 }}>
                  Landlord Accreditation & Portfolio Gateway
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: isApproved
                      ? 'rgba(16, 185, 129, 0.2)'
                      : isPending
                      ? 'rgba(245, 158, 11, 0.2)'
                      : isRejected
                      ? 'rgba(248, 113, 113, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: isApproved ? T.emerald : isPending ? '#f59e0b' : isRejected ? '#f87171' : T.textSecondary
                  }}
                >
                  {isApproved
                    ? 'Verified Landlord'
                    : isPending
                    ? 'Application Pending Review'
                    : isRejected
                    ? 'Application Requires Revision'
                    : 'Action Required: Apply to Verify'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: T.textMuted, margin: '6px 0 0', maxWidth: '680px', lineHeight: 1.45 }}>
                {isApproved
                  ? 'Your ownership credentials have been verified. You can publish properties and utilize Place4U operational tools.'
                  : isPending
                  ? 'Your identity documents and proof of ownership are currently being reviewed by the compliance committee.'
                  : isRejected
                  ? `Application declined: ${profile?.rejection_reason || 'Documents could not be validated.'} Please update your application.`
                  : 'Submit your landlord application to obtain verified badge accreditation, list properties with zero restrictions, and manage tenants.'}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div style={{ flexShrink: 0 }}>
            {!isApproved && !isPending && (
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '10px 22px',
                  background: `linear-gradient(135deg, ${T.accent} 0%, #3b82f6 100%)`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(79, 126, 248, 0.35)'
                }}
              >
                <Sparkles size={16} />
                {isRejected ? 'Resubmit Application' : 'Start Landlord Application'}
                <ArrowRight size={16} />
              </button>
            )}

            {isPending && (
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: T.textPrimary,
                  border: `1px solid ${T.border}`,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                View / Edit Submitted Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
