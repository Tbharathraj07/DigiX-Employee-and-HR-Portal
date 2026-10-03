-- ==============================================================================
-- DigiX Technologies - Fix Authentication Permissions and RLS Recursion
-- Migration: 005_fix_authentication_permissions.sql
-- Description: 
--   1. Grants necessary schema, table, sequence, and function privileges to the
--      Supabase `authenticated` role so RLS queries can execute without 42501.
--   2. Eliminates infinite RLS recursion on `public.profiles` by replacing
--      circular helper function calls on profiles with direct, zero-recursion
--      `id = auth.uid()` policy checks for authenticated users.
--   3. Ensures helper functions (get_auth_role, is_admin, is_hr_or_admin,
--      get_auth_employee_id) have explicit SECURITY DEFINER, search_path, and EXECUTE grants.
-- ==============================================================================

-- 1. Grant schema usage to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Grant table permissions to authenticated role on all 21 public tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3. Grant sequence permissions for any auto-incrementing/serial columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Grant routine/function execution privileges
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 5. Set default privileges for future objects created in schema public
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO authenticated;

-- 6. Break RLS recursion on public.profiles
-- The previous policies ("Admins full access to profiles" and "HR read profiles")
-- called is_admin() and is_hr_or_admin(), which executed queries against public.profiles,
-- causing infinite recursion and 42501 permission denied errors.
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "HR read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;

-- New non-recursive policies on profiles:
-- Authenticated users can view their own profile (zero recursion, pure id = auth.uid() check)
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Authenticated users can update their own profile
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Authenticated users can insert their own profile during initial provisioning
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 7. Ensure RLS helper functions are clean, STABLE, and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.is_hr_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE((SELECT role IN ('hr_manager', 'admin') FROM public.profiles WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.get_auth_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 8. Explicitly grant execute on all helper functions to authenticated
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hr_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_employee_id() TO authenticated;

-- 9. Re-verify employees table policies are intact and non-recursive
DROP POLICY IF EXISTS "Admins full access to employees" ON public.employees;
CREATE POLICY "Admins full access to employees"
  ON public.employees FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "HR view employees" ON public.employees;
CREATE POLICY "HR view employees"
  ON public.employees FOR SELECT TO authenticated
  USING (public.is_hr_or_admin());

DROP POLICY IF EXISTS "HR insert employees" ON public.employees;
CREATE POLICY "HR insert employees"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "HR update employees" ON public.employees;
CREATE POLICY "HR update employees"
  ON public.employees FOR UPDATE TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own record" ON public.employees;
CREATE POLICY "Employees view own record"
  ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());
