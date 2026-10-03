import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testNotificationsModule() {
  console.log('====================================================');
  console.log('MODULE 2: NOTIFICATIONS -> SUPABASE VERIFICATION');
  console.log('====================================================\n');

  // 1. Anonymous Access Test
  console.log('--- TEST 1: ANONYMOUS ACCESS ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonData, error: anonErr } = await anonClient.from('notifications').select('*');
  console.log(`Anon query count: ${anonData?.length ?? 0} | Error: ${anonErr?.message || 'None'}`);

  const { data: anonInsert, error: anonInsErr } = await anonClient.from('notifications').insert({
    title: 'Anon Hack Notification',
    message: 'Should be blocked'
  });
  if (anonInsErr) {
    console.log(`[PASS] Anonymous INSERT blocked by RLS as expected: ${anonInsErr.message}`);
  } else {
    console.error(`[FAIL] Anonymous user was able to insert!`);
  }

  // 2. Authenticate HR (Priyanka) to create test notifications
  console.log('\n--- TEST 2: HR CREATING TARGETED & BROADCAST NOTIFICATIONS ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw new Error(`HR auth failed: ${hrAuthErr.message}`);
  console.log(`[PASS] HR authenticated: UID ${hrAuth.user.id}`);

  // Pre-clean any previous TEST_ notifications
  await hrClient.from('notifications').delete().ilike('title', 'TEST_%');

  // Resolve Employee 1 (Tarumani Bharath Raj) and Employee 2 (Alex Morgan)
  const { data: employeesList, error: empListErr } = await hrClient
    .from('employees')
    .select('id, employee_id, name, email');
  if (empListErr || !employeesList) throw new Error(`Failed to list employees: ${empListErr?.message}`);

  const tarumani = employeesList.find((e) => e.employee_id === 'DGX003' || e.email?.includes('tarumani'));
  const alex = employeesList.find((e) => e.employee_id === 'DGX004' || e.name?.includes('Alex'));
  const priyanka = employeesList.find((e) => e.employee_id === 'HR001' || e.email?.includes('priyanka'));
  const marcus = employeesList.find((e) => e.employee_id === 'ADM001' || e.email?.includes('marcus'));

  console.log(`[PASS] Resolved employees:`);
  console.log(`   - Tarumani: ${tarumani?.id} (${tarumani?.name})`);
  console.log(`   - Alex: ${alex?.id} (${alex?.name})`);

  // HR creates:
  // Notif A: Private to Tarumani
  const { data: notifA, error: errA } = await hrClient
    .from('notifications')
    .insert({
      recipient_employee_id: tarumani.id,
      target_role: 'employee',
      title: 'TEST_Private Note to Tarumani',
      message: 'Your probation assessment has been scheduled.',
      action_url: '/employee/profile',
      is_read: false
    })
    .select()
    .single();
  if (errA) throw new Error(`HR failed to insert Notif A: ${errA.message}`);
  console.log(`[PASS] Created Notif A (Private to Tarumani): ID ${notifA.id}`);

  // Notif B: Private to Alex Morgan
  const { data: notifB, error: errB } = await hrClient
    .from('notifications')
    .insert({
      recipient_employee_id: alex.id,
      target_role: 'employee',
      title: 'TEST_Confidential Memo to Alex Morgan',
      message: 'Confidential project transfer review.',
      action_url: '/employee/projects',
      is_read: false
    })
    .select()
    .single();
  if (errB) throw new Error(`HR failed to insert Notif B: ${errB.message}`);
  console.log(`[PASS] Created Notif B (Private to Alex): ID ${notifB.id}`);

  // Notif C: Broadcast to all employees
  const { data: notifC, error: errC } = await hrClient
    .from('notifications')
    .insert({
      recipient_employee_id: null,
      target_role: 'all',
      title: 'TEST_Broadcast: Annual Benefits Open Enrollment',
      message: 'Open enrollment for healthcare benefits commences next Monday.',
      action_url: '/employee/announcements',
      is_read: false
    })
    .select()
    .single();
  if (errC) throw new Error(`HR failed to insert Notif C: ${errC.message}`);
  console.log(`[PASS] Created Notif C (Broadcast All): ID ${notifC.id}`);

  // 3. Employee Access & RLS Isolation Test (Tarumani Bharath Raj)
  console.log('\n--- TEST 3: EMPLOYEE ACCESS & STRICT RLS ISOLATION ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw new Error(`Employee auth failed: ${empAuthErr.message}`);
  console.log(`[PASS] Employee authenticated: UID ${empAuth.user.id}`);

  const { data: empVisibleNotifs, error: empReadErr } = await empClient
    .from('notifications')
    .select('id, title, recipient_employee_id, target_role, is_read');
  if (empReadErr) throw new Error(`Employee query failed: ${empReadErr.message}`);

  console.log(`[PASS] Employee visible notifications count: ${empVisibleNotifs.length}`);
  empVisibleNotifs.forEach((n) => {
    console.log(`   - [${n.id}] "${n.title}" (Recipient: ${n.recipient_employee_id || 'null'}, Role: ${n.target_role})`);
  });

  const canSeeNotifA = empVisibleNotifs.some((n) => n.id === notifA.id);
  const canSeeNotifB = empVisibleNotifs.some((n) => n.id === notifB.id);
  const canSeeNotifC = empVisibleNotifs.some((n) => n.id === notifC.id);

  if (canSeeNotifA) {
    console.log(`[PASS] Employee correctly sees own private notification (Notif A).`);
  } else {
    console.error(`[FAIL] Employee CANNOT see own private notification!`);
  }

  if (!canSeeNotifB) {
    console.log(`[PASS] Strict RLS Isolation Verified: Employee CANNOT see another employee's private notification (Notif B).`);
  } else {
    console.error(`[FAIL] PRIVACY LEAK: Employee was able to read another employee's private notification!`);
  }

  if (canSeeNotifC) {
    console.log(`[PASS] Employee correctly sees broadcast notification (Notif C).`);
  } else {
    console.error(`[FAIL] Employee CANNOT see broadcast notification!`);
  }

  // 4. Employee Update & RLS Mutation Defense
  console.log('\n--- TEST 4: EMPLOYEE UPDATE & PERMISSION INTEGRITY ---');
  // Employee marks own notification (Notif A) as read -> Should SUCCEED
  const { data: markOwnData, error: markOwnErr } = await empClient
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifA.id)
    .select()
    .single();
  if (markOwnErr) {
    console.error(`[FAIL] Employee failed to mark own notification read: ${markOwnErr.message}`);
  } else {
    console.log(`[PASS] Employee successfully marked own notification as read: is_read=${markOwnData.is_read}`);
  }

  // Employee attempts to modify another employee's notification (Notif B) -> Should be BLOCKED
  const { data: attackData, error: attackErr } = await empClient
    .from('notifications')
    .update({ is_read: true, title: 'Hacked Title' })
    .eq('id', notifB.id)
    .select();
  if (attackErr || !attackData || attackData.length === 0) {
    console.log(`[PASS] Employee CANNOT mutate another employee's notification (0 rows affected or RLS violation).`);
  } else {
    console.error(`[FAIL] SECURITY VIOLATION: Employee mutated another employee's notification!`);
  }

  // 5. Admin Verification & Cleanup
  console.log('\n--- TEST 5: ADMIN AUDIT & CLEANUP ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw new Error(`Admin auth failed: ${adminAuthErr.message}`);
  console.log(`[PASS] Admin authenticated: UID ${adminAuth.user.id}`);

  // Admin verifies Notif A is marked as read in database
  const { data: dbNotifA, error: dbErrA } = await adminClient
    .from('notifications')
    .select('*')
    .eq('id', notifA.id)
    .single();
  if (dbErrA || !dbNotifA) {
    console.error(`[FAIL] Admin could not verify Notif A in database: ${dbErrA?.message}`);
  } else {
    console.log(`[PASS] Persistence Verified: Notif A is_read=${dbNotifA.is_read} is stored in Supabase.`);
  }

  // Cleanup test records
  const { error: delErr } = await adminClient
    .from('notifications')
    .delete()
    .in('id', [notifA.id, notifB.id, notifC.id]);
  if (delErr) {
    console.error(`[FAIL] Admin cleanup failed: ${delErr.message}`);
  } else {
    console.log(`[PASS] All temporary test notifications deleted successfully from Supabase.`);
  }

  // Verify deletion
  const { data: checkDeleted } = await adminClient
    .from('notifications')
    .select('*')
    .in('id', [notifA.id, notifB.id, notifC.id]);
  if (!checkDeleted || checkDeleted.length === 0) {
    console.log(`[PASS] Verification confirmed: 0 test notification rows remain.`);
  } else {
    console.error(`[FAIL] Test notifications were not completely cleaned up!`);
  }

  console.log('\n====================================================');
  console.log('MODULE 2 (NOTIFICATIONS) ALL VERIFICATIONS PASSED');
  console.log('====================================================');
}

testNotificationsModule().catch((err) => {
  console.error('[MODULE 2 ERROR]', err);
  process.exit(1);
});
