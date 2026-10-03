-- ==============================================================================
-- DigiX Technologies - Employee Self-Service Avatar Update Migration
-- Migration: 008_employee_avatar_update.sql
-- Description:
--   1. Implements a secure SECURITY DEFINER RPC function `update_own_profile_photo`
--      allowing authenticated employees to update ONLY their own `profile_photo`
--      without HR approval.
--   2. Adds an RLS UPDATE policy on `public.employees` for authenticated employees
--      restricted to their own record (`user_id = auth.uid()`).
--   3. Attaches a BEFORE UPDATE trigger (`trg_check_employee_self_update`)
--      that strictly prevents non-HR/non-Admin authenticated users from modifying
--      protected fields (id, employee_id, user_id, name, email, phone, department,
--      designation, location, joining_date, manager_id, status) to preserve
--      enterprise governance, while allowing direct SQL editor/maintenance queries.
--   4. Grants storage DELETE permissions on `employee-documents` for authenticated
--      employees scoped strictly to their own avatar subfolder (`{employee_id}/avatars/`).
-- ==============================================================================

-- 1. Dedicated SECURITY DEFINER RPC to update own avatar securely
CREATE OR REPLACE FUNCTION public.update_own_profile_photo(new_photo_url TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_id UUID;
  caller_emp_id UUID;
  updated_record RECORD;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated';
  END IF;

  -- Locate employee record by user_id or linked profile
  SELECT id INTO caller_emp_id FROM public.employees WHERE user_id = calling_user_id LIMIT 1;
  IF caller_emp_id IS NULL THEN
    SELECT employee_id INTO caller_emp_id FROM public.profiles WHERE id = calling_user_id LIMIT 1;
  END IF;

  IF caller_emp_id IS NULL THEN
    RAISE EXCEPTION 'Employee profile not found for authenticated user';
  END IF;

  UPDATE public.employees
  SET profile_photo = new_photo_url,
      updated_at = now()
  WHERE id = caller_emp_id
  RETURNING id, employee_id, name, email, department, designation, profile_photo, updated_at
  INTO updated_record;

  RETURN to_jsonb(updated_record);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_profile_photo(TEXT) TO authenticated;

-- 2. Trigger function to protect immutable employee columns on self-update
CREATE OR REPLACE FUNCTION public.check_employee_self_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Authenticated non-HR/Admin users: strictly block unauthorized modifications to protected corporate fields
  -- Direct SQL Editor / maintenance queries where auth.uid() is NULL, as well as HR/Admin users, are not blocked
  IF auth.uid() IS NOT NULL AND NOT (public.is_hr_or_admin()) THEN
    IF NEW.id <> OLD.id OR
       NEW.employee_id <> OLD.employee_id OR
       NEW.user_id IS DISTINCT FROM OLD.user_id OR
       NEW.name <> OLD.name OR
       NEW.email <> OLD.email OR
       NEW.phone IS DISTINCT FROM OLD.phone OR
       NEW.department IS DISTINCT FROM OLD.department OR
       NEW.designation IS DISTINCT FROM OLD.designation OR
       NEW.location IS DISTINCT FROM OLD.location OR
       NEW.joining_date IS DISTINCT FROM OLD.joining_date OR
       NEW.manager_id IS DISTINCT FROM OLD.manager_id OR
       NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Security Violation: Employees may only update their profile photo. Other profile changes require HR approval.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_check_employee_self_update ON public.employees;
CREATE TRIGGER trg_check_employee_self_update
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.check_employee_self_update();

-- 3. Policy: Allow employees to update their own employee record (subject to trigger validation)
DROP POLICY IF EXISTS "Employees update own profile photo" ON public.employees;
CREATE POLICY "Employees update own profile photo"
  ON public.employees FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Storage Policy: Allow employees to safely delete old avatars ONLY within their own avatar folder
DROP POLICY IF EXISTS "Employees delete own avatars in employee-documents" ON storage.objects;
CREATE POLICY "Employees delete own avatars in employee-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (storage.foldername(name))[1] = (SELECT id::text FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
    AND (storage.foldername(name))[2] = 'avatars'
  );
