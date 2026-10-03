-- ==============================================================================
-- DigiX Technologies - Phase 13 Database Schema Migration
-- Migration: 013_create_company_calendar_schema.sql
-- Description: Creates Company Calendar tables (company_holidays, calendar_events)
--              with constraints, indexes, automatic updated_at triggers, year calculation,
--              get_auth_department helper function, non-recursive RLS policies,
--              and updates the audit_logs module constraint for 'Calendar'.
-- Dependency:  Requires Phase 1 (001), Phase 4 (004), and Phase 12 (012).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Function: get_auth_department()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_department()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT department FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_department() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_auth_department() FROM anon;

-- ------------------------------------------------------------------------------
-- 2. Create Core Calendar Tables
-- ------------------------------------------------------------------------------

-- Table 1: company_holidays
-- Purpose: Government and public holidays observed by the company.
--          IMPORTANT: Weekends (Saturday/Sunday) are calculated dynamically in UI
--          and MUST NOT be stored as holiday records.
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) >= 2),
  date DATE NOT NULL,
  description TEXT,
  holiday_type TEXT NOT NULL DEFAULT 'public' CHECK (holiday_type IN (
    'public',
    'national',
    'state',
    'restricted',
    'company',
    'gazetted',
    'optional'
  )),
  location TEXT DEFAULT 'All Locations',
  year INTEGER NOT NULL,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_company_holidays_date_name UNIQUE (date, name)
);

-- Table 2: calendar_events
-- Purpose: Official company events, town halls, workshops, engagement activities,
--          and team meetings. Supports audience targeting (all, department, employee).
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) >= 3),
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  event_type TEXT NOT NULL DEFAULT 'company_event' CHECK (event_type IN (
    'company_event',
    'meeting',
    'team_meeting',
    'town_hall',
    'workshop',
    'engagement',
    'holiday_celebration',
    'company_activity',
    'training',
    'other'
  )),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'department', 'employee')),
  target_department TEXT,
  target_employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  location TEXT,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_event_times_valid CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

-- ------------------------------------------------------------------------------
-- 3. Automatic Triggers
-- ------------------------------------------------------------------------------

-- Year sync trigger for holidays
CREATE OR REPLACE FUNCTION public.set_holiday_year()
RETURNS TRIGGER AS $$
BEGIN
  NEW.year := EXTRACT(YEAR FROM NEW.date)::INTEGER;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_holiday_year ON public.company_holidays;
CREATE TRIGGER trg_set_holiday_year
  BEFORE INSERT OR UPDATE OF date ON public.company_holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.set_holiday_year();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_company_holidays_updated_at ON public.company_holidays;
CREATE TRIGGER trg_company_holidays_updated_at
  BEFORE UPDATE ON public.company_holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_company_holidays_date ON public.company_holidays(date);
CREATE INDEX IF NOT EXISTS idx_company_holidays_year ON public.company_holidays(year);
CREATE INDEX IF NOT EXISTS idx_company_holidays_type ON public.company_holidays(holiday_type);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_target_audience ON public.calendar_events(target_audience);
CREATE INDEX IF NOT EXISTS idx_calendar_events_target_dept ON public.calendar_events(target_department);
CREATE INDEX IF NOT EXISTS idx_calendar_events_target_emp ON public.calendar_events(target_employee_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);

-- ------------------------------------------------------------------------------
-- 5. Safely Update Audit Logs Constraint & HR Audit Policy for Calendar
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_module_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_module_check
  CHECK (module IN (
    'Employees', 'Attendance', 'Leave', 'Training', 'Recruitment',
    'Profile', 'Onboarding', 'Projects', 'Tasks', 'Security', 'Admin', 'System',
    'HelpDesk', 'Calendar'
  ));

DROP POLICY IF EXISTS "HR read HR audit_logs" ON public.audit_logs;
CREATE POLICY "HR read HR audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_hr_or_admin()
    AND module IN ('Employees', 'Attendance', 'Leave', 'Training', 'Recruitment', 'Profile', 'Onboarding', 'HelpDesk', 'Calendar')
  );

-- ------------------------------------------------------------------------------
-- 6. Enable Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7. Define RLS Policies for company_holidays
-- ------------------------------------------------------------------------------

-- SELECT: All authenticated employees/HR/Admin can read public holidays
DROP POLICY IF EXISTS "Authenticated users view holidays" ON public.company_holidays;
CREATE POLICY "Authenticated users view holidays"
  ON public.company_holidays FOR SELECT TO authenticated
  USING (true);

-- INSERT: HR and Admin only
DROP POLICY IF EXISTS "HR and Admin insert holidays" ON public.company_holidays;
CREATE POLICY "HR and Admin insert holidays"
  ON public.company_holidays FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_or_admin());

-- UPDATE: HR and Admin only
DROP POLICY IF EXISTS "HR and Admin update holidays" ON public.company_holidays;
CREATE POLICY "HR and Admin update holidays"
  ON public.company_holidays FOR UPDATE TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

-- DELETE: HR and Admin only
DROP POLICY IF EXISTS "HR and Admin delete holidays" ON public.company_holidays;
CREATE POLICY "HR and Admin delete holidays"
  ON public.company_holidays FOR DELETE TO authenticated
  USING (public.is_hr_or_admin());

-- ------------------------------------------------------------------------------
-- 8. Define RLS Policies for calendar_events
-- ------------------------------------------------------------------------------

-- SELECT: HR & Admin can view all events. Employees can view events targeted to 'all',
--         events targeted to their department, or events specifically targeted to them.
DROP POLICY IF EXISTS "Users view authorized calendar events" ON public.calendar_events;
CREATE POLICY "Users view authorized calendar events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (
    public.is_hr_or_admin()
    OR target_audience = 'all'
    OR (target_audience = 'department' AND target_department = public.get_auth_department())
    OR (target_audience = 'employee' AND target_employee_id = public.get_auth_employee_id())
  );

-- INSERT: HR and Admin only
DROP POLICY IF EXISTS "HR and Admin insert calendar events" ON public.calendar_events;
CREATE POLICY "HR and Admin insert calendar events"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_or_admin());

-- UPDATE: HR and Admin only
DROP POLICY IF EXISTS "HR and Admin update calendar events" ON public.calendar_events;
CREATE POLICY "HR and Admin update calendar events"
  ON public.calendar_events FOR UPDATE TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

-- DELETE: HR and Admin only
DROP POLICY IF EXISTS "HR and Admin delete calendar events" ON public.calendar_events;
CREATE POLICY "HR and Admin delete calendar events"
  ON public.calendar_events FOR DELETE TO authenticated
  USING (public.is_hr_or_admin());

-- ------------------------------------------------------------------------------
-- 9. Explicit Permissions & Anon Revocation
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_holidays TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;

REVOKE ALL ON public.company_holidays FROM anon;
REVOKE ALL ON public.calendar_events FROM anon;

-- ------------------------------------------------------------------------------
-- 10. Seed Canonical Verified Government Holidays (Year 2026)
-- ------------------------------------------------------------------------------
INSERT INTO public.company_holidays (name, date, description, holiday_type, location, year)
VALUES
  ('Republic Day', '2026-01-26', 'National Holiday celebrating the Constitution of India', 'national', 'All Locations', 2026),
  ('Maha Shivratri', '2026-02-17', 'Gazetted public holiday', 'public', 'All Locations', 2026),
  ('Holi', '2026-03-04', 'Festival of Colors - Public holiday', 'public', 'All Locations', 2026),
  ('Good Friday', '2026-04-03', 'Public Holiday observed across all centers', 'public', 'All Locations', 2026),
  ('Eid-ul-Fitr', '2026-03-21', 'Public holiday', 'public', 'All Locations', 2026),
  ('Independence Day', '2026-08-15', 'National Holiday celebrating Independence Day', 'national', 'All Locations', 2026),
  ('Gandhi Jayanti', '2026-10-02', 'National Holiday in honor of Mahatma Gandhi', 'national', 'All Locations', 2026),
  ('Dussehra (Vijayadashami)', '2026-10-20', 'Public holiday for Vijayadashami celebration', 'public', 'All Locations', 2026),
  ('Diwali (Deepavali)', '2026-11-08', 'Festival of Lights - Public holiday', 'national', 'All Locations', 2026),
  ('Christmas Day', '2026-12-25', 'Celebration of Christmas - Public holiday', 'public', 'All Locations', 2026)
ON CONFLICT (date, name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 11. Seed Initial Canonical Company Events
-- ------------------------------------------------------------------------------
INSERT INTO public.calendar_events (title, description, event_date, start_time, end_time, event_type, target_audience, location)
VALUES
  ('DigiX Q4 Annual Town Hall', 'Quarterly company-wide executive update and roadmap presentation by Leadership.', '2026-10-16', '10:00:00', '11:30:00', 'town_hall', 'all', 'Main Auditorium & Virtual Zoom'),
  ('Engineering Tech Sprint Review', 'Sprint retrospective and Q4 architecture showcase for Web Platform.', '2026-10-28', '14:00:00', '15:30:00', 'meeting', 'department', 'Tech Hub Room 3B')
ON CONFLICT DO NOTHING;

UPDATE public.calendar_events
SET target_department = 'Technology'
WHERE title = 'Engineering Tech Sprint Review';
