-- ==============================================================================
-- Place4U: Backfill applications.property_title from the linked listing
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rfajxzjrzmckroitcqxz/sql
--
-- WHY
--   public.properties has no `title` / `name` column. The application intake
--   form used to read those fields, so every application submitted for a
--   specific unit stored a generic placeholder ("Residential Rental
--   Application") instead of the property it was for. The client now derives a
--   real label from the listing's own fields, but rows already written still
--   carry the placeholder.
--
-- WHAT
--   For applications that are linked to a listing (property_id) and whose
--   property_title is empty or one of the old generic placeholders, replace it
--   with a readable label built from that listing's real fields, e.g.
--   "2 Bed Apartment · 12 Main Rd, Sandton, Gauteng".
--
-- NOTES
--   * Idempotent: only touches generic/blank titles, so it is safe to re-run.
--   * applications.property_id is VARCHAR(100) and properties.id is UUID, so
--     the join casts the id to text (no foreign key exists).
--   * Rows with NO property_id (general applications) cannot be recovered and
--     are intentionally left untouched.
-- ==============================================================================

UPDATE public.applications AS a
SET property_title = sub.label
FROM (
  SELECT
    a2.id AS application_id,
    nullif(
      concat_ws(
        ' · ',
        -- Type descriptor: "2 Bed Apartment", "House", ... (or null)
        nullif(
          btrim(
            CASE
              WHEN p.bedrooms IS NOT NULL
                THEN p.bedrooms::text || ' Bed ' || coalesce(nullif(btrim(p.property_type), ''), 'Property')
              ELSE coalesce(btrim(p.property_type), '')
            END
          ),
          ''
        ),
        -- Location: "12 Main Rd, Sandton, Gauteng" (or null)
        nullif(
          concat_ws(
            ', ',
            nullif(btrim(p.address), ''),
            nullif(btrim(p.city), ''),
            nullif(btrim(p.province), '')
          ),
          ''
        )
      ),
      ''
    ) AS label
  FROM public.applications AS a2
  JOIN public.properties AS p
    ON p.id::text = btrim(a2.property_id)
  WHERE a2.property_id IS NOT NULL
    AND btrim(a2.property_id) <> ''
) AS sub
WHERE a.id = sub.application_id
  AND sub.label IS NOT NULL
  AND (
    a.property_title IS NULL
    OR btrim(a.property_title) = ''
    OR lower(btrim(a.property_title)) IN (
      'residential rental application',
      'student accommodation application',
      'selected rental property',
      'rental application',
      'rental unit',
      'property details',
      'apartment',
      'property'
    )
  );

-- ------------------------------------------------------------------------------
-- VERIFY: list applications still missing a usable property label
-- ------------------------------------------------------------------------------
-- SELECT a.id, a.property_id, a.property_title
-- FROM public.applications AS a
-- WHERE a.property_id IS NOT NULL
--   AND btrim(a.property_id) <> ''
--   AND (
--     a.property_title IS NULL
--     OR btrim(a.property_title) = ''
--     OR lower(btrim(a.property_title)) LIKE '%application%'
--   )
-- ORDER BY a.property_title;
