import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function verifyNotificationsIntegration() {
  console.log('================================================================');
  console.log('    DIGIX PORTAL - NOTIFICATIONS → SUPABASE VERIFICATION        ');
  console.log('================================================================\n');

  let allTestsPassed = true;
  const tempNotifIds = [];

  // --- 1. Anonymous Access Security Test ---
  console.log('--- TEST 1: Anonymous Access Security Test ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: anonSelectData, error: anonSelectErr } = await anonClient
    .from('notifications')
    .select('*');
  const anonSelectBlocked = (!anonSelectData || anonSelectData.length === 0);
  console.log('Anon SELECT public.notifications:', anonSelectBlocked ? '✅ BLOCKED (0 rows visible / unauthorized)' : '❌ LEAKED DATA');
  if (!anonSelectBlocked) allTestsPassed = false;

  const { data: anonInsData, error: anonInsErr } = await anonClient
    .from('notifications')
    .insert({
      title: 'Hacked Anon Notification',
      message: 'Should be rejected by RLS',
      target_role: 'all'
    })
    .select();
  const anonInsBlocked = Boolean(anonInsErr) || !anonInsData || anonInsData.length === 0;
  console.log('Anon INSERT public.notifications:', anonInsBlocked ? `✅ BLOCKED (${anonInsErr?.message || 'RLS denied'})` : '❌ LEAKED INSERT');
  if (!anonInsBlocked) allTestsPassed = false;

  const { data: anonUpdData, error: anonUpdErr } = await anonClient
    .from('notifications')
    .update({ is_read: true })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();
  const anonUpdBlocked = Boolean(anonUpdErr) || !anonUpdData || anonUpdData.length === 0;
  console.log('Anon UPDATE public.notifications:', anonUpdBlocked ? `✅ BLOCKED (${anonUpdErr?.message || '0 rows updated'})` : '❌ LEAKED UPDATE');
  if (!anonUpdBlocked) allTestsPassed = false;

  const { data: anonDelData, error: anonDelErr } = await anonClient
    .from('notifications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();
  const anonDelBlocked = Boolean(anonDelErr) || !anonDelData || anonDelData.length === 0;
  console.log('Anon DELETE public.notifications:', anonDelBlocked ? `✅ BLOCKED (${anonDelErr?.message || '0 rows deleted'})` : '❌ LEAKED DELETE');
  if (!anonDelBlocked) allTestsPassed = false;

  // --- 2. Authenticate Users ---
  console.log('\n--- Authenticating Real Accounts ---');
  // Tarumani Bharath Raj (Employee)
  const empClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) {
    console.error('❌ Failed to login Tarumani:', empAuthErr.message);
    allTestsPassed = false;
    return;
  }
  console.log('✅ Employee Tarumani logged in:', empAuth.user.id);

  // Get Tarumani DB employee ID
  const { data: empProfile } = await empClient.from('profiles').select('employee_id, role').eq('id', empAuth.user.id).single();
  const tarumaniDbId = empProfile.employee_id;
  console.log('Tarumani DB Employee ID:', tarumaniDbId);

  // Priyanka (HR)
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) {
    console.error('❌ Failed to login Priyanka:', hrAuthErr.message);
    allTestsPassed = false;
    return;
  }
  console.log('✅ HR Priyanka logged in:', hrAuth.user.id);

  // Marcus Vance (Admin)
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) {
    console.error('❌ Failed to login Marcus:', adminAuthErr.message);
    allTestsPassed = false;
    return;
  }
  console.log('✅ Admin Marcus Vance logged in:', adminAuth.user.id);

  // Find another employee ID for cross-user isolation test
  const { data: otherEmp } = await hrClient
    .from('employees')
    .select('id, name')
    .neq('id', tarumaniDbId)
    .limit(1)
    .single();
  const otherEmpDbId = otherEmp.id;
  console.log('Other Employee DB ID for cross-isolation test:', otherEmpDbId, `(${otherEmp.name})`);

  // --- 3. HR Operations & Notification Creation ---
  console.log('\n--- TEST 3: HR Notification Creation via Supabase ---');
  // 3a. Private notification for Tarumani
  const { data: notifTarumani, error: notifTarumaniErr } = await hrClient
    .from('notifications')
    .insert({
      title: 'TEST_VERIFY_Tarumani_Private',
      message: 'Private message for Tarumani Bharath Raj',
      recipient_employee_id: tarumaniDbId,
      target_role: null,
      is_read: false
    })
    .select()
    .single();

  if (notifTarumaniErr) {
    console.error('❌ HR failed to create Tarumani notification:', notifTarumaniErr.message);
    allTestsPassed = false;
  } else {
    tempNotifIds.push(notifTarumani.id);
    console.log('✅ HR created private notification for Tarumani:', notifTarumani.id);
  }

  // 3b. Broadcast notification for all employees
  const { data: notifBroadcast, error: notifBroadcastErr } = await hrClient
    .from('notifications')
    .insert({
      title: 'TEST_VERIFY_Broadcast_Employees',
      message: 'Broadcast notification for all employees',
      recipient_employee_id: null,
      target_role: 'employee',
      is_read: false
    })
    .select()
    .single();

  if (notifBroadcastErr) {
    console.error('❌ HR failed to create broadcast notification:', notifBroadcastErr.message);
    allTestsPassed = false;
  } else {
    tempNotifIds.push(notifBroadcast.id);
    console.log('✅ HR created broadcast notification:', notifBroadcast.id);
  }

  // 3c. Private notification for OTHER employee
  const { data: notifOther, error: notifOtherErr } = await hrClient
    .from('notifications')
    .insert({
      title: 'TEST_VERIFY_Other_Employee_Private',
      message: 'Confidential notification for other employee',
      recipient_employee_id: otherEmpDbId,
      target_role: null,
      is_read: false
    })
    .select()
    .single();

  if (notifOtherErr) {
    console.error('❌ HR failed to create other employee notification:', notifOtherErr.message);
    allTestsPassed = false;
  } else {
    tempNotifIds.push(notifOther.id);
    console.log('✅ HR created confidential notification for other employee:', notifOther.id);
  }

  // --- 4. Employee Permissions & Cross-User Isolation ---
  console.log('\n--- TEST 4: Cross-User Notification Isolation & Visibility ---');
  const { data: empNotifs, error: empNotifsErr } = await empClient
    .from('notifications')
    .select('*');

  if (empNotifsErr) {
    console.error('❌ Tarumani failed to fetch notifications:', empNotifsErr.message);
    allTestsPassed = false;
  } else {
    const canSeeTarumaniPrivate = empNotifs.some(n => n.id === notifTarumani?.id);
    const canSeeBroadcast = empNotifs.some(n => n.id === notifBroadcast?.id);
    const canSeeOtherPrivate = empNotifs.some(n => n.id === notifOther?.id);

    console.log('Tarumani sees own private notification:', canSeeTarumaniPrivate ? '✅ YES' : '❌ NO');
    console.log('Tarumani sees employee broadcast notification:', canSeeBroadcast ? '✅ YES' : '❌ NO');
    console.log('Tarumani ISOLATED from other employee private notification:', !canSeeOtherPrivate ? '✅ YES (Hidden by RLS)' : '❌ LEAKED');

    if (!canSeeTarumaniPrivate || !canSeeBroadcast || canSeeOtherPrivate) {
      allTestsPassed = false;
    }
  }

  // Employee blocked from direct insert into public.notifications
  const { data: empHackIns, error: empHackInsErr } = await empClient
    .from('notifications')
    .insert({
      title: 'Employee Unauthorized Insert',
      message: 'Should be blocked by RLS',
      target_role: 'all'
    })
    .select();
  const empInsertBlocked = Boolean(empHackInsErr) || !empHackIns || empHackIns.length === 0;
  console.log('Tarumani direct INSERT blocked by RLS:', empInsertBlocked ? `✅ BLOCKED (${empHackInsErr?.message || 'RLS denied'})` : '❌ FAILED');
  if (!empInsertBlocked) allTestsPassed = false;

  // --- 5. Read/Unread Mutation and Persistence ---
  console.log('\n--- TEST 5: Mark as Read and DB Persistence ---');
  // Tarumani marks his own notification as read
  const { data: markReadData, error: markReadErr } = await empClient
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifTarumani.id)
    .select();

  const markReadSuccess = !markReadErr && markReadData && markReadData.length > 0 && markReadData[0].is_read === true;
  console.log('Tarumani mark own notification read:', markReadSuccess ? '✅ SUCCESS (is_read = true in Supabase)' : `❌ FAILED (${markReadErr?.message})`);
  if (!markReadSuccess) allTestsPassed = false;

  // Tarumani attempts to mutate other employee's private notification
  const { data: hackOtherUpdData, error: hackOtherUpdErr } = await empClient
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifOther.id)
    .select();

  const hackOtherBlocked = Boolean(hackOtherUpdErr) || !hackOtherUpdData || hackOtherUpdData.length === 0;
  console.log('Tarumani blocked from mutating other employee notification:', hackOtherBlocked ? '✅ BLOCKED (0 rows updated)' : '❌ MUTATION LEAK');
  if (!hackOtherBlocked) allTestsPassed = false;

  // Tarumani attempts to delete his notification (RLS only allows HR/Admin ALL, Employee has SELECT and UPDATE)
  const { data: empDelData, error: empDelErr } = await empClient
    .from('notifications')
    .delete()
    .eq('id', notifTarumani.id)
    .select();

  const empDelBlocked = Boolean(empDelErr) || !empDelData || empDelData.length === 0;
  console.log('Tarumani blocked from direct DELETE (only HR/Admin can delete):', empDelBlocked ? '✅ BLOCKED (0 rows deleted)' : '❌ DELETED BY EMPLOYEE');

  // --- 6. Persistence across Logout and Login ---
  console.log('\n--- TEST 6: Persistence across Logout & Login ---');
  // Create fresh client to simulate re-authentication session
  const reauthClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: reauthData, error: reauthErr } = await reauthClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (reauthErr) {
    console.error('❌ Re-auth failed:', reauthErr.message);
    allTestsPassed = false;
  } else {
    const { data: persistedNotif, error: persistedErr } = await reauthClient
      .from('notifications')
      .select('*')
      .eq('id', notifTarumani.id)
      .single();

    const isStillRead = !persistedErr && persistedNotif && persistedNotif.is_read === true;
    console.log('Notification is_read state persisted across fresh session:', isStillRead ? '✅ PERSISTED' : '❌ LOST');
    if (!isStillRead) allTestsPassed = false;
  }

  // --- 7. Admin Access Test ---
  console.log('\n--- TEST 7: Admin (Marcus Vance) Notification Access ---');
  const { data: adminAllNotifs, error: adminAllNotifsErr } = await adminClient
    .from('notifications')
    .select('*');

  const adminCanSeeAll = !adminAllNotifsErr && adminAllNotifs && adminAllNotifs.length >= tempNotifIds.length;
  console.log('Admin can access all notifications:', adminCanSeeAll ? `✅ SUCCESS (${adminAllNotifs.length} total rows visible)` : `❌ FAILED`);
  if (!adminCanSeeAll) allTestsPassed = false;

  // --- 8. Cleanup Temporary Test Data ---
  console.log('\n--- TEST 8: Temporary Test Data Cleanup ---');
  const { data: deletedRows, error: deleteErr } = await adminClient
    .from('notifications')
    .delete()
    .in('id', tempNotifIds)
    .select();

  if (deleteErr) {
    console.error('❌ Failed to cleanup test notifications:', deleteErr.message);
    allTestsPassed = false;
  } else {
    console.log(`✅ Cleaned up ${deletedRows?.length || 0} temporary test notification(s)`);
    // Verify none remain
    const { data: remainingCheck } = await adminClient
      .from('notifications')
      .select('id')
      .in('id', tempNotifIds);
    console.log('Verified 0 test notifications remaining:', remainingCheck?.length === 0 ? '✅ 0 REMAINING' : '❌ LEAKED ROWS');
    if (remainingCheck && remainingCheck.length > 0) allTestsPassed = false;
  }

  // --- 9. Announcements Regression Test ---
  console.log('\n--- TEST 9: Announcements Module Regression Check ---');
  const { data: announcements, error: annErr } = await empClient
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  const announcementsWorking = !annErr && Array.isArray(announcements);
  console.log('Announcements module still functions normally:', announcementsWorking ? `✅ WORKING (${announcements.length} announcements)` : `❌ REGRESSION (${annErr?.message})`);
  if (!announcementsWorking) allTestsPassed = false;

  // --- Summary ---
  console.log('\n================================================================');
  if (allTestsPassed) {
    console.log('🎉 ALL NOTIFICATIONS MODULE INTEGRATION TESTS PASSED!');
  } else {
    console.log('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('================================================================\n');

  if (!allTestsPassed) {
    process.exit(1);
  }
}

verifyNotificationsIntegration().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
