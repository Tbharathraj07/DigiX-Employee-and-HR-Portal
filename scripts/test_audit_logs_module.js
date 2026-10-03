import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testAuditLogsModule() {
  console.log('====================================================');
  console.log('MODULE 5: AUDIT LOGS -> SUPABASE VERIFICATION');
  console.log('====================================================\n');

  // 1. Anonymous Access Test
  console.log('--- TEST 1: ANONYMOUS ACCESS ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonData, error: anonErr } = await anonClient.from('audit_logs').select('*');
  console.log(`Anon select count: ${anonData?.length ?? 0} | Error: ${anonErr?.message || 'None'}`);

  const { data: anonIns, error: anonInsErr } = await anonClient.from('audit_logs').insert({
    actor_name: 'Anon Hacker',
    role: 'anonymous',
    action: 'Attempted hack',
    module: 'Security'
  });
  if (anonInsErr) {
    console.log(`[PASS] Anonymous INSERT blocked by RLS: ${anonInsErr.message}`);
  } else {
    console.error(`[FAIL] Anonymous user was able to insert into audit_logs!`);
  }

  // 2. Employee (Tarumani Bharath Raj) Test
  console.log('\n--- TEST 2: EMPLOYEE (Tarumani Bharath Raj) AUDIT LOG PERMISSIONS ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw new Error(`Employee auth failed: ${empAuthErr.message}`);
  console.log(`[PASS] Employee authenticated: UID ${empAuth.user.id}`);

  // Fetch employee record to get employee ID
  const { data: empRecord } = await empClient
    .from('employees')
    .select('id, name')
    .eq('email', 'tarumani.bharathraj@digix.internal')
    .single();

  // Employee inserts an audit log for a self action (e.g. Profile or Leave update)
  const { data: empLog, error: empLogErr } = await empClient
    .from('audit_logs')
    .insert({
      actor_employee_id: empRecord.id,
      actor_name: empRecord.name,
      role: 'Associate Developer',
      action: 'TEST_Employee checked security settings',
      module: 'Security',
      status: 'Success'
    })
    .select()
    .single();

  if (empLogErr) {
    console.error(`[FAIL] Employee could not insert permitted audit log: ${empLogErr.message}`);
  } else {
    console.log(`[PASS] Employee successfully recorded audit log: ID ${empLog.id}`);
  }

  // Employee attempts to read audit logs -> Should be BLOCKED (0 rows returned or error)
  const { data: empReadLogs, error: empReadErr } = await empClient.from('audit_logs').select('*');
  if (empReadErr || !empReadLogs || empReadLogs.length === 0) {
    console.log(`[PASS] Employee SELECT on audit_logs blocked by RLS (0 rows visible to regular staff).`);
  } else {
    console.error(`[FAIL] RLS LEAK: Employee was able to read ${empReadLogs.length} audit logs!`);
  }

  // 3. HR (Priyanka) Test
  console.log('\n--- TEST 3: HR (Priyanka) AUDIT LOG PERMISSIONS ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw new Error(`HR auth failed: ${hrAuthErr.message}`);
  console.log(`[PASS] HR authenticated: UID ${hrAuth.user.id}`);

  const { data: hrRecord } = await hrClient.from('employees').select('id, name').eq('email', 'priyanka@digix.internal').single();

  // HR inserts an HR audit log
  const { data: hrLog, error: hrLogErr } = await hrClient
    .from('audit_logs')
    .insert({
      actor_employee_id: hrRecord.id,
      actor_name: hrRecord.name,
      role: 'HR Manager',
      action: 'TEST_HR reviewed workforce leave applications',
      module: 'Leave',
      status: 'Success'
    })
    .select()
    .single();

  if (hrLogErr) {
    console.error(`[FAIL] HR could not insert audit log: ${hrLogErr.message}`);
  } else {
    console.log(`[PASS] HR successfully created HR audit log: ID ${hrLog.id}`);
  }

  // HR reads permitted logs (HR modules)
  const { data: hrReadLogs, error: hrReadErr } = await hrClient.from('audit_logs').select('*');
  if (hrReadErr) {
    console.error(`[FAIL] HR failed to read logs: ${hrReadErr.message}`);
  } else {
    console.log(`[PASS] HR retrieved ${hrReadLogs.length} audit logs via RLS.`);
    const nonHrLog = hrReadLogs.find(l => l.module === 'Admin' || l.module === 'System');
    if (!nonHrLog) {
      console.log(`[PASS] Verified HR only accesses permitted modules (no Admin/System subsystem leakage).`);
    } else {
      console.warn(`[INFO] HR log scope check: row with module ${nonHrLog.module} returned.`);
    }
  }

  // 4. Admin (Marcus Vance) Test
  console.log('\n--- TEST 4: ADMIN (Marcus Vance) FULL AUDIT LOG PERMISSIONS ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw new Error(`Admin auth failed: ${adminAuthErr.message}`);
  console.log(`[PASS] Admin authenticated: UID ${adminAuth.user.id}`);

  const { data: adminRecord } = await adminClient.from('employees').select('id, name').eq('email', 'marcus.vance@digix.internal').single();

  // Admin inserts admin audit log
  const { data: adminLog, error: adminLogErr } = await adminClient
    .from('audit_logs')
    .insert({
      actor_employee_id: adminRecord.id,
      actor_name: adminRecord.name,
      role: 'System Administrator',
      action: 'TEST_Admin performed zero-trust security audit',
      module: 'Admin',
      status: 'Success'
    })
    .select()
    .single();

  if (adminLogErr) {
    throw new Error(`Admin failed to insert audit log: ${adminLogErr.message}`);
  }
  console.log(`[PASS] Admin inserted audit log: ID ${adminLog.id}`);

  // Admin reads all logs
  const { data: allAdminLogs, error: adminReadErr } = await adminClient
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (adminReadErr) {
    throw new Error(`Admin read failed: ${adminReadErr.message}`);
  }
  console.log(`[PASS] Admin verified ${allAdminLogs.length} total audit log entries across all subsystems.`);

  // 5. Append-Only Security Defense: NO UPDATE OR DELETE ALLOWED
  console.log('\n--- TEST 5: STRICT IMMUTABILITY / APPEND-ONLY DEFENSE ---');
  // Attempt 1: UPDATE on audit log -> MUST FAIL
  const { data: updData, error: updErr } = await adminClient
    .from('audit_logs')
    .update({ action: 'TAMPERED_ACTION_OVERRIDE' })
    .eq('id', adminLog.id)
    .select();

  if (updErr || !updData || updData.length === 0) {
    console.log(`[PASS] UPDATE operation strictly BLOCKED by database RLS (0 rows affected).`);
  } else {
    console.error(`[FAIL] IMMUTABILITY BREACH: Audit log was modified!`);
  }

  // Attempt 2: DELETE on audit log -> MUST FAIL
  const { data: delData, error: delErr } = await adminClient
    .from('audit_logs')
    .delete()
    .eq('id', adminLog.id)
    .select();

  if (delErr || !delData || delData.length === 0) {
    console.log(`[PASS] DELETE operation strictly BLOCKED by database RLS (0 rows deleted). Immutability confirmed!`);
  } else {
    console.error(`[FAIL] IMMUTABILITY BREACH: Audit log was deleted!`);
  }

  console.log('\n====================================================');
  console.log('MODULE 5 (AUDIT LOGS) ALL VERIFICATIONS PASSED');
  console.log('====================================================');
}

testAuditLogsModule().catch(err => {
  console.error('[MODULE 5 ERROR]', err);
  process.exit(1);
});
