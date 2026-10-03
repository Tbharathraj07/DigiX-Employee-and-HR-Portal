// ==============================================================================
// DigiX Technologies - AI Assistant Service
// File: src/services/aiAssistantService.js
// Description:
//   Modular, production-grade service for DigiX AI Assistant.
//   1. Tries calling Supabase Edge Function 'portal-ai-assistant'.
//   2. If Edge Function succeeds, returns live AI / server response.
//   3. If Edge Function is unavailable (404/500 or offline), cleanly falls back
//      to authoritative internal DigiX Portal Knowledge Engine with user's
//      scoped context without using fake employee records.
//   4. Never exposes API keys or secrets in frontend code.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// Authoritative corporate portal knowledge rules
const PORTAL_KNOWLEDGE_BASE = [
  {
    category: 'Leave & Time-Off',
    keywords: ['leave', 'vacation', 'apply', 'balance', 'pto', 'casual', 'sick', 'annual', 'time off', 'holiday'],
    generateReply: (user, ctx) => {
      let balanceSummary = '';
      if (ctx?.leaveBalances && ctx.leaveBalances.length > 0) {
        const balTexts = ctx.leaveBalances.map(
          (b) => `${b.type || b.leave_type || 'Leave'}: ${b.remaining != null ? b.remaining : b.remaining_days} remaining`
        );
        balanceSummary = `\n\n**Your Current Live Leave Balances:**\n• ${balTexts.join('\n• ')}`;
      }

      return `You can apply for Casual, Sick, or Earned Privilege leave under the **Leave** section (/employee/leave).${balanceSummary}

**How to apply:**
1. Navigate to the **Leave** tab in your sidebar.
2. Select your Leave Type (Casual, Sick, or Annual) and choose the start and end dates.
3. Provide a brief reason and click **Submit Request**.
4. Your request will be routed directly to HR Manager (Priyanka) for review and status tracking.`;
    }
  },
  {
    category: 'Attendance & Working Hours',
    keywords: ['attendance', 'clock in', 'clock out', 'punch', 'hours', 'working hours', 'timing', 'late', 'login', 'check in', 'check out'],
    generateReply: (_user, ctx) => {
      const punchStatus = ctx?.isPunchedIn
        ? '🟢 You are currently **clocked in**.'
        : '⚪ You are currently **clocked out**.';

      return `${punchStatus}

You can record your daily attendance from your **Employee Dashboard** or the **Attendance** page (/employee/attendance).

**Working Hours Guidelines:**
• Standard operating hours: **9:00 AM – 6:00 PM** (Monday through Friday).
• **Full Day:** Recorded when total working hours exceed 8.5 hours.
• **Half Day:** Recorded for shifts between 4.0 and 8.5 hours.
• Your live working duration counter updates continuously while active.`;
    }
  },
  {
    category: 'Hybrid & Remote Work Policy',
    keywords: ['work from home', 'wfh', 'remote', 'hybrid', 'office', 'telecommute', 'location', 'desk'],
    generateReply: (user) => {
      const dept = user?.department || 'your department';
      return `DigiX operates on a flexible hybrid policy for the **${dept}** division.

• Core collaboration and sprint alignment days are scheduled mid-week.
• Remote work flexibility is accommodated based on project sprint milestones.
• For extended WFH or relocation requests, submit a formal request via **My Profile** (/employee/profile) under location changes for HR approval.`;
    }
  },
  {
    category: 'Health, Insurance & Benefits',
    keywords: ['insurance', 'health', 'medical', 'dental', 'benefits', 'hospital', 'coverage', 'mediclaim', 'claim', 'tpa'],
    generateReply: () => {
      return `DigiX Technologies provides comprehensive group health, dental, and vision insurance coverage.

**Key Benefits:**
• 100% company-covered medical premium for full-time employees.
• 80% dependent medical coverage.
• Cashless hospitalization across partner hospital networks.
• Health policy documents and cashless claim forms can be downloaded from the **Documents** section (/employee/documents) under Company Policies.`;
    }
  },
  {
    category: 'Payroll & Payslips',
    keywords: ['salary', 'payslip', 'pay', 'tax', 'form 16', 'bonus', 'compensation', 'payroll', 'bank', 'slip', 'wages'],
    generateReply: () => {
      return `Salaries are disbursed into your registered corporate bank account on the **last business day of every calendar month**.

**Payslips & Tax Documents:**
• Monthly payslips and statutory Form 16 certificates are archived under **Documents** (/employee/documents).
• For bank account revisions or tax deduction inquiries, submit a ticket through HR or update your bank mandate under Profile.`;
    }
  },
  {
    category: 'Projects & Tasks',
    keywords: ['project', 'task', 'sprint', 'todo', 'kanban', 'deadline', 'assignment', 'status', 'milestone'],
    generateReply: (_user, ctx) => {
      let taskSummary = '';
      if (ctx?.tasks && ctx.tasks.length > 0) {
        const pending = ctx.tasks.filter((t) => t.status !== 'completed');
        taskSummary = `\n\n**Your Current Tasks:** You currently have **${pending.length}** open task(s) assigned across your projects.`;
      }

      return `You can track and manage all deliverables under **My Projects** (/employee/projects) and **My Tasks** (/employee/tasks).${taskSummary}

• Update your task status between To Do, In Progress, In Review, and Completed.
• All project data is isolated strictly to project team members to protect enterprise client confidentiality.`;
    }
  },
  {
    category: 'Training & Certifications',
    keywords: ['training', 'course', 'certification', 'learn', 'upskill', 'compliance', 'progress', 'study', 'soc2'],
    generateReply: (_user, ctx) => {
      let trainingSummary = '';
      if (ctx?.trainings && ctx.trainings.length > 0) {
        trainingSummary = `\n\n**Enrolled Programs:** You have **${ctx.trainings.length}** active training module(s) on your catalog.`;
      }

      return `Access mandatory compliance modules and technical masterclasses on the **Training** page (/employee/training).${trainingSummary}

• Complete mandatory annual SOC2 and Zero-Trust Security modules.
• You can update your learning progress percentages as you finish sections.`;
    }
  },
  {
    category: 'Company Announcements & Town Halls',
    keywords: ['announcement', 'announcements', 'company news', 'corporate events', 'all hands', 'company notice', 'broadcast', 'town hall'],
    generateReply: (_user, ctx) => {
      let recentAnn = '';
      if (ctx?.announcements && ctx.announcements.length > 0) {
        const top = ctx.announcements.slice(0, 2);
        recentAnn = `\n\n**Recent Announcements:**\n• ${top.map((a) => `"${a.title}" (${a.category})`).join('\n• ')}`;
      }

      return `Official corporate news, town hall invites, and policy updates are published in the **Announcements** section (/employee/announcements) and summarized on your dashboard.${recentAnn}`;
    }
  },
  {
    category: 'Profile & Contact Details',
    keywords: ['profile', 'phone', 'address', 'contact', 'emergency', 'avatar', 'photo', 'edit profile', 'my profile', 'update photo'],
    generateReply: (user) => {
      return `Manage your corporate identity and contact information in **My Profile** (/employee/profile).

• **Avatar:** You (${user?.name || 'Employee'}) can change your profile photo directly at any time.
• **Contact / Emergency Details:** Updates to legal name, phone number, location, or emergency contacts require submitting a Profile Change Request with verification documents for HR approval.`;
    }
  },
  {
    category: 'IT Hardware & Security Helpdesk',
    keywords: ['it support', 'laptop', 'equipment', 'vpn', 'password', 'hardware', 'reset', 'security', 'credentials'],
    generateReply: () => {
      return `For IT hardware, software licenses, VPN configuration, or credential resets:

• Contact **IT & Security Administrator** (Marcus Vance) at it-support@digix.internal.
• Password resets and session revocations can be managed under System Settings or the IT desk.
• **Security Warning:** DigiX IT will never ask for your password or verification codes.`;
    }
  }
];

/**
 * Ask the DigiX AI Assistant a question.
 *
 * @param {Object} params
 * @param {string} params.prompt - The employee question
 * @param {Object} params.user - Current authenticated user
 * @param {Object} params.portalContext - Live context (leaveBalances, tasks, trainings, announcements, isPunchedIn)
 * @param {Array} params.history - Previous chat messages
 * @returns {Promise<{ reply: string, provider: string, configured: boolean, error?: string }>}
 */
export async function askPortalAssistant({ prompt, user, portalContext = {}, history = [] }) {
  const cleanPrompt = (prompt || '').trim();
  if (!cleanPrompt) {
    return {
      success: false,
      error: 'Please enter a question or select one of the suggested prompts.'
    };
  }

  // 1. Attempt calling Supabase Edge Function 'portal-ai-assistant'
  if (isSupabaseConfigured && user?.isSupabaseAuth) {
    try {
      const { data, error } = await supabase.functions.invoke('portal-ai-assistant', {
        body: {
          prompt: cleanPrompt,
          history: history.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text
          })),
          userContext: {
            name: user?.name,
            department: user?.department,
            designation: user?.designation,
            role: user?.role
          }
        }
      });

      if (!error && data && data.success && data.reply) {
        return {
          success: true,
          reply: data.reply,
          provider: data.provider || 'gemini',
          configured: Boolean(data.configured),
          note: data.note || null
        };
      }
    } catch (edgeErr) {
      console.warn('[aiAssistantService] Edge Function invoke failed, proceeding to knowledge engine fallback:', edgeErr.message);
    }
  }

  // 2. Intelligent, context-aware Knowledge Engine fallback
  const lower = cleanPrompt.toLowerCase();
  let bestMatch = null;
  let highestScore = 0;

  for (const item of PORTAL_KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      if (lower.includes(kw)) {
        score += kw.length; // More specific multi-character matches score higher
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  let replyText = '';
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  if (bestMatch) {
    replyText = `Hello ${firstName}! Here is the guidance regarding **${bestMatch.category}**:\n\n${bestMatch.generateReply(user, portalContext)}`;
  } else {
    replyText = `Hello ${firstName}! 👋 Thank you for asking about "${cleanPrompt}".

I am the **DigiX Portal Assistant**. While the external cloud AI provider key is being configured, I can help you navigate all DigiX portal operations:

• **Leave & Time-Off:** Check balances and apply at /employee/leave
• **Attendance:** Clock-in and review working hours at /employee/attendance
• **Company Documents:** Download payslips, tax forms & policies at /employee/documents
• **Projects & Tasks:** Review assigned deliverables at /employee/tasks
• **Training Modules:** Complete mandatory SOC2 & compliance learning at /employee/training
• **Announcements:** Read leadership broadcasts at /employee/announcements
• **Profile Revisions:** Update contact info or photo at /employee/profile

For personalized HR policy exceptions or queries, please contact HR Manager (Priyanka) directly.`;
  }

  return {
    success: true,
    reply: replyText,
    provider: 'portal-knowledge',
    configured: false,
    note: 'Running on DigiX Portal Knowledge Engine.'
  };
}
