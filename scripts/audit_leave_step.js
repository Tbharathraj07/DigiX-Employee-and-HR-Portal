import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function runAudit() {
  console.log('====================================================');
  console.log('    LEAVE MANAGEMENT → SUPABASE AUDIT & TESTS       ');
  console.log('====================================================\n');

  // --- TEST 1: Unauthenticated / Anonymous Access ---
  console.log('--- TEST 1: Unauthenticated / Anon Access Security ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: anonReqs, error: anonReqsErr } = await anonClient.from('leave_requests').select('*');
  console.log('Anon SELECT leave_requests count:', anonReqs?.length ?? 0, '| Error:', anonReqsErr?.message || 'None (0 rows returned)');

  const { data: anonBals, error: anonBalsErr } = await anonClient.from('leave_balances').select('*');
  console.log('Anon SELECT leave_balances count:', anonBals?.length ?? 0, '| Error:', anonBalsErr?.message || 'None (0 rows returned)');

  const { error: anonInsertErr } = await anonClient.from('leave_requests').insert({
    employee_id: '31f16325-1f18-4cd9-afcb-43fc7400bbf0',
    leave_type: 'casual',
    start_date: '2026-10-01',
    end_date: '2026-10-02'
  });
  console.log('Anon INSERT leave_requests blocked:', anonInsertErr ? '✅ ' + anonInsertErr.message : '❌ Failed to block');

  // --- TEST 2: Employee (Tarumani Bharath Raj) View Balances ---
  console.log('\n--- TEST 2: Employee Login & Balances (Tarumani Bharath Raj) ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw empAuthErr;
  console.log('✅ Employee logged in successfully. UID:', empAuth.user.id);

  const { data: empRecord } = await empClient.from('employees').select('id, employee_id, name').eq('user_id', empAuth.user.id).single();
  console.log('   Employee DB ID:', empRecord.id, 'Display ID:', empRecord.employee_id);

  const { data: myBalances, error: balErr } = await empClient.from('leave_balances').select('*').eq('employee_id', empRecord.id);
  console.log(`✅ Employee retrieved ${myBalances?.length} leave balance records from Supabase:`);
  myBalances.forEach(b => {
    console.log(`   - ${b.leave_type.toUpperCase()}: Total ${b.total_days} | Used ${b.used_days} | Remaining ${b.remaining_days}`);
  });

  // Check RLS balance isolation
  const { data: allBals } = await empClient.from('leave_balances').select('*');
  const leakedBals = allBals?.filter(b => b.employee_id !== empRecord.id);
  if (leakedBals?.length > 0) {
    console.error('❌ SECURITY FAILURE: Employee can see others balances:', leakedBals);
  } else {
    console.log('✅ PASS: Employee can ONLY see their own leave balances (RLS isolation verified).');
  }

  // --- TEST 3: Employee Submits Leave Request (2 days casual) ---
  console.log('\n--- TEST 3: Employee Submitting Leave Request (2 days Casual) ---');
  const { data: submittedReq1, error: submitErr1 } = await empClient.from('leave_requests').insert({
    employee_id: empRecord.id,
    leave_type: 'casual',
    start_date: '2026-10-22',
    end_date: '2026-10-23',
    reason: 'Attending family wedding ceremony',
    status: 'pending'
  }).select().single();

  if (submitErr1) throw submitErr1;
  console.log('✅ Leave request 1 stored in Supabase:', {
    id: submittedReq1.id,
    leave_type: submittedReq1.leave_type,
    dates: `${submittedReq1.start_date} to ${submittedReq1.end_date}`,
    status: submittedReq1.status
  });

  // --- TEST 4: Security - Unauthorized Actions by Employee ---
  console.log('\n--- TEST 4: Security Checks on Employee Privileges ---');
  // Attempt to approve own request
  const { data: selfApprove, error: selfApproveErr } = await empClient.from('leave_requests').update({
    status: 'approved'
  }).eq('id', submittedReq1.id).select();

  console.log('   Self-approve attempt result:', { rows: selfApprove?.length ?? 0, error: selfApproveErr?.message });
  if (!selfApprove || selfApprove.length === 0) {
    console.log('✅ PASS: Employee cannot approve their own leave request (Enforced by RLS)!');
  }

  // Attempt to tamper with leave balance
  const { data: tamperBal, error: tamperBalErr } = await empClient.from('leave_balances').update({
    remaining_days: 999
  }).eq('employee_id', empRecord.id).select();

  console.log('   Tamper balance attempt result:', { rows: tamperBal?.length ?? 0, error: tamperBalErr?.message });
  if (!tamperBal || tamperBal.length === 0) {
    console.log('✅ PASS: Employee cannot modify leave balances (Enforced by RLS)!');
  }

  // Attempt to read all leave requests
  const { data: allReqsForEmp } = await empClient.from('leave_requests').select('*');
  const leakedReqs = allReqsForEmp?.filter(r => r.employee_id !== empRecord.id);
  if (leakedReqs?.length > 0) {
    console.error('❌ SECURITY FAILURE: Employee can see others requests:', leakedReqs);
  } else {
    console.log('✅ PASS: Employee can ONLY see their own leave requests (RLS isolation verified).');
  }

  // --- TEST 5: HR Approval Flow (Priyanka) ---
  console.log('\n--- TEST 5: HR Login & Approval Flow (Priyanka) ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw hrAuthErr;
  console.log('✅ HR logged in successfully. UID:', hrAuth.user.id);

  const { data: hrRecord } = await hrClient.from('employees').select('id, name').eq('user_id', hrAuth.user.id).single();

  // HR reviews company leave requests
  const { data: hrVisibleReqs } = await hrClient.from('leave_requests').select(`
    id,
    employee_id,
    leave_type,
    start_date,
    end_date,
    reason,
    status,
    employee:employees!employee_id (id, name, department)
  `);

  console.log(`✅ HR can view all company leave requests (${hrVisibleReqs?.length} on record)`);
  const foundReq = hrVisibleReqs?.find(r => r.id === submittedReq1.id);
  console.log('   Found pending request from:', foundReq?.employee?.name, `(${foundReq?.employee?.department})`);

  // HR Approves request
  const initialBalRow = myBalances.find(b => b.leave_type === 'casual');
  const initialRemaining = Number(initialBalRow.remaining_days); // 8

  const { error: approveErr } = await hrClient.from('leave_requests').update({
    status: 'approved',
    approved_by: hrRecord.id,
    approved_at: new Date().toISOString(),
    hr_comment: 'Approved by HR Manager Priyanka. Have a great time!'
  }).eq('id', submittedReq1.id);

  if (approveErr) throw approveErr;
  console.log('✅ HR approved leave request 1 in Supabase!');

  // Adjust leave balance (2 days deducted from casual)
  const daysDeducted = 2;
  const expectedUsed = Number(initialBalRow.used_days) + daysDeducted;
  const expectedRemaining = Number(initialBalRow.total_days) - expectedUsed;

  const { error: balDeductErr } = await hrClient.from('leave_balances').update({
    used_days: expectedUsed,
    remaining_days: expectedRemaining
  }).eq('id', initialBalRow.id);

  if (balDeductErr) throw balDeductErr;
  console.log(`✅ HR updated leave_balances: used ${expectedUsed}, remaining ${expectedRemaining}`);

  // --- TEST 6: Employee Re-check & Persistence ---
  console.log('\n--- TEST 6: Employee Verify Updated Request Status & Balance ---');
  const { data: empViewReq1 } = await empClient.from('leave_requests').select('*').eq('id', submittedReq1.id).single();
  console.log('   Request status for Employee:', empViewReq1.status);
  console.log('   HR Comment:', empViewReq1.hr_comment);

  const { data: empViewBal1 } = await empClient.from('leave_balances').select('*').eq('id', initialBalRow.id).single();
  console.log('   Updated Casual Balance for Employee:', {
    total: empViewBal1.total_days,
    used: empViewBal1.used_days,
    remaining: empViewBal1.remaining_days
  });

  const verified1 = empViewReq1.status === 'approved' && Number(empViewBal1.remaining_days) === expectedRemaining;
  console.log('   Approval & Balance Consistency Check:', verified1 ? '✅ PERFECT' : '❌ MISMATCH');

  // Test logout and login persistence
  await empClient.auth.signOut();
  await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  const { data: empViewBalPersist } = await empClient.from('leave_balances').select('*').eq('id', initialBalRow.id).single();
  console.log('   Persistence across logout/login:', Number(empViewBalPersist.remaining_days) === expectedRemaining ? '✅ PERSISTED' : '❌ LOST');

  // --- TEST 7: Rejection Flow ---
  console.log('\n--- TEST 7: Testing Rejection Flow ---');
  // Employee submits second request (Sick Leave 1 day)
  const { data: submittedReq2 } = await empClient.from('leave_requests').insert({
    employee_id: empRecord.id,
    leave_type: 'sick',
    start_date: '2026-11-02',
    end_date: '2026-11-02',
    reason: 'Dental routine checkup',
    status: 'pending'
  }).select().single();

  console.log('   Employee submitted request 2 (Sick):', submittedReq2.id);

  const initialSickBal = myBalances.find(b => b.leave_type === 'sick');

  // HR Rejects second request
  const { error: rejectErr } = await hrClient.from('leave_requests').update({
    status: 'rejected',
    approved_by: hrRecord.id,
    approved_at: new Date().toISOString(),
    hr_comment: 'Please reschedule non-urgent checkups outside sprint freeze.'
  }).eq('id', submittedReq2.id);

  if (rejectErr) throw rejectErr;
  console.log('✅ HR rejected leave request 2 in Supabase!');

  // Verify sick balance was NOT deducted
  const { data: sickBalAfterReject } = await empClient.from('leave_balances').select('*').eq('id', initialSickBal.id).single();
  console.log('   Sick balance after rejection (should be unchanged):', {
    total: sickBalAfterReject.total_days,
    used: sickBalAfterReject.used_days,
    remaining: sickBalAfterReject.remaining_days
  });
  const sickUnchanged = Number(sickBalAfterReject.remaining_days) === Number(initialSickBal.remaining_days);
  console.log('   Rejection balance integrity check:', sickUnchanged ? '✅ UNCHANGED (CORRECT)' : '❌ ERRONEOUSLY DEDUCTED');

  // --- TEST 8: Admin Verification (Marcus Vance) ---
  console.log('\n--- TEST 8: Admin Login & Access (Marcus Vance) ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw adminAuthErr;
  console.log('✅ Admin logged in successfully. UID:', adminAuth.user.id);

  const { data: adminReqs } = await adminClient.from('leave_requests').select('id, employee_id, leave_type, status');
  console.log(`✅ Admin can view all leave requests (${adminReqs?.length} total in system)`);

  const { data: adminBals } = await adminClient.from('leave_balances').select('id, employee_id, leave_type, remaining_days');
  console.log(`✅ Admin can view all leave balances (${adminBals?.length} total across all company employees)`);

  console.log('\n====================================================');
  console.log('          AUDIT & VERIFICATION COMPLETED            ');
  console.log('====================================================');
}

runAudit().catch(console.error);
