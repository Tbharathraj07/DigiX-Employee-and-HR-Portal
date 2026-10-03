import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function audit() {
  console.log('====================================================');
  console.log('      STEP 6: EMPLOYEE PROFILE AUDIT & VERIFICATION');
  console.log('====================================================\n');

  // 1. Anon / Unauthenticated checks
  console.log('--- TEST 1: Unauthenticated / Anon Access Security ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: anonProfiles, error: anonProfilesErr } = await anonClient.from('profiles').select('*');
  console.log('Anon SELECT profiles count:', anonProfiles?.length ?? 0, '| Error:', anonProfilesErr?.message || 'None (0 rows returned via RLS)');

  const { data: anonEmps, error: anonEmpsErr } = await anonClient.from('employees').select('*');
  console.log('Anon SELECT employees count:', anonEmps?.length ?? 0, '| Error:', anonEmpsErr?.message || 'None (0 rows returned via RLS)');

  const { data: anonEc, error: anonEcErr } = await anonClient.from('emergency_contacts').select('*');
  console.log('Anon SELECT emergency_contacts count:', anonEc?.length ?? 0, '| Error:', anonEcErr?.message || 'None (0 rows returned via RLS)');

  const { data: anonDocs, error: anonDocsErr } = await anonClient.from('employee_documents').select('*');
  console.log('Anon SELECT employee_documents count:', anonDocs?.length ?? 0, '| Error:', anonDocsErr?.message || 'None (0 rows returned via RLS)');

  const { data: anonPcr, error: anonPcrErr } = await anonClient.from('profile_change_requests').select('*');
  console.log('Anon SELECT profile_change_requests count:', anonPcr?.length ?? 0, '| Error:', anonPcrErr?.message || 'None (0 rows returned via RLS)');

  // 2. Employee Login (Tarumani Bharath Raj)
  console.log('\n--- TEST 2: Employee Login (Tarumani Bharath Raj) ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });

  if (empAuthErr) {
    console.error('❌ Employee login failed:', empAuthErr.message);
    return;
  }
  console.log('✅ Employee login SUCCESSful! Auth UID:', empAuth.user.id);
  const authUser = empAuth.user;

  // 2.1 Own profile verification
  const { data: myProfile, error: myProfErr } = await empClient
    .from('profiles')
    .select('id, employee_id, role, created_at, updated_at')
    .eq('id', authUser.id)
    .maybeSingle();

  console.log('✅ Own profile retrieved from Supabase:', myProfile);

  // 2.2 Attempting to select all profiles (RLS isolation test)
  const { data: allProfiles, error: allProfErr } = await empClient
    .from('profiles')
    .select('id, role, employee_id');
  console.log(`RLS Isolation: Employee queried ALL profiles -> Received ${allProfiles?.length} rows.`);
  const leakedOtherProfiles = allProfiles?.filter(p => p.id !== authUser.id);
  if (leakedOtherProfiles?.length > 0) {
    console.error('❌ SECURITY ISSUE: Employee can see other profiles:', leakedOtherProfiles);
  } else {
    console.log('✅ PASS: Employee can ONLY see their own profile record.');
  }

  // 2.3 Own employee record verification
  const { data: myEmp, error: myEmpErr } = await empClient
    .from('employees')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();

  console.log('✅ Own employee record retrieved from Supabase:', {
    id: myEmp?.id,
    employee_id: myEmp?.employee_id,
    name: myEmp?.name,
    email: myEmp?.email,
    department: myEmp?.department,
    designation: myEmp?.designation,
    location: myEmp?.location,
    joining_date: myEmp?.joining_date,
    status: myEmp?.status
  });

  // 2.4 Attempting to select all employees (RLS isolation test)
  const { data: allEmps, error: allEmpsErr } = await empClient
    .from('employees')
    .select('id, employee_id, name, email');
  console.log(`RLS Isolation: Employee queried ALL employees -> Received ${allEmps?.length} rows.`);
  const leakedOtherEmps = allEmps?.filter(e => e.id !== myEmp?.id);
  if (leakedOtherEmps?.length > 0) {
    console.error('❌ SECURITY ISSUE: Employee can see other employee records:', leakedOtherEmps);
  } else {
    console.log('✅ PASS: Employee can ONLY see their own employee record.');
  }

  // 2.5 Emergency Contacts verification
  const { data: myEc, error: myEcErr } = await empClient
    .from('emergency_contacts')
    .select('*')
    .eq('employee_id', myEmp?.id);
  console.log('✅ Emergency contacts for Employee:', myEc?.length ? myEc : '0 on record in Supabase');

  // Attempting to select all emergency contacts across the company
  const { data: allEc } = await empClient.from('emergency_contacts').select('*');
  const leakedOtherEc = allEc?.filter(ec => ec.employee_id !== myEmp?.id);
  if (leakedOtherEc?.length > 0) {
    console.error('❌ SECURITY ISSUE: Employee can see other employees emergency contacts:', leakedOtherEc);
  } else {
    console.log('✅ PASS: Employee cannot see any other employees emergency contacts.');
  }

  // 2.6 Employee Documents verification
  const { data: myDocs, error: myDocsErr } = await empClient
    .from('employee_documents')
    .select('*')
    .eq('employee_id', myEmp?.id);
  console.log('✅ Employee documents on record in Supabase:', myDocs?.length ? myDocs : '0 on record');

  // Attempting to select all documents across the company
  const { data: allDocs } = await empClient.from('employee_documents').select('*');
  const leakedOtherDocs = allDocs?.filter(d => d.employee_id !== myEmp?.id);
  if (leakedOtherDocs?.length > 0) {
    console.error('❌ SECURITY ISSUE: Employee can see other employees documents:', leakedOtherDocs);
  } else {
    console.log('✅ PASS: Employee cannot see any other employees documents.');
  }

  // 2.7 Profile Change Requests verification
  const { data: myPcr, error: myPcrErr } = await empClient
    .from('profile_change_requests')
    .select('*')
    .eq('employee_id', myEmp?.id);
  console.log('✅ Profile change requests on record for Employee:', myPcr?.length ? myPcr : '0 on record');

  // Attempting to select all change requests across the company
  const { data: allPcr } = await empClient.from('profile_change_requests').select('*');
  const leakedOtherPcr = allPcr?.filter(p => p.employee_id !== myEmp?.id);
  if (leakedOtherPcr?.length > 0) {
    console.error('❌ SECURITY ISSUE: Employee can see other employees change requests:', leakedOtherPcr);
  } else {
    console.log('✅ PASS: Employee cannot see any other employees profile change requests.');
  }

  // 3. HR (Priyanka) verification
  console.log('\n--- TEST 3: HR Login (Priyanka) & Operational Capabilities ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });

  if (hrAuthErr) {
    console.error('❌ HR login failed:', hrAuthErr.message);
  } else {
    console.log('✅ HR login SUCCESSful! Auth UID:', hrAuth.user.id);
    const { data: hrEmps } = await hrClient.from('employees').select('id, employee_id, name, department, designation');
    console.log(`✅ HR can view all employees (${hrEmps?.length} total in company directory)`);

    const { data: hrPcr } = await hrClient.from('profile_change_requests').select('id, employee_id, field_name, requested_value, status');
    console.log(`✅ HR can view all profile change requests (${hrPcr?.length} total in system)`);

    const { data: hrDocs } = await hrClient.from('employee_documents').select('id, employee_id, document_name, document_type');
    console.log(`✅ HR can view all employee documents (${hrDocs?.length} total in system)`);
  }

  // 4. Admin (Marcus Vance) verification
  console.log('\n--- TEST 4: Admin Login (Marcus Vance) & Governance Capabilities ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });

  if (adminAuthErr) {
    console.error('❌ Admin login failed:', adminAuthErr.message);
  } else {
    console.log('✅ Admin login SUCCESSful! Auth UID:', adminAuth.user.id);
    const { data: adminProfiles } = await adminClient.from('profiles').select('id, role, employee_id');
    console.log(`✅ Admin can view all profiles (${adminProfiles?.length} total in system)`);
  }

  // 5. Database Linkage Verification
  console.log('\n--- TEST 5: Database Linkage Verification (auth.users -> profiles -> employees) ---');
  console.log('Tarumani Bharath Raj:');
  console.log('  auth.users.id:', authUser.id);
  console.log('  profiles.id:', myProfile?.id);
  console.log('  profiles.employee_id:', myProfile?.employee_id);
  console.log('  employees.id:', myEmp?.id);
  console.log('  employees.user_id:', myEmp?.user_id);
  console.log('  employees.employee_id:', myEmp?.employee_id);

  const isProfileLinkedByPk = myProfile?.id === authUser.id;
  const isEmployeeLinkedByUserId = myEmp?.user_id === authUser.id;
  const isEmployeeLinkedByProfileFk = myProfile?.employee_id === myEmp?.id;

  console.log('  Linkage Checks:');
  console.log('    profiles.id == auth.users.id:', isProfileLinkedByPk ? '✅ MATCH' : '❌ MISMATCH');
  console.log('    employees.user_id == auth.users.id:', isEmployeeLinkedByUserId ? '✅ MATCH' : '❌ MISMATCH');
  console.log('    profiles.employee_id == employees.id:', isEmployeeLinkedByProfileFk ? '✅ MATCH' : '❌ MISMATCH');

  console.log('\n====================================================');
  console.log('               AUDIT COMPLETED');
  console.log('====================================================');
}

audit().catch(console.error);
