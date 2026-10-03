// ==============================================================================
// DigiX Technologies - Clean Enterprise SaaS Login Page Test Suite
// File: scripts/test_login_page_redesign.js
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const envPath = path.resolve('.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((l) => {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq !== -1) {
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  });
}

const SUPABASE_URL = env['VITE_SUPABASE_URL'] || 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = env['VITE_SUPABASE_PUBLISHABLE_KEY'];

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function record(name, pass, details = '') {
  if (pass) {
    results.passed++;
    console.log(`  [+] [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.failed++;
    console.error(`  [x] [FAIL] ${name}: ${details}`);
  }
}

async function runLoginTests() {
  console.log('================================================================');
  console.log('DIGIX PORTAL - ENTERPRISE SAAS LOGIN REDESIGN AUDIT');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // GROUP 1: REMOVAL OF PROMOTIONAL & DEMO UI ELEMENTS
  // ---------------------------------------------------------------------------
  console.log('>>> [GROUP 1] REMOVED VISIBLE SHORTCUTS & MARKETING CLAIMS');

  const loginFile = 'src/pages/auth/LoginPage.jsx';
  record('LoginPage file exists', fs.existsSync(loginFile), loginFile);
  const loginContent = fs.readFileSync(loginFile, 'utf8');

  record(
    'Quick Demo Accounts removed from login UI',
    !loginContent.includes('Quick Demo Accounts'),
    'Zero visible demo accounts'
  );

  record(
    'One-click autofill removed from login UI',
    !loginContent.includes('One-click autofill'),
    'Zero autofill shortcuts'
  );

  record(
    'All Systems Operational removed',
    !loginContent.includes('All Systems Operational'),
    'Removed unverified system badge'
  );

  record(
    'Enterprise SLA removed',
    !loginContent.includes('Enterprise SLA'),
    'Removed unverified SLA claim'
  );

  record(
    'SOC2 Type II Certified removed',
    !loginContent.includes('SOC2 Type II Certified'),
    'Removed unverified SOC2 claim'
  );

  record(
    'ISO 27001 removed',
    !loginContent.includes('ISO 27001'),
    'Removed unverified ISO claim'
  );

  record(
    '256-Bit SSL Protection removed',
    !loginContent.includes('256-Bit SSL Protection'),
    'Removed unverified SSL badge'
  );

  // ---------------------------------------------------------------------------
  // GROUP 2: NEW CLEAN ENTERPRISE SAAS SPECIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> [GROUP 2] CLEAN ENTERPRISE SAAS SPECIFICATION');

  record(
    'Two-column responsive desktop layout (lg:flex lg:w-1/2)',
    loginContent.includes('lg:flex') && loginContent.includes('lg:w-1/2'),
    '50/50 responsive desktop split'
  );

  record(
    'Left side branding: "DigiX Technologies"',
    loginContent.includes('DigiX Technologies'),
    'Brand name verified'
  );

  record(
    'Left side headline: "Your workplace, connected."',
    loginContent.includes('Your workplace, connected.'),
    'Exact headline verified'
  );

  record(
    'Left side text: "Manage people, work, attendance, and employee services from one secure platform."',
    loginContent.includes('Manage people, work, attendance, and employee services from one secure platform.'),
    'Exact supporting text verified'
  );

  record(
    'Login card heading: "Welcome back"',
    loginContent.includes('Welcome back'),
    'Card heading verified'
  );

  record(
    'Login card subheading: "Sign in to continue to your DigiX workspace."',
    loginContent.includes('Sign in to continue to your DigiX workspace.'),
    'Card subheading verified'
  );

  record(
    'Email field label: "Email address" with placeholder "name@digix.internal"',
    loginContent.includes('Email address') && loginContent.includes('name@digix.internal'),
    'Email input verified'
  );

  record(
    'Password field label: "Password" with accessible visibility toggle',
    loginContent.includes('Password') && loginContent.includes('aria-label') && loginContent.includes('EyeOff'),
    'Password input and toggle verified'
  );

  record(
    'Remember me checkbox present',
    loginContent.includes('Remember me') && loginContent.includes('rememberMe'),
    'Checkbox verified'
  );

  record(
    'Forgot password link present',
    loginContent.includes('Forgot password?'),
    'Forgot password action verified'
  );

  record(
    'Primary button: "Sign In" with animated loading state',
    loginContent.includes('Sign In') && loginContent.includes('Signing in...') && loginContent.includes('Loader2'),
    'Button states verified'
  );

  record(
    'Registration prompt: "Don\'t have an account?" & "Request Account Access"',
    loginContent.includes("Don't have an account?") && loginContent.includes('Request Account Access'),
    'Registration navigation link verified'
  );

  record(
    'Footer text: "© 2026 DigiX Technologies. All rights reserved."',
    loginContent.includes('© 2026 DigiX Technologies. All rights reserved.'),
    'Footer copyright verified'
  );

  // ---------------------------------------------------------------------------
  // GROUP 3: LIVE SUPABASE AUTHENTICATION & RBAC PRESERVATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> [GROUP 3] LIVE SUPABASE AUTHENTICATION & RBAC PRESERVATION');

  const supabaseClient = createClient(SUPABASE_URL, ANON_KEY);

  // 1. Employee Login
  const { data: empData, error: empErr } = await supabaseClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  record(
    'Employee authentication succeeds (tarumani.bharathraj@digix.internal)',
    !empErr && !!empData?.user,
    empErr ? empErr.message : `UID: ${empData.user.id}`
  );

  // 2. HR Manager Login
  const { data: hrData, error: hrErr } = await supabaseClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  record(
    'HR authentication succeeds (priyanka@digix.internal)',
    !hrErr && !!hrData?.user,
    hrErr ? hrErr.message : `UID: ${hrData.user.id}`
  );

  // 3. Admin Login
  const { data: adminData, error: adminErr } = await supabaseClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  record(
    'Admin authentication succeeds (marcus.vance@digix.internal)',
    !adminErr && !!adminData?.user,
    adminErr ? adminErr.message : `UID: ${adminData.user.id}`
  );

  // 4. Invalid Password Rejection
  const { data: invalidData, error: invalidErr } = await supabaseClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'IncorrectPassword123'
  });
  record(
    'Invalid credentials correctly rejected with authentication error',
    !!invalidErr && !invalidData?.user,
    invalidErr ? invalidErr.message : 'Failed to reject invalid password'
  );

  // 5. Non-existent User Rejection
  const { data: nonExistentData, error: nonExistentErr } = await supabaseClient.auth.signInWithPassword({
    email: 'fake.user@digix.internal',
    password: 'demo'
  });
  record(
    'Non-existent account correctly rejected',
    !!nonExistentErr && !nonExistentData?.user,
    nonExistentErr ? nonExistentErr.message : 'Failed to reject non-existent user'
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL LOGIN REDESIGN TESTS: ${results.passed + results.failed}`);
  console.log(`PASSED: ${results.passed}`);
  console.log(`FAILED: ${results.failed}`);
  console.log('================================================================\n');

  if (results.failed === 0) {
    console.log('✅ ALL ENTERPRISE SAAS LOGIN REDESIGN TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED. Please review the output above.');
    process.exit(1);
  }
}

runLoginTests().catch((err) => {
  console.error('Fatal error running login audit:', err);
  process.exit(1);
});
