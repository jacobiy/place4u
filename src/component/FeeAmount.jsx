import React from 'react';
import { formatZarAmount } from '../services/promotionService';

const SIZES = {
  xs: 'text-[11px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl'
};

const TONES = {
  light: {
    amount: 'text-slate-900',
    struck: 'text-red-600 decoration-red-600',
    free: 'text-red-600'
  },
  dark: {
    amount: 'text-white',
    struck: 'text-red-400 decoration-red-400',
    free: 'text-red-400'
  },
  muted: {
    amount: 'text-slate-500',
    struck: 'text-red-500 decoration-red-500',
    free: 'text-red-500'
  }
};

function resolveNumbers(quote, amount) {
  const original = Number(
    quote?.originalAmount ?? quote?.baseAmount ?? amount ?? 0
  );
  const final = Number(quote?.finalAmount ?? amount ?? original);
  const discounted = Boolean(quote?.promotionApplied) && final < original;
  const isFree = Boolean(quote?.isFree) || (discounted && final === 0);
  return { original, final, discounted, isFree };
}

/**
 * Renders a fee amount with the promotion treatment:
 *
 *   R100,00  (struck through in red)   FREE
 *
 * Every screen that quotes the R100 application fee should use this instead of
 * hard-coding the number, so a live promotion is consistent everywhere.
 */
export default function FeeAmount({
  quote,
  amount,
  tone = 'light',
  size = 'md',
  showFreeLabel = true,
  freeLabel = 'FREE',
  showOriginalWhenFree = true,
  className = '',
  valueClassName = '',
  strikeClassName = '',
  freeClassName = ''
}) {
  const palette = TONES[tone] || TONES.light;
  const { original, final, discounted, isFree } = resolveNumbers(quote, amount);
  const sizeClass = SIZES[size] || SIZES.md;
  const promotionName = quote?.promotion?.name;
  const canStrike = quote?.showStrikethrough !== false;

  if (discounted && isFree) {
    if (!canStrike || !showOriginalWhenFree) {
      return (
        <span
          className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${sizeClass} ${className}`}
          title={promotionName ? `${promotionName} — fee waived` : 'Fee waived by promotion'}
        >
          {showFreeLabel ? (
            <span className={`font-bold tracking-wide uppercase ${palette.free} ${freeClassName}`}>
              {freeLabel}
            </span>
          ) : (
            <span className={`font-semibold ${palette.amount} ${valueClassName}`}>
              {formatZarAmount(0)}
            </span>
          )}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${sizeClass} ${className}`}
        title={promotionName ? `${promotionName} — fee waived` : 'Fee waived by promotion'}
      >
        <s className={`font-medium line-through decoration-2 ${palette.struck} ${strikeClassName}`}>
          {formatZarAmount(original)}
        </s>
        {showFreeLabel && (
          <span className={`font-bold tracking-wide uppercase ${palette.free} ${freeClassName}`}>
            {freeLabel}
          </span>
        )}
      </span>
    );
  }

  if (discounted && canStrike) {
    return (
      <span
        className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${sizeClass} ${className}`}
        title={promotionName ? `${promotionName} — ${formatZarAmount(final)}` : undefined}
      >
        <s className={`font-medium line-through decoration-2 ${palette.struck} ${strikeClassName}`}>
          {formatZarAmount(original)}
        </s>
        <span className={`font-bold ${palette.amount} ${valueClassName}`}>
          {formatZarAmount(final)}
        </span>
      </span>
    );
  }

  return (
    <span className={`${sizeClass} ${className}`}>
      <span className={`font-semibold ${palette.amount} ${valueClassName}`}>
        {formatZarAmount(final)}
      </span>
    </span>
  );
}

/**
 * Invoice-style breakdown: the base charge, the promotion line created when a
 * promotion is live, and the total (struck through + FREE when waived).
 */
export function FeeBreakdown({ quote, tone = 'light', className = '', dense = false }) {
  const palette = TONES[tone] || TONES.light;
  const lines = quote?.lineItems || [];
  const { original, discounted, isFree } = resolveNumbers(quote);

  if (!lines.length) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, index) => {
        const key = `${line.kind}-${line.label}-${index}`;
        if (line.kind === 'discount') {
          return (
            <div
              key={key}
              className={`flex items-baseline justify-between gap-3 ${dense ? 'text-[11px]' : 'text-xs'}`}
            >
              <span className={`${palette.free} font-medium`}>
                Promotion · {line.label}
                {line.promotionCode ? (
                  <span className="ml-1.5 rounded border border-current px-1 py-0.5 font-mono text-[9px] uppercase tracking-wide">
                    {line.promotionCode}
                  </span>
                ) : null}
              </span>
              <s className={`${palette.struck} shrink-0 font-medium line-through decoration-2`}>
                −{formatZarAmount(Math.abs(line.amount))}
              </s>
            </div>
          );
        }

        if (line.kind === 'total') {
          return (
            <div
              key={key}
              className={`flex items-baseline justify-between gap-3 border-t pt-1.5 ${tone === 'dark' ? 'border-white/10' : 'border-slate-200'} ${dense ? 'text-[11px]' : 'text-xs'} font-semibold`}
            >
              <span className={palette.amount}>Total</span>
              {discounted && isFree ? (
                <FeeAmount quote={quote} tone={tone} size={dense ? 'xs' : 'sm'} />
              ) : (
                <span className={palette.amount}>{formatZarAmount(quote?.finalAmount ?? original)}</span>
              )}
            </div>
          );
        }

        return (
          <div
            key={key}
            className={`flex items-baseline justify-between gap-3 ${dense ? 'text-[11px]' : 'text-xs'}`}
          >
            <span className={tone === 'dark' ? 'text-white/60' : 'text-slate-500'}>{line.label}</span>
            <span className={palette.amount}>{formatZarAmount(line.amount)}</span>
          </div>
        );
      })}
    </div>
  );
}
