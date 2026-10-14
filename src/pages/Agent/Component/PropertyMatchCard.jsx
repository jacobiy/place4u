import React from 'react';
import {
  MapPin,
  BedDouble,
  Bath,
  Sofa,
  Flag,
  FlagOff,
  SkipForward,
  Eye,
  RotateCcw,
  Info,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { describeProperty } from '../../../utils/propertyLabel';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&auto=format&fit=crop&q=60';

/** Returns an array of landlord constraints, or [] when none are structured. */
export function getLandlordConstraints(property = {}) {
  const parts = [];

  if (typeof property.landlord_constraints === 'string' && property.landlord_constraints.trim()) {
    parts.push(property.landlord_constraints.trim());
  } else {
    if (property.singles_only === true) parts.push('Singles only');
    if (property.pet_friendly === false) parts.push('No pets');
    if (property.max_occupants) parts.push(`Max ${property.max_occupants} occupants`);
    const minIncome = property.min_income ?? property.minimum_income;
    if (minIncome) parts.push(`Min income R${Number(minIncome).toLocaleString('en-ZA')}`);
  }

  return parts;
}

const rent = (p) => Number(p?.price || p?.rent || 0);

/**
 * A single property in the working results list, the draft, or the shipped list.
 *
 * variant: 'result' | 'draft' | 'shipped'
 */
export default function PropertyMatchCard({
  property,
  match = null,
  variant = 'result',
  isNewBatch = false,
  onFlag = () => {},
  onUnflag = () => {},
  onSkip = () => {},
  onUnskip = () => {},
  onView = () => {},
  onNoteChange = null,
  busy = false
}) {
  const p = property || {};
  const state = match?.state || null;
  const constraints = getLandlordConstraints(p);
  const cover = p.image_urls?.[0] || p.image_url || p.image || PLACEHOLDER_IMG;
  // The properties table has no `title`/`name`, so build the label from the
  // real fields rather than falling back to a generic placeholder.
  const title = describeProperty(p) || 'Rental unit';
  const locationLine = [p.area, p.city, p.province].filter(Boolean).join(', ') || p.address || 'Location on request';
  const isStudent = (p.property_type || '').toLowerCase().includes('student');

  const isFlagged = state === 'flagged';

  return (
    <article className={`apm-card ${isFlagged ? 'is-flagged' : ''}`}>
      <div className="apm-card-imgwrap">
        <img src={cover} alt={title} className="apm-card-img" loading="lazy" />
        {isStudent && <span className="apm-card-ribbon">Student</span>}
        {variant === 'shipped' && isNewBatch && (
          <span className="apm-card-new">New since last shipment</span>
        )}
      </div>

      <div className="apm-card-body">
        <div className="apm-card-head">
          <div className="apm-card-price">
            R{rent(p).toLocaleString('en-ZA')}
            <span>/mo</span>
          </div>
          {variant === 'shipped' && (
            <span className="apm-state-badge shipped">
              <CheckCircle2 size={12} /> Shipped
            </span>
          )}
          {variant === 'result' && isFlagged && (
            <span className="apm-state-badge flagged">
              <Flag size={12} /> Flagged
            </span>
          )}
        </div>

        <div className="apm-card-loc">
          <MapPin size={13} />
          <span>{locationLine}</span>
        </div>
        <h4 className="apm-card-title">{title}</h4>

        <div className="apm-card-tags">
          {typeof p.bedrooms === 'number' && (
            <span className="apm-tag">
              <BedDouble size={12} /> {p.bedrooms} bd
            </span>
          )}
          {typeof p.bathrooms === 'number' && (
            <span className="apm-tag">
              <Bath size={12} /> {p.bathrooms} ba
            </span>
          )}
          <span className="apm-tag">
            <Sofa size={12} /> {p.furnished ? 'Furnished' : 'Unfurnished'}
          </span>
          {p.property_type && <span className="apm-tag">{p.property_type}</span>}
        </div>

        {constraints.length > 0 && (
          <div className="apm-card-constraints">
            <Info size={13} />
            <span>Landlord: {constraints.join(' · ')}</span>
          </div>
        )}

        {variant === 'result' && state !== 'skipped' && (
          <div className="apm-card-actions">
            {isFlagged ? (
              <button
                type="button"
                className="apm-btn unflag"
                onClick={() => onUnflag(p)}
                disabled={busy}
                title="Remove from draft"
              >
                <FlagOff size={14} /> Unflag
              </button>
            ) : (
              <button
                type="button"
                className="apm-btn flag"
                onClick={() => onFlag(p)}
                disabled={busy || state === 'skipped'}
                title="Add to draft shortlist"
              >
                <Flag size={14} /> Flag
              </button>
            )}
            <button
              type="button"
              className="apm-btn skip"
              onClick={() => onSkip(p)}
              disabled={busy || isFlagged}
              title="Mark as reviewed and rejected"
            >
              <SkipForward size={14} /> Skip
            </button>
            <button type="button" className="apm-btn ghost" onClick={() => onView(p)} title="View property">
              <Eye size={14} /> View
            </button>
          </div>
        )}

        {variant === 'draft' && (
          <div className="apm-card-actions draft">
            <button
              type="button"
              className="apm-btn unflag"
              onClick={() => onUnflag(p)}
              disabled={busy}
            >
              <RotateCcw size={14} /> Unflag
            </button>
            <button type="button" className="apm-btn ghost" onClick={() => onView(p)}>
              <Eye size={14} /> View
            </button>
          </div>
        )}

        {variant === 'skipped' && match?.skipReason && (
          <div className="apm-card-skipreason">Reason: {match.skipReason}</div>
        )}

        {variant === 'result' && state === 'skipped' && (
          <div className="apm-card-actions draft">
            <button type="button" className="apm-btn ghost" onClick={() => onUnskip(p)} disabled={busy}>
              <RotateCcw size={14} /> Unskip
            </button>
            <button type="button" className="apm-btn ghost" onClick={() => onView(p)}>
              <Eye size={14} /> View
            </button>
          </div>
        )}

        {variant === 'draft' && onNoteChange && (
          <div className="apm-note-field">
            <label htmlFor={`note-${p.id}`}>
              <Sparkles size={12} /> Why this is a good fit (optional)
            </label>
            <textarea
              id={`note-${p.id}`}
              rows={2}
              maxLength={400}
              value={match?.matchNote || ''}
              placeholder="e.g. Walking distance to the tenant's workplace and within budget."
              onChange={(e) => onNoteChange(p, e.target.value)}
            />
          </div>
        )}

        {variant === 'shipped' && match?.matchNote && (
          <div className="apm-card-skipreason">Note: {match.matchNote}</div>
        )}
      </div>
    </article>
  );
}
