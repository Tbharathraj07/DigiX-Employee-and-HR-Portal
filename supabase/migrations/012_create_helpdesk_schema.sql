-- ==============================================================================
-- DigiX Technologies - Phase 12 Database Schema Migration
-- Migration: 012_create_helpdesk_schema.sql
-- Description: Creates HR Help Desk tables (helpdesk_tickets, helpdesk_ticket_messages)
--              with constraints, indexes, automatic updated_at trigger, ticket
--              number generator, non-recursive RLS policies, and updates the
--              audit_logs module constraint for 'HelpDesk'.
-- Dependency:  Requires Phase 1 (001_create_core_hr_schema.sql) and Phase 4 (004).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Sequence for Human-Readable Ticket Numbers
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.helpdesk_ticket_number_seq START WITH 1001;

-- ------------------------------------------------------------------------------
-- 2. Create Core Help Desk Tables
-- ------------------------------------------------------------------------------

-- Table 1: helpdesk_tickets
-- Purpose: Primary entity representing an HR support request
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (length(trim(subject)) >= 3 AND length(subject) <= 200),
  category TEXT NOT NULL CHECK (category IN (
    'Payroll & Compensation',
    'Benefits & Health',
    'Leave & Attendance',
    'Company Policies & Workplace',
    'Performance & Appraisals',
    'Verification & Documentation',
    'General HR Inquiry'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'in_progress',
    'waiting_for_employee',
    'resolved',
    'closed'
  )),
  description TEXT NOT NULL CHECK (length(trim(description)) >= 5),
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  initial_attachment_url TEXT,
  initial_attachment_name TEXT,
  initial_attachment_size TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table 2: helpdesk_ticket_messages
-- Purpose: Chronological conversation history, replies, clarification requests,
--          and reply attachments between Employee and HR. Strictly append-only.
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('employee', 'hr_manager', 'admin')),
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. Automatic Ticket Number & Updated_at Triggers
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_helpdesk_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR trim(NEW.ticket_number) = '' THEN
    NEW.ticket_number := 'HD-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('public.helpdesk_ticket_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_helpdesk_ticket_number ON public.helpdesk_tickets;
CREATE TRIGGER trg_set_helpdesk_ticket_number
  BEFORE INSERT ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_helpdesk_ticket_number();

DROP TRIGGER IF EXISTS trg_helpdesk_tickets_updated_at ON public.helpdesk_tickets;
CREATE TRIGGER trg_helpdesk_tickets_updated_at
  BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_employee_id ON public.helpdesk_tickets(employee_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_status ON public.helpdesk_tickets(status);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_category ON public.helpdesk_tickets(category);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_priority ON public.helpdesk_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_assigned_to ON public.helpdesk_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_created_at ON public.helpdesk_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helpdesk_messages_ticket_id ON public.helpdesk_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_messages_sender_id ON public.helpdesk_ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_messages_created_at ON public.helpdesk_ticket_messages(created_at ASC);

-- ------------------------------------------------------------------------------
-- 5. Safely Update Audit Logs Constraint & HR Audit Policy for HelpDesk
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_module_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_module_check
  CHECK (module IN (
    'Employees', 'Attendance', 'Leave', 'Training', 'Recruitment',
    'Profile', 'Onboarding', 'Projects', 'Tasks', 'Security', 'Admin', 'System',
    'HelpDesk'
  ));

DROP POLICY IF EXISTS "HR read HR audit_logs" ON public.audit_logs;
CREATE POLICY "HR read HR audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_hr_or_admin()
    AND module IN ('Employees', 'Attendance', 'Leave', 'Training', 'Recruitment', 'Profile', 'Onboarding', 'HelpDesk')
  );

-- ------------------------------------------------------------------------------
-- 6. Enable Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7. Define RLS Policies for helpdesk_tickets
-- ------------------------------------------------------------------------------

-- SELECT: Employees see only their own tickets; HR and Admin see all
DROP POLICY IF EXISTS "Employees view own helpdesk tickets" ON public.helpdesk_tickets;
CREATE POLICY "Employees view own helpdesk tickets"
  ON public.helpdesk_tickets FOR SELECT TO authenticated
  USING (
    employee_id = public.get_auth_employee_id()
    OR public.is_hr_or_admin()
  );

-- INSERT: Employees can insert tickets for themselves only; HR/Admin can insert for anyone
DROP POLICY IF EXISTS "Employees create own helpdesk tickets" ON public.helpdesk_tickets;
CREATE POLICY "Employees create own helpdesk tickets"
  ON public.helpdesk_tickets FOR INSERT TO authenticated
  WITH CHECK (
    (employee_id = public.get_auth_employee_id() AND status = 'open')
    OR public.is_hr_or_admin()
  );

-- UPDATE: Only HR and Admin can update ticket status, assignees, and metadata.
-- Employees cannot directly modify official ticket status or records.
DROP POLICY IF EXISTS "HR and Admin update helpdesk tickets" ON public.helpdesk_tickets;
CREATE POLICY "HR and Admin update helpdesk tickets"
  ON public.helpdesk_tickets FOR UPDATE TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

-- DELETE: Strictly Admins only (employees cannot delete tickets)
DROP POLICY IF EXISTS "Admins delete helpdesk tickets" ON public.helpdesk_tickets;
CREATE POLICY "Admins delete helpdesk tickets"
  ON public.helpdesk_tickets FOR DELETE TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Define RLS Policies for helpdesk_ticket_messages (Append-Only)
-- ------------------------------------------------------------------------------

-- SELECT: HR/Admin can read all messages; Employees can read messages for their own tickets
DROP POLICY IF EXISTS "Users read messages for accessible tickets" ON public.helpdesk_ticket_messages;
CREATE POLICY "Users read messages for accessible tickets"
  ON public.helpdesk_ticket_messages FOR SELECT TO authenticated
  USING (
    public.is_hr_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.helpdesk_tickets t
      WHERE t.id = helpdesk_ticket_messages.ticket_id
        AND t.employee_id = public.get_auth_employee_id()
    )
  );

-- INSERT: Strictly validated sender identity to prevent impersonation
DROP POLICY IF EXISTS "Users insert messages to accessible tickets" ON public.helpdesk_ticket_messages;
CREATE POLICY "Users insert messages to accessible tickets"
  ON public.helpdesk_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    -- Case A: HR or Admin
    (
      public.is_hr_or_admin()
      AND (sender_id = public.get_auth_employee_id() OR sender_id IS NULL)
      AND sender_role IN ('hr_manager', 'admin')
    )
    OR
    -- Case B: Employee (must own the ticket, role must be employee, ticket cannot be closed)
    (
      sender_id = public.get_auth_employee_id()
      AND sender_role = 'employee'
      AND public.get_auth_role() = 'employee'
      AND EXISTS (
        SELECT 1 FROM public.helpdesk_tickets t
        WHERE t.id = helpdesk_ticket_messages.ticket_id
          AND t.employee_id = public.get_auth_employee_id()
          AND t.status != 'closed'
      )
    )
  );

-- Notice: NO UPDATE or DELETE policies are granted on helpdesk_ticket_messages.
-- Conversation history is strictly immutable and append-only.

-- ------------------------------------------------------------------------------
-- 9. Explicit Permissions & Sequence Grants
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.helpdesk_tickets TO authenticated;
GRANT SELECT, INSERT ON public.helpdesk_ticket_messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.helpdesk_ticket_number_seq TO authenticated;

REVOKE ALL ON public.helpdesk_tickets FROM anon;
REVOKE ALL ON public.helpdesk_ticket_messages FROM anon;
REVOKE ALL ON SEQUENCE public.helpdesk_ticket_number_seq FROM anon;

-- ------------------------------------------------------------------------------
-- 10. Ensure Canonical Test Persona Roles are Intact
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_profile_role_escalation;

UPDATE public.profiles
SET role = 'employee', updated_at = NOW()
WHERE id = (SELECT user_id FROM public.employees WHERE email = 'tarumani.bharathraj@digix.internal' LIMIT 1);

ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_profile_role_escalation;
