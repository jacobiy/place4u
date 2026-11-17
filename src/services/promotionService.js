/**
 * Place4U Promotions & Fee Quote Service
 *
 * One place that answers "what does this application actually cost right now?"
 * for the tenant payment flow, the admin desk and the agent wallet.
 *
 * The database is authoritative (database/payment_promotions_schema.sql):
 * `quote_application_fee()` computes the discount, and a BEFORE INSERT trigger
 * re-applies it to every payment row. Everything here degrades to the normal
 * R100 fee when that SQL has not been run yet, so the app keeps working.
 */
import { supabase } from '../utils/Supabase';

export const BASE_APPLICATION_FEE = 100;
export const PROMOTION_DISCOUNT_TYPES = ['full', 'percentage', 'fixed'];

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value) => Math.round((num(value) + Number.EPSILON) * 100) / 100;

export function formatZarAmount(value) {
  return `R${num(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/** True when an error means the promotions migration has not been applied. */
export function isPromotionSchemaMissing(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return (
    error.code === '42P01' || // undefined_table
    error.code === '42883' || // undefined_function
    error.code === 'PGRST202' ||
    message.includes('does not exist') ||
    message.includes('could not find the function') ||
    message.includes('schema cache')
  );
}

export function normalizePromotion(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code || null,
    name: row.name || 'Promotion',
    description: row.description || '',
    isActive: row.is_active === true,
    discountType: PROMOTION_DISCOUNT_TYPES.includes(row.discount_type) ? row.discount_type : 'full',
    discountValue: num(row.discount_value),
    appliesTo: row.applies_to || 'application_fee',
    autoApply: row.auto_apply !== false,
    showStrikethrough: row.show_strikethrough !== false,
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    maxRedemptions: row.max_redemptions ?? null,
    redemptionCount: num(row.redemption_count),
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

/** Client-side copy of the server rule, used for the graceful fallback path. */
export function isPromotionLive(promotion, now = new Date()) {
  if (!promotion || !promotion.isActive) return false;
  const start = promotion.startsAt ? new Date(promotion.startsAt) : null;
  const end = promotion.endsAt ? new Date(promotion.endsAt) : null;
  if (start && start > now) return false;
  if (end && end <= now) return false;
  if (promotion.maxRedemptions != null && promotion.redemptionCount >= promotion.maxRedemptions) {
    return false;
  }
  return true;
}

export function promotionDiscount(promotion, baseAmount = BASE_APPLICATION_FEE) {
  if (!promotion) return 0;
  const base = Math.max(num(baseAmount), 0);
  if (promotion.discountType === 'full') return round2(base);
  if (promotion.discountType === 'percentage') {
    const pct = Math.min(Math.max(num(promotion.discountValue), 0), 100);
    return round2((base * pct) / 100);
  }
  if (promotion.discountType === 'fixed') {
    return round2(Math.min(Math.max(num(promotion.discountValue), 0), base));
  }
  return 0;
}

/**
 * Build a fee quote object. Shape is deliberately identical to the JSON that
 * `quote_application_fee()` returns, so callers never branch on the source.
 */
export function buildFeeQuote({ originalAmount = BASE_APPLICATION_FEE, promotion = null } = {}) {
  const base = Math.max(num(originalAmount), 0);
  const live = isPromotionLive(promotion) ? promotion : null;
  const discount = live ? promotionDiscount(live, base) : 0;
  const finalAmount = Math.max(round2(base - discount), 0);
  const promotionApplied = Boolean(live && discount > 0);

  const lineItems = [
    { label: 'Application screening fee', amount: base, kind: 'charge' }
  ];
  if (promotionApplied) {
    lineItems.push({
      label: live.name,
      amount: -discount,
      kind: 'discount',
      promotionCode: live.code,
      promotionId: live.id
    });
  }
  lineItems.push({
    label: promotionApplied ? 'Total after promotion' : 'Total due',
    amount: finalAmount,
    kind: 'total'
  });

  return {
    baseAmount: base,
    originalAmount: base,
    discountAmount: discount,
    finalAmount,
    isFree: finalAmount === 0 && discount > 0,
    promotionApplied,
    showStrikethrough: promotionApplied && live.showStrikethrough !== false,
    promotion: promotionApplied ? live : null,
    lineItems
  };
}

export const defaultFeeQuote = () => buildFeeQuote();

export function normalizeFeeQuote(raw) {
  if (!raw || typeof raw !== 'object') return defaultFeeQuote();

  const originalAmount = num(
    raw.original_amount ?? raw.originalAmount ?? raw.base_amount ?? raw.baseAmount ?? BASE_APPLICATION_FEE
  );
  const discountAmount = num(raw.discount_amount ?? raw.discountAmount);
  const finalAmount = num(
    raw.final_amount ?? raw.finalAmount ?? Math.max(originalAmount - discountAmount, 0)
  );
  const promotionApplied = Boolean(raw.promotion_applied ?? raw.promotionApplied ?? discountAmount > 0);
  const promo = normalizePromotion(raw.promotion);

  return {
    baseAmount: originalAmount,
    originalAmount,
    discountAmount,
    finalAmount,
    isFree: Boolean(raw.is_free ?? raw.isFree ?? (finalAmount === 0 && promotionApplied)),
    promotionApplied,
    showStrikethrough: Boolean(
      raw.show_strikethrough ?? raw.showStrikethrough ?? promotionApplied
    ),
    promotion: promotionApplied ? promo : null,
    lineItems: (raw.line_items || raw.lineItems || []).map((line) => ({
      label: line.label || '',
      amount: num(line.amount),
      kind: line.kind || 'charge',
      promotionCode: line.promotion_code ?? line.promotionCode ?? null,
      promotionId: line.promotion_id ?? line.promotionId ?? null
    }))
  };
}

/** Currently running, auto-applied promotion (no code needed). */
export async function getActiveFeePromotion() {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('applies_to', 'application_fee')
    .eq('is_active', true)
    .eq('auto_apply', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    if (isPromotionSchemaMissing(error)) return null;
    throw error;
  }
  return normalizePromotion((data || [])[0]);
}

export async function getPromotionByCode(code) {
  if (!code) return null;
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .ilike('code', String(code).trim())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    if (isPromotionSchemaMissing(error)) return null;
    throw error;
  }
  return normalizePromotion((data || [])[0]);
}

/**
 * Ask the database to price an application fee. Falls back to local math when
 * the promotions SQL is missing (or the network is unavailable).
 */
export async function quoteApplicationFee(code = null) {
  try {
    const { data, error } = await supabase.rpc('quote_application_fee', {
      p_promotion_code: code || null
    });
    if (!error && data) return normalizeFeeQuote(data);
  } catch {
    // Fall through: the migration may not be applied, or the network is down.
  }
  return localQuote(code);
}

async function localQuote(code) {
  try {
    const promotion = code ? await getPromotionByCode(code) : await getActiveFeePromotion();
    if (code && (!promotion || !isPromotionLive(promotion))) return defaultFeeQuote();
    return buildFeeQuote({ promotion: isPromotionLive(promotion) ? promotion : null });
  } catch {
    return defaultFeeQuote();
  }
}

/* ------------------------------------------------------------------------- */
/* Admin management                                                           */
/* ------------------------------------------------------------------------- */

export async function listPromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizePromotion);
}

export async function createPromotion(input) {
  const payload = toRow(input);
  const { data, error } = await supabase.from('promotions').insert(payload).select().single();
  if (error) throw error;
  return normalizePromotion(data);
}

export async function updatePromotion(id, patch) {
  const { data, error } = await supabase
    .from('promotions')
    .update(toRow(patch, true))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return normalizePromotion(data);
}

export async function setPromotionActive(id, isActive) {
  return updatePromotion(id, { isActive });
}

export async function deletePromotion(id) {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw error;
  return true;
}

function toRow(input = {}, partial = false) {
  const row = {};
  const set = (key, value) => {
    if (value !== undefined) row[key] = value;
  };

  set('code', input.code === undefined ? undefined : (input.code ? String(input.code).trim().toUpperCase() : null));
  set('name', input.name === undefined ? undefined : String(input.name).trim());
  set('description', input.description === undefined ? undefined : (input.description || null));
  set('is_active', input.isActive === undefined ? undefined : Boolean(input.isActive));
  set('discount_type', input.discountType === undefined ? undefined : input.discountType);
  set('discount_value', input.discountValue === undefined ? undefined : round2(input.discountValue));
  set('applies_to', input.appliesTo === undefined ? undefined : input.appliesTo);
  set('auto_apply', input.autoApply === undefined ? undefined : Boolean(input.autoApply));
  set('show_strikethrough', input.showStrikethrough === undefined ? undefined : Boolean(input.showStrikethrough));
  set('starts_at', input.startsAt === undefined ? undefined : (input.startsAt || null));
  set('ends_at', input.endsAt === undefined ? undefined : (input.endsAt || null));
  set('max_redemptions', input.maxRedemptions === undefined ? undefined : (input.maxRedemptions ? Number(input.maxRedemptions) : null));

  if (!partial) {
    if (row.name === undefined) row.name = 'Application fee promotion';
    if (row.discount_type === undefined) row.discount_type = 'full';
    if (row.discount_value === undefined) row.discount_value = 100;
    if (row.applies_to === undefined) row.applies_to = 'application_fee';
  }

  return row;
}

/** Live updates for the payment screens and the admin promotions table. */
export function subscribeToPromotions(onChange) {
  try {
    const channel = supabase
      .channel(`promotions-sync-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onChange)
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* noop */
      }
    };
  } catch {
    return () => {};
  }
}
