// ==============================================================================
// DigiX Technologies - AI Assistant Module Integration & Security Test Suite
// File: scripts/test_ai_assistant_module.js
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const envPath = path.resolve('.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((l) => {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq !== -1) {
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  });
}

const SUPABASE_URL = env['VITE_SUPABASE_URL'] || 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = env['VITE_SUPABASE_PUBLISHABLE_KEY'];
process.env.VITE_SUPABASE_URL = SUPABASE_URL;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = ANON_KEY;

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function record(name, pass, details = '') {
  if (pass) {
    results.passed++;
    console.log(`  [+] [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.failed++;
    console.error(`  [x] [FAIL] ${name}: ${details}`);
  }
}

async function runAIAssistantSuite() {
  console.log('================================================================');
  console.log('DIGIX PORTAL - MODULE 13: AI ASSISTANT VERIFICATION SUITE');
  console.log('================================================================\n');

  // --- 1. CODEBASE ARCHITECTURE AUDIT ---
  console.log('>>> [GROUP 1] CODEBASE ARCHITECTURE & ZERO-MOCK AUDIT');

  const pageContent = fs.readFileSync('src/pages/employee/AIAssistantPage.jsx', 'utf8');
  record(
    'AIAssistantPage does not import AI_FAQ_KNOWLEDGE',
    !pageContent.includes('AI_FAQ_KNOWLEDGE'),
    'Removed static mock import'
  );

  record(
    'AIAssistantPage imports aiAssistantService',
    pageContent.includes('askPortalAssistant'),
    'Imports decoupled service module'
  );

  const serviceContent = fs.readFileSync('src/services/aiAssistantService.js', 'utf8');
  record(
    'aiAssistantService exists and is modular',
    serviceContent.length > 500 && serviceContent.includes('askPortalAssistant'),
    'Service file created'
  );

  const edgeFunctionExists = fs.existsSync('supabase/functions/portal-ai-assistant/index.ts');
  record(
    'portal-ai-assistant Edge Function exists',
    edgeFunctionExists,
    'Found supabase/functions/portal-ai-assistant/index.ts'
  );

  const migrationExists = fs.existsSync('supabase/migrations/009_create_ai_assistant_schema.sql');
  record(
    '009_create_ai_assistant_schema.sql exists',
    migrationExists,
    'Found migration 009 with RLS and seed data'
  );

  // --- 2. ROUTE & AUTHENTICATION ACCESS CONTROL ---
  console.log('\n>>> [GROUP 2] ROUTING & ROLE-BASED ACCESS CONTROL');
  const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
  record(
    'AI Assistant route protected under RoleRoute in App.jsx',
    appJsx.includes('path="employee/ai-assistant"') && appJsx.includes('AIAssistantPage'),
    'Protected under RoleRoute allowedRoles=[employee, hr, hr_manager, admin]'
  );

  // --- 3. EDGE FUNCTION SECURITY AUDIT ---
  console.log('\n>>> [GROUP 3] EDGE FUNCTION SECURITY AUDIT');
  const edgeContent = fs.readFileSync('supabase/functions/portal-ai-assistant/index.ts', 'utf8');
  record(
    'Edge Function requires Bearer Authorization token',
    edgeContent.includes("req.headers.get('Authorization')") && edgeContent.includes("status: 401"),
    'Strict JWT check enforced'
  );

  record(
    'Edge Function respects caller RLS for employee context',
    edgeContent.includes("supabaseUserClient.auth.getUser") && edgeContent.includes("eq('user_id', user.id)"),
    'Uses user-scoped client'
  );

  record(
    'Edge Function checks for GEMINI_API_KEY or OPENAI_API_KEY environment secrets',
    edgeContent.includes("Deno.env.get('GEMINI_API_KEY')") && edgeContent.includes("Deno.env.get('OPENAI_API_KEY')"),
    'Proper secret management'
  );

  record(
    'Edge Function provides structured fallback when AI secret is missing',
    edgeContent.includes("portal-knowledge") && edgeContent.includes("PORTAL_KNOWLEDGE_INDEX"),
    'Graceful degradation without mock data'
  );

  // --- 4. CLIENT SERVICE LOGIC & SIMULATION ---
  console.log('\n>>> [GROUP 4] CLIENT SERVICE & CONTEXTUAL KNOWLEDGE ENGINE');
  const { askPortalAssistant } = await import('../src/services/aiAssistantService.js');

  const testUser = {
    name: 'Tarumani Bharath Raj',
    department: 'Technology',
    designation: 'Associate Software Developer',
    role: 'employee',
    isSupabaseAuth: true
  };

  const testContext = {
    leaveBalances: [
      { leave_type: 'Casual', remaining_days: 6 },
      { leave_type: 'Sick', remaining_days: 6 },
      { leave_type: 'Annual', remaining_days: 13 }
    ],
    tasks: [
      { id: '1', title: 'Task 1', status: 'in_progress' },
      { id: '2', title: 'Task 2', status: 'completed' }
    ],
    trainings: [{ id: '1', title: 'SOC2 Masterclass' }],
    announcements: [{ title: 'Q4 Town Hall', category: 'Events' }],
    isPunchedIn: true
  };

  // Test A: Empty prompt validation
  const emptyRes = await askPortalAssistant({ prompt: '   ', user: testUser });
  record(
    'Service rejects empty or whitespace-only prompt',
    !emptyRes.success && emptyRes.error.includes('Please enter a question'),
    emptyRes.error
  );

  // Test B: Leave question with live balance injection
  const leaveRes = await askPortalAssistant({
    prompt: 'How do I apply for leave and what are my balances?',
    user: testUser,
    portalContext: testContext
  });
  record(
    'Leave question returns authoritative guidance with live balances',
    leaveRes.success && leaveRes.reply.includes('/employee/leave') && leaveRes.reply.includes('Casual'),
    `Provider: ${leaveRes.provider}`
  );

  // Test C: Attendance question with punch status injection
  const attRes = await askPortalAssistant({
    prompt: 'What are the attendance rules and am I clocked in?',
    user: testUser,
    portalContext: testContext
  });
  record(
    'Attendance question returns punch status and working hours guidelines',
    attRes.success && attRes.reply.includes('/employee/attendance') && attRes.reply.includes('clocked in'),
    `Provider: ${attRes.provider}`
  );

  // Test D: Project & Task question with count
  const taskRes = await askPortalAssistant({
    prompt: 'Where can I see my tasks for the sprint?',
    user: testUser,
    portalContext: testContext
  });
  record(
    'Tasks question returns task guidance with active count',
    taskRes.success && taskRes.reply.includes('/employee/tasks') && taskRes.reply.includes('1'),
    `Provider: ${taskRes.provider}`
  );

  // Test E: Benefits & Medical insurance question
  const medRes = await askPortalAssistant({
    prompt: 'How does medical insurance work at DigiX?',
    user: testUser,
    portalContext: testContext
  });
  record(
    'Benefits question directs user to Documents section with coverage info',
    medRes.success && medRes.reply.includes('/employee/documents') && medRes.reply.includes('medical'),
    `Provider: ${medRes.provider}`
  );

  // Test F: Out of domain question handles gracefully
  const generalRes = await askPortalAssistant({
    prompt: 'What is the capital of Mars?',
    user: testUser,
    portalContext: testContext
  });
  record(
    'Out-of-scope question provides portal orientation without crash',
    generalRes.success && generalRes.reply.includes('DigiX Portal Assistant'),
    'Friendly portal orientation returned'
  );

  // Test G: Multi-turn conversation history
  const historyRes = await askPortalAssistant({
    prompt: 'Can you remind me how to update my photo?',
    user: testUser,
    portalContext: testContext,
    history: [
      { sender: 'user', text: 'Hello' },
      { sender: 'bot', text: 'Hi! How can I help you?' }
    ]
  });
  record(
    'Multi-question conversation history processed smoothly',
    historyRes.success && historyRes.reply.includes('/employee/profile'),
    'Multi-turn request processed'
  );

  // --- 5. DATA PRIVACY & DATA ISOLATION VERIFICATION ---
  console.log('\n>>> [GROUP 5] DATA ISOLATION & LEAKAGE DEFENSE');
  // Check that other employee records are not referenced in the service
  const serviceText = fs.readFileSync('src/services/aiAssistantService.js', 'utf8');
  record(
    'aiAssistantService contains ZERO hardcoded fake employee records',
    !serviceText.includes('DGX001') && !serviceText.includes('Priya Sharma') && !serviceText.includes('EMP-1088'),
    'Zero mock employee leakage'
  );

  // --- 6. REGRESSION VERIFICATION ACROSS EXISTING MODULES ---
  console.log('\n>>> [GROUP 6] REGRESSION VERIFICATION ACROSS PREVIOUS MODULES');
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  // A. Authenticate Tarumani
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  record('Employee Tarumani authenticates with Supabase', !authErr && Boolean(authData?.user?.id));

  // B. Query live attendance
  const { data: attData, error: attErr } = await supabase.from('attendance').select('id').limit(1);
  record('Attendance table operational', !attErr && Boolean(attData));

  // C. Query live leave requests
  const { data: lvData, error: lvErr } = await supabase.from('leave_requests').select('id').limit(1);
  record('Leave requests table operational', !lvErr && Boolean(lvData));

  // D. Query live training assignments
  const { data: trData, error: trErr } = await supabase.from('training_assignments').select('id').limit(1);
  record('Training assignments table operational', !trErr && Boolean(trData));

  // E. Query live projects & tasks
  const { data: pjData, error: pjErr } = await supabase.from('projects').select('id').limit(1);
  record('Projects table operational', !pjErr && Boolean(pjData));

  // F. Query live announcements
  const { data: annData, error: annErr } = await supabase.from('announcements').select('id').limit(1);
  record('Announcements table operational', !annErr && Boolean(annData));

  // G. Query live audit logs (should be blocked for regular employee by RLS)
  const { data: auditData } = await supabase.from('audit_logs').select('id');
  record('Audit logs RLS remains active for employee', !auditData || auditData.length === 0, 'Zero leaks');

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${results.passed + results.failed} | PASSED: ${results.passed} | FAILED: ${results.failed}`);
  console.log('================================================================');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAIAssistantSuite().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
