-- ==============================================================================
-- DigiX Technologies - Phase 2 Database Schema Migration
-- Migration: 002_create_employee_project_tables.sql
-- Description: Creates 8 production tables for profile change requests, leave balances,
--              employee documents, emergency contacts, projects, project members,
--              tasks, and task comments with constraints, indexes, triggers,
--              and non-recursive Row Level Security (RLS) policies.
-- Dependency:  Requires Phase 1 (001_create_core_hr_schema.sql) tables & functions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Core Phase 2 Tables (In Strict Dependency Order)
-- ------------------------------------------------------------------------------

-- Table 1: profile_change_requests
-- Purpose: Allow employees to request changes to profile fields subject to HR review
CREATE TABLE IF NOT EXISTS public.profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  current_value TEXT,
  requested_value TEXT,
  reason TEXT,
  supporting_document_url TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  hr_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 2: leave_balances
-- Purpose: Store employee leave balances per leave type and calendar year
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'casual', 'unpaid', 'other')),
  total_days NUMERIC(5,2) DEFAULT 0 NOT NULL CHECK (total_days >= 0),
  used_days NUMERIC(5,2) DEFAULT 0 NOT NULL CHECK (used_days >= 0),
  remaining_days NUMERIC(5,2) DEFAULT 0 NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_leave_balances_employee_type_year UNIQUE (employee_id, leave_type, year)
);

-- Table 3: employee_documents
-- Purpose: Store metadata and storage references for employee documents
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  storage_path TEXT,
  document_url TEXT,
  uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'expired', 'rejected', 'archived')),
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 4: emergency_contacts
-- Purpose: Store employee emergency contact details
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 5: projects
-- Purpose: Store company project directory and status
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planned' NOT NULL CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
  project_manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_project_dates_valid CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Table 6: project_members
-- Purpose: Connect employees to projects with project-specific roles
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_role TEXT CHECK (project_role IS NULL OR project_role IN ('developer', 'designer', 'tester', 'project_manager', 'analyst', 'other')),
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  removed_at TIMESTAMPTZ
);

-- Table 7: tasks
-- Purpose: Store project and employee task assignments and tracking
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 8: task_comments
-- Purpose: Store communication and comments on tasks
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. Security Helper Functions (Created AFTER project_members and tasks tables exist)
-- ------------------------------------------------------------------------------

-- Check if the current authenticated employee is an active member of a given project
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND employee_id = public.get_auth_employee_id()
      AND removed_at IS NULL
  );
$$;

-- Check if the current authenticated employee has permission to access a task
CREATE OR REPLACE FUNCTION public.can_access_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = p_task_id
      AND (
        t.assigned_to = public.get_auth_employee_id()
        OR (t.project_id IS NOT NULL AND public.is_project_member(t.project_id))
      )
  );
$$;

-- ------------------------------------------------------------------------------
-- 3. Performance Indexes & Partial Constraints
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_employee_id ON public.profile_change_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_status ON public.profile_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_reviewed_by ON public.profile_change_requests(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON public.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON public.leave_balances(year);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON public.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_employee_id ON public.emergency_contacts(employee_id);

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON public.projects(project_manager_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee_id ON public.project_members(employee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_employee_id ON public.task_comments(employee_id);

-- Enforce at most ONE primary emergency contact per employee
CREATE UNIQUE INDEX IF NOT EXISTS uq_emergency_contacts_single_primary
  ON public.emergency_contacts (employee_id)
  WHERE is_primary = true;

-- Prevent duplicate active membership for the same employee and project
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members_active
  ON public.project_members (project_id, employee_id)
  WHERE removed_at IS NULL;

-- ------------------------------------------------------------------------------
-- 4. Automatic updated_at Triggers (Reusing public.update_updated_at_column)
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_profile_change_requests_updated_at ON public.profile_change_requests;
CREATE TRIGGER trg_profile_change_requests_updated_at
  BEFORE UPDATE ON public.profile_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_leave_balances_updated_at ON public.leave_balances;
CREATE TRIGGER trg_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_employee_documents_updated_at ON public.employee_documents;
CREATE TRIGGER trg_employee_documents_updated_at
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_emergency_contacts_updated_at ON public.emergency_contacts;
CREATE TRIGGER trg_emergency_contacts_updated_at
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER trg_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 5. Enable Row Level Security (RLS) on all 8 Phase 2 tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. Define RLS Policies (Safely Replace Existing Policies)
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Table 1: profile_change_requests Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage profile_change_requests" ON public.profile_change_requests;
CREATE POLICY "HR and Admin manage profile_change_requests"
  ON public.profile_change_requests FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own profile_change_requests" ON public.profile_change_requests;
CREATE POLICY "Employees view own profile_change_requests"
  ON public.profile_change_requests FOR SELECT TO authenticated
  USING (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees create profile_change_requests" ON public.profile_change_requests;
CREATE POLICY "Employees create profile_change_requests"
  ON public.profile_change_requests FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.get_auth_employee_id()
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Employees cancel own pending profile_change_requests" ON public.profile_change_requests;
CREATE POLICY "Employees cancel own pending profile_change_requests"
  ON public.profile_change_requests FOR UPDATE TO authenticated
  USING (
    employee_id = public.get_auth_employee_id()
    AND status = 'pending'
  )
  WITH CHECK (
    employee_id = public.get_auth_employee_id()
    AND status = 'cancelled'
  );

-- ==============================================================================
-- Table 2: leave_balances Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage leave_balances" ON public.leave_balances;
CREATE POLICY "HR and Admin manage leave_balances"
  ON public.leave_balances FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own leave_balances" ON public.leave_balances;
CREATE POLICY "Employees view own leave_balances"
  ON public.leave_balances FOR SELECT TO authenticated
  USING (employee_id = public.get_auth_employee_id());

-- ==============================================================================
-- Table 3: employee_documents Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage employee_documents" ON public.employee_documents;
CREATE POLICY "HR and Admin manage employee_documents"
  ON public.employee_documents FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own employee_documents" ON public.employee_documents;
CREATE POLICY "Employees view own employee_documents"
  ON public.employee_documents FOR SELECT TO authenticated
  USING (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees upload own employee_documents" ON public.employee_documents;
CREATE POLICY "Employees upload own employee_documents"
  ON public.employee_documents FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.get_auth_employee_id()
    AND (uploaded_by IS NULL OR uploaded_by = public.get_auth_employee_id())
  );

-- ==============================================================================
-- Table 4: emergency_contacts Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "HR and Admin manage emergency_contacts"
  ON public.emergency_contacts FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Employees view own emergency_contacts"
  ON public.emergency_contacts FOR SELECT TO authenticated
  USING (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees create own emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Employees create own emergency_contacts"
  ON public.emergency_contacts FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees update own emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Employees update own emergency_contacts"
  ON public.emergency_contacts FOR UPDATE TO authenticated
  USING (employee_id = public.get_auth_employee_id())
  WITH CHECK (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees delete own emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Employees delete own emergency_contacts"
  ON public.emergency_contacts FOR DELETE TO authenticated
  USING (employee_id = public.get_auth_employee_id());

-- ==============================================================================
-- Table 5: projects Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage projects" ON public.projects;
CREATE POLICY "HR and Admin manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view assigned projects" ON public.projects;
CREATE POLICY "Employees view assigned projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    project_manager_id = public.get_auth_employee_id()
    OR public.is_project_member(id)
  );

-- ==============================================================================
-- Table 6: project_members Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage project_members" ON public.project_members;
CREATE POLICY "HR and Admin manage project_members"
  ON public.project_members FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Project managers view project members" ON public.project_members;
CREATE POLICY "Project managers view project members"
  ON public.project_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
        AND p.project_manager_id = public.get_auth_employee_id()
    )
  );

DROP POLICY IF EXISTS "Employees view own project_members" ON public.project_members;
CREATE POLICY "Employees view own project_members"
  ON public.project_members FOR SELECT TO authenticated
  USING (employee_id = public.get_auth_employee_id());

-- ==============================================================================
-- Table 7: tasks Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage tasks" ON public.tasks;
CREATE POLICY "HR and Admin manage tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view accessible tasks" ON public.tasks;
CREATE POLICY "Employees view accessible tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    assigned_to = public.get_auth_employee_id()
    OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  );

DROP POLICY IF EXISTS "Employees create tasks in member projects" ON public.tasks;
CREATE POLICY "Employees create tasks in member projects"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    project_id IS NOT NULL
    AND public.is_project_member(project_id)
    AND (created_by IS NULL OR created_by = public.get_auth_employee_id())
  );

DROP POLICY IF EXISTS "Employees update assigned tasks" ON public.tasks;
CREATE POLICY "Employees update assigned tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (assigned_to = public.get_auth_employee_id())
  WITH CHECK (assigned_to = public.get_auth_employee_id());

-- ==============================================================================
-- Table 8: task_comments Policies
-- ==============================================================================
DROP POLICY IF EXISTS "HR and Admin manage task_comments" ON public.task_comments;
CREATE POLICY "HR and Admin manage task_comments"
  ON public.task_comments FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view accessible task_comments" ON public.task_comments;
CREATE POLICY "Employees view accessible task_comments"
  ON public.task_comments FOR SELECT TO authenticated
  USING (public.can_access_task(task_id));

DROP POLICY IF EXISTS "Employees create own task_comments" ON public.task_comments;
CREATE POLICY "Employees create own task_comments"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.get_auth_employee_id()
    AND public.can_access_task(task_id)
  );

DROP POLICY IF EXISTS "Employees update own task_comments" ON public.task_comments;
CREATE POLICY "Employees update own task_comments"
  ON public.task_comments FOR UPDATE TO authenticated
  USING (employee_id = public.get_auth_employee_id())
  WITH CHECK (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees delete own task_comments" ON public.task_comments;
CREATE POLICY "Employees delete own task_comments"
  ON public.task_comments FOR DELETE TO authenticated
  USING (employee_id = public.get_auth_employee_id());
