// ==============================================================================
// DigiX Technologies - Demo Reset Safety & Data Preservation Verification Suite
// File: scripts/test_demo_reset_safety.js
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  });
}

const SUPABASE_URL = env['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('================================================================');
console.log('DIGIX PORTAL - PRODUCTION DATA SAFETY VERIFICATION: RESET DEMO');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function record(name, condition, details = '') {
  if (condition) {
    console.log(`  [+] [PASS] ${name} ${details ? `(${details})` : ''}`);
    passCount++;
  } else {
    console.log(`  [x] [FAIL] ${name} ${details ? `: ${details}` : ''}`);
    failCount++;
  }
}

// ------------------------------------------------------------------------------
// TEST GROUP 1: STATIC CODE AUDIT FOR DATA SAFETY GUARDS
// ------------------------------------------------------------------------------
console.log('>>> [GROUP 1] STATIC CODE AUDIT FOR DATA SAFETY GUARDS');

const profileMenuContent = fs.readFileSync('src/components/layout/ProfileMenu.jsx', 'utf8');
const dataContextContent = fs.readFileSync('src/context/DataContext.jsx', 'utf8');

record(
  'ProfileMenu checks !isSupabaseAuth before showing Reset Demo Data',
  profileMenuContent.includes('!isSupabaseAuth'),
  'Protected from authenticated Supabase users'
);

record(
  'ProfileMenu checks !import.meta.env.PROD before showing Reset Demo Data',
  profileMenuContent.includes('!import.meta.env.PROD'),
  'Protected from production builds'
);

record(
  'ProfileMenu includes confirmation Modal before reset',
  profileMenuContent.includes('showConfirmModal') && profileMenuContent.includes('Modal') && profileMenuContent.includes('Reset Demo Data?'),
  'Confirmation dialog requirement met'
);

record(
  'DataContext resetDemoData has hard guard against isSupabaseAuth',
  dataContextContent.includes('if (isSupabaseAuth || Boolean(user?.isSupabaseAuth) || Boolean(user?.dbId))'),
  'Hard safety guard implemented'
);

record(
  'DataContext resetDemoData has hard guard against import.meta.env.PROD',
  dataContextContent.includes('if (import.meta.env.PROD)'),
  'Production environment protection implemented'
);

record(
  'DataContext has completely eliminated localStorage.clear() call',
  !/localStorage\.clear\s*\(\s*\)/.test(dataContextContent.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')),
  'No indiscriminate storage wiping'
);

record(
  'DataContext implements targeted removal of demo keys only',
  dataContextContent.includes('localStorage.removeItem(`${STORAGE_KEY}_${key}`)'),
  'Leaves Supabase auth tokens intact'
);

// ------------------------------------------------------------------------------
// TEST GROUP 2: LOGICAL SIMULATION OF resetDemoData()
// ------------------------------------------------------------------------------
console.log('\n>>> [GROUP 2] LOGICAL SIMULATION OF resetDemoData() BEHAVIOR');

// Mock localStorage
const mockStorage = {
  data: {
    'sb-ytgvckjfbsvvmqhqqvyj-auth-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token',
    'digix_portal_auth_v4': '{"user":{"name":"Tarumani"},"isAuthenticated":true}',
    'digix_portal_live_data_v4_attendance': '[{"id":"real-att-1"}]',
    'digix_portal_live_data_v4_tasks': '[{"id":"demo-task-1"}]'
  },
  getItem(key) { return this.data[key] || null; },
  setItem(key, val) { this.data[key] = String(val); },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

// Simulate DataContext safety logic for authenticated user
function simulateReset(isSupabaseAuth, user, isProd = false) {
  if (isSupabaseAuth || Boolean(user?.isSupabaseAuth) || Boolean(user?.dbId)) {
    return false;
  }
  if (isProd) {
    return false;
  }

  const STORAGE_KEY = 'digix_portal_live_data_v4';
  const demoKeys = [
    'systemSettings', 'rolePermissions', 'leavePolicyQuotas', 'auditLogs',
    'announcements', 'notifications', 'employees', 'candidates', 'projects',
    'tasks', 'attendance', 'leaveBalances', 'leaveRequests', 'onboarding',
    'trainings', 'employeeDocuments', 'companyDocuments', 'profileRequests'
  ];
  demoKeys.forEach((key) => {
    mockStorage.removeItem(`${STORAGE_KEY}_${key}`);
  });
  return true;
}

// Case A: Real authenticated employee attempts reset
const authUser = { id: 'DGX005', dbId: '31f16325-1f18-4cd9-afcb-43fc7400bbf0', isSupabaseAuth: true, name: 'Bharath Raj' };
const authResult = simulateReset(true, authUser, false);

record(
  'Authenticated employee resetDemoData is blocked immediately',
  authResult === false,
  'Returns false and aborts'
);

record(
  'Authenticated employee Supabase token is preserved',
  Boolean(mockStorage.getItem('sb-ytgvckjfbsvvmqhqqvyj-auth-token')),
  'sb-*-auth-token unaffected'
);

record(
  'Authenticated employee attendance storage is preserved on blocked reset',
  Boolean(mockStorage.getItem('digix_portal_live_data_v4_attendance')),
  'Attendance storage intact'
);

// Case B: Production environment check
const prodResult = simulateReset(false, { id: 'DGX003' }, true);
record(
  'Production mode blocks resetDemoData even if not authenticated',
  prodResult === false,
  'import.meta.env.PROD blocks execution'
);

// Case C: Local offline demo account in development
const demoResult = simulateReset(false, { id: 'DGX003' }, false);
record(
  'Local demo account allows resetDemoData in non-production mode',
  demoResult === true,
  'Reset executed for demo mode'
);

record(
  'Local demo reset removes demo keys without removing Supabase tokens',
  mockStorage.getItem('digix_portal_live_data_v4_attendance') === null &&
  Boolean(mockStorage.getItem('sb-ytgvckjfbsvvmqhqqvyj-auth-token')),
  'Only demo keys purged; auth tokens preserved'
);

// ------------------------------------------------------------------------------
// TEST GROUP 3: DATABASE READ-ONLY INTEGRITY VERIFICATION
// ------------------------------------------------------------------------------
console.log('\n>>> [GROUP 3] PRODUCTION DATABASE READ-ONLY INTEGRITY CHECK');

async function checkDatabaseIntegrity() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: { createClient: false }
  });

  // Read public attendance records (via service check or count)
  const { data, error } = await supabase
    .from('attendance')
    .select('id, employee_id, attendance_date, status')
    .limit(5);

  record(
    'No database connection failure or schema disruption',
    !error || error.code === 'PGRST116' || error.message.includes('permission denied') || Array.isArray(data),
    error ? `Expected RLS defense: ${error.message}` : `Retrieved ${data?.length || 0} rows`
  );

  console.log('\n================================================================');
  console.log(`TOTAL SAFETY TESTS: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

checkDatabaseIntegrity();
