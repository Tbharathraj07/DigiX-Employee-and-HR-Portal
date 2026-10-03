-- ==============================================================================
-- DigiX Technologies - Secure Employee Directory Migration
-- Migration: 010_create_employee_directory.sql
-- Description:
--   1. Creates public.employee_directory secure database view exposing ONLY safe
--      public directory fields (id, employee_id, name, email, department, designation,
--      location, profile_photo, status).
--   2. Explicitly omits sensitive columns: phone, joining_date, salary, manager_id,
--      user_id, emergency contact, or private personal data.
--   3. Sets security_barrier = true on the view.
--   4. Grants SELECT strictly to authenticated employees; completely REVOKES from anon.
--   5. Provides public.get_employee_directory() SECURITY DEFINER helper function.
--   6. Preserves existing strict public.employees RLS policy (user_id = auth.uid()).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Dedicated Secure Directory RPC Function (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_employee_directory()
RETURNS TABLE (
  id UUID,
  employee_id TEXT,
  name TEXT,
  email TEXT,
  department TEXT,
  designation TEXT,
  location TEXT,
  profile_photo TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    id,
    employee_id,
    name,
    email,
    department,
    designation,
    location,
    profile_photo,
    status
  FROM public.employees
  WHERE status = 'active'
  ORDER BY department, name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_directory() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_employee_directory() FROM anon;

-- ------------------------------------------------------------------------------
-- 2. Create Secure employee_directory View backed by Secure Function
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.employee_directory CASCADE;

CREATE OR REPLACE VIEW public.employee_directory
WITH (security_barrier = true) AS
SELECT
  id,
  employee_id,
  name,
  email,
  department,
  designation,
  location,
  profile_photo,
  status
FROM public.get_employee_directory();

-- ------------------------------------------------------------------------------
-- 3. Grant Minimum Required Access on View
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.employee_directory TO authenticated;
REVOKE ALL ON public.employee_directory FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.employee_directory FROM authenticated;

-- Verification commentary
COMMENT ON VIEW public.employee_directory IS 'Secure public employee directory exposing only non-sensitive identity and organizational fields for active personnel.';
COMMENT ON FUNCTION public.get_employee_directory() IS 'Safe RPC returning active employee directory without sensitive contact, financial, or personal fields.';
