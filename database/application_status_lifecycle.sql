-- ============================================================================
-- Application status lifecycle — single source of truth
-- ----------------------------------------------------------------------------
-- The four dashboards (tenant / agent / landlord / admin) now share one status
-- vocabulary, defined in src/services/applicationStatus.js:
--
--   submitted | under_review | matches_found | completed | expired | cancelled | rejected
--
-- Older builds only ever expected `submitted`, `under_review`, `completed` and
-- `expired`, so any legacy CHECK constraint on public.applications.status would
-- silently reject the newer `matches_found` (agent match work), `cancelled`
-- (tenant withdrawal) and `rejected` (landlord decline) writes. Worse, the
-- client swallowed that error and showed the change locally, so the status
-- reverted on the next fetch.
--
-- This migration:
--   1. Backfills every legacy / alias status onto the canonical value.
--   2. Replaces any status CHECK constraint with the canonical set.
--   3. Guarantees a NOT NULL default of 'submitted'.
--
-- Idempotent — safe to run more than once.
-- ============================================================================

-- 1. Backfill aliases onto canonical values ---------------------------------
update public.applications set status = 'submitted'
  where status is null or status in ('new', 'pending', 'received');

update public.applications set status = 'under_review'
  where status in ('pending_review', 'in_review', 'review');

update public.applications set status = 'matches_found'
  where status in ('matched', 'matches', 'property_matched');

update public.applications set status = 'completed'
  where status in ('approved', 'placed', 'success', 'closed');

update public.applications set status = 'rejected'
  where status in ('declined', 'declined_by_landlord');

update public.applications set status = 'cancelled'
  where status in ('withdrawn');

-- 2. Replace the status CHECK constraint ------------------------------------
do $$
begin
  -- Drop any legacy named constraint first (both historical name guesses).
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.applications'::regclass
      and conname = 'applications_status_check'
  ) then
    alter table public.applications drop constraint applications_status_check;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.applications'::regclass
      and conname = 'applications_status_check'
  ) then
    alter table public.applications
      add constraint applications_status_check
      check (status in (
        'submitted', 'under_review', 'matches_found',
        'completed', 'expired', 'cancelled', 'rejected'
      ));
  end if;
end $$;

-- 3. Default + NOT NULL -----------------------------------------------------
alter table public.applications alter column status set default 'submitted';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applications'
      and column_name = 'status'
      and is_nullable = 'YES'
  ) then
    alter table public.applications alter column status set not null;
  end if;
end $$;

-- 4. Helpful index for dashboard status filters -----------------------------
create index if not exists idx_applications_status on public.applications(status);
