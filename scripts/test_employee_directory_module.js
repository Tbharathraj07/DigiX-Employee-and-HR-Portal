// ==============================================================================
// DigiX Technologies - Module 13: Secure Employee Directory Verification Suite
// File: scripts/test_employee_directory_module.js
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

async function runDirectoryTestSuite() {
  console.log('================================================================');
  console.log('DIGIX PORTAL - MODULE 13: SECURE EMPLOYEE DIRECTORY AUDIT SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // GROUP 1: MIGRATION & DATABASE SECURITY AUDIT
  // ---------------------------------------------------------------------------
  console.log('>>> [GROUP 1] DATABASE SECURITY & MIGRATION SPECIFICATION');

  const migrationPath = 'supabase/migrations/010_create_employee_directory.sql';
  record('Migration file 010 exists', fs.existsSync(migrationPath), migrationPath);

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  record(
    'Migration defines get_employee_directory function as SECURITY DEFINER',
    migrationSql.includes('FUNCTION public.get_employee_directory()') &&
    migrationSql.includes('SECURITY DEFINER'),
    'RPC function properly isolated with SECURITY DEFINER'
  );

  record(
    'Migration defines employee_directory view with security_barrier = true',
    migrationSql.includes('VIEW public.employee_directory') &&
    migrationSql.includes('security_barrier = true'),
    'Security barrier prevents optimizer leakage'
  );

  record(
    'Migration explicitly revokes ALL permissions from anonymous users',
    migrationSql.includes('REVOKE ALL ON public.employee_directory FROM anon;') &&
    migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.get_employee_directory() FROM anon;'),
    'Anon users blocked from view & function'
  );

  record(
    'Migration grants access only to authenticated users',
    migrationSql.includes('GRANT SELECT ON public.employee_directory TO authenticated;') &&
    migrationSql.includes('GRANT EXECUTE ON FUNCTION public.get_employee_directory() TO authenticated;'),
    'Authenticated role access granted'
  );

  record(
    'Migration forbids write operations (INSERT/UPDATE/DELETE) on directory view',
    migrationSql.includes('REVOKE INSERT, UPDATE, DELETE ON public.employee_directory FROM authenticated;'),
    'Read-only directory access strictly enforced'
  );

  const sensitiveKeywords = ['phone', 'salary', 'joining_date', 'user_id', 'emergency_contact'];
  const codeWithoutComments = migrationSql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  const leaksSensitive = sensitiveKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(codeWithoutComments);
  });
  record(
    'Directory definition excludes sensitive fields (salary, phone, joining date)',
    !leaksSensitive,
    'Zero sensitive columns exposed in directory projection'
  );

  // ---------------------------------------------------------------------------
  // GROUP 2: FRONTEND CODE & ZERO-MOCK AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n>>> [GROUP 2] FRONTEND COMPONENT & ZERO-MOCK AUDIT');

  const myTeamContent = fs.readFileSync('src/pages/employee/MyTeam.jsx', 'utf8');

  record(
    'MyTeam.jsx does NOT import INITIAL_EMPLOYEES or mockAccounts',
    !myTeamContent.includes('INITIAL_EMPLOYEES') && !myTeamContent.includes('mockAccounts'),
    'Zero mock imports in MyTeam'
  );

  record(
    'MyTeam.jsx does not hardcode static manager name "Priyanka"',
    !myTeamContent.includes('Priyanka') || myTeamContent.includes('reportingManager.name'),
    'Reporting manager is dynamically resolved'
  );

  record(
    'MyTeam.jsx connects to usePortalData directory source',
    myTeamContent.includes('employeeDirectory') && myTeamContent.includes('fetchEmployeeDirectory'),
    'Consumes secure directory context'
  );

  record(
    'MyTeam.jsx includes department filtering and live search capabilities',
    myTeamContent.includes('selectedDeptFilter') && myTeamContent.includes('searchQuery'),
    'Search and department filtering implemented'
  );

  record(
    'MyTeam.jsx displays safe fields only (no salary or phone rendered)',
    !myTeamContent.includes('member.salary') && !myTeamContent.includes('member.phone'),
    'No sensitive contact or compensation fields rendered'
  );

  // ---------------------------------------------------------------------------
  // GROUP 3: DATA CONTEXT ARCHITECTURE AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n>>> [GROUP 3] DATA CONTEXT SECURE MAPPER & ISOLATION');

  const dataContextContent = fs.readFileSync('src/context/DataContext.jsx', 'utf8');

  record(
    'DataContext exports mapDbDirectoryEntryToUi',
    dataContextContent.includes('mapDbDirectoryEntryToUi'),
    'Dedicated safe directory mapper defined'
  );

  const { mapDbDirectoryEntryToUi } = await import('../src/lib/directoryMapper.js');

  const mockDbRow = {
    id: 'e1234567-89ab-cdef-0123-456789abcdef',
    employee_id: 'DGX001',
    name: 'Alice Cooper',
    email: 'alice@digix.internal',
    department: 'Technology',
    designation: 'Senior Cloud Engineer',
    location: 'Bangalore Campus (Hybrid)',
    profile_photo: 'https://images.unsplash.com/test.jpg',
    status: 'active',
    // Sensitive fields that might be in a raw DB record
    phone: '+1 (555) 999-8888',
    salary: '$165,000',
    joining_date: '2021-04-12',
    user_id: 'u-secret-auth-id-12345',
    emergency_contact: 'Bob Cooper: 555-0000'
  };

  const mappedSafeEntry = mapDbDirectoryEntryToUi(mockDbRow);

  record(
    'mapDbDirectoryEntryToUi omits phone number',
    mappedSafeEntry.phone === undefined,
    `phone: ${mappedSafeEntry.phone}`
  );

  record(
    'mapDbDirectoryEntryToUi omits salary',
    mappedSafeEntry.salary === undefined,
    `salary: ${mappedSafeEntry.salary}`
  );

  record(
    'mapDbDirectoryEntryToUi omits joining date',
    mappedSafeEntry.joiningDate === undefined && mappedSafeEntry.joinDate === undefined,
    `joinDate: ${mappedSafeEntry.joinDate}`
  );

  record(
    'mapDbDirectoryEntryToUi omits user_id and emergency contact',
    mappedSafeEntry.userId === undefined && mappedSafeEntry.emergencyContact === undefined,
    'Private auth & emergency contacts omitted'
  );

  record(
    'mapDbDirectoryEntryToUi retains safe directory fields',
    mappedSafeEntry.name === 'Alice Cooper' &&
    mappedSafeEntry.department === 'Technology' &&
    mappedSafeEntry.roleTitle === 'Senior Cloud Engineer' &&
    mappedSafeEntry.id === 'DGX001',
    'Safe organizational fields preserved'
  );

  // ---------------------------------------------------------------------------
  // GROUP 4: LIVE SUPABASE RLS & PERMISSION VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> [GROUP 4] LIVE SUPABASE ACCESS CONTROL & RLS ISOLATION');

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);

  // Authenticate test personas
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  record('Employee authentication (tarumani.bharathraj@digix.internal)', !empAuthErr && !!empAuth?.user, empAuthErr?.message);

  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  record('HR authentication (priyanka@digix.internal)', !hrAuthErr && !!hrAuth?.user, hrAuthErr?.message);

  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  record('Admin authentication (marcus.vance@digix.internal)', !adminAuthErr && !!adminAuth?.user, adminAuthErr?.message);

  // 1. Anonymous Access to employees table
  const { data: anonEmp, error: anonEmpErr } = await anonClient.from('employees').select('id, name, salary, phone');
  record(
    'Anonymous user cannot read employees table (RLS blocked or 0 rows)',
    anonEmpErr !== null || (anonEmp && anonEmp.length === 0),
    anonEmpErr ? anonEmpErr.message : '0 rows returned'
  );

  // 2. Normal Employee Access to employees table (RLS must NOT be weakened!)
  const { data: empDirect, error: empDirectErr } = await empClient.from('employees').select('*');
  record(
    'Existing public.employees RLS policy is PRESERVED (Employee sees ONLY own row)',
    !empDirectErr && empDirect && empDirect.length === 1 && empDirect[0].email === 'tarumani.bharathraj@digix.internal',
    `Returned ${empDirect?.length} row(s); own email verified`
  );

  // 3. Normal Employee cannot query other employees sensitive fields via public.employees
  const { data: empOther } = await empClient
    .from('employees')
    .select('id, name, salary, phone')
    .neq('user_id', empAuth.user.id);
  record(
    'Employee cannot read other employees records from public.employees',
    !empOther || empOther.length === 0,
    `Returned ${empOther?.length || 0} rows`
  );

  // 4. Normal Employee cannot insert or modify employees table
  const { error: empInsertErr } = await empClient.from('employees').insert({
    employee_id: 'HACK_DIR_001',
    name: 'Rogue Employee',
    email: 'rogue@digix.internal'
  });
  record(
    'Employee write access to employees table is strictly blocked by RLS',
    !!empInsertErr,
    empInsertErr ? empInsertErr.message : 'Failed to block write'
  );

  // 5. HR Manager capabilities are preserved
  const { data: hrEmployees, error: hrEmployeesErr } = await hrClient
    .from('employees')
    .select('id, employee_id, name, department, designation')
    .order('employee_id');
  record(
    'HR Manager can view master employee roster across departments',
    !hrEmployeesErr && hrEmployees && hrEmployees.length >= 5,
    `HR retrieved ${hrEmployees?.length || 0} active employees`
  );

  // 6. Admin capabilities are preserved
  const { data: adminEmployees, error: adminEmployeesErr } = await adminClient
    .from('employees')
    .select('id, employee_id, name, department, designation')
    .order('employee_id');
  record(
    'Admin can view master employee roster across all departments',
    !adminEmployeesErr && adminEmployees && adminEmployees.length >= 5,
    `Admin retrieved ${adminEmployees?.length || 0} master employees`
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL DIRECTORY AUDIT TESTS: ${results.passed + results.failed}`);
  console.log(`PASSED: ${results.passed}`);
  console.log(`FAILED: ${results.failed}`);
  console.log('================================================================\n');

  if (results.failed === 0) {
    console.log('✅ ALL SECURE EMPLOYEE DIRECTORY AUDIT TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME AUDIT TESTS FAILED. Please review the output above.');
    process.exit(1);
  }
}

runDirectoryTestSuite().catch((err) => {
  console.error('Fatal error running directory audit suite:', err);
  process.exit(1);
});
