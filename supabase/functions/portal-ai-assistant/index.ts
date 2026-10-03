// ==============================================================================
// DigiX Technologies - AI Assistant & Portal Knowledge Edge Function
// Function: portal-ai-assistant
// Path: supabase/functions/portal-ai-assistant/index.ts
// Description:
//   1. Authenticates caller via Supabase Auth JWT token (Strict RBAC/RLS).
//   2. Resolves caller's safe employee context (own balances, tasks, announcements).
//   3. Connects to configured AI Provider (Gemini / OpenAI) via environment secrets.
//   4. If no AI secret is set, gracefully provides authoritative portal guidance
//      from the corporate knowledge base without leaking or faking data.
// ==============================================================================

/// <reference path="../../deno.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  prompt?: string;
  message?: string;
  history?: Array<{ sender: string; text: string }>;
  userContext?: {
    name?: string;
    department?: string;
    designation?: string;
    role?: string;
  };
}

// Authoritative internal policy guidance for knowledge engine fallback
const PORTAL_KNOWLEDGE_INDEX: Array<{
  category: string;
  keywords: string[];
  reply: string;
}> = [
  {
    category: 'Leave & PTO',
    keywords: ['leave', 'vacation', 'apply', 'balance', 'pto', 'casual', 'sick', 'annual', 'time off', 'holiday'],
    reply: `You can apply for Casual, Sick, or Earned Privilege leave under the **Leave** section (/employee/leave).
- **Annual Quotas:** 12 Casual, 10 Sick, and 18 Earned Privilege leaves.
- **Workflow:** Submit dates and reason. Your request is automatically routed to HR Manager (Priyanka) for review.
- **Balance Tracking:** Check your current remaining balances live on the Leave dashboard.`
  },
  {
    category: 'Attendance & Clock-In',
    keywords: ['attendance', 'clock in', 'clock out', 'punch', 'hours', 'working hours', 'timing', 'late', 'login', 'checkin'],
    reply: `You can record your daily attendance from your **Employee Dashboard** or the **Attendance** page (/employee/attendance).
- **Business Hours:** 9:00 AM – 6:00 PM (Monday – Friday).
- **Duration Rules:** Working >= 8.5 hours records as Full Day; between 4.0 – 8.5 hours records as Half Day.
- **Punch Timer:** Your live session duration updates in real time on the dashboard.`
  },
  {
    category: 'Workplace & Remote Work',
    keywords: ['work from home', 'wfh', 'remote', 'hybrid', 'office', 'telecommute', 'location'],
    reply: `DigiX operates on a flexible hybrid policy.
- Engineering and Product squads collaborate on designated in-office sprint days.
- Remote work arrangements or emergency WFH can be coordinated directly with your reporting manager and HR.`
  },
  {
    category: 'Benefits & Health',
    keywords: ['insurance', 'health', 'medical', 'dental', 'benefits', 'hospital', 'coverage', 'mediclaim', 'claim'],
    reply: `DigiX provides 100% company-covered medical, dental, and vision insurance for full-time employees, with 80% coverage for eligible dependents.
- Policy documents, cashless hospital lists, and TPA enrollment numbers can be found under the **Documents** section (/employee/documents).`
  },
  {
    category: 'Payroll & Compensation',
    keywords: ['salary', 'payslip', 'pay', 'tax', 'form 16', 'bonus', 'compensation', 'payroll', 'bank', 'slip'],
    reply: `Salaries are disbursed on the final working day of each calendar month.
- Monthly payslips and statutory Form 16 certificates are archived under **Documents** (/employee/documents).
- For direct deposit or bank account revisions, submit a request via **My Profile** or contact HR.`
  },
  {
    category: 'Projects & Tasks',
    keywords: ['project', 'task', 'sprint', 'todo', 'kanban', 'deadline', 'assignment', 'status', 'milestone'],
    reply: `You can manage your work items in **My Projects** (/employee/projects) and **My Tasks** (/employee/tasks).
- Update task status (To Do, In Progress, In Review, Completed).
- Tasks are strictly isolated to assigned project team members to protect company confidentiality.`
  },
  {
    category: 'Training & Upskilling',
    keywords: ['training', 'course', 'certification', 'learn', 'upskill', 'compliance', 'progress', 'study', 'soc2'],
    reply: `Enrolled corporate learning programs and mandatory compliance courses (like SOC2 & Zero-Trust) are accessible on the **Training** page (/employee/training).
- Launch interactive modules, track completion percentages, and earn completion certificates.`
  },
  {
    category: 'Announcements & News',
    keywords: ['announcements', 'news', 'events', 'all hands', 'update', 'notice', 'broadcast', 'town hall'],
    reply: `Corporate town halls, policy notices, and company updates are published in the **Announcements** section (/employee/announcements) and highlighted on your dashboard.`
  },
  {
    category: 'Profile & Personal Details',
    keywords: ['profile', 'phone', 'address', 'contact', 'emergency', 'avatar', 'photo', 'edit profile'],
    reply: `Manage your personal details on the **My Profile** page (/employee/profile).
- **Profile Photo:** You can update your avatar photo anytime directly.
- **Legal Information:** Updates to legal name, phone number, or work location require submission of a Profile Change Request for HR approval.`
  },
  {
    category: 'IT & Hardware Support',
    keywords: ['it support', 'laptop', 'equipment', 'vpn', 'password', 'hardware', 'reset', 'security', 'credentials'],
    reply: `For IT equipment, developer machines, or VPN credentials, contact IT & Security Admin (Marcus Vance) or submit a ticket through the internal IT helpdesk.
- Note: Never disclose your DigiX portal password or multi-factor authentication tokens.`
  }
];

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Missing or invalid Authorization header.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // 2. Validate token and user session
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid or expired session token.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request payload
    const body: RequestBody = await req.json().catch(() => ({}));
    const userPrompt = (body.prompt || body.message || '').trim();

    if (!userPrompt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request: Prompt message cannot be empty.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Query safe employee context (Scoped strictly to this user via RLS)
    let employeeRecord: Record<string, unknown> | null = null;
    let leaveBalances: Array<Record<string, unknown>> = [];
    let activeAnnouncements: Array<Record<string, unknown>> = [];

    try {
      const { data: empData } = await supabaseUserClient
        .from('employees')
        .select('id, employee_id, name, department, designation, location')
        .eq('user_id', user.id)
        .maybeSingle();
      if (empData) employeeRecord = empData;

      if (employeeRecord?.id) {
        const { data: lbData } = await supabaseUserClient
          .from('leave_balances')
          .select('leave_type, total_days, used_days, remaining_days')
          .eq('employee_id', employeeRecord.id);
        if (lbData) leaveBalances = lbData;
      }

      const { data: annData } = await supabaseUserClient
        .from('announcements')
        .select('title, category, priority, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      if (annData) activeAnnouncements = annData;
    } catch (_ctxErr) {
      // Non-fatal if context lookup fails
    }

    const callerName = employeeRecord?.name || body.userContext?.name || user.email?.split('@')[0] || 'Team Member';
    const callerDept = employeeRecord?.department || body.userContext?.department || 'Technology';
    const callerDesignation = employeeRecord?.designation || body.userContext?.designation || 'Associate';

    // 4. Check for external AI Provider Key (Gemini or OpenAI)
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    // Case A: Gemini API is configured
    if (geminiKey) {
      try {
        const systemPrompt = `You are the DigiX AI Assistant, an internal HR and operations guide for DigiX Technologies.
User Context:
- Name: ${callerName}
- Department: ${callerDept}
- Designation: ${callerDesignation}
${leaveBalances.length ? `- Current Leave Balances: ${JSON.stringify(leaveBalances)}` : ''}
${activeAnnouncements.length ? `- Recent Announcements: ${JSON.stringify(activeAnnouncements)}` : ''}

Rules:
1. Answer questions concisely, professionally, and clearly.
2. For portal actions, guide the user to the correct page (/employee/leave, /employee/attendance, /employee/documents, /employee/projects, /employee/training, /employee/profile).
3. NEVER reveal or guess private information about any other employee.
4. If asked about something beyond DigiX corporate scope, politely clarify that you are trained on DigiX portal policies.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const aiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nEmployee Question: ${userPrompt}` }] }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600
            }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const generatedText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return new Response(
              JSON.stringify({
                success: true,
                reply: generatedText,
                provider: 'gemini',
                configured: true
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (geminiErr) {
        console.warn('[portal-ai-assistant] Gemini provider invocation error:', geminiErr);
      }
    }

    // Case B: OpenAI API is configured
    if (openaiKey) {
      try {
        const systemPrompt = `You are the DigiX AI Assistant, an internal HR and operations guide for DigiX Technologies.
User Context: Name: ${callerName}, Department: ${callerDept}, Designation: ${callerDesignation}.
Guide the user to portal sections (/employee/leave, /employee/attendance, /employee/documents, etc.). Never reveal another employee's private information.`;

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 600,
            temperature: 0.3
          })
        });

        if (openaiRes.ok) {
          const oaiData = await openaiRes.json();
          const generatedText = oaiData?.choices?.[0]?.message?.content;
          if (generatedText) {
            return new Response(
              JSON.stringify({
                success: true,
                reply: generatedText,
                provider: 'openai',
                configured: true
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (oaiErr) {
        console.warn('[portal-ai-assistant] OpenAI provider invocation error:', oaiErr);
      }
    }

    // Case C: Neither AI key is set — Authoritative Portal Knowledge Engine response
    // Match against verified knowledge base
    const lower = userPrompt.toLowerCase();
    let bestMatch = PORTAL_KNOWLEDGE_INDEX.find((item) =>
      item.keywords.some((k) => lower.includes(k))
    );

    let answerText = '';
    if (bestMatch) {
      answerText = `Hello ${callerName}, here is the official information regarding **${bestMatch.category}**:\n\n${bestMatch.reply}`;
    } else {
      answerText = `Hello ${callerName}, thank you for contacting the DigiX Portal Assistant.

I can assist you with:
- **Leave & Time-Off:** Applying for leaves, reviewing balances, and tracking approvals under /employee/leave.
- **Attendance & Timesheets:** Recording daily clock-in/clock-out under /employee/attendance.
- **Company Documents & Payslips:** Accessing tax forms and policy manuals under /employee/documents.
- **Training & Skills:** Enrolling in compliance courses and tracking certificates under /employee/training.
- **My Tasks & Sprints:** Tracking active project deliverables under /employee/tasks.
- **Profile Updates:** Updating your contact info or submitting HR verification requests under /employee/profile.

For specific policy exceptions or personal queries, please reach out to your reporting manager or HR Manager (Priyanka).`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply: answerText,
        provider: 'portal-knowledge',
        configured: false,
        note: 'AI Provider secret (GEMINI_API_KEY or OPENAI_API_KEY) is not yet set in Supabase Secrets. Using authoritative DigiX Portal Knowledge Engine.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[portal-ai-assistant] Unhandled error:', err);
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
