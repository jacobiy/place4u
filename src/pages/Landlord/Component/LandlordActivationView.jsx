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
import { T, SERIF } from '../Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from './Buttons';

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

  const tone = isRejected
    ? { accent: T.red, soft: T.redSoft, border: T.redBorder, tag: 'Application Requires Revision' }
    : isPending
    ? { accent: T.amber, soft: T.amberSoft, border: T.amberBorder, tag: 'Application Pending Review' }
    : { accent: T.accent, soft: T.accentSoft, border: T.accentBorder, tag: 'Action Required · Apply to Verify' };

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
        className="ll-anim-up"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f3f9ff 55%, #eef6ff 100%)',
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusXl,
          padding: 'clamp(1.4rem, 3.5vw, 1.9rem)',
          marginBottom: '1.75rem',
          boxShadow: T.shadow,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: 'linear-gradient(90deg,#7dd3fc,#0ea5e9,#2563eb)' }} />
        <div aria-hidden style={{ position: 'absolute', top: -70, right: -60, width: 260, height: 260, borderRadius: '9999px', background: 'radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)' }} />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 500px', minWidth: 0 }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '1rem',
                background: tone.soft,
                border: `1px solid ${tone.border}`,
                color: tone.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isPending ? <Clock size={26} /> : isRejected ? <ShieldCheck size={26} /> : <Sparkles size={26} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.25rem, 3vw, 1.55rem)', color: T.textPrimary, letterSpacing: '-0.01em', margin: 0 }}>
                  Landlord accreditation & portfolio gateway
                </h2>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 11px',
                    borderRadius: 9999,
                    background: tone.soft,
                    border: `1px solid ${tone.border}`,
                    color: tone.accent
                  }}
                >
                  {tone.tag}
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: T.textSecondary, margin: '8px 0 0', maxWidth: '680px', lineHeight: 1.6 }}>
                {isPending
                  ? 'Your identity documents and proof of ownership are currently being reviewed by the compliance committee. Your operational tools unlock the moment you are approved.'
                  : isRejected
                  ? `Application declined: ${profile?.rejection_reason || 'Documents could not be validated.'} Please update your application and resubmit.`
                  : 'Submit your landlord application to obtain verified badge accreditation, list properties with zero restrictions, and manage tenants.'}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div style={{ flexShrink: 0 }}>
            {!isPending && (
              <PrimaryBtn onClick={() => setIsModalOpen(true)}>
                <Sparkles size={16} />
                {isRejected ? 'Resubmit Application' : 'Start Landlord Application'}
                <ArrowRight size={16} />
              </PrimaryBtn>
            )}

            {isPending && (
              <SecondaryBtn onClick={() => setIsModalOpen(true)}>
                View / edit submitted application
              </SecondaryBtn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
