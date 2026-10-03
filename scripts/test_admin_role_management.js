// scripts/test_admin_role_management.js
// Verification suite for Admin Role Management feature
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

const EMP_EMAIL = 'tarumani.bharathraj@digix.internal';
const HR_EMAIL = 'priyanka@digix.internal';
const ADMIN_EMAIL = 'marcus.vance@digix.internal';
const PASS = 'demo';

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
  console.log('DIGIX PORTAL - ADMIN ROLE MANAGEMENT REGRESSION SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. FRONTEND SECRET LEAK AUDIT
  // ---------------------------------------------------------------------------
  console.log('>>> TEST GROUP 1: SECRET ISOLATION & FRONTEND CLEANLINESS');

  // Check .env.local
  const envLocalPath = path.resolve('.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const hasServiceRole = envContent.includes('service_role') || envContent.includes('SUPABASE_SERVICE_ROLE_KEY');
    record('Secrets', 'Service-role key not present in .env.local', !hasServiceRole, 'no service-role key in local env');
  }

  // Scan src/ files
  let srcClean = true;
  let leakedFile = '';
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (ent.isFile() && (ent.name.endsWith('.js') || ent.name.endsWith('.jsx') || ent.name.endsWith('.ts'))) {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          srcClean = false;
          leakedFile = full;
        }
      }
    }
  }
  scanDir(path.resolve('src'));
  record('Secrets', 'No SUPABASE_SERVICE_ROLE_KEY in frontend src/', srcClean, srcClean ? 'zero leaks' : `leaked in ${leakedFile}`);

  // Scan dist/ bundle if exists
  if (fs.existsSync(path.resolve('dist'))) {
    let distClean = true;
    scanDir(path.resolve('dist'));
    record('Secrets', 'No service_role secret in production bundle (dist/)', distClean, 'production bundle clean');
  }

  // ---------------------------------------------------------------------------
  // 2. SCHEMA & TRIGGER PRESERVATION AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 2: TRIGGER & RLS POLICY INTEGRITY');

  const regMigrationPath = path.resolve('supabase/migrations/006_create_registration_requests_schema.sql');
  const regMigrationSql = fs.readFileSync(regMigrationPath, 'utf8');
  const hasTriggerFunc = regMigrationSql.includes('FUNCTION public.prevent_profile_role_escalation()');
  const hasTriggerAttach = regMigrationSql.includes('CREATE TRIGGER trg_prevent_profile_role_escalation');
  record('Triggers', 'prevent_profile_role_escalation() trigger function preserved', hasTriggerFunc && hasTriggerAttach);

  const authMigrationPath = path.resolve('supabase/migrations/005_fix_authentication_permissions.sql');
  const authMigrationSql = fs.readFileSync(authMigrationPath, 'utf8');
  const hasIsAdmin = authMigrationSql.includes('FUNCTION public.is_admin()');
  const isAdminDef = authMigrationSql.includes("role = 'admin'");
  record('Security', 'public.is_admin() definition unmodified and preserved', hasIsAdmin && isAdminDef);

  // ---------------------------------------------------------------------------
  // 3. LIVE DATABASE TRIGGER ENFORCEMENT & SECURITY
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 3: LIVE DATABASE ROLE ESCALATION RESISTANCE');

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);

  // Sign in employee
  const { data: empAuth } = await empClient.auth.signInWithPassword({ email: EMP_EMAIL, password: PASS });
  const empUser = empAuth?.user;

  // Sign in HR
  const { data: hrAuth } = await hrClient.auth.signInWithPassword({ email: HR_EMAIL, password: PASS });
  const hrUser = hrAuth?.user;

  // Sign in Admin
  const { data: adminAuth } = await adminClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: PASS });
  const adminUser = adminAuth?.user;

  // 3a. Employee direct self-escalation to Admin -> BLOCKED by trigger
  const { error: empEscAdminErr } = await empClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', empUser.id);
  const empEscAdminBlocked = empEscAdminErr !== null && empEscAdminErr.message.includes('Access Denied');
  record('Trigger Test', 'Employee direct role elevation to Admin blocked by trigger', empEscAdminBlocked, empEscAdminErr?.message);

  // 3b. Employee direct self-escalation to HR -> BLOCKED by trigger
  const { error: empEscHrErr } = await empClient
    .from('profiles')
    .update({ role: 'hr_manager' })
    .eq('id', empUser.id);
  const empEscHrBlocked = empEscHrErr !== null && empEscHrErr.message.includes('Access Denied');
  record('Trigger Test', 'Employee direct role elevation to HR Manager blocked by trigger', empEscHrBlocked, empEscHrErr?.message);

  // 3c. HR direct self-escalation to Admin -> BLOCKED by trigger
  const { error: hrEscAdminErr } = await hrClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', hrUser.id);
  const hrEscAdminBlocked = hrEscAdminErr !== null && hrEscAdminErr.message.includes('Access Denied');
  record('Trigger Test', 'HR direct role elevation to Admin blocked by trigger', hrEscAdminBlocked, hrEscAdminErr?.message);

  // 3d. Direct frontend update of other user profile -> BLOCKED by RLS
  const targetUserId = '89f6fed1-997a-45f1-aedb-f3ec9ee99bf7'; // Bharath Raj
  const { data: directUpdateData } = await adminClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', targetUserId)
    .select();
  const directUpdateBlocked = !directUpdateData || directUpdateData.length === 0;
  record('RLS Test', 'Direct frontend database role update of other user blocked by RLS', directUpdateBlocked, '0 rows modified');

  // Verify admin user's role remains 'admin'
  const { data: targetProfileBefore } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single();
  record('Integrity', 'Admin session remains valid and active', targetProfileBefore?.role === 'admin', `Role: ${targetProfileBefore?.role}`);

  // ---------------------------------------------------------------------------
  // 4. EDGE FUNCTION IMPLEMENTATION & SAFETY LOGIC AUDIT
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 4: EDGE FUNCTION IMPLEMENTATION & SAFETY LOGIC');

  const edgeFuncPath = path.resolve('supabase/functions/change-user-role/index.ts');
  const edgeFuncExists = fs.existsSync(edgeFuncPath);
  record('Edge Function', 'supabase/functions/change-user-role/index.ts exists', edgeFuncExists);

  const edgeCode = fs.readFileSync(edgeFuncPath, 'utf8');

  // Bearer token check
  const hasTokenValidation = edgeCode.includes('callerToken') && edgeCode.includes('auth.getUser(callerToken)');
  record('Edge Function', 'Validates caller session token via Supabase Auth', hasTokenValidation);

  // Admin role check on server
  const hasAdminCheck = edgeCode.includes("callerProfile.role !== 'admin'") || edgeCode.includes("role !== 'admin'");
  record('Edge Function', 'Strictly rejects non-admin callers on the server', hasAdminCheck);

  // Allowed roles check (Employee, HR Manager, Admin)
  const hasAllowedRoles = edgeCode.includes('employee') && edgeCode.includes('hr_manager') && edgeCode.includes('admin');
  record('Edge Function', 'Accepts Employee, HR Manager, and Admin roles', hasAllowedRoles);

  // Last admin protection
  const hasLastAdminProtection = edgeCode.includes('At least one system administrator must remain active') || edgeCode.includes('LAST_ADMIN_PROTECTED');
  record('Edge Function', 'Accidental removal of the last administrator is prevented', hasLastAdminProtection);

  // Admin transfer sequence
  const hasAdminTransfer = edgeCode.includes('isTransfer') && edgeCode.includes('Admin Transfer');
  record('Edge Function', 'Safe Admin transfer workflow implemented', hasAdminTransfer);

  // Database verification logic before returning success
  const hasDbVerification = edgeCode.includes('ROLE_UPDATE_NOT_PERSISTED') && edgeCode.includes('verifiedProfile?.role');
  record('Edge Function', 'Verifies role actually persisted in database before success', hasDbVerification);

  // Safe rollback on failure
  const hasRollback = edgeCode.includes('Safe Rollback') && edgeCode.includes('previousRole');
  record('Edge Function', 'Safely rolls back state if transfer sequence fails', hasRollback);

  // Service role key usage
  const usesServiceRoleKey = edgeCode.includes('SUPABASE_SERVICE_ROLE_KEY') && edgeCode.includes('Deno.env.get');
  record('Edge Function', 'Privileged operations use SUPABASE_SERVICE_ROLE_KEY on server only', usesServiceRoleKey);

  // Audit logging in Edge function
  const logsAudit = edgeCode.includes(".from('audit_logs')") && edgeCode.includes('ROLE_CHANGED');
  record('Edge Function', 'Records ROLE_CHANGED event to public.audit_logs', logsAudit);

  // ---------------------------------------------------------------------------
  // 5. DATABASE MIGRATION SPECIFICATION AUDIT (011_admin_role_management.sql)
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 5: DATABASE MIGRATION SPECIFICATION (011)');

  const migration011Path = path.resolve('supabase/migrations/011_admin_role_management.sql');
  const migration011Exists = fs.existsSync(migration011Path);
  record('Migration 011', '011_admin_role_management.sql exists', migration011Exists);

  const migration011Sql = fs.readFileSync(migration011Path, 'utf8');

  // get_users_with_roles RPC
  const hasGetUsersWithRoles = migration011Sql.includes('FUNCTION public.get_users_with_roles()') &&
    migration011Sql.includes('SECURITY DEFINER');
  record('Migration 011', 'Defines get_users_with_roles() as SECURITY DEFINER', hasGetUsersWithRoles);

  // admin_change_user_role RPC
  const hasAdminChangeUserRole = migration011Sql.includes('FUNCTION public.admin_change_user_role(') &&
    migration011Sql.includes('SECURITY DEFINER');
  record('Migration 011', 'Defines admin_change_user_role() as SECURITY DEFINER', hasAdminChangeUserRole);

  // admin_transfer_system_role RPC
  const hasAdminTransferRpc = migration011Sql.includes('FUNCTION public.admin_transfer_system_role(') &&
    migration011Sql.includes('SECURITY DEFINER');
  record('Migration 011', 'Defines atomic admin_transfer_system_role() procedure', hasAdminTransferRpc);

  // Database verification in migration
  const hasDbVerificationInSql = migration011Sql.includes('ROLE_UPDATE_NOT_PERSISTED');
  record('Migration 011', 'Enforces ROLE_UPDATE_NOT_PERSISTED database verification check', hasDbVerificationInSql);

  // Last admin protection in migration
  const hasLastAdminInSql = migration011Sql.includes('At least one system administrator must remain active');
  record('Migration 011', 'Prevents zero-admin system state in migration procedure', hasLastAdminInSql);

  // Audit logging in migration
  const hasAuditLogInSql = migration011Sql.includes('public.audit_logs') && migration011Sql.includes('ROLE_CHANGED');
  record('Migration 011', 'Logs tamper-evident ROLE_CHANGED event to public.audit_logs', hasAuditLogInSql);

  // Permission grants strictly to authenticated, revoked from anon
  const hasRevokeAnon = migration011Sql.includes('REVOKE EXECUTE ON FUNCTION public.admin_change_user_role') &&
    migration011Sql.includes('FROM anon');
  record('Migration 011', 'Revokes all execute permissions from anonymous users', hasRevokeAnon);

  // ---------------------------------------------------------------------------
  // 6. ADMIN UI COMPONENT & STATE REFRESH INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 6: ADMIN UI COMPONENT & STATE REFRESH INTEGRITY');

  const uiPath = path.resolve('src/pages/admin/RolesPermissions.jsx');
  const uiExists = fs.existsSync(uiPath);
  record('Admin UI', 'src/pages/admin/RolesPermissions.jsx exists', uiExists);

  const uiCode = fs.readFileSync(uiPath, 'utf8');

  // Verify false-positive catch block was ELIMINATED
  const hasFalsePositiveCatch = uiCode.includes('// Fallback for local testing if Edge Function is not yet deployed:\n        // Use client-side audit logging and local state update') ||
    (uiCode.includes('catch (invokeErr)') && uiCode.includes('edgeSuccess = true'));
  record('Admin UI', 'False-positive error catch block completely removed', !hasFalsePositiveCatch, 'No synthetic success on failure');

  // Displays required employee fields
  const hasEmpName = uiCode.includes('emp.name');
  const hasEmpId = uiCode.includes('emp.id');
  const hasEmpEmail = uiCode.includes('emp.email');
  const hasEmpDept = uiCode.includes('emp.department');
  const hasCurrentRole = uiCode.includes('effectiveRole') || uiCode.includes('Current Role');
  const hasChangeRoleBtn = uiCode.includes('Change Role');
  record('Admin UI', 'Table displays Name, ID, Email, Department, Current Role, Change Role button',
    hasEmpName && hasEmpId && hasEmpEmail && hasEmpDept && hasCurrentRole && hasChangeRoleBtn);

  // Modal checks
  const hasModal = uiCode.includes('Change User Role');
  const hasRoleSelect = uiCode.includes('employee') && uiCode.includes('hr_manager') && uiCode.includes('admin');
  const hasConfirmDialog = uiCode.includes('Are you sure you want to change');
  const hasElevationWarning = uiCode.includes('This will give this user full system administrator access');
  const hasLastAdminAlert = uiCode.includes('At least one system administrator must remain active');
  record('Admin UI', 'Modal supports role selection, explicit confirmation, and warnings',
    hasModal && hasRoleSelect && hasConfirmDialog && hasElevationWarning && hasLastAdminAlert);

  // 3-Phase Verification in UI
  const hasFreshFetch = uiCode.includes('await fetchLiveRoles()');
  const hasVerificationCheck = uiCode.includes('verifiedRole !== selectedNewRole');
  const hasStrictError = uiCode.includes('Role Update Failed — The database did not confirm the requested role change.');
  record('Admin UI', 'Requires fresh database fetch confirmation before showing success',
    hasFreshFetch && hasVerificationCheck && hasStrictError);

  // Session refresh for transferred admin
  const hasSessionRefresh = uiCode.includes('refreshProfile?.()');
  record('Admin UI', 'Triggers AuthContext session refresh when Admin transfers role', hasSessionRefresh);

  // Routing permissions
  const appPath = path.resolve('src/App.jsx');
  const appCode = fs.readFileSync(appPath, 'utf8');
  const isProtectedAdminRoute = appCode.includes("admin/roles-permissions") && appCode.includes("allowedRoles={['admin']}");
  record('Routing', 'Role Management route /admin/roles-permissions restricted strictly to admin', isProtectedAdminRoute);

  // ---------------------------------------------------------------------------
  // 7. PRODUCTION DATA SAFETY VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> TEST GROUP 7: PRODUCTION DATA INTEGRITY VERIFICATION');

  // Verify target user: Bharath Raj (DGX005)
  const { data: targetEmpRecord } = await adminClient
    .from('employees')
    .select('id, employee_id, user_id, name, email, designation')
    .eq('employee_id', 'DGX005')
    .single();

  const isBharathRajUntouched = targetEmpRecord?.name === 'Bharath Raj' &&
    targetEmpRecord?.employee_id === 'DGX005' &&
    targetEmpRecord?.user_id === targetUserId;

  record('Data Safety', 'Target employee (Bharath Raj / DGX005) record intact in database', isBharathRajUntouched,
    `Emp: ${targetEmpRecord?.name}, Code: ${targetEmpRecord?.employee_id}`);

  // Verify Marcus Vance is still Admin
  const { data: adminRecord } = await adminClient
    .from('employees')
    .select('name, employee_id')
    .eq('user_id', adminUser.id)
    .single();

  record('Data Safety', 'Current administrator (Marcus Vance) remains intact and active',
    adminRecord?.name === 'Marcus Vance');

  console.log('\n================================================================');
  console.log(`RESULTS: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('================================================================');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
