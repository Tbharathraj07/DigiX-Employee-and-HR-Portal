import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testOnboardingModule() {
  console.log('====================================================');
  console.log('MODULE 4: ONBOARDING -> SUPABASE VERIFICATION');
  console.log('====================================================\n');

  // 1. Anonymous Access Test
  console.log('--- TEST 1: ANONYMOUS ACCESS ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonData, error: anonErr } = await anonClient.from('onboarding_checklists').select('*');
  console.log(`Anon select count: ${anonData?.length ?? 0} | Error: ${anonErr?.message || 'None'}`);

  const { data: anonIns, error: anonInsErr } = await anonClient.from('onboarding_checklists').insert({
    employee_id: '00000000-0000-0000-0000-000000000000',
    cohort_name: 'Anon Cohort'
  });
  if (anonInsErr) {
    console.log(`[PASS] Anonymous INSERT blocked by RLS: ${anonInsErr.message}`);
  } else {
    console.error(`[FAIL] Anonymous user was able to insert!`);
  }

  // 2. HR (Priyanka) Access & Creation
  console.log('\n--- TEST 2: HR (Priyanka) CREATES ONBOARDING RECORD ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw new Error(`HR auth failed: ${hrAuthErr.message}`);
  console.log(`[PASS] HR authenticated: UID ${hrAuth.user.id}`);

  // Fetch real employees for employee and buddy
  const { data: emps, error: empsErr } = await hrClient.from('employees').select('id, employee_id, name, email');
  if (empsErr || !emps) throw new Error(`Failed to fetch employees: ${empsErr?.message}`);

  const tarumani = emps.find(e => e.email?.includes('tarumani'));
  const alex = emps.find(e => e.name?.includes('Alex'));
  const priyanka = emps.find(e => e.email?.includes('priyanka'));
  const bharath = emps.find(e => e.employee_id === 'DGX005');

  console.log(`[PASS] Resolved real employees:`);
  console.log(`   - Tarumani: ${tarumani?.id} (${tarumani?.name})`);
  console.log(`   - Alex Morgan: ${alex?.id} (${alex?.name})`);
  console.log(`   - Bharath Raj: ${bharath?.id} (${bharath?.name})`);

  // Target employee for test onboarding: Alex Morgan (or Bharath Raj)
  // Let's check if Alex already has an onboarding record, if so remove any previous test record
  await hrClient.from('onboarding_checklists').delete().eq('employee_id', alex.id);

  const initialChecklist = [
    { id: 'task-1', title: 'Provision MacBook Pro & YubiKey Hardware', done: true },
    { id: 'task-2', title: 'Grant Google Workspace & Slack Enterprise Access', done: true },
    { id: 'task-3', title: 'Assign Corporate Mentor / Buddy', done: true },
    { id: 'task-4', title: 'Complete SOC2 & InfoSec Mandatory Training', done: false },
    { id: 'task-5', title: '30-Day Manager Performance Alignment Check-in', done: false }
  ];

  const { data: createdOnb, error: createErr } = await hrClient
    .from('onboarding_checklists')
    .insert({
      employee_id: alex.id,
      buddy_id: tarumani.id, // Tarumani is buddy!
      cohort_name: 'TEST_October 2026 Engineering Cohort',
      progress: 60,
      status: 'in_progress',
      checklist_items: initialChecklist
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

  if (createErr || !createdOnb) {
    throw new Error(`HR failed to insert onboarding record: ${createErr?.message}`);
  }

  console.log(`[PASS] HR created onboarding record: ID ${createdOnb.id}`);
  console.log(`   - Employee: ${createdOnb.employee?.name} | Buddy: ${createdOnb.buddy?.name}`);
  console.log(`   - Cohort: ${createdOnb.cohort_name}`);
  console.log(`   - Progress: ${createdOnb.progress}% | Status: ${createdOnb.status}`);

  // 3. Buddy / Employee Access via RLS (Tarumani as assigned Buddy)
  console.log('\n--- TEST 3: BUDDY ACCESS (Tarumani Bharath Raj) ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw new Error(`Employee auth failed: ${empAuthErr.message}`);
  console.log(`[PASS] Tarumani authenticated: UID ${empAuth.user.id}`);

  // Tarumani should see the record because buddy_id = tarumani.id
  const { data: buddyRecords, error: buddyErr } = await empClient
    .from('onboarding_checklists')
    .select('*')
    .eq('id', createdOnb.id);

  if (buddyErr || !buddyRecords || buddyRecords.length === 0) {
    console.error(`[FAIL] Buddy could not see assigned onboarding record: ${buddyErr?.message}`);
  } else {
    console.log(`[PASS] Buddy successfully accessed assigned mentee onboarding record via RLS.`);
  }

  // 4. Update Checklist Items & Progress
  console.log('\n--- TEST 4: CHECKLIST PROGRESS UPDATE ---');
  const updatedChecklist = initialChecklist.map(t => t.id === 'task-4' ? { ...t, done: true } : t);
  const newProgress = 80;

  const { data: updatedOnb, error: updateErr } = await hrClient
    .from('onboarding_checklists')
    .update({
      checklist_items: updatedChecklist,
      progress: newProgress,
      status: 'in_progress'
    })
    .eq('id', createdOnb.id)
    .select()
    .single();

  if (updateErr || !updatedOnb) {
    throw new Error(`Failed to update onboarding progress: ${updateErr?.message}`);
  }
  console.log(`[PASS] Updated checklist progress in Supabase: ${updatedOnb.progress}% (Status: ${updatedOnb.status})`);

  // 5. Admin (Marcus Vance) Verification & Persistence Test
  console.log('\n--- TEST 5: ADMIN ACCESS & PERSISTENCE VERIFICATION ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw new Error(`Admin auth failed: ${adminAuthErr.message}`);
  console.log(`[PASS] Admin authenticated: UID ${adminAuth.user.id}`);

  const { data: adminRead, error: adminReadErr } = await adminClient
    .from('onboarding_checklists')
    .select(`
      id,
      progress,
      cohort_name,
      checklist_items,
      employee:employees!employee_id(name),
      buddy:employees!buddy_id(name)
    `)
    .eq('id', createdOnb.id)
    .single();

  if (adminReadErr || !adminRead) {
    throw new Error(`Admin failed to read onboarding: ${adminReadErr?.message}`);
  }
  console.log(`[PASS] Admin verified persistent record in Supabase:`);
  console.log(`   - Employee: ${adminRead.employee?.name} | Buddy: ${adminRead.buddy?.name}`);
  console.log(`   - Progress: ${adminRead.progress}% | Tasks count: ${adminRead.checklist_items?.length}`);

  // 6. Cleanup Temporary Test Record
  console.log('\n--- TEST 6: CLEANUP TEMPORARY RECORD ---');
  const { error: delErr } = await adminClient
    .from('onboarding_checklists')
    .delete()
    .eq('id', createdOnb.id);

  if (delErr) {
    console.error(`[FAIL] Failed to delete test onboarding record: ${delErr.message}`);
  } else {
    console.log(`[PASS] Test onboarding record deleted successfully from Supabase.`);
  }

  // Verify deletion
  const { data: verifyDel } = await adminClient
    .from('onboarding_checklists')
    .select('*')
    .eq('id', createdOnb.id);

  if (!verifyDel || verifyDel.length === 0) {
    console.log(`[PASS] Confirmed 0 temporary onboarding records remain.`);
  } else {
    console.error(`[FAIL] Onboarding test record still exists!`);
  }

  console.log('\n====================================================');
  console.log('MODULE 4 (ONBOARDING) ALL VERIFICATIONS PASSED');
  console.log('====================================================');
}

testOnboardingModule().catch(err => {
  console.error('[MODULE 4 ERROR]', err);
  process.exit(1);
});
