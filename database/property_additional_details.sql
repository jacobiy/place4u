-- ==============================================================================
-- Place4U: Landlord Enlistment - Additional Property Information
-- Expands public.properties to capture rich architectural and mandate specifications:
--  - Title / Headline & Detailed Description
--  - Floor size (m²)
--  - Deposit amount and terms
--  - Lease term / duration
--  - Parking bays & parking type
--  - Curated amenities (JSONB array)
--  - Utility policies (water inclusion, electricity type)
--  - Complex / Estate name & postal code
--  - Maximum occupants & house rules
--
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Add additional listing specification columns to public.properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS description TEXT NULL,
  ADD COLUMN IF NOT EXISTS size VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS deposit VARCHAR(100) NULL DEFAULT '1.5 Months',
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12, 2) NULL,
  ADD COLUMN IF NOT EXISTS lease_term VARCHAR(50) NULL DEFAULT '12 Months',
  ADD COLUMN IF NOT EXISTS lease_term_months INTEGER NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS parking_bays INTEGER NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_type VARCHAR(50) NULL DEFAULT 'covered',
  ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS water_included BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS electricity_type VARCHAR(50) NOT NULL DEFAULT 'prepaid',
  ADD COLUMN IF NOT EXISTS complex_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS max_occupants INTEGER NULL DEFAULT 2;

-- 2. Helpful column documentation
COMMENT ON COLUMN public.properties.title IS 'Marketing headline or property name (e.g. The Apex Penthouse)';
COMMENT ON COLUMN public.properties.description IS 'Detailed architectural narrative, spatial flow, and unit overview';
COMMENT ON COLUMN public.properties.size IS 'Floor area / floor space (e.g. 95 m²)';
COMMENT ON COLUMN public.properties.deposit IS 'Security deposit terms (e.g. 1.5 Months, R15,000)';
COMMENT ON COLUMN public.properties.deposit_amount IS 'Explicit deposit amount in ZAR';
COMMENT ON COLUMN public.properties.lease_term IS 'Lease period terms (e.g. 12 Months, Flexible)';
COMMENT ON COLUMN public.properties.parking_bays IS 'Total allocated vehicle parking bays';
COMMENT ON COLUMN public.properties.parking_type IS 'Parking arrangement: covered, open, garage, basement, street, none';
COMMENT ON COLUMN public.properties.amenities IS 'JSONB array of amenities and features (e.g. ["Fiber Internet", "Backup Generator", "Pool"])';
COMMENT ON COLUMN public.properties.water_included IS 'Whether municipal water is included in the monthly rent';
COMMENT ON COLUMN public.properties.electricity_type IS 'Electricity metering model: prepaid, billed, or included';
COMMENT ON COLUMN public.properties.complex_name IS 'Building, complex, or estate name if applicable';
COMMENT ON COLUMN public.properties.postal_code IS 'Area postal code';
COMMENT ON COLUMN public.properties.max_occupants IS 'Maximum number of permitted resident occupants';

-- 3. Optional backfill for existing listings with missing titles
UPDATE public.properties
SET title = COALESCE(
  title,
  CASE 
    WHEN area IS NOT NULL AND area != '' THEN INITCAP(COALESCE(property_type, 'Residence')) || ' in ' || area
    WHEN city IS NOT NULL AND city != '' THEN INITCAP(COALESCE(property_type, 'Residence')) || ' in ' || city
    ELSE INITCAP(COALESCE(property_type, 'Residence'))
  END
)
WHERE title IS NULL;

-- 4. Fast search indices
CREATE INDEX IF NOT EXISTS idx_properties_title ON public.properties(title);
CREATE INDEX IF NOT EXISTS idx_properties_amenities ON public.properties USING gin (amenities);
