-- ==============================================================================
-- DigiX Technologies - Phase 4 Database Schema Migration
-- Migration: 004_create_governance_and_security_schema.sql
-- Description: Creates 2 governance and security tables for audit logs and system
--              settings with constraints, indexes, triggers, and Row Level Security (RLS).
-- Dependency:  Requires Phase 1 (001_create_core_hr_schema.sql).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Tables (In Strict Dependency Order)
-- ------------------------------------------------------------------------------

-- Table 1: audit_logs
-- Purpose: Tamper-evident security and activity audit trail of all system state changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('Employees', 'Attendance', 'Leave', 'Training', 'Recruitment', 'Profile', 'Onboarding', 'Projects', 'Tasks', 'Security', 'Admin', 'System')),
  status TEXT DEFAULT 'Success' NOT NULL CHECK (status IN ('Success', 'Warning', 'Failed')),
  ip_address TEXT, -- Nullable; safe handling for untrusted client IP
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 2: system_settings
-- Purpose: Global application configuration, authentication policies, and HR leave quotas
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false NOT NULL,
  updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. Performance Indexes
-- ------------------------------------------------------------------------------

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_employee_id ON public.audit_logs(actor_employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);

-- Indexes for system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_config_key ON public.system_settings(config_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON public.system_settings(is_public);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON public.system_settings(updated_by);

-- ------------------------------------------------------------------------------
-- 3. Automatic updated_at Triggers (Reusing public.update_updated_at_column)
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS) on Phase 4 tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. Define RLS Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Table 1: audit_logs Policies (Strictly Append-Only Audit Trail)
-- ==============================================================================
DROP POLICY IF EXISTS "Admins read all audit_logs" ON public.audit_logs;
CREATE POLICY "Admins read all audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "HR read HR audit_logs" ON public.audit_logs;
CREATE POLICY "HR read HR audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_hr_or_admin()
    AND module IN ('Employees', 'Attendance', 'Leave', 'Training', 'Recruitment', 'Profile', 'Onboarding')
  );

DROP POLICY IF EXISTS "Authenticated users insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated users insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    actor_employee_id = public.get_auth_employee_id()
    OR public.is_hr_or_admin()
    OR actor_employee_id IS NULL
  );

-- (Notice: Deliberately NO UPDATE or DELETE policies are granted. Audit logs are strictly immutable).

-- ==============================================================================
-- Table 2: system_settings Policies
-- ==============================================================================
DROP POLICY IF EXISTS "Admins manage system_settings" ON public.system_settings;
CREATE POLICY "Admins manage system_settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "HR read hr_system_settings" ON public.system_settings;
CREATE POLICY "HR read hr_system_settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (
    public.is_hr_or_admin()
    OR is_public = true
  );

DROP POLICY IF EXISTS "HR update hr_policy_settings" ON public.system_settings;
CREATE POLICY "HR update hr_policy_settings"
  ON public.system_settings FOR UPDATE TO authenticated
  USING (
    public.is_hr_or_admin()
    AND config_key IN ('hr_policy_settings', 'leave_policy_quotas', 'attendance_config')
  )
  WITH CHECK (
    public.is_hr_or_admin()
    AND config_key IN ('hr_policy_settings', 'leave_policy_quotas', 'attendance_config')
  );

DROP POLICY IF EXISTS "Employees view public system_settings" ON public.system_settings;
CREATE POLICY "Employees view public system_settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (is_public = true);
