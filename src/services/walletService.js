/**
 * Place4U Wallet Ledger Service
 * Single Supabase-backed source of truth shared by Agent Wallet and Admin Payments.
 * All money rules live in database/agent_wallet_ledger.sql (RPCs + view).
 */
import { supabase } from '../utils/Supabase';

export const APPLICATION_FEE = 100;
export const AGENT_SPLIT_RATE = 0.5;
export const AGENT_SHARE_AMOUNT = APPLICATION_FEE * AGENT_SPLIT_RATE; // R50

const num = (v) => Number(v) || 0;

const normalizeBalance = (row) => ({
  agentId: row.agent_id,
  fullName: row.full_name,
  email: row.email,
  assignedCount: num(row.assigned_count),
  paidCount: num(row.paid_count),
  completedCount: num(row.completed_count),
  pipelineCount: num(row.pipeline_count),
  refundedCount: num(row.refunded_count),
  earned: num(row.earned),
  pipeline: num(row.pipeline),
  refundedShare: num(row.refunded_share),
  paidOut: num(row.paid_out),
  reserved: num(row.reserved),
  available: num(row.available)
});

/** Balance for one agent (defaults to the signed-in agent). */
export async function getAgentBalance(agentId) {
  let q = supabase.from('agent_wallet_balances').select('*');
  if (agentId) q = q.eq('agent_id', agentId);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  return data ? normalizeBalance(data) : null;
}

/** Balances for every agent (admin). */
export async function getAllAgentBalances() {
  const { data, error } = await supabase.from('agent_wallet_balances').select('*');
  if (error) throw error;
  return (data || []).map(normalizeBalance);
}

/** Payout requests / payouts. Agent: pass agentId. Admin: omit for all. */
export async function getPayoutRequests(agentId) {
  let q = supabase
    .from('agent_payout_requests')
    .select('*, agent:users!agent_payout_requests_agent_id_fkey(id, full_name, email, phone)')
    .order('requested_at', { ascending: false });
  if (agentId) q = q.eq('agent_id', agentId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Payments (fees) attached to applications, including refund state. */
export async function getApplicationFeePayments(applicationIds) {
  let q = supabase
    .from('payments')
    .select('id, application_id, payer_id, amount, status, receipt_number, created_at, refund_amount, refund_reference, refund_reason, refund_method, refunded_at')
    .eq('payment_type', 'application_fee');
  if (applicationIds?.length) q = q.in('application_id', applicationIds);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Agent asks to withdraw. Server validates against real balance. */
export async function requestPayout({ amount, bankDetails, note }) {
  const { data, error } = await supabase.rpc('request_agent_payout', {
    p_amount: Number(amount),
    p_bank_details: bankDetails || {},
    p_note: note || null
  });
  if (error) throw error;
  return data;
}

/** Admin: action = 'approve' | 'pay' | 'reject' */
export async function processPayout(requestId, action, { reference, method, note } = {}) {
  const { data, error } = await supabase.rpc('process_agent_payout', {
    p_request_id: requestId,
    p_action: action,
    p_reference: reference || null,
    p_method: method || null,
    p_note: note || null
  });
  if (error) throw error;
  return data;
}

/** Admin: pay an agent without a prior request. */
export async function adminDirectPayout({ agentId, amount, reference, method, note }) {
  const { data, error } = await supabase.rpc('admin_direct_agent_payout', {
    p_agent_id: agentId,
    p_amount: Number(amount),
    p_reference: reference || null,
    p_method: method || null,
    p_note: note || null
  });
  if (error) throw error;
  return data;
}

/** Admin: refund an application fee (also removes the agent's R50 for that file). */
export async function refundApplicationFee({ applicationId, amount, reason, method }) {
  const { data, error } = await supabase.rpc('refund_application_fee', {
    p_application_id: applicationId,
    p_amount: amount != null ? Number(amount) : null,
    p_reason: reason || null,
    p_method: method || null
  });
  if (error) throw error;
  return data;
}

/**
 * Subscribe to every table that affects wallet math so Agent and Admin screens
 * update live. Returns an unsubscribe function.
 */
export function subscribeToWalletChanges(onChange) {
  const channel = supabase
    .channel(`wallet-sync-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_payout_requests' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, onChange)
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch { /* noop */ }
  };
}
