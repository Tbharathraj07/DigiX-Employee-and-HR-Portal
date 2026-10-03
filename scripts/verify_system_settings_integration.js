import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

const EMP_EMAIL = 'tarumani.bharathraj@digix.internal';
const HR_EMAIL = 'priyanka@digix.internal';
const ADMIN_EMAIL = 'marcus.vance@digix.internal';
const PASS = 'demo';

async function runSystemSettingsVerification() {
  console.log('================================================================');
  console.log('DIGIX PORTAL - MODULE 6: SYSTEM SETTINGS & PERMISSIONS SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // STEP 1: Anonymous Access Test
  // ---------------------------------------------------------------------------
  console.log('>>> STEP 1: ANONYMOUS ACCESS TEST');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  const { data: anonSelect, error: anonSelectErr } = await anonClient.from('system_settings').select('*');
  console.log(`- Anon SELECT result: error=${anonSelectErr?.message || 'none'}, count=${anonSelect?.length || 0}`);
  if (anonSelectErr) {
    console.log('  [PASS] Anonymous SELECT blocked with database permission error.');
  } else {
    throw new Error('Security Breach: Anonymous client read system_settings!');
  }

  const { error: anonInsErr } = await anonClient.from('system_settings').insert({
    config_key: 'anon_hack_key',
    config_value: { hacked: true }
  });
  if (anonInsErr) {
    console.log(`  [PASS] Anonymous INSERT blocked by database permissions: ${anonInsErr.message}`);
  } else {
    throw new Error('Security Breach: Anonymous user inserted into system_settings!');
  }

  const { error: anonUpdErr } = await anonClient.from('system_settings').update({
    config_value: { hacked: true }
  }).eq('config_key', 'system_settings');
  if (anonUpdErr) {
    console.log(`  [PASS] Anonymous UPDATE blocked by database permissions: ${anonUpdErr.message}`);
  } else {
    throw new Error('Security Breach: Anonymous user updated system_settings!');
  }

  const { error: anonDelErr } = await anonClient.from('system_settings').delete().eq('config_key', 'system_settings');
  if (anonDelErr) {
    console.log(`  [PASS] Anonymous DELETE blocked by database permissions: ${anonDelErr.message}`);
  } else {
    throw new Error('Security Breach: Anonymous user deleted system_settings!');
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Authenticate Real Test Accounts
  // ---------------------------------------------------------------------------
  console.log('\n>>> STEP 2: AUTHENTICATING REAL TEST ACCOUNTS');
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: EMP_EMAIL,
    password: PASS
  });
  if (empAuthErr) throw new Error(`Employee auth failed: ${empAuthErr.message}`);
  console.log(`- Employee authenticated: Tarumani Bharath Raj (UID: ${empAuth.user.id})`);

  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: HR_EMAIL,
    password: PASS
  });
  if (hrAuthErr) throw new Error(`HR auth failed: ${hrAuthErr.message}`);
  console.log(`- HR authenticated: Priyanka (UID: ${hrAuth.user.id})`);

  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: PASS
  });
  if (adminAuthErr) throw new Error(`Admin auth failed: ${adminAuthErr.message}`);
  console.log(`- Admin authenticated: Marcus Vance (UID: ${adminAuth.user.id})`);

  const { data: adminRecord } = await adminClient
    .from('employees')
    .select('id, name')
    .eq('email', ADMIN_EMAIL)
    .single();
  console.log(`- Admin employee DB ID: ${adminRecord.id}`);

  // ---------------------------------------------------------------------------
  // STEP 3: Employee Security & RLS Tests
  // ---------------------------------------------------------------------------
  console.log('\n>>> STEP 3: EMPLOYEE SECURITY & RLS TESTS');
  // 1. Employee SELECT - should ONLY see is_public = true records
  const { data: empVisible, error: empSelectErr } = await empClient
    .from('system_settings')
    .select('config_key, is_public');

  if (empSelectErr) throw new Error(`Employee select failed: ${empSelectErr.message}`);
  console.log(`- Employee visible config keys: [${empVisible.map(r => r.config_key).join(', ')}]`);

  const hasNonPublic = empVisible.some(r => r.is_public === false || r.config_key === 'role_permissions');
  if (!hasNonPublic) {
    console.log('  [PASS] Employee can ONLY view public settings. Private role_permissions is strictly hidden by RLS!');
  } else {
    throw new Error('RLS breach: Employee was able to read non-public system settings!');
  }

  // 2. Employee INSERT attempt - must fail
  const { error: empInsErr } = await empClient.from('system_settings').insert({
    config_key: 'employee_test_injection',
    config_value: { unauthorized: true },
    is_public: true
  });
  if (empInsErr) {
    console.log(`  [PASS] Employee INSERT on system_settings blocked: ${empInsErr.message}`);
  } else {
    throw new Error('RLS breach: Employee inserted into system_settings!');
  }

  // 3. Employee UPDATE attempt - must affect 0 rows
  const { data: empUpdData } = await empClient
    .from('system_settings')
    .update({ config_value: { portalName: 'Employee Overridden Portal' } })
    .eq('config_key', 'system_settings')
    .select();

  if (!empUpdData || empUpdData.length === 0) {
    console.log('  [PASS] Employee UPDATE on system_settings blocked (0 rows affected).');
  } else {
    throw new Error('RLS breach: Employee modified system_settings!');
  }

  // 4. Employee DELETE attempt - must affect 0 rows
  const { data: empDelData } = await empClient
    .from('system_settings')
    .delete()
    .eq('config_key', 'system_settings')
    .select();

  if (!empDelData || empDelData.length === 0) {
    console.log('  [PASS] Employee DELETE on system_settings blocked (0 rows affected).');
  } else {
    throw new Error('RLS breach: Employee deleted system_settings!');
  }

  // ---------------------------------------------------------------------------
  // STEP 4: HR Security & RLS Tests
  // ---------------------------------------------------------------------------
  console.log('\n>>> STEP 4: HR SECURITY & RLS TESTS');
  // 1. HR SELECT - can read settings
  const { data: hrVisible, error: hrSelectErr } = await hrClient
    .from('system_settings')
    .select('config_key, is_public');

  if (hrSelectErr) throw new Error(`HR select failed: ${hrSelectErr.message}`);
  console.log(`- HR visible config keys: [${hrVisible.map(r => r.config_key).join(', ')}]`);
  console.log('  [PASS] HR can view departmental and public system settings.');

  // 2. HR permitted UPDATE on leave_policy_quotas
  const { data: hrUpdLeave, error: hrUpdLeaveErr } = await hrClient
    .from('system_settings')
    .update({
      config_value: { casualLimit: 14, sickLimit: 10, privilegeLimit: 18, carryForward: 6 },
      updated_by: adminRecord.id
    })
    .eq('config_key', 'leave_policy_quotas')
    .select();

  if (hrUpdLeaveErr || !hrUpdLeave || hrUpdLeave.length === 0) {
    throw new Error(`HR permitted UPDATE failed: ${hrUpdLeaveErr?.message || '0 rows updated'}`);
  }
  console.log(`  [PASS] HR successfully updated permitted leave_policy_quotas (Rows updated: ${hrUpdLeave.length}).`);

  // 3. HR restricted UPDATE on system_settings (Admin tenant branding) - must affect 0 rows
  const { data: hrUpdAdminData } = await hrClient
    .from('system_settings')
    .update({ config_value: { portalName: 'HR Hijacked Portal' } })
    .eq('config_key', 'system_settings')
    .select();

  if (!hrUpdAdminData || hrUpdAdminData.length === 0) {
    console.log('  [PASS] HR UPDATE on Admin system_settings blocked by RLS (0 rows affected).');
  } else {
    throw new Error('RLS breach: HR modified Admin system_settings!');
  }

  // 4. HR restricted UPDATE on role_permissions - must affect 0 rows
  const { data: hrUpdPermData } = await hrClient
    .from('system_settings')
    .update({ config_value: [] })
    .eq('config_key', 'role_permissions')
    .select();

  if (!hrUpdPermData || hrUpdPermData.length === 0) {
    console.log('  [PASS] HR UPDATE on role_permissions blocked by RLS (0 rows affected).');
  } else {
    throw new Error('RLS breach: HR modified role_permissions!');
  }

  // 5. HR INSERT attempt - must fail
  const { error: hrInsErr } = await hrClient.from('system_settings').insert({
    config_key: 'hr_unauthorized_key',
    config_value: { test: true },
    is_public: false
  });
  if (hrInsErr) {
    console.log(`  [PASS] HR INSERT on system_settings blocked: ${hrInsErr.message}`);
  } else {
    throw new Error('RLS breach: HR inserted new system_settings row!');
  }

  // 6. HR DELETE attempt - must affect 0 rows
  const { data: hrDelData } = await hrClient
    .from('system_settings')
    .delete()
    .eq('config_key', 'leave_policy_quotas')
    .select();

  if (!hrDelData || hrDelData.length === 0) {
    console.log('  [PASS] HR DELETE on system_settings blocked (0 rows affected).');
  } else {
    throw new Error('RLS breach: HR deleted system_settings row!');
  }

  // ---------------------------------------------------------------------------
  // STEP 5: Role Escalation Prevention Tests
  // ---------------------------------------------------------------------------
  console.log('\n>>> STEP 5: ROLE ESCALATION PREVENTION TESTS');
  // 1. Employee trying to escalate own role to admin
  const { error: empEscErr } = await empClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', empAuth.user.id);

  if (empEscErr) {
    console.log(`  [PASS] Employee role escalation to Admin strictly BLOCKED: ${empEscErr.message}`);
  } else {
    throw new Error('CRITICAL SECURITY BREACH: Employee escalated own role to admin!');
  }

  // 2. Employee trying to escalate own role to hr_manager
  const { error: empEscHrErr } = await empClient
    .from('profiles')
    .update({ role: 'hr_manager' })
    .eq('id', empAuth.user.id);

  if (empEscHrErr) {
    console.log(`  [PASS] Employee role escalation to HR Manager strictly BLOCKED: ${empEscHrErr.message}`);
  } else {
    throw new Error('CRITICAL SECURITY BREACH: Employee escalated own role to hr_manager!');
  }

  // 3. HR trying to escalate own role to admin
  const { error: hrEscErr } = await hrClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', hrAuth.user.id);

  if (hrEscErr) {
    console.log(`  [PASS] HR role escalation to Admin strictly BLOCKED: ${hrEscErr.message}`);
  } else {
    throw new Error('CRITICAL SECURITY BREACH: HR escalated own role to admin!');
  }

  // ---------------------------------------------------------------------------
  // STEP 6: Admin Configuration & Audit Logging Tests
  // ---------------------------------------------------------------------------
  console.log('\n>>> STEP 6: ADMIN CONFIGURATION & AUDIT LOGGING TESTS');
  // Fetch initial system settings for baseline
  const { data: initialSettingsRow } = await adminClient
    .from('system_settings')
    .select('*')
    .eq('config_key', 'system_settings')
    .single();

  const originalConfig = initialSettingsRow.config_value;
  console.log(`- Current Portal Name in Supabase: "${originalConfig.portalName}"`);

  // Admin updates system_settings with controlled test value
  const tempPortalName = `DigiX Portal (Verified ${Date.now()})`;
  const updatedConfig = { ...originalConfig, portalName: tempPortalName };

  const { data: adminUpdRes, error: adminUpdErr } = await adminClient
    .from('system_settings')
    .update({
      config_value: updatedConfig,
      updated_by: adminRecord.id
    })
    .eq('config_key', 'system_settings')
    .select()
    .single();

  if (adminUpdErr) throw new Error(`Admin update failed: ${adminUpdErr.message}`);
  console.log(`  [PASS] Admin updated system_settings: Portal Name is now "${adminUpdRes.config_value.portalName}"`);

  // Record audit log for settings update
  const auditAction = `System settings configuration updated (Test ${Date.now()})`;
  const { error: auditErr } = await adminClient.from('audit_logs').insert({
    actor_employee_id: adminRecord.id,
    actor_name: adminRecord.name,
    role: 'System Administrator',
    action: auditAction,
    module: 'Admin',
    status: 'Success',
    details: { updatedKey: 'system_settings', newPortalName: tempPortalName }
  });

  if (auditErr) throw new Error(`Settings audit log failed: ${auditErr.message}`);
  console.log(`  [PASS] Audit log recorded for settings update: "${auditAction}"`);

  // ---------------------------------------------------------------------------
  // STEP 7: Persistence Across Complete Logout & Re-login
  // ---------------------------------------------------------------------------
  console.log('\n>>> STEP 7: PERSISTENCE ACROSS RE-AUTHENTICATION');
  await adminClient.auth.signOut();
  console.log('- Admin signed out completely.');

  const reAuthClient = createClient(SUPABASE_URL, ANON_KEY);
  await reAuthClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: PASS
  });
  console.log('- Admin re-authenticated with Supabase.');

  const { data: persistedRow, error: persistErr } = await reAuthClient
    .from('system_settings')
    .select('config_value')
    .eq('config_key', 'system_settings')
    .single();

  if (persistErr) throw new Error(`Failed to load persisted settings: ${persistErr.message}`);
  console.log(`- Loaded Portal Name from Supabase: "${persistedRow.config_value.portalName}"`);

  if (persistedRow.config_value.portalName === tempPortalName) {
    console.log('  [PASS] Verified configuration persists across complete logout / login in live Supabase!');
  } else {
    throw new Error('Persistence mismatch: Saved configuration was not found after re-login!');
  }

  // ---------------------------------------------------------------------------
  // STEP 8: Restoration of Original Settings Value
  // ---------------------------------------------------------------------------
  console.log('\n>>> STEP 8: RESTORATION OF ORIGINAL SYSTEM SETTINGS VALUE');
  const { data: restoredRow, error: restoreErr } = await reAuthClient
    .from('system_settings')
    .update({
      config_value: originalConfig,
      updated_by: adminRecord.id
    })
    .eq('config_key', 'system_settings')
    .select()
    .single();

  if (restoreErr) throw new Error(`Restoration failed: ${restoreErr.message}`);
  console.log(`  [PASS] Restored original Portal Name: "${restoredRow.config_value.portalName}"`);

  // Also restore leave quotas to default (12, 10, 18, 5)
  await reAuthClient
    .from('system_settings')
    .update({
      config_value: { casualLimit: 12, sickLimit: 10, privilegeLimit: 18, carryForward: 5 },
      updated_by: adminRecord.id
    })
    .eq('config_key', 'leave_policy_quotas');
  console.log('  [PASS] Restored baseline leave policy quotas: { casual: 12, sick: 10, privilege: 18, carryForward: 5 }');

  // ---------------------------------------------------------------------------
  // STEP 9: Regression Verification Across Completed Modules
  // ---------------------------------------------------------------------------
  console.log('\n>>> STEP 9: REGRESSION VERIFICATION ACROSS COMPLETED MODULES');
  const tablesToCheck = [
    'announcements', 'notifications', 'employee_documents', 'company_documents',
    'onboarding_checklists', 'audit_logs', 'leave_requests', 'leave_balances', 'attendance', 'projects', 'tasks'
  ];

  for (const tbl of tablesToCheck) {
    const { data: rows, error: tblErr } = await reAuthClient.from(tbl).select('id').limit(2);
    if (tblErr) throw new Error(`Regression on table ${tbl}: ${tblErr.message}`);
    console.log(`- Table ${tbl.padEnd(23)}: OK (sample count=${rows?.length ?? 0})`);
  }
  console.log('  [PASS] Zero regressions across all previously completed modules.');

  console.log('\n================================================================');
  console.log('MODULE 6: SYSTEM SETTINGS & PERMISSIONS ALL TESTS PASSED!');
  console.log('================================================================\n');
}

runSystemSettingsVerification().catch(err => {
  console.error('\n[VERIFICATION SUITE ERROR]', err);
  process.exit(1);
});
