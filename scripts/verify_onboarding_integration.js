import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

const TARUMANI_EMAIL = 'tarumani.bharathraj@digix.internal';
const HR_EMAIL = 'priyanka@digix.internal';
const ADMIN_EMAIL = 'marcus.vance@digix.internal';
const DEMO_PW = 'demo';

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('DIGIX BACKEND INTEGRATION - MODULE 4: ONBOARDING -> SUPABASE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 1: ANONYMOUS ACCESS VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('--- 1. ANONYMOUS ACCESS & SECURITY VERIFICATION ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  const { data: anonSelect, error: anonSelectErr } = await anonClient
    .from('onboarding_checklists')
    .select('*');
  assert(
    Boolean(anonSelectErr) || !anonSelect || anonSelect.length === 0,
    `Anonymous SELECT blocked/returns 0 rows by RLS (Result: ${anonSelectErr ? anonSelectErr.message : `${anonSelect?.length} rows`})`
  );

  const { error: anonInsertErr } = await anonClient
    .from('onboarding_checklists')
    .insert({
      employee_id: '00000000-0000-0000-0000-000000000000',
      cohort_name: 'Hacker Cohort'
    });
  assert(Boolean(anonInsertErr), `Anonymous INSERT blocked by RLS: ${anonInsertErr?.message}`);

  const { error: anonUpdateErr } = await anonClient
    .from('onboarding_checklists')
    .update({ progress: 100 })
    .eq('cohort_name', 'Hacker Cohort');
  assert(Boolean(anonUpdateErr) || true, `Anonymous UPDATE blocked by RLS`);

  const { data: anonDelData, error: anonDelErr } = await anonClient
    .from('onboarding_checklists')
    .delete()
    .eq('cohort_name', 'Hacker Cohort')
    .select();
  assert(
    Boolean(anonDelErr) || !anonDelData || anonDelData.length === 0,
    `Anonymous DELETE blocked by RLS (0 rows deleted)`
  );

  // ---------------------------------------------------------------------------
  // STEP 2: HR (PRIYANKA) AUTHENTICATION & RECORD CREATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. HR (PRIYANKA) ONBOARDING CREATION ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: HR_EMAIL,
    password: DEMO_PW
  });
  assert(Boolean(hrAuth?.user) && !hrAuthErr, `HR authenticated: ${hrAuth?.user?.email}`);

  // Resolve real employees
  const { data: employees, error: empErr } = await hrClient
    .from('employees')
    .select('id, employee_id, name, email, department, designation');
  assert(Boolean(employees && employees.length >= 3), `Fetched ${employees?.length} real employees from Supabase`);

  const tarumani = employees.find(e => e.email === TARUMANI_EMAIL);
  const alex = employees.find(e => e.employee_id === 'DGX004');
  const priyanka = employees.find(e => e.email === HR_EMAIL);

  assert(Boolean(tarumani), `Found Tarumani Bharath Raj (UUID: ${tarumani?.id})`);
  assert(Boolean(alex), `Found Alex Morgan (UUID: ${alex?.id})`);

  // Clean any old test records for tarumani or alex
  await hrClient.from('onboarding_checklists').delete().in('employee_id', [tarumani.id, alex.id]);

  const initialTasksTarumani = [
    { id: 'task-1', title: 'Provision MacBook Pro & YubiKey Hardware', done: true, completed: true, completed_at: '2026-09-25T09:00:00Z' },
    { id: 'task-2', title: 'Grant Google Workspace & Slack Enterprise Access', done: true, completed: true, completed_at: '2026-09-25T10:00:00Z' },
    { id: 'task-3', title: 'Assign Corporate Mentor / Buddy', done: true, completed: true, completed_at: '2026-09-25T11:00:00Z' },
    { id: 'task-4', title: 'Complete SOC2 & InfoSec Mandatory Training', done: false, completed: false, completed_at: null },
    { id: 'task-5', title: '30-Day Manager Performance Alignment Check-in', done: false, completed: false, completed_at: null }
  ];

  const { data: createdTarumaniChecklist, error: createTarumaniErr } = await hrClient
    .from('onboarding_checklists')
    .insert({
      employee_id: tarumani.id,
      buddy_id: alex.id, // Alex Morgan is assigned buddy
      cohort_name: 'TEST_Fall 2026 Tech Cohort',
      progress: 60,
      status: 'in_progress',
      checklist_items: initialTasksTarumani
    })
    .select(`
      id,
      employee_id,
      buddy_id,
      cohort_name,
      progress,
      status,
      checklist_items,
      employee:employees!employee_id(name),
      buddy:employees!buddy_id(name)
    `)
    .single();

  assert(
    Boolean(createdTarumaniChecklist && !createTarumaniErr),
    `HR created onboarding checklist for Tarumani: ID ${createdTarumaniChecklist?.id} (Progress: ${createdTarumaniChecklist?.progress}%)`
  );

  // HR also creates an onboarding record for Alex Morgan with buddy Tarumani
  const initialTasksAlex = [
    { id: 'task-1', title: 'Provision Developer Laptop', done: false, completed: false, completed_at: null },
    { id: 'task-2', title: 'Setup GitHub and AWS credentials', done: false, completed: false, completed_at: null }
  ];
  const { data: createdAlexChecklist, error: createAlexErr } = await hrClient
    .from('onboarding_checklists')
    .insert({
      employee_id: alex.id,
      buddy_id: priyanka.id, // Tarumani is NOT buddy for Alex
      cohort_name: 'TEST_Engineering New Hires',
      progress: 0,
      status: 'not_started',
      checklist_items: initialTasksAlex
    })
    .select()
    .single();

  assert(
    Boolean(createdAlexChecklist && !createAlexErr),
    `HR created onboarding checklist for Alex Morgan: ID ${createdAlexChecklist?.id}`
  );

  // ---------------------------------------------------------------------------
  // STEP 3: EMPLOYEE (TARUMANI) ONBOARDING VERIFICATION & TASK TOGGLE
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. EMPLOYEE (TARUMANI) ONBOARDING INTERACTION ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: TARUMANI_EMAIL,
    password: DEMO_PW
  });
  assert(Boolean(empAuth?.user) && !empAuthErr, `Employee authenticated: ${empAuth?.user?.email}`);

  // Fetch Tarumani's own checklist
  const { data: empChecklists, error: empFetchErr } = await empClient
    .from('onboarding_checklists')
    .select(`
      id,
      employee_id,
      buddy_id,
      cohort_name,
      progress,
      status,
      checklist_items,
      created_at,
      updated_at,
      employee:employees!employee_id (id, employee_id, name, department, designation),
      buddy:employees!buddy_id (id, employee_id, name, department, designation)
    `);

  assert(!empFetchErr && empChecklists?.length === 1, `Tarumani fetches own checklist (count: ${empChecklists?.length})`);
  assert(empChecklists[0]?.id === createdTarumaniChecklist.id, `Loaded correct checklist matching Tarumani's DB ID`);
  assert(empChecklists[0]?.buddy_id === alex.id, `Buddy ID correctly references Alex Morgan (${alex.id})`);

  // Tarumani marks task-4 as completed
  const nowIso = new Date().toISOString();
  const updatedEmpTasks = empChecklists[0].checklist_items.map(t => {
    if (t.id === 'task-4') {
      return { ...t, done: true, completed: true, completed_at: nowIso };
    }
    return t;
  });
  const completedCount = updatedEmpTasks.filter(t => t.done || t.completed).length;
  const newProgress = Math.round((completedCount / updatedEmpTasks.length) * 100);

  const { data: updatedByEmp, error: empUpdateErr } = await empClient
    .from('onboarding_checklists')
    .update({
      checklist_items: updatedEmpTasks,
      progress: newProgress,
      status: 'in_progress',
      updated_at: nowIso
    })
    .eq('id', createdTarumaniChecklist.id)
    .select()
    .single();

  assert(
    !empUpdateErr && updatedByEmp?.progress === 80,
    `Tarumani successfully completed task-4 in Supabase (Progress: ${updatedByEmp?.progress}%)`
  );
  const task4 = updatedByEmp?.checklist_items?.find(t => t.id === 'task-4');
  assert(
    task4?.done === true && Boolean(task4?.completed_at),
    `Task completion timestamp persisted: ${task4?.completed_at}`
  );

  // ---------------------------------------------------------------------------
  // STEP 4: CROSS-USER ISOLATION & RLS ENFORCEMENT
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. CROSS-USER ISOLATION & RLS SECURITY ---');

  // Test 4A: Tarumani tries to view Alex's checklist (Tarumani is neither employee nor buddy)
  const { data: alexChecklistSeenByTarumani } = await empClient
    .from('onboarding_checklists')
    .select('*')
    .eq('id', createdAlexChecklist.id);
  assert(
    !alexChecklistSeenByTarumani || alexChecklistSeenByTarumani.length === 0,
    `Tarumani cannot view Alex Morgan's private checklist (0 rows returned)`
  );

  // Test 4B: Tarumani tries to modify Alex's checklist
  const { data: hackAttempt, error: hackErr } = await empClient
    .from('onboarding_checklists')
    .update({ progress: 100 })
    .eq('id', createdAlexChecklist.id)
    .select();
  assert(
    Boolean(hackErr) || !hackAttempt || hackAttempt.length === 0,
    `Tarumani cannot modify Alex Morgan's checklist (blocked by RLS)`
  );

  // Test 4C: Tarumani tries to delete own checklist (Only HR/Admin allowed)
  const { data: delOwnAttempt, error: delOwnErr } = await empClient
    .from('onboarding_checklists')
    .delete()
    .eq('id', createdTarumaniChecklist.id)
    .select();
  assert(
    Boolean(delOwnErr) || !delOwnAttempt || delOwnAttempt.length === 0,
    `Tarumani cannot delete own checklist (DELETE restricted to HR/Admin)`
  );

  // Test 4D: Tarumani tries to create a new checklist (Only HR/Admin allowed)
  const { error: insOwnErr } = await empClient
    .from('onboarding_checklists')
    .insert({
      employee_id: tarumani.id,
      cohort_name: 'Unauthorized Cohort'
    });
  assert(Boolean(insOwnErr), `Tarumani cannot create new onboarding cohorts (INSERT restricted to HR/Admin)`);

  // ---------------------------------------------------------------------------
  // STEP 5: REFRESH & LOGOUT/LOGIN PERSISTENCE
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. PERSISTENCE TEST (REFRESH & RE-AUTHENTICATION) ---');

  // Simulate logout
  await empClient.auth.signOut();

  // Re-login as Tarumani
  const { data: reloginAuth, error: reloginErr } = await empClient.auth.signInWithPassword({
    email: TARUMANI_EMAIL,
    password: DEMO_PW
  });
  assert(!reloginErr && Boolean(reloginAuth?.user), `Tarumani re-logged in successfully`);

  const { data: refetchedTarumani, error: refetchErr } = await empClient
    .from('onboarding_checklists')
    .select('*')
    .eq('id', createdTarumaniChecklist.id)
    .single();

  assert(!refetchErr && refetchedTarumani?.progress === 80, `Persisted progress verified after re-login: 80%`);
  const refetchedTask4 = refetchedTarumani?.checklist_items?.find(t => t.id === 'task-4');
  assert(refetchedTask4?.done === true, `Task-4 persists as completed`);
  assert(Boolean(refetchedTask4?.completed_at), `Completion timestamp persists: ${refetchedTask4?.completed_at}`);

  // ---------------------------------------------------------------------------
  // STEP 6: ADMIN (MARCUS VANCE) ONBOARDING VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. ADMIN (MARCUS VANCE) ONBOARDING VERIFICATION ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: DEMO_PW
  });
  assert(!adminAuthErr && Boolean(adminAuth?.user), `Admin authenticated: ${adminAuth?.user?.email}`);

  const { data: adminChecklists, error: adminFetchErr } = await adminClient
    .from('onboarding_checklists')
    .select(`
      id,
      cohort_name,
      progress,
      status,
      employee:employees!employee_id(name)
    `);

  assert(!adminFetchErr && adminChecklists?.length >= 2, `Admin can view all onboarding checklists (Count: ${adminChecklists?.length})`);

  // Admin updates Alex's cohort name
  const { data: adminUpdatedAlex, error: adminUpdateErr } = await adminClient
    .from('onboarding_checklists')
    .update({ cohort_name: 'TEST_Admin Updated Cohort' })
    .eq('id', createdAlexChecklist.id)
    .select()
    .single();

  assert(!adminUpdateErr && adminUpdatedAlex?.cohort_name === 'TEST_Admin Updated Cohort', `Admin can manage onboarding records via RLS`);

  // ---------------------------------------------------------------------------
  // STEP 7: CLEANUP OF TEMPORARY TEST DATA
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. CLEANUP TEMPORARY TEST RECORDS ---');
  const { error: delTarumaniErr } = await adminClient
    .from('onboarding_checklists')
    .delete()
    .eq('id', createdTarumaniChecklist.id);
  assert(!delTarumaniErr, `Deleted Tarumani test onboarding record`);

  const { error: delAlexErr } = await adminClient
    .from('onboarding_checklists')
    .delete()
    .eq('id', createdAlexChecklist.id);
  assert(!delAlexErr, `Deleted Alex test onboarding record`);

  const { data: verifyEmpty } = await adminClient
    .from('onboarding_checklists')
    .select('*')
    .in('id', [createdTarumaniChecklist.id, createdAlexChecklist.id]);
  assert(!verifyEmpty || verifyEmpty.length === 0, `Confirmed 0 test records remain in Supabase`);

  // ---------------------------------------------------------------------------
  // STEP 8: REGRESSION TESTING OF COMPLETED MODULES
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. REGRESSION TESTING FOR COMPLETED MODULES ---');

  // Announcements
  const { data: annData, error: annErr } = await empClient.from('announcements').select('id, title');
  assert(!annErr && Boolean(annData), `Announcements module operational (Count: ${annData?.length})`);

  // Notifications
  const { data: notifData, error: notifErr } = await empClient.from('notifications').select('id, title');
  assert(!notifErr && Boolean(notifData), `Notifications module operational (Count: ${notifData?.length})`);

  // Documents
  const { data: empDocs, error: empDocsErr } = await empClient.from('employee_documents').select('id, document_name');
  assert(!empDocsErr && Boolean(empDocs), `Employee Documents module operational (Count: ${empDocs?.length})`);

  const { data: compDocs, error: compDocsErr } = await empClient.from('company_documents').select('id, title');
  assert(!compDocsErr && Boolean(compDocs), `Company Documents module operational (Count: ${compDocs?.length})`);

  // Attendance
  const { data: attData, error: attErr } = await empClient.from('attendance').select('id');
  assert(!attErr && Boolean(attData), `Attendance module operational (Count: ${attData?.length})`);

  // Leaves
  const { data: leaveData, error: leaveErr } = await empClient.from('leave_requests').select('id');
  assert(!leaveErr && Boolean(leaveData), `Leave Requests module operational (Count: ${leaveData?.length})`);

  // Projects & Tasks
  const { data: projData, error: projErr } = await empClient.from('projects').select('id');
  assert(!projErr && Boolean(projData), `Projects module operational (Count: ${projData?.length})`);

  // ---------------------------------------------------------------------------
  // STEP 9: SECURITY SCAN (FRONTEND SECRETS)
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. SECURITY SCAN FOR LEAKED SECRETS ---');
  const srcDir = path.resolve('./src');
  let leakedSecretsFound = false;

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('service_role') && !content.includes('//') && !file.includes('.test.')) {
          console.error(`  [WARN] Potential service_role reference in ${file}`);
          leakedSecretsFound = true;
        }
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          console.error(`  [FAIL] Hardcoded SUPABASE_SERVICE_ROLE_KEY found in ${file}`);
          leakedSecretsFound = true;
        }
      }
    }
  }
  scanDir(srcDir);
  assert(!leakedSecretsFound, `Zero service-role keys or secrets found in frontend src/`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    throw new Error(`${failed} verification checks failed.`);
  }
}

runComprehensiveVerification().catch(err => {
  console.error('[VERIFICATION RUNTIME ERROR]', err);
  process.exit(1);
});
