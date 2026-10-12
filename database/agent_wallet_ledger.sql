-- ==============================================================================
-- Place4U: Interlocked Payments  ->  Application  ->  Agent Wallet  ->  Admin
-- Run AFTER payments_and_applications_schema.sql in the Supabase SQL Editor.
--
-- Money rules (all enforced server-side):
--   * Tenant pays R100 fee; payment row is attached to applications.id.
--   * Agent earns 50% (R50) per application that is: assigned to them,
--     status = 'completed', fee_paid = true and NOT refunded.
--   * Agent balance = earned - paid payouts - open (pending/approved) requests.
--     A refund of a completed app removes its R50 from "earned" automatically.
--   * Withdrawals are requested through request_agent_payout() which validates
--     the balance; admin approves / pays / rejects via process_agent_payout().
--   * Admin refunds go through refund_application_fee().
-- ==============================================================================

-- 1. REFUND TRACKING COLUMNS -----------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS fee_refunded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(100) NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS refund_method VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS refunded_by UUID NULL;

-- 2. PAYOUT REQUESTS / PAYOUTS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'ZAR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  source VARCHAR(20) NOT NULL DEFAULT 'agent_request',
  bank_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  method VARCHAR(100) NULL,
  reference VARCHAR(100) NULL,
  agent_note TEXT NULL,
  admin_note TEXT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  processed_by UUID NULL,
  CONSTRAINT check_payout_status CHECK (status IN ('pending','approved','paid','rejected')),
  CONSTRAINT check_payout_source CHECK (source IN ('agent_request','admin_direct'))
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_agent ON public.agent_payout_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.agent_payout_requests(status);

ALTER TABLE public.agent_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents read own payout requests" ON public.agent_payout_requests;
CREATE POLICY "Agents read own payout requests"
ON public.agent_payout_requests FOR SELECT TO authenticated
USING (
  agent_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.user_type = 'admin')
);
-- No INSERT/UPDATE/DELETE policies for clients: writes happen only via the
-- SECURITY DEFINER functions below, so balances cannot be tampered with.

-- 3. BALANCE VIEW (one row per agent) ---------------------------------------------
CREATE OR REPLACE VIEW public.agent_wallet_balances
WITH (security_invoker = false) AS
SELECT
  u.id AS agent_id,
  u.full_name,
  u.email,
  COALESCE(a.assigned_count, 0)  AS assigned_count,
  COALESCE(a.paid_count, 0)      AS paid_count,
  COALESCE(a.completed_count, 0) AS completed_count,
  COALESCE(a.pipeline_count, 0)  AS pipeline_count,
  COALESCE(a.refunded_count, 0)  AS refunded_count,
  COALESCE(a.completed_count, 0) * 50.00 AS earned,
  COALESCE(a.pipeline_count, 0)  * 50.00 AS pipeline,
  COALESCE(a.refunded_count, 0)  * 50.00 AS refunded_share,
  COALESCE(p.paid_out, 0)   AS paid_out,
  COALESCE(p.reserved, 0)   AS reserved,
  COALESCE(a.completed_count, 0) * 50.00 - COALESCE(p.paid_out, 0) - COALESCE(p.reserved, 0) AS available
FROM public.users u
LEFT JOIN (
  SELECT assigned_to,
    COUNT(*)                                                                         AS assigned_count,
    COUNT(*) FILTER (WHERE fee_paid AND NOT fee_refunded)                            AS paid_count,
    COUNT(*) FILTER (WHERE fee_paid AND NOT fee_refunded AND status = 'completed')   AS completed_count,
    COUNT(*) FILTER (WHERE fee_paid AND NOT fee_refunded AND status <> 'completed')  AS pipeline_count,
    COUNT(*) FILTER (WHERE fee_refunded)                                             AS refunded_count
  FROM public.applications
  WHERE assigned_to IS NOT NULL
  GROUP BY assigned_to
) a ON a.assigned_to = u.id
LEFT JOIN (
  SELECT agent_id,
    SUM(amount) FILTER (WHERE status = 'paid')                 AS paid_out,
    SUM(amount) FILTER (WHERE status IN ('pending','approved')) AS reserved
  FROM public.agent_payout_requests
  GROUP BY agent_id
) p ON p.agent_id = u.id
WHERE u.user_type = 'agent'
  AND (u.id = auth.uid()
       OR EXISTS (SELECT 1 FROM public.users x WHERE x.id = auth.uid() AND x.user_type = 'admin'));

GRANT SELECT ON public.agent_wallet_balances TO authenticated;

-- 4. TRIGGER: payment <-> application (fee paid AND refunded) ----------------------
CREATE OR REPLACE FUNCTION public.sync_payment_to_application()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_id IS NULL OR NEW.payment_type <> 'application_fee' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    UPDATE public.applications
    SET fee_paid = true,
        fee_amount = NEW.amount,
        fee_currency = NEW.currency,
        fee_receipt = NEW.receipt_number,
        payment_method = NEW.payment_method,
        payment_id = NEW.id
    WHERE id = NEW.application_id;
  ELSIF NEW.status = 'refunded' THEN
    UPDATE public.applications
    SET fee_refunded = true,
        refunded_at = COALESCE(NEW.refunded_at, now()),
        refund_reference = NEW.refund_reference
    WHERE id = NEW.application_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_payment_to_application ON public.payments;
CREATE TRIGGER trg_sync_payment_to_application
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_to_application();

-- Backfill: applications that already have a completed payment row
UPDATE public.applications a
SET fee_paid = true, fee_receipt = p.receipt_number, payment_id = p.id, fee_amount = p.amount
FROM public.payments p
WHERE p.application_id = a.id AND p.status = 'completed'
  AND p.payment_type = 'application_fee' AND a.fee_paid IS DISTINCT FROM true;

-- 5. RPC: agent requests a withdrawal ----------------------------------------------
CREATE OR REPLACE FUNCTION public.request_agent_payout(
  p_amount NUMERIC, p_bank_details JSONB DEFAULT '{}'::jsonb, p_note TEXT DEFAULT NULL
) RETURNS public.agent_payout_requests AS $$
DECLARE
  v_available NUMERIC;
  v_row public.agent_payout_requests;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'agent') THEN
    RAISE EXCEPTION 'Only agents can request payouts';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Serialise concurrent requests from the same agent
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  SELECT available INTO v_available FROM public.agent_wallet_balances WHERE agent_id = auth.uid();
  IF COALESCE(v_available, 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance (R%)', COALESCE(v_available, 0);
  END IF;

  INSERT INTO public.agent_payout_requests (agent_id, amount, bank_details, agent_note, source, status)
  VALUES (auth.uid(), p_amount, COALESCE(p_bank_details, '{}'::jsonb), p_note, 'agent_request', 'pending')
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: admin processes a request (approve / pay / reject) ------------------------
CREATE OR REPLACE FUNCTION public.process_agent_payout(
  p_request_id UUID, p_action TEXT, p_reference TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL, p_note TEXT DEFAULT NULL
) RETURNS public.agent_payout_requests AS $$
DECLARE
  v_row public.agent_payout_requests;
  v_new TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  v_new := CASE p_action WHEN 'approve' THEN 'approved' WHEN 'pay' THEN 'paid' WHEN 'reject' THEN 'rejected' END;
  IF v_new IS NULL THEN RAISE EXCEPTION 'Unknown action %', p_action; END IF;

  SELECT * INTO v_row FROM public.agent_payout_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_row.status IN ('paid','rejected') THEN
    RAISE EXCEPTION 'Request already %', v_row.status;
  END IF;

  UPDATE public.agent_payout_requests
  SET status = v_new,
      reference = COALESCE(NULLIF(p_reference,''), reference, CASE WHEN v_new = 'paid' THEN 'EFT-P4U-AG-' || to_char(now(),'YYMMDDHH24MISS') END),
      method = COALESCE(p_method, method),
      admin_note = COALESCE(p_note, admin_note),
      processed_at = now(),
      processed_by = auth.uid()
  WHERE id = p_request_id
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: admin records a direct payout (no prior request) -------------------------
CREATE OR REPLACE FUNCTION public.admin_direct_agent_payout(
  p_agent_id UUID, p_amount NUMERIC, p_reference TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL, p_note TEXT DEFAULT NULL
) RETURNS public.agent_payout_requests AS $$
DECLARE
  v_available NUMERIC;
  v_row public.agent_payout_requests;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_agent_id::text));
  SELECT available INTO v_available FROM public.agent_wallet_balances WHERE agent_id = p_agent_id;
  IF COALESCE(v_available, 0) < p_amount THEN
    RAISE EXCEPTION 'Amount exceeds agent available balance (R%)', COALESCE(v_available, 0);
  END IF;
  INSERT INTO public.agent_payout_requests
    (agent_id, amount, status, source, method, reference, admin_note, processed_at, processed_by)
  VALUES (p_agent_id, p_amount, 'paid', 'admin_direct', p_method,
          COALESCE(NULLIF(p_reference,''), 'EFT-P4U-AG-' || to_char(now(),'YYMMDDHH24MISS')),
          p_note, now(), auth.uid())
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: admin refunds an application fee -----------------------------------------
CREATE OR REPLACE FUNCTION public.refund_application_fee(
  p_application_id UUID, p_amount NUMERIC DEFAULT NULL, p_reason TEXT DEFAULT NULL,
  p_method TEXT DEFAULT NULL
) RETURNS public.payments AS $$
DECLARE
  v_pay public.payments;
  v_ref TEXT := 'REF-P4U-' || to_char(now(),'YYMMDDHH24MISS');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_pay FROM public.payments
  WHERE application_id = p_application_id AND payment_type = 'application_fee' AND status = 'completed'
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No completed application-fee payment is attached to this application';
  END IF;

  UPDATE public.payments
  SET status = 'refunded',
      refund_amount = COALESCE(p_amount, amount),
      refund_reference = v_ref,
      refund_reason = p_reason,
      refund_method = p_method,
      refunded_at = now(),
      refunded_by = auth.uid(),
      updated_at = now()
  WHERE id = v_pay.id
  RETURNING * INTO v_pay;   -- trigger flags applications.fee_refunded
  RETURN v_pay;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.request_agent_payout(NUMERIC, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_agent_payout(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_direct_agent_payout(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_application_fee(UUID, NUMERIC, TEXT, TEXT) TO authenticated;

-- 9. GUARD: only admins may change money-critical payment fields ---------------------
CREATE OR REPLACE FUNCTION public.guard_payment_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
     AND (NEW.status IS DISTINCT FROM OLD.status
          OR NEW.amount IS DISTINCT FROM OLD.amount
          OR NEW.payment_type IS DISTINCT FROM OLD.payment_type
          OR NEW.refund_amount IS DISTINCT FROM OLD.refund_amount
          OR NEW.refund_reference IS DISTINCT FROM OLD.refund_reference
          OR (OLD.application_id IS NOT NULL AND NEW.application_id IS DISTINCT FROM OLD.application_id)) THEN
    RAISE EXCEPTION 'Only administrators can modify payment status, amount or refund data';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_payment_updates ON public.payments;
CREATE TRIGGER trg_guard_payment_updates
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_updates();

NOTIFY pgrst, 'reload schema';
