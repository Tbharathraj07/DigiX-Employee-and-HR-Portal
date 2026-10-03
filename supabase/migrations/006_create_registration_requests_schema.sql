-- ==============================================================================
-- DigiX Technologies - Registration Requests & Profile Security Hardening
-- Migration: 006_create_registration_requests_schema.sql
-- Description:
--   1. Creates public.registration_requests table for unauthenticated Employee/HR
--      applicants waiting for administrative review.
--   2. Enforces strict role constraints: only 'employee' or 'hr_manager' may be
--      requested. 'admin' is explicitly forbidden at the database constraint level.
--   3. Enforces initial 'pending' status constraint and unique pending email index.
--   4. Configures Row Level Security (RLS) allowing anon to INSERT pending requests,
--      while restricting SELECT and UPDATE strictly to authenticated Admins.
--   5. Creates a SECURITY DEFINER trigger that writes an in-app notification to
--      public.notifications (target_role = 'admin') upon new request creation.
--   6. Hardens public.profiles by attaching a BEFORE UPDATE trigger that prevents
--      non-administrators from modifying the 'role' column.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create registration_requests Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  designation TEXT,
  location TEXT,
  requested_role TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  joining_date DATE,
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reason TEXT,
  reviewed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Role Security: MUST allow ONLY employee or hr_manager; NEVER admin
  CONSTRAINT chk_registration_requested_role CHECK (requested_role IN ('employee', 'hr_manager')),

  -- Status Security: Supported states are pending, approved, rejected
  CONSTRAINT chk_registration_status CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Input Validation: Ensure full_name and email are non-empty
  CONSTRAINT chk_registration_name_not_empty CHECK (length(trim(full_name)) > 0),
  CONSTRAINT chk_registration_email_not_empty CHECK (length(trim(email)) > 0)
);

-- ------------------------------------------------------------------------------
-- 2. Indexes & Deduplication Constraints
-- ------------------------------------------------------------------------------
-- Prevent duplicate pending registration requests for the same email address (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_registration_requests_pending_email
  ON public.registration_requests (lower(trim(email)))
  WHERE status = 'pending';

-- Performance indexes for administrative filtering
CREATE INDEX IF NOT EXISTS idx_registration_requests_email
  ON public.registration_requests (lower(trim(email)));

CREATE INDEX IF NOT EXISTS idx_registration_requests_status
  ON public.registration_requests (status);

CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at
  ON public.registration_requests (created_at DESC);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_registration_requests_updated_at ON public.registration_requests;
CREATE TRIGGER set_registration_requests_updated_at
  BEFORE UPDATE ON public.registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) on registration_requests
-- ------------------------------------------------------------------------------
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Grant schema and table permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON TABLE public.registration_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.registration_requests TO authenticated;

-- Revoke dangerous permissions from anon
REVOKE SELECT, UPDATE, DELETE ON TABLE public.registration_requests FROM anon;

-- Policy 1: Anonymous users can INSERT only pending requests with valid non-admin roles
DROP POLICY IF EXISTS "Anon insert pending registration request" ON public.registration_requests;
CREATE POLICY "Anon insert pending registration request"
  ON public.registration_requests FOR INSERT TO anon
  WITH CHECK (
    status = 'pending'
    AND requested_role IN ('employee', 'hr_manager')
    AND full_name IS NOT NULL AND length(trim(full_name)) > 0
    AND email IS NOT NULL AND length(trim(email)) > 0
  );

-- Policy 2: Admin can SELECT all registration requests
DROP POLICY IF EXISTS "Admin select registration requests" ON public.registration_requests;
CREATE POLICY "Admin select registration requests"
  ON public.registration_requests FOR SELECT TO authenticated
  USING (public.is_admin());

-- Policy 3: Admin can UPDATE registration requests (approve/reject, record review notes)
DROP POLICY IF EXISTS "Admin update registration requests" ON public.registration_requests;
CREATE POLICY "Admin update registration requests"
  ON public.registration_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. Server-Side Admin In-App Notification Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_admin_on_registration_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  role_display TEXT;
BEGIN
  -- Format human-friendly role name
  IF NEW.requested_role = 'hr_manager' THEN
    role_display := 'HR Manager';
  ELSE
    role_display := 'Employee';
  END IF;

  -- Insert administrative alert into public.notifications
  INSERT INTO public.notifications (
    recipient_employee_id,
    target_role,
    target_department,
    title,
    message,
    action_url,
    is_read,
    created_at
  ) VALUES (
    NULL,
    'admin',
    NEW.department,
    'New Access Request: ' || NEW.full_name,
    NEW.full_name || ' (' || NEW.email || ') requested ' || role_display ||
      ' access' || CASE WHEN NEW.department IS NOT NULL AND length(trim(NEW.department)) > 0
                        THEN ' for ' || NEW.department
                        ELSE '' END || '.',
    '/admin/users?tab=requests',
    false,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_registration ON public.registration_requests;
CREATE TRIGGER trg_notify_admin_registration
  AFTER INSERT ON public.registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_admin_on_registration_request();

-- ------------------------------------------------------------------------------
-- 5. Harden public.profiles to Prevent Role Privilege Escalation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- If the role column is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Verify that the executing session belongs to an administrator
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access Denied: Only system administrators are authorized to modify user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.trg_notify_admin_on_registration_request() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO authenticated;
