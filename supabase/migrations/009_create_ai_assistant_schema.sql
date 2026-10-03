-- ==============================================================================
-- DigiX Technologies - AI Assistant & Portal Knowledge Base Schema
-- Migration: 009_create_ai_assistant_schema.sql
-- Description:
--   1. Creates public.portal_knowledge_base for corporate FAQ, policy guides,
--      benefits, attendance, leave, and IT procedures.
--   2. Creates public.ai_conversations for secure, per-user chat persistence.
--   3. Configures Row Level Security (RLS) ensuring strict cross-employee data
--      isolation: employees only access their own conversation logs and active
--      portal policies suitable for their role.
--   4. Adds GIN and B-Tree indexes for fast text and keyword lookups.
--   5. Seeds authoritative DigiX enterprise knowledge articles.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create portal_knowledge_base Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  target_role TEXT NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_portal_kb_target_role CHECK (target_role IN ('all', 'employee', 'hr_manager', 'admin')),
  CONSTRAINT chk_portal_kb_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT chk_portal_kb_answer_not_empty CHECK (length(trim(answer)) > 0)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_portal_kb_category ON public.portal_knowledge_base (category);
CREATE INDEX IF NOT EXISTS idx_portal_kb_target_role ON public.portal_knowledge_base (target_role);
CREATE INDEX IF NOT EXISTS idx_portal_kb_is_active ON public.portal_knowledge_base (is_active);
CREATE INDEX IF NOT EXISTS idx_portal_kb_keywords_gin ON public.portal_knowledge_base USING GIN (keywords);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_portal_knowledge_base_updated_at ON public.portal_knowledge_base;
CREATE TRIGGER set_portal_knowledge_base_updated_at
  BEFORE UPDATE ON public.portal_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 2. Create ai_conversations Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_ai_conversations_role CHECK (role IN ('user', 'assistant', 'system')),
  CONSTRAINT chk_ai_conversations_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Indexes for fast per-user conversation retrieval
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_id ON public.ai_conversations (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON public.ai_conversations (created_at ASC);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
ALTER TABLE public.portal_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.portal_knowledge_base TO authenticated;
GRANT ALL ON TABLE public.portal_knowledge_base TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_conversations TO authenticated;

-- Revoke all access from anonymous users
REVOKE ALL ON TABLE public.portal_knowledge_base FROM anon;
REVOKE ALL ON TABLE public.ai_conversations FROM anon;

-- Knowledge Base Policies:
-- Authenticated users can view active knowledge articles applicable to their role
DROP POLICY IF EXISTS "Authenticated users view active knowledge base" ON public.portal_knowledge_base;
CREATE POLICY "Authenticated users view active knowledge base"
  ON public.portal_knowledge_base FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (
      target_role = 'all'
      OR target_role = (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1)
      OR public.is_hr_or_admin()
    )
  );

-- Only HR and Admin can manage knowledge base articles
DROP POLICY IF EXISTS "HR and Admin manage knowledge base" ON public.portal_knowledge_base;
CREATE POLICY "HR and Admin manage knowledge base"
  ON public.portal_knowledge_base FOR ALL TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

-- AI Conversations Policies:
-- Strict per-user isolation: Employees can ONLY view, insert, or manage their own conversation records
DROP POLICY IF EXISTS "Users view own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users view own ai conversations"
  ON public.ai_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users insert own ai conversations"
  ON public.ai_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users delete own ai conversations"
  ON public.ai_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 4. Seed Official Knowledge Base Articles
-- ------------------------------------------------------------------------------
INSERT INTO public.portal_knowledge_base (category, title, question, answer, keywords, target_role, is_active)
VALUES
  (
    'Leave & Time Off',
    'Applying for Leave and Balance Rules',
    'How do I apply for casual, sick, or privilege leave and check my balance?',
    'You can apply for Casual, Sick, or Earned Privilege leave anytime under the **Leave** section (/employee/leave). DigiX provides 12 Casual Leaves, 10 Sick Leaves, and 18 Earned Privilege leaves annually with up to 5 days carry-forward. Once submitted, your request is reviewed by HR Manager (Priyanka) with real-time status updates.',
    ARRAY['leave', 'vacation', 'apply', 'balance', 'pto', 'casual', 'sick', 'annual', 'time off', 'holiday'],
    'all',
    true
  ),
  (
    'Attendance & Working Hours',
    'Daily Attendance and Clock-In/Clock-Out Policy',
    'How do I clock in and what are the working hours guidelines?',
    'You can clock in and clock out directly from your **Employee Dashboard** or the **Attendance** page (/employee/attendance). DigiX standard business hours are 9:00 AM to 6:00 PM (Monday through Friday). Sessions exceeding 8.5 hours are recorded as full day, and between 4 to 8.5 hours as half day.',
    ARRAY['attendance', 'clock in', 'clock out', 'punch', 'hours', 'working hours', 'timing', 'late', 'login'],
    'all',
    true
  ),
  (
    'Workplace & Remote Policy',
    'Hybrid & Work From Home Guidelines',
    'What is our hybrid and work from home policy?',
    'DigiX Technologies operates on a flexible hybrid policy. For Technology teams in Hyderabad and global branches, collaborative sprint planning and design sessions occur on designated hybrid days. Remote exceptions can be submitted through manager and HR approval.',
    ARRAY['work from home', 'wfh', 'remote', 'hybrid', 'office', 'telecommute', 'location'],
    'all',
    true
  ),
  (
    'Benefits & Health',
    'Medical, Dental & Insurance Benefits',
    'How do I claim health and medical insurance benefits?',
    'DigiX provides comprehensive medical, dental, and vision insurance for full-time employees and their eligible dependents. You can review policy details and download benefit summary forms in the **Documents** section (/employee/documents) under Company Policies.',
    ARRAY['insurance', 'health', 'medical', 'dental', 'benefits', 'hospital', 'coverage', 'mediclaim'],
    'all',
    true
  ),
  (
    'Payroll & Compensation',
    'Salary Processing and Payslip Retrieval',
    'When do we get paid and where are payslips stored?',
    'Salaries are processed on the last business day of every month. Your monthly payslips and annual tax documentation are securely archived in the **Documents** section (/employee/documents) under your personal records.',
    ARRAY['salary', 'payslip', 'pay', 'tax', 'form 16', 'bonus', 'compensation', 'payroll', 'bank'],
    'all',
    true
  ),
  (
    'Projects & Tasks',
    'Project Assignment and Task Tracking',
    'How do I track my assigned projects and sprint tasks?',
    'Navigate to **My Projects** (/employee/projects) and **My Tasks** (/employee/tasks) to view tasks assigned to you. You can update task status (To Do, In Progress, In Review, Completed), attach notes, and track progress against project deadlines.',
    ARRAY['project', 'task', 'sprint', 'todo', 'kanban', 'deadline', 'assignment', 'status'],
    'all',
    true
  ),
  (
    'Training & Upskilling',
    'Corporate Training Modules and Certifications',
    'How do I enroll in training programs and track learning progress?',
    'Visit the **Training** page (/employee/training) to view your enrolled courses and mandatory compliance certifications (such as SOC2 & Zero-Trust Security). You can launch courses and update your learning progress percentages directly on the card.',
    ARRAY['training', 'course', 'certification', 'learn', 'upskill', 'compliance', 'progress', 'study'],
    'all',
    true
  ),
  (
    'Corporate Communications',
    'Company Announcements and Town Hall Updates',
    'Where do I find official company announcements and events?',
    'All official corporate broadcasts, quarterly all-hands invitations, and leadership notices are posted on the **Announcements** page (/employee/announcements) and appear on your Employee Dashboard.',
    ARRAY['announcements', 'news', 'events', 'all hands', 'update', 'notice', 'broadcast'],
    'all',
    true
  ),
  (
    'IT & Technical Support',
    'Hardware, Laptop, VPN, and Credential Resets',
    'How do I request IT equipment or report security issues?',
    'For IT hardware requests, VPN access, or password resets, contact the IT & Security desk via Marcus Vance (System Administrator) or visit the IT Helpdesk channel. Never share your DigiX portal password or auth tokens.',
    ARRAY['it support', 'laptop', 'equipment', 'vpn', 'password', 'hardware', 'reset', 'security'],
    'all',
    true
  ),
  (
    'Profile & Records',
    'Updating Personal Information and Emergency Contacts',
    'How do I update my contact number, address, or emergency contact?',
    'Go to **My Profile** (/employee/profile). You can update your profile avatar directly at any time. For legal name, phone, or location changes, submit a Profile Change Request which routes to HR for review and approval.',
    ARRAY['profile', 'phone', 'address', 'contact', 'emergency contact', 'avatar', 'photo', 'edit profile'],
    'all',
    true
  )
ON CONFLICT DO NOTHING;
