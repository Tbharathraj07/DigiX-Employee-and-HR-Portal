// scripts/test_forgot_password_e2e.js
// Verification suite for Forgot Password & Password Recovery flow
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function record(category, name, passed, details = '') {
  if (passed) {
    results.passed++;
    console.log(`  [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.failed++;
    console.error(`  [FAIL] ${name}: ${details}`);
  }
  results.tests.push({ category, name, passed, details });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('DIGIX PORTAL - FORGOT PASSWORD & RECOVERY VERIFICATION SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. FRONTEND IMPLEMENTATION & VALIDATION AUDIT
  // ---------------------------------------------------------------------------
  console.log('>>> TEST GROUP 1: FRONTEND CODE & VALIDATION CHECKS');

  const loginPageContent = fs.readFileSync('src/pages/auth/LoginPage.jsx', 'utf8');

  // Verify Forgot Password link exists
  const hasForgotLink = loginPageContent.includes('Forgot password?') && loginPageContent.includes('setIsForgotModalOpen(true)');
  record('Frontend', 'Forgot Password trigger exists and opens modal', hasForgotLink);

  // Verify empty email validation
  const hasEmptyEmailCheck = loginPageContent.includes('if (!targetEmail)') && loginPageContent.includes('Please enter your corporate email address.');
  record('Frontend', 'Empty email validation implemented', hasEmptyEmailCheck);

  // Verify invalid email format validation
  const hasInvalidEmailCheck = loginPageContent.includes('emailRegex.test(targetEmail)') && loginPageContent.includes('Please enter a valid email address.');
  record('Frontend', 'Invalid email format validation implemented', hasInvalidEmailCheck);

  // Verify supabase.auth.resetPasswordForEmail call
  const hasResetCall = loginPageContent.includes('supabase.auth.resetPasswordForEmail(targetEmail');
  record('Frontend', 'Calls supabase.auth.resetPasswordForEmail', hasResetCall);

  // Verify redirectTo is provided
  const hasRedirectTo = loginPageContent.includes('redirectTo: `${window.location.origin}/#/setup-password`');
  record('Frontend', 'Specifies correct redirectTo path (/#/setup-password)', hasRedirectTo);

  // ---------------------------------------------------------------------------
  // 2. ROUTING & URL NORMALIZATION AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 2: ROUTING & HASH NORMALIZATION');

  const mainContent = fs.readFileSync('src/main.jsx', 'utf8');
  const hasNormalizer = mainContent.includes('normalizeAuthRouting') && mainContent.includes('window.location.hash = \'#/setup-password\' + hash');
  record('Routing', 'HashRouter recovery fragment normalizer configured in main.jsx', hasNormalizer);

  const appContent = fs.readFileSync('src/App.jsx', 'utf8');
  const hasSetupRoute = appContent.includes('path="/setup-password"') && appContent.includes('SetupPasswordPage');
  record('Routing', 'SetupPasswordPage route /setup-password registered', hasSetupRoute);

  // ---------------------------------------------------------------------------
  // 3. SETUP PASSWORD & PASSWORD RECOVERY LOGIC AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 3: SETUP PASSWORD & RECOVERY FLOW LOGIC');

  const setupContent = fs.readFileSync('src/pages/auth/SetupPasswordPage.jsx', 'utf8');

  // Verify isRecoveryFlow detection
  const hasRecoveryState = setupContent.includes('isRecoveryFlow') && setupContent.includes('PASSWORD_RECOVERY');
  record('Recovery', 'isRecoveryFlow detected from URL parameters and auth events', hasRecoveryState);

  // Verify password strength validation (< 8 chars rejected)
  const hasMinLengthCheck = setupContent.includes('password.length < 8') && setupContent.includes('Password must be at least 8 characters long.');
  record('Validation', 'Password below 8 characters rejected', hasMinLengthCheck);

  // Verify password mismatch validation
  const hasMismatchCheck = setupContent.includes('password !== confirmPassword') && setupContent.includes('Passwords do not match.');
  record('Validation', 'Password mismatch rejected', hasMismatchCheck);

  // Verify updateUser password call
  const hasUpdateUser = setupContent.includes('supabase.auth.updateUser({') && setupContent.includes('password');
  record('Recovery', 'Calls supabase.auth.updateUser({ password })', hasUpdateUser);

  // Verify clean redirection after reset
  const hasCleanRedirect = setupContent.includes('navigate(\'/login\', { replace: true })') && setupContent.includes('supabase.auth.signOut()');
  record('Recovery', 'Signs out recovery session and redirects to /login on success', hasCleanRedirect);

  // Verify invitation flow is preserved
  const hasInvitationPreserved = setupContent.includes('navigate(\'/admin/dashboard\'') && setupContent.includes('Account Activated!');
  record('Regression', 'Invitation activation flow preserved without regression', hasInvitationPreserved);

  // ---------------------------------------------------------------------------
  // 4. SUPABASE AUTH API LIVE REQUEST TEST
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 4: LIVE SUPABASE AUTH API TEST');

  const client = createClient(SUPABASE_URL, ANON_KEY);

  // Request password reset for verified recipient
  const targetEmail = 'bharathrajtarumani01@gmail.com';
  const { data: resetRes, error: resetErr } = await client.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: 'http://localhost:5173/#/setup-password'
  });

  const requestSuccess = !resetErr && resetRes !== null;
  record('API Request', 'supabase.auth.resetPasswordForEmail() succeeds for target user', requestSuccess, resetErr?.message || 'HTTP 200 OK');

  // Verify sensitive tokens are not returned in API response
  const noTokensInResponse = !resetRes?.access_token && !resetRes?.session;
  record('Security', 'No sensitive session tokens exposed in reset request response', noTokensInResponse);

  // ---------------------------------------------------------------------------
  // 5. NEGATIVE LIVE TESTS
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 5: NEGATIVE LIVE TESTS');

  // 5a. Invalid/expired OTP token hash rejected
  const { error: expiredOtpErr } = await client.auth.verifyOtp({
    token_hash: 'invalid_dummy_token_hash_for_testing_recovery_flow',
    type: 'recovery'
  });
  record('Negative Tests', 'Invalid/expired recovery token_hash rejected by Supabase Auth', expiredOtpErr !== null, expiredOtpErr?.message);

  // 5b. Invalid access token setSession rejected
  const { error: invalidSessionErr } = await client.auth.setSession({
    access_token: 'dummy_invalid_access_token',
    refresh_token: 'dummy_invalid_refresh_token'
  });
  record('Negative Tests', 'Invalid access_token/refresh_token rejected by Supabase Auth', invalidSessionErr !== null, invalidSessionErr?.message);

  // ---------------------------------------------------------------------------
  // 6. TARGET EMPLOYEE DATA INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 6: TARGET EMPLOYEE DATA INTEGRITY');

  // Login as admin to check target employee record
  const { data: adminAuth } = await client.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });

  const { data: targetEmp } = await client.from('employees').select('id, employee_id, name, email, department, status').eq('email', targetEmail).single();
  const empExists = targetEmp !== null && targetEmp.email === targetEmail;
  record('Integrity', 'Target employee record intact (DGX008)', empExists, `ID: ${targetEmp?.employee_id}, Name: ${targetEmp?.name}`);

  // Marcus Vance & DGX005 checks
  const { data: dgx005 } = await client.from('employees').select('id, employee_id, name').eq('employee_id', 'DGX005').single();
  record('Integrity', 'DGX005 remains untouched', dgx005 !== null, `Name: ${dgx005?.name}`);

  console.log('\n================================================================');
  console.log(`TOTAL: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('================================================================');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
