-- Place4U: Landlord + Roles schema helpers
-- NOTE: Run in your Postgres/Supabase SQL editor.

-- 1) Allow 'agent' as a user_type value
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_user_type_check;

ALTER TABLE public.users
ADD CONSTRAINT users_user_type_check
CHECK (
  user_type::text = ANY (
    ARRAY[
      'tenant'::text,
      'landlord'::text,
      'admin'::text,
      'agent'::text
    ]
  )
);

CREATE INDEX IF NOT EXISTS idx_users_user_type
ON public.users(user_type);

COMMENT ON COLUMN public.users.user_type
IS 'User role: tenant, landlord, agent, or admin';

-- 2) Landlord profiles
CREATE TABLE IF NOT EXISTS public.landlord_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  landlord_code VARCHAR(20) NULL,

  full_name VARCHAR(255) NULL,
  company_name VARCHAR(255) NULL,
  tax_id VARCHAR(100) NULL,
  profile_image_url TEXT NULL,

  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  alternative_phone VARCHAR(50) NULL,
  contact_preference VARCHAR(50) NULL DEFAULT 'both',

  address TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,

  id_verified BOOLEAN NULL DEFAULT false,
  email_verified BOOLEAN NULL DEFAULT false,
  phone_verified BOOLEAN NULL DEFAULT false,
  ownership_proof_verified BOOLEAN NULL DEFAULT false,
  verification_documents JSONB NULL DEFAULT '[]'::jsonb,

  total_properties INTEGER NULL DEFAULT 0,
  total_tenants INTEGER NULL DEFAULT 0,
  total_income DECIMAL(12, 2) NULL DEFAULT 0,
  currency VARCHAR(3) NULL DEFAULT 'ZAR',

  join_date DATE NULL DEFAULT CURRENT_DATE,

  notification_preferences JSONB NULL DEFAULT '{
    "email": true,
    "sms": true,
    "push": false,
    "maintenance": true,
    "payments": true,
    "messages": true
  }'::jsonb,

  two_factor_enabled BOOLEAN NULL DEFAULT false,
  two_factor_secret VARCHAR(255) NULL,
  last_password_change TIMESTAMP NULL,

  account_status VARCHAR(20) NULL DEFAULT 'active',
  account_tier VARCHAR(20) NULL DEFAULT 'basic',

  created_at TIMESTAMP NULL DEFAULT now(),
  updated_at TIMESTAMP NULL DEFAULT now(),
  last_login TIMESTAMP NULL,
  last_activity TIMESTAMP NULL,

  language VARCHAR(10) NULL DEFAULT 'en',
  timezone VARCHAR(50) NULL DEFAULT 'Africa/Johannesburg',
  date_format VARCHAR(20) NULL DEFAULT 'DD/MM/YYYY',

  metadata JSONB NULL DEFAULT '{}'::jsonb,

  CONSTRAINT landlord_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT landlord_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT landlord_profiles_landlord_code_key UNIQUE (landlord_code),
  CONSTRAINT landlord_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  CONSTRAINT valid_account_status
    CHECK (account_status IN ('active', 'suspended', 'pending', 'inactive')),
  CONSTRAINT valid_account_tier
    CHECK (account_tier IN ('basic', 'premium', 'enterprise')),
  CONSTRAINT valid_contact_preference
    CHECK (contact_preference IN ('email', 'phone', 'both', 'none')),
  CONSTRAINT valid_currency
    CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX IF NOT EXISTS idx_landlord_profiles_user_id ON public.landlord_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_email ON public.landlord_profiles(email);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_landlord_code ON public.landlord_profiles(landlord_code);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_account_status ON public.landlord_profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_created_at ON public.landlord_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_updated_at ON public.landlord_profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_notifications ON public.landlord_profiles USING gin (notification_preferences);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_verification ON public.landlord_profiles
  (id_verified, email_verified, phone_verified, ownership_proof_verified);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_landlord_profiles_updated_at ON public.landlord_profiles;
CREATE TRIGGER update_landlord_profiles_updated_at
  BEFORE UPDATE ON public.landlord_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Optional: direct messages table used by the landlord Messages UI
-- If you already have messaging tables, adjust the frontend queries accordingly.
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created_at
ON public.messages(sender_id, receiver_id, created_at);

-- 4) Optional: property image URL (frontend uses `image_url` if present)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

COMMENT ON COLUMN public.properties.image_url
IS 'Public URL to a property photo (Supabase Storage or CDN).';
