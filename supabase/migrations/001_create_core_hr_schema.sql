-- ==============================================================================
-- DigiX Technologies - Core HR PostgreSQL Schema Migration
-- Migration: 001_create_core_hr_schema.sql
-- Description: Creates the 6 core production tables, relationships, constraints,
--              indexes, automatic updated_at triggers, and non-recursive RLS policies.
-- ==============================================================================

-- 1. Helper function for updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Create Core Tables
-- ------------------------------------------------------------------------------

-- Table 1: profiles
-- Purpose: Connect Supabase Auth users with their application role
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID, -- Foreign key to employees(id) added after employees table creation
  role TEXT NOT NULL CHECK (role IN ('employee', 'hr_manager', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 2: employees
-- Purpose: Store employee directory information
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department TEXT,
  designation TEXT,
  location TEXT,
  joining_date DATE,
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'on_leave', 'resigned')),
  profile_photo TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Link profiles.employee_id -> employees.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_employee'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_employee
      FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Table 3: attendance
-- Purpose: Store daily check-in and check-out records
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present' NOT NULL CHECK (status IN ('present', 'late', 'absent', 'on_leave')),
  work_mode TEXT DEFAULT 'office' NOT NULL CHECK (work_mode IN ('office', 'remote', 'hybrid')),
  total_hours NUMERIC(6,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, attendance_date)
);

-- Table 4: leave_requests
-- Purpose: Store employee leave requests and HR approval workflow
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  hr_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_leave_dates_valid CHECK (end_date >= start_date)
);

-- Table 5: training
-- Purpose: Store company training courses created by HR
CREATE TABLE IF NOT EXISTS public.training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  instructor TEXT,
  duration TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'upcoming' NOT NULL CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 6: training_assignments
-- Purpose: Connect employees with assigned training programs
CREATE TABLE IF NOT EXISTS public.training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.training(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'assigned' NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed')),
  completion_percent INTEGER DEFAULT 0 NOT NULL CHECK (completion_percent >= 0 AND completion_percent <= 100),
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  CONSTRAINT uq_training_employee UNIQUE (training_id, employee_id)
);

-- ------------------------------------------------------------------------------
-- 3. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_training_status ON public.training(status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_employee_id ON public.training_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_training_id ON public.training_assignments(training_id);

-- ------------------------------------------------------------------------------
-- 4. Automatic updated_at Triggers
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_training_updated_at ON public.training;
CREATE TRIGGER trg_training_updated_at
  BEFORE UPDATE ON public.training
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_training_assignments_updated_at ON public.training_assignments;
CREATE TRIGGER trg_training_assignments_updated_at
  BEFORE UPDATE ON public.training_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Helper Functions (Non-Recursive & Safe)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. Enable Row Level Security (RLS) on all 6 tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7. Define RLS Policies
-- ------------------------------------------------------------------------------

-- Policies on: profiles
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
CREATE POLICY "Admins full access to profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "HR read profiles" ON public.profiles;
CREATE POLICY "HR read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_hr_or_admin());

-- Policies on: employees
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

-- Policies on: attendance
DROP POLICY IF EXISTS "Admins full access to attendance" ON public.attendance;
CREATE POLICY "Admins full access to attendance"
  ON public.attendance FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "HR manage attendance" ON public.attendance;
CREATE POLICY "HR manage attendance"
  ON public.attendance FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own attendance" ON public.attendance;
CREATE POLICY "Employees view own attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees log own attendance" ON public.attendance;
CREATE POLICY "Employees log own attendance"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees update own attendance" ON public.attendance;
CREATE POLICY "Employees update own attendance"
  ON public.attendance FOR UPDATE TO authenticated
  USING (employee_id = public.get_auth_employee_id())
  WITH CHECK (employee_id = public.get_auth_employee_id());

-- Policies on: leave_requests
DROP POLICY IF EXISTS "Admins full access to leave_requests" ON public.leave_requests;
CREATE POLICY "Admins full access to leave_requests"
  ON public.leave_requests FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "HR manage leave_requests" ON public.leave_requests;
CREATE POLICY "HR manage leave_requests"
  ON public.leave_requests FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own leave_requests" ON public.leave_requests;
CREATE POLICY "Employees view own leave_requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees create leave_requests" ON public.leave_requests;
CREATE POLICY "Employees create leave_requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees update pending leave_requests" ON public.leave_requests;
CREATE POLICY "Employees update pending leave_requests"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (employee_id = public.get_auth_employee_id() AND status = 'pending')
  WITH CHECK (employee_id = public.get_auth_employee_id() AND status IN ('pending', 'cancelled'));

-- Policies on: training
DROP POLICY IF EXISTS "HR and Admin manage training" ON public.training;
CREATE POLICY "HR and Admin manage training"
  ON public.training FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view assigned training" ON public.training;
CREATE POLICY "Employees view assigned training"
  ON public.training FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.training_assignments ta
      WHERE ta.training_id = training.id
        AND ta.employee_id = public.get_auth_employee_id()
    )
  );

-- Policies on: training_assignments
DROP POLICY IF EXISTS "HR and Admin manage training_assignments" ON public.training_assignments;
CREATE POLICY "HR and Admin manage training_assignments"
  ON public.training_assignments FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

DROP POLICY IF EXISTS "Employees view own assignments" ON public.training_assignments;
CREATE POLICY "Employees view own assignments"
  ON public.training_assignments FOR SELECT TO authenticated
  USING (employee_id = public.get_auth_employee_id());

DROP POLICY IF EXISTS "Employees update own assignment progress" ON public.training_assignments;
CREATE POLICY "Employees update own assignment progress"
  ON public.training_assignments FOR UPDATE TO authenticated
  USING (employee_id = public.get_auth_employee_id())
  WITH CHECK (employee_id = public.get_auth_employee_id());
