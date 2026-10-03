-- ==============================================================================
-- DigiX Technologies - Secure Admin Role Management Migration
-- Migration: 011_admin_role_management.sql
-- Description:
--   1. Implements public.admin_change_user_role(target_user_id UUID, new_role TEXT)
--      SECURITY DEFINER RPC function allowing authenticated Admins to change user roles.
--   2. Explicitly verifies caller authentication and public.is_admin() on the server.
--   3. Automatically executes the existing prevent_profile_role_escalation() trigger
--      cleanly because the executing session is verified as an active administrator.
--   4. Enforces last-admin protection: rejects any operation that leaves the system
--      with zero active administrators.
--   5. Verifies database persistence before returning success.
--   6. Records audit event into public.audit_logs.
--   7. Provides public.get_users_with_roles() helper allowing Admins to read
--      all user roles across profiles for the administrative governance UI.
--   8. Grants EXECUTE strictly to authenticated users; completely REVOKES from anon.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Function: Read User Roles (Admin Only)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
  user_id UUID,
  employee_id TEXT,
  role TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
BEGIN
  -- Strict Admin Access Control
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only system administrators can query global user roles.';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    COALESCE(e.employee_id, 'UNKNOWN') AS employee_id,
    p.role AS role,
    p.updated_at AS updated_at
  FROM public.profiles p
  LEFT JOIN public.employees e ON e.user_id = p.id OR e.id = p.employee_id
  ORDER BY p.role ASC, p.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_users_with_roles() FROM anon;

-- ------------------------------------------------------------------------------
-- 2. Privileged Role Change RPC Function (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_previous_role TEXT;
  v_confirmed_role TEXT;
  v_target_emp_code TEXT;
  v_target_name TEXT;
  v_active_admins_count INT;
BEGIN
  -- A. Verify caller authentication
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Session is not authenticated.';
  END IF;

  -- B. Verify caller is currently an administrator
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only system administrators are authorized to modify user roles.';
  END IF;

  -- C. Validate requested role
  IF new_role NOT IN ('employee', 'hr_manager', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: Role must be employee, hr_manager, or admin.';
  END IF;

  -- D. Validate target user exists in profiles
  SELECT role INTO v_previous_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_previous_role IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found in public.profiles.';
  END IF;

  -- E. Last Admin Removal Protection
  IF v_previous_role = 'admin' AND new_role != 'admin' THEN
    SELECT COUNT(*) INTO v_active_admins_count
    FROM public.profiles
    WHERE role = 'admin';

    IF v_active_admins_count <= 1 THEN
      RAISE EXCEPTION 'At least one system administrator must remain active. Accidental removal of the last administrator is forbidden.';
    END IF;
  END IF;

  -- F. Retrieve employee metadata for audit trail
  SELECT employee_id, name INTO v_target_emp_code, v_target_name
  FROM public.employees
  WHERE user_id = target_user_id
  LIMIT 1;

  -- G. Execute update on public.profiles
  -- Note: The BEFORE UPDATE trigger trg_prevent_profile_role_escalation will fire.
  -- Because auth.uid() is the authenticated administrator, public.is_admin() returns TRUE.
  -- The trigger check passes without modification or weakening.
  UPDATE public.profiles
  SET role = new_role,
      updated_at = now()
  WHERE id = target_user_id;

  -- H. Verify update actually persisted in database
  SELECT role INTO v_confirmed_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_confirmed_role IS DISTINCT FROM new_role THEN
    RAISE EXCEPTION 'ROLE_UPDATE_NOT_PERSISTED: Database verification failed. Role update was not persisted.';
  END IF;

  -- I. Record Audit Log
  INSERT INTO public.audit_logs (
    actor_employee_id,
    actor_name,
    role,
    action,
    module,
    status,
    ip_address,
    details,
    created_at
  ) VALUES (
    (SELECT employee_id FROM public.profiles WHERE id = v_caller_id LIMIT 1),
    COALESCE((SELECT name FROM public.employees WHERE user_id = v_caller_id LIMIT 1), 'System Administrator'),
    'admin',
    'ROLE_CHANGED',
    'Admin',
    'Success',
    '127.0.0.1',
    jsonb_build_object(
      'action', 'ROLE_CHANGED',
      'previous_role', v_previous_role,
      'new_role', new_role,
      'target_employee_id', COALESCE(v_target_emp_code, 'UNKNOWN'),
      'target_user_id', target_user_id,
      'target_name', COALESCE(v_target_name, 'Employee')
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'employee_id', COALESCE(v_target_emp_code, 'UNKNOWN'),
    'name', COALESCE(v_target_name, 'Employee'),
    'previous_role', v_previous_role,
    'new_role', new_role,
    'updated_at', now()
  );
END;
$$;

-- Overload alias supporting p_target_user_id, p_new_role
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN public.admin_change_user_role(p_target_user_id, p_new_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_user_role(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_change_user_role(UUID, TEXT) FROM anon;

-- ------------------------------------------------------------------------------
-- 3. Atomic Admin Transfer Procedure (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_transfer_system_role(
  target_user_id UUID,
  replacement_role TEXT DEFAULT 'employee'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_target_role TEXT;
  v_confirmed_target_role TEXT;
  v_confirmed_caller_role TEXT;
  v_active_admins_count INT;
  v_target_emp_code TEXT;
  v_target_name TEXT;
  v_caller_emp_code TEXT;
  v_caller_name TEXT;
BEGIN
  -- 1. Authenticate caller as current admin
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Session is not authenticated.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only system administrators are authorized to transfer administrator privileges.';
  END IF;

  IF target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Invalid transfer: Cannot transfer administrator privileges to yourself.';
  END IF;

  IF replacement_role NOT IN ('employee', 'hr_manager') THEN
    RAISE EXCEPTION 'Invalid replacement role: Replacement role must be employee or hr_manager.';
  END IF;

  -- 2. Verify target user exists
  SELECT role INTO v_target_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found in public.profiles.';
  END IF;

  -- 3. Verify Marcus is currently admin
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Caller is not currently a system administrator.';
  END IF;

  -- Metadata for audit trail
  SELECT employee_id, name INTO v_target_emp_code, v_target_name
  FROM public.employees
  WHERE user_id = target_user_id
  LIMIT 1;

  SELECT employee_id, name INTO v_caller_emp_code, v_caller_name
  FROM public.employees
  WHERE user_id = v_caller_id
  LIMIT 1;

  -- 4. Promote target to Admin
  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE id = target_user_id;

  -- 5. Verify target is now Admin in the database
  SELECT role INTO v_confirmed_target_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_confirmed_target_role != 'admin' THEN
    RAISE EXCEPTION 'ROLE_UPDATE_NOT_PERSISTED: Failed to verify promotion of target user to admin.';
  END IF;

  -- 6. Demote old Admin to Employee / replacement role
  UPDATE public.profiles
  SET role = replacement_role, updated_at = now()
  WHERE id = v_caller_id;

  -- 7. Verify old Admin is now replacement role
  SELECT role INTO v_confirmed_caller_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_confirmed_caller_role != replacement_role THEN
    -- Restore target
    UPDATE public.profiles SET role = v_target_role, updated_at = now() WHERE id = target_user_id;
    RAISE EXCEPTION 'ROLE_UPDATE_NOT_PERSISTED: Failed to verify demotion of old administrator. State was safely restored.';
  END IF;

  -- 8. Verify at least one Admin exists
  SELECT COUNT(*) INTO v_active_admins_count
  FROM public.profiles
  WHERE role = 'admin';

  IF v_active_admins_count < 1 THEN
    -- Emergency restore
    UPDATE public.profiles SET role = 'admin', updated_at = now() WHERE id = v_caller_id;
    UPDATE public.profiles SET role = v_target_role, updated_at = now() WHERE id = target_user_id;
    RAISE EXCEPTION 'ROLE_UPDATE_NOT_PERSISTED: Invariant violated: Zero administrators remain. State was safely restored.';
  END IF;

  -- 9. Create ROLE_CHANGED audit records
  INSERT INTO public.audit_logs (
    actor_employee_id, actor_name, role, action, module, status, ip_address, details, created_at
  ) VALUES
  (
    COALESCE(v_caller_emp_code, 'ADM001'),
    COALESCE(v_caller_name, 'System Administrator'),
    'admin',
    'ROLE_CHANGED',
    'Admin',
    'Success',
    '127.0.0.1',
    jsonb_build_object(
      'action', 'ROLE_CHANGED',
      'type', 'ADMIN_TRANSFER_PROMOTION',
      'target_user_id', target_user_id,
      'target_employee_id', COALESCE(v_target_emp_code, 'UNKNOWN'),
      'target_name', COALESCE(v_target_name, 'Employee'),
      'previous_role', v_target_role,
      'new_role', 'admin'
    ),
    now()
  ),
  (
    COALESCE(v_caller_emp_code, 'ADM001'),
    COALESCE(v_caller_name, 'System Administrator'),
    'admin',
    'ROLE_CHANGED',
    'Admin',
    'Success',
    '127.0.0.1',
    jsonb_build_object(
      'action', 'ROLE_CHANGED',
      'type', 'ADMIN_TRANSFER_DEMOTION',
      'target_user_id', v_caller_id,
      'target_employee_id', COALESCE(v_caller_emp_code, 'ADM001'),
      'target_name', COALESCE(v_caller_name, 'System Administrator'),
      'previous_role', 'admin',
      'new_role', replacement_role
    ),
    now()
  );

  -- 10. Return success only after all verification succeeds
  RETURN jsonb_build_object(
    'success', true,
    'transferred_to', jsonb_build_object(
      'user_id', target_user_id,
      'employee_id', COALESCE(v_target_emp_code, 'UNKNOWN'),
      'name', COALESCE(v_target_name, 'Employee'),
      'role', 'admin'
    ),
    'old_admin', jsonb_build_object(
      'user_id', v_caller_id,
      'role', replacement_role
    ),
    'updated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_transfer_system_role(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_transfer_system_role(UUID, TEXT) FROM anon;

-- Verification commentary
COMMENT ON FUNCTION public.admin_change_user_role(UUID, TEXT) IS 'Secure server-side procedure for Admins to change user roles with trigger, last-admin, and database verification protections.';
COMMENT ON FUNCTION public.admin_transfer_system_role(UUID, TEXT) IS 'Atomic transfer procedure for switching system administrators with rollback and invariant protection.';
COMMENT ON FUNCTION public.get_users_with_roles() IS 'Protected directory of profile roles accessible exclusively by system administrators.';
