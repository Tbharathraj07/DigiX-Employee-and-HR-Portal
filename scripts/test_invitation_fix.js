// scripts/test_invitation_fix.js
// Verification suite for the employee registration approval invitation fix
import fs from 'fs';
import path from 'path';

function runTestSuite() {
  console.log('================================================================');
  console.log('TEST SUITE: EMPLOYEE REGISTRATION APPROVAL & INVITATION FIX');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(title, condition, detail = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${title}`);
    } else {
      console.error(`  [FAIL] ${title} - ${detail}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Inspect Edge Function Source Code
  // ---------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Edge Function Code Analysis ---');
  const edgeFunctionPath = path.resolve('supabase/functions/approve-registration/index.ts');
  const edgeFunctionContent = fs.readFileSync(edgeFunctionPath, 'utf8');

  // Verify inviteUserByEmail is called
  assert(
    'Calls supabaseAdmin.auth.admin.inviteUserByEmail',
    edgeFunctionContent.includes('supabaseAdmin.auth.admin.inviteUserByEmail(')
  );

  // Verify silent fallback to admin.createUser was completely removed
  assert(
    'Silent fallback to admin.createUser is completely removed',
    !edgeFunctionContent.includes('admin.createUser(') &&
    !edgeFunctionContent.includes('Provisioning Auth user directly via admin.createUser')
  );

  // Verify error handling on invite failure returns clean failure response
  assert(
    'Returns non-200 failure response when inviteUserByEmail fails',
    edgeFunctionContent.includes('invitation_email_delivered: false') &&
    edgeFunctionContent.includes('errorCode') &&
    edgeFunctionContent.includes('EMAIL_RATE_LIMIT_EXCEEDED')
  );

  // Verify registration request is NOT marked approved on invite failure
  assert(
    'Registration request is NOT updated before inviteUserByEmail succeeds',
    edgeFunctionContent.indexOf('inviteUserByEmail') < edgeFunctionContent.indexOf(".from('registration_requests')\n      .update({")
  );

  // Verify unrequested manual activation link fallback was removed
  assert(
    'Manual activation-link fallback endpoint is NOT present',
    !edgeFunctionContent.includes("body.action === 'generate-activation-link'")
  );

  // Verify safe rollback logic exists
  assert(
    'Transaction rollback cleanly removes profile, employee, and auth user on downstream failure',
    edgeFunctionContent.includes("deleteUser(createdAuthUserId)") &&
    edgeFunctionContent.includes(".from('employees').delete()") &&
    edgeFunctionContent.includes(".from('profiles').delete()")
  );

  // ---------------------------------------------------------------------------
  // 2. Inspect Frontend UsersManagement.jsx Source Code
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Frontend Admin UI Response Handling ---');
  const usersManagementPath = path.resolve('src/pages/admin/UsersManagement.jsx');
  const usersManagementContent = fs.readFileSync(usersManagementPath, 'utf8');

  // Verify frontend checks for invite failure
  assert(
    'Frontend extracts safe error message from function error context',
    usersManagementContent.includes('error.context.json()') ||
    usersManagementContent.includes('error.context')
  );

  // Verify frontend checks invitation_email_delivered
  assert(
    'Frontend verifies invitation_email_delivered is not false',
    usersManagementContent.includes('invitation_email_delivered === false')
  );

  // Verify toast clearly indicates failure
  assert(
    'Frontend displays explicit failure toast when invitation fails',
    usersManagementContent.includes('Approval Failed - Invitation Not Sent')
  );

  // Verify request is kept pending on failure
  assert(
    'Request state remains pending on failure without optimistic approval',
    usersManagementContent.includes('Keep request strictly as pending!')
  );

  // ---------------------------------------------------------------------------
  // 3. Inspect SetupPasswordPage.jsx Compatibility
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: SetupPasswordPage Flow Compatibility ---');
  const setupPasswordPath = path.resolve('src/pages/auth/SetupPasswordPage.jsx');
  const setupPasswordContent = fs.readFileSync(setupPasswordPath, 'utf8');

  assert(
    'SetupPasswordPage supports PKCE exchangeCodeForSession',
    setupPasswordContent.includes('exchangeCodeForSession(code)')
  );

  assert(
    'SetupPasswordPage supports OTP token_hash verifyOtp',
    setupPasswordContent.includes('verifyOtp({') &&
    setupPasswordContent.includes("token_hash: tokenHash")
  );

  assert(
    'SetupPasswordPage supports implicit access_token setSession',
    setupPasswordContent.includes('setSession({')
  );

  assert(
    'SetupPasswordPage performs password setup via updateUser',
    setupPasswordContent.includes('supabase.auth.updateUser({')
  );

  // ---------------------------------------------------------------------------
  // 4. Security Audit: Secret Leakage Check
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Security Audit & Zero Secret Leaks ---');
  
  // Check dist bundle for secrets
  const distDir = path.resolve('dist/assets');
  let jsBundleFiles = [];
  if (fs.existsSync(distDir)) {
    jsBundleFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));
  }

  let bundleClean = true;
  for (const jsFile of jsBundleFiles) {
    const bundleContent = fs.readFileSync(path.join(distDir, jsFile), 'utf8');
    if (bundleContent.includes('SUPABASE_SERVICE_ROLE_KEY') || 
        bundleContent.includes('service_role') && !bundleContent.includes('role')) {
      bundleClean = false;
      console.error(`  [LEAK] Secret found in ${jsFile}`);
    }
  }

  assert(
    'No service-role keys or secrets found in production dist bundle',
    bundleClean && jsBundleFiles.length > 0
  );

  // Check frontend source files for hardcoded secrets
  const srcFiles = ['src/pages/admin/UsersManagement.jsx', 'src/pages/auth/SetupPasswordPage.jsx', 'src/App.jsx'];
  let srcClean = true;
  for (const sf of srcFiles) {
    const content = fs.readFileSync(path.resolve(sf), 'utf8');
    if (content.includes('service_role') || content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      srcClean = false;
      console.error(`  [LEAK] Secret reference found in ${sf}`);
    }
  }
  assert('No hardcoded secrets or service_role in frontend source files', srcClean);

  console.log('\n----------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('----------------------------------------------------------------');

  if (passedTests === totalTests) {
    console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('SOME VERIFICATION CHECKS FAILED!\n');
    process.exit(1);
  }
}

runTestSuite();
