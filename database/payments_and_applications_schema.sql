-- ==============================================================================
-- Place4U: Applications Documents & Payments Schema Migration
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
-- ==============================================================================

-- 1. EXTEND 'applications' TABLE WITH DOCUMENTS & PAYMENT TRACKING COLUMNS
-- ------------------------------------------------------------------------------
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS accommodation_category VARCHAR(50) DEFAULT 'standard_room',
  ADD COLUMN IF NOT EXISTS property_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS property_title VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS fee_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_currency VARCHAR(10) DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS fee_receipt VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS payment_id UUID NULL;

-- Comment on columns for schema documentation
COMMENT ON COLUMN public.applications.documents 
  IS 'Structured array of verified PDF attachments (university acceptance, bursary/NSFAS, bank statements, ID, payslip)';
COMMENT ON COLUMN public.applications.accommodation_category 
  IS 'Accommodation type: student_room or standard_room';
COMMENT ON COLUMN public.applications.fee_paid 
  IS 'Flag confirming whether the mandatory R100 application vetting fee has been paid';
COMMENT ON COLUMN public.applications.fee_receipt 
  IS 'Unique invoice receipt reference issued upon card payment (e.g. REC-P4U-XXXXXX)';


-- 2. CREATE 'payments' TABLE FOR RECORDING APPLICATION & RENTAL TRANSACTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  application_id UUID NULL,
  payer_id UUID NULL,
  property_id VARCHAR(100) NULL,
  
  -- Financial Particulars
  amount NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'ZAR',
  payment_type VARCHAR(50) NOT NULL DEFAULT 'application_fee',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
  
  -- Gateway & Processing Details (PayPal Card Processing)
  gateway VARCHAR(50) NOT NULL DEFAULT 'paypal',
  gateway_order_id VARCHAR(255) NULL,
  gateway_capture_id VARCHAR(255) NULL,
  receipt_number VARCHAR(100) UNIQUE NOT NULL,
  card_brand VARCHAR(50) NULL,
  card_last4 VARCHAR(10) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  
  -- Payer Identification
  payer_name VARCHAR(255) NULL,
  payer_email VARCHAR(255) NULL,
  description TEXT DEFAULT 'Place4U Tenant Application Screening Fee (R100)',
  
  -- Extended Metadata & Audit Trail
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Foreign Key Constraints (Soft-linked if records exist)
  CONSTRAINT fk_payments_payer
    FOREIGN KEY (payer_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_application
    FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL,

  -- Status Checks
  CONSTRAINT check_payment_status 
    CHECK (status IN ('completed', 'pending', 'processing', 'failed', 'refunded')),
  CONSTRAINT check_payment_type
    CHECK (payment_type IN ('application_fee', 'rent', 'deposit', 'holding_fee', 'service_fee'))
);


-- 3. CREATE PERFORMANCE INDEXES FOR PAYMENTS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON public.payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);


-- 4. ENABLE ROW LEVEL SECURITY (RLS) FOR PAYMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own payment receipts
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT
TO authenticated
USING (
  payer_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.user_type IN ('admin', 'agent')
  )
);

-- Policy: Authenticated tenants can insert payments for application fees
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
CREATE POLICY "Authenticated users can insert payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (
  payer_id = auth.uid()
  OR payer_id IS NULL
);

-- Policy: Authenticated tenants can update own payments (e.g. linking application_id)
DROP POLICY IF EXISTS "Authenticated users can update own payments" ON public.payments;
CREATE POLICY "Authenticated users can update own payments"
ON public.payments FOR UPDATE
TO authenticated
USING (
  payer_id = auth.uid()
  OR payer_id IS NULL
)
WITH CHECK (
  payer_id = auth.uid()
  OR payer_id IS NULL
);

-- Policy: Admins can manage all payments
DROP POLICY IF EXISTS "Admins have full access to payments" ON public.payments;
CREATE POLICY "Admins have full access to payments"
ON public.payments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.user_type = 'admin'
  )
);

-- Policy: Allow anon to insert payments (e.g. prospective tenant card fee settlement)
DROP POLICY IF EXISTS "Allow anon insert payments" ON public.payments;
CREATE POLICY "Allow anon insert payments"
ON public.payments FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Allow anon to select payments
DROP POLICY IF EXISTS "Allow anon select payments" ON public.payments;
CREATE POLICY "Allow anon select payments"
ON public.payments FOR SELECT
TO anon
USING (true);

-- Policy: Allow anon to update payments (e.g. linking application_id)
DROP POLICY IF EXISTS "Allow anon update payments" ON public.payments;
CREATE POLICY "Allow anon update payments"
ON public.payments FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);


-- 5. UPGRADE 'documents' TABLE TO SUPPORT STUDENT & ROOM VERIFICATION FILES
-- ------------------------------------------------------------------------------
-- Remove legacy document type restriction to allow student and residential doc types
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;

-- Add optional application_id and metadata columns to public.documents
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS application_id UUID NULL,
  ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS file_size VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS slot_key VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Allow flexible verified document types
ALTER TABLE public.documents 
  ADD CONSTRAINT documents_document_type_check 
  CHECK (
    document_type IS NULL OR 
    document_type IN (
      'id', 
      'id_document',
      'acceptance_letter', 
      'university_acceptance', 
      'bursary_confirmation', 
      'nsfas_letter', 
      'bank_statement', 
      'proof_of_income', 
      'payslip', 
      'student_card',
      'lease_agreement',
      'other'
    )
  );

CREATE INDEX IF NOT EXISTS idx_documents_application_id ON public.documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);


-- 6. AUTOMATIC TRIGGER: SYNC PAYMENT TO APPLICATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_payment_to_application()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_id IS NOT NULL AND NEW.status = 'completed' AND NEW.payment_type = 'application_fee' THEN
    UPDATE public.applications
    SET 
      fee_paid = true,
      fee_amount = NEW.amount,
      fee_currency = NEW.currency,
      fee_receipt = NEW.receipt_number,
      payment_method = NEW.payment_method,
      payment_id = NEW.id
    WHERE id = NEW.application_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_payment_to_application ON public.payments;
CREATE TRIGGER trg_sync_payment_to_application
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payment_to_application();


-- 7. BIDIRECTIONAL BACKFILL & SELF-HEALING
-- ------------------------------------------------------------------------------
-- Link applications to existing payments by matching receipt
UPDATE public.applications a
SET payment_id = p.id,
    fee_paid = true
FROM public.payments p
WHERE a.fee_receipt IS NOT NULL 
  AND a.fee_receipt = p.receipt_number
  AND a.payment_id IS NULL;

-- Link payments to existing applications by matching receipt
UPDATE public.payments p
SET application_id = a.id
FROM public.applications a
WHERE p.receipt_number IS NOT NULL 
  AND p.receipt_number = a.fee_receipt
  AND p.application_id IS NULL;


-- 8. REFRESH SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
