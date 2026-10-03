-- ==============================================================================
-- DigiX Technologies - Phase 3 Database Schema Migration
-- Migration: 003_create_operations_and_comms_schema.sql
-- Description: Creates 5 production tables for recruitment candidates, onboarding
--              checklists, announcements, notifications, and company documents
--              with constraints, indexes, triggers, and Row Level Security (RLS).
-- Dependency:  Requires Phase 1 (001_create_core_hr_schema.sql) and Phase 2
--              (002_create_employee_project_tables.sql).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Tables (In Strict Dependency Order)
-- ------------------------------------------------------------------------------

-- Table 1: candidates
-- Purpose: Recruitment and ATS candidate pipeline management
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role_applied TEXT NOT NULL,
  department TEXT NOT NULL,
  stage TEXT DEFAULT 'Applied' NOT NULL CHECK (stage IN ('Applied', 'Screening', 'Technical Interview', 'HR Round', 'Offered', 'Hired', 'Rejected')),
  rating NUMERIC(3,1) DEFAULT 4.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  experience TEXT,
  current_company TEXT,
  salary_expectation TEXT,
  interviewer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  resume_url TEXT,
  applied_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 2: onboarding_checklists
-- Purpose: New employee orientation tracking, equipment provisioning, and buddy allocations
CREATE TABLE IF NOT EXISTS public.onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  buddy_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  cohort_name TEXT,
  progress INTEGER DEFAULT 0 NOT NULL CHECK (progress >= 0 AND progress <= 100),
  status TEXT DEFAULT 'in_progress' NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 3: announcements
-- Purpose: Organization-wide notices, policy amendments, and town hall broadcasts
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Company News', 'HR', 'Policy', 'Events', 'Leadership', 'General')),
  priority TEXT DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  author_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  target_audience TEXT DEFAULT 'All Employees' NOT NULL,
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  published_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 4: notifications
-- Purpose: Real-time user alert feed, task notifications, leave updates, and badge counts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  target_role TEXT CHECK (target_role IS NULL OR target_role IN ('all', 'employee', 'hr_manager', 'admin')),
  target_department TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 5: company_documents
-- Purpose: Central repository for company policies, employee handbook, benefits, and compliance forms
CREATE TABLE IF NOT EXISTS public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Company Policy', 'Benefits', 'Compliance', 'Legal', 'General')),
  file_name TEXT NOT NULL,
  file_size TEXT,
  file_format TEXT DEFAULT 'PDF' NOT NULL,
  storage_path TEXT NOT NULL,
  download_url TEXT,
  uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. Performance Indexes
-- ------------------------------------------------------------------------------

-- Indexes for candidates
CREATE INDEX IF NOT EXISTS idx_candidates_candidate_code ON public.candidates(candidate_code);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON public.candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON public.candidates(stage);
CREATE INDEX IF NOT EXISTS idx_candidates_department ON public.candidates(department);
CREATE INDEX IF NOT EXISTS idx_candidates_interviewer_id ON public.candidates(interviewer_id);

-- Indexes for onboarding_checklists
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_employee_id ON public.onboarding_checklists(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_buddy_id ON public.onboarding_checklists(buddy_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_status ON public.onboarding_checklists(status);

-- Indexes for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON public.announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.announcements(category);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON public.announcements(author_id);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_employee_id ON public.notifications(recipient_employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Indexes for company_documents
CREATE INDEX IF NOT EXISTS idx_company_documents_category ON public.company_documents(category);
CREATE INDEX IF NOT EXISTS idx_company_documents_is_active ON public.company_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_company_documents_uploaded_by ON public.company_documents(uploaded_by);

-- ------------------------------------------------------------------------------
-- 3. Automatic updated_at Triggers (Reusing public.update_updated_at_column)
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_candidates_updated_at ON public.candidates;
CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_onboarding_checklists_updated_at ON public.onboarding_checklists;
CREATE TRIGGER trg_onboarding_checklists_updated_at
  BEFORE UPDATE ON public.onboarding_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_company_documents_updated_at ON public.company_documents;
CREATE TRIGGER trg_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS) on all 5 Phase 3 tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. Define RLS Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Table 1: candidates Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage candidates" ON public.candidates;
CREATE POLICY "HR and Admin manage candidates"
  ON public.candidates FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Interviewers view assigned candidates" ON public.candidates;
CREATE POLICY "Interviewers view assigned candidates"
  ON public.candidates FOR SELECT TO authenticated
  USING (interviewer_id = public.get_auth_employee_id());

-- ==============================================================================
-- Table 2: onboarding_checklists Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage onboarding_checklists" ON public.onboarding_checklists;
CREATE POLICY "HR and Admin manage onboarding_checklists"
  ON public.onboarding_checklists FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own onboarding_checklist" ON public.onboarding_checklists;
CREATE POLICY "Employees view own onboarding_checklist"
  ON public.onboarding_checklists FOR SELECT TO authenticated
  USING (
    employee_id = public.get_auth_employee_id()
    OR buddy_id = public.get_auth_employee_id()
  );

DROP POLICY IF EXISTS "Employees update own onboarding_checklist" ON public.onboarding_checklists;
CREATE POLICY "Employees update own onboarding_checklist"
  ON public.onboarding_checklists FOR UPDATE TO authenticated
  USING (employee_id = public.get_auth_employee_id())
  WITH CHECK (employee_id = public.get_auth_employee_id());

-- ==============================================================================
-- Table 3: announcements Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage announcements" ON public.announcements;
CREATE POLICY "HR and Admin manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view announcements" ON public.announcements;
CREATE POLICY "Employees view announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (true);

-- ==============================================================================
-- Table 4: notifications Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage notifications" ON public.notifications;
CREATE POLICY "HR and Admin manage notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own notifications" ON public.notifications;
CREATE POLICY "Employees view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    recipient_employee_id = public.get_auth_employee_id()
    OR (
      recipient_employee_id IS NULL
      AND (target_role IS NULL OR target_role = 'all' OR target_role = public.get_auth_role())
    )
  );

DROP POLICY IF EXISTS "Employees mark own notifications read" ON public.notifications;
CREATE POLICY "Employees mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    recipient_employee_id = public.get_auth_employee_id()
    OR recipient_employee_id IS NULL
  )
  WITH CHECK (
    recipient_employee_id = public.get_auth_employee_id()
    OR recipient_employee_id IS NULL
  );

-- ==============================================================================
-- Table 5: company_documents Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage company_documents" ON public.company_documents;
CREATE POLICY "HR and Admin manage company_documents"
  ON public.company_documents FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view active company_documents" ON public.company_documents;
CREATE POLICY "Employees view active company_documents"
  ON public.company_documents FOR SELECT TO authenticated
  USING (is_active = true);
