// scripts/verify_live_password_recovery.js
import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

const accessToken = process.env.TEST_RECOVERY_ACCESS_TOKEN || '';
const refreshToken = process.env.TEST_RECOVERY_REFRESH_TOKEN || '';
const targetEmail = process.env.TEST_RECOVERY_EMAIL || '';
const newPassword = process.env.TEST_RECOVERY_NEW_PASSWORD || '';

async function verify() {
  console.log('================================================================');
  console.log('LIVE VERIFICATION: PASSWORD RECOVERY TOKEN & LOGIN');
  console.log('================================================================\n');

  const recoveryClient = createClient(SUPABASE_URL, ANON_KEY);

  // 1. Establish session from recovery tokens (exact flow of SetupPasswordPage.jsx)
  console.log('1. Establishing session from recovery tokens...');
  const { data: sessionData, error: sessionErr } = await recoveryClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (sessionErr) {
    console.error('❌ Recovery session failed:', sessionErr.message);
    process.exit(1);
  }

  const recoveryUser = sessionData?.session?.user;
  console.log('✅ Recovery session established successfully!');
  console.log('   User ID:', recoveryUser?.id);
  console.log('   User Email:', recoveryUser?.email);
  console.log('   User Full Name:', recoveryUser?.user_metadata?.full_name);

  // 2. Profile query as recovery user (exact query of SetupPasswordPage.jsx)
  console.log('\n2. Querying user profile under recovery session...');
  const { data: prof, error: profErr } = await recoveryClient
    .from('profiles')
    .select('id, employee_id, role, created_at')
    .eq('id', recoveryUser.id)
    .single();

  if (profErr) {
    console.warn('⚠️ Profile query warning:', profErr.message);
  } else {
    console.log('✅ Profile found: Role =', prof?.role, '| Employee ID =', prof?.employee_id);
  }

  // 3. Update password via supabase.auth.updateUser({ password })
  console.log('\n3. Updating password via supabase.auth.updateUser({ password })...');
  const { data: updateData, error: updateErr } = await recoveryClient.auth.updateUser({
    password: newPassword
  });

  if (updateErr) {
    console.error('❌ Password update failed:', updateErr.message);
    process.exit(1);
  }

  console.log('✅ Password successfully updated in Supabase Auth!');

  // 4. Sign out of recovery session (clean teardown)
  console.log('\n4. Signing out of recovery session...');
  await recoveryClient.auth.signOut();
  console.log('✅ Recovery session signed out cleanly.');

  // 5. Test LOGIN with the NEW PASSWORD (exact flow of LoginPage.jsx)
  console.log('\n5. Testing login with NEW password at /login...');
  const loginClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: loginData, error: loginErr } = await loginClient.auth.signInWithPassword({
    email: targetEmail,
    password: newPassword
  });

  if (loginErr) {
    console.error('❌ Login with new password failed:', loginErr.message);
    process.exit(1);
  }

  const authenticatedUser = loginData?.user;
  console.log('✅ Login SUCCEEDED with new password!');
  console.log('   Authenticated User ID:', authenticatedUser?.id);
  console.log('   Email:', authenticatedUser?.email);

  // 6. Test AuthContext profile & employee loading
  console.log('\n6. Testing profile and employee resolution (AuthContext.jsx)...');
  const { data: authProfile, error: authProfileErr } = await loginClient
    .from('profiles')
    .select('id, employee_id, role')
    .eq('id', authenticatedUser.id)
    .single();

  if (authProfileErr) {
    console.error('❌ Profile lookup failed:', authProfileErr.message);
    process.exit(1);
  }

  const { data: authEmployee, error: authEmployeeErr } = await loginClient
    .from('employees')
    .select('id, employee_id, name, department, designation, status')
    .eq('id', authProfile.employee_id)
    .single();

  if (authEmployeeErr) {
    console.error('❌ Linked employee lookup failed:', authEmployeeErr.message);
    process.exit(1);
  }

  console.log('✅ User Profile & Employee Data Loaded Successfully!');
  console.log('   Employee ID:', authEmployee.employee_id);
  console.log('   Name:', authEmployee.name);
  console.log('   Role:', authProfile.role);
  console.log('   Department:', authEmployee.department);
  console.log('   Designation:', authEmployee.designation);
  console.log('   Status:', authEmployee.status);

  console.log('\n================================================================');
  console.log('FORGOT PASSWORD COMPLETE END-TO-END VERIFIED (100% SUCCESS)');
  console.log('================================================================');
}

verify().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
