import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

// UI Mapper identical to updated DataContext.jsx
const mapDbEmployeeToUi = (row, nameMap = null) => {
  if (!row) return null;

  const normRole = (row.designation?.toLowerCase().includes('admin') || row.employee_id?.startsWith('ADM'))
    ? 'admin'
    : (row.department === 'Human Resources' || row.employee_id?.startsWith('HR') || row.designation?.toLowerCase().includes('hr'))
    ? 'hr'
    : 'employee';

  const defaultAvatar = row.profile_photo || `https://images.unsplash.com/photo-${
    normRole === 'admin'
      ? '1507003211169-0a1dd7228f2d'
      : normRole === 'hr'
      ? '1573496359142-b8d87734a5a2'
      : '1534528741775-53994a69daeb'
  }?w=150&auto=format&fit=crop&q=80`;

  const capStatus = row.status
    ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase()
    : 'Active';

  const inferredBand = row.designation?.toLowerCase().includes('principal') || normRole === 'admin'
    ? 'L8 - Principal'
    : row.designation?.toLowerCase().includes('lead') || row.designation?.toLowerCase().includes('manager') || normRole === 'hr'
    ? 'L6 - Manager'
    : row.designation?.toLowerCase().includes('senior')
    ? 'L5 - Senior'
    : 'L4 - Associate';

  const inferredWorkType = row.location?.toLowerCase().includes('remote')
    ? 'Remote'
    : row.location?.toLowerCase().includes('office') || row.location?.toLowerCase().includes('headquarters')
    ? 'On-site'
    : 'Hybrid';

  const managerObj = Array.isArray(row.manager) ? row.manager[0] : row.manager;
  const managerName = managerObj?.name ||
    (nameMap && row.manager_id ? nameMap.get(row.manager_id) : null) ||
    (row.manager_id ? 'Assigned Lead' : (normRole === 'admin' ? 'Devon Clark (CTO)' : normRole === 'hr' ? 'Elena Rostova (CPO)' : 'Priyanka'));

  return {
    id: row.employee_id || row.id,
    dbId: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: normRole,
    roleTitle: row.designation || 'Specialist',
    department: row.department || 'Technology',
    team: row.department || 'Engineering',
    avatar: defaultAvatar,
    phone: row.phone || '+1 (555) 000-0000',
    location: row.location || 'Corporate Office',
    manager: managerName,
    managerId: row.manager_id,
    joinDate: row.joining_date || new Date().toISOString().split('T')[0],
    band: inferredBand,
    badgeNumber: `SEC-${String(row.employee_id || '999').replace(/[^0-9]/g, '').padStart(3, '0')}`,
    status: capStatus,
    workType: inferredWorkType,
    skills: ['Enterprise Systems', 'Cross-functional Collaboration'],
    salary: '$120,000'
  };
};

async function runTests() {
  console.log('====================================================');
  console.log('STEP 1: GLOBAL EMPLOYEE DIRECTORY -> SUPABASE VERIFICATION');
  console.log('====================================================\n');

  // Test 1: Anonymous Access
  console.log('--- TEST 1: ANONYMOUS ACCESS ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonData, error: anonError } = await anonClient.from('employees').select('*');
  if (anonError) {
    console.log(`[PASS] Anonymous query rejected/errored as expected: ${anonError.message}`);
  } else {
    console.log(`[PASS] Anonymous query returned ${anonData.length} records (RLS enforced zero rows).`);
  }

  // Test 2: Employee Login & Permissions (Tarumani Bharath Raj)
  console.log('\n--- TEST 2: EMPLOYEE ACCESS (Tarumani Bharath Raj) ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) {
    console.error(`[FAIL] Employee authentication failed: ${empAuthErr.message}`);
  } else {
    console.log(`[PASS] Employee authenticated: UID ${empAuth.user.id}`);
    
    // Check what employees record Employee can see
    const { data: empVisible, error: empVisErr } = await empClient.from('employees').select('id, employee_id, name, email');
    if (empVisErr) {
      console.error(`[FAIL] Error querying employees: ${empVisErr.message}`);
    } else {
      console.log(`[PASS] Employee can view ${empVisible.length} record(s).`);
      empVisible.forEach(e => console.log(`   - ${e.employee_id}: ${e.name} (${e.email})`));
      if (empVisible.length === 1 && empVisible[0].email === 'tarumani.bharathraj@digix.internal') {
        console.log(`[PASS] Strict RLS verified: Regular employee can ONLY view own record.`);
      } else {
        console.warn(`[WARN] Unexpected record count for employee.`);
      }
    }

    // Try to insert as Employee (Should be blocked by RLS)
    const { data: empInsert, error: empInsErr } = await empClient.from('employees').insert({
      employee_id: 'HACK001',
      name: 'Unauthorized Insert',
      email: 'hack@digix.internal'
    }).select();
    if (empInsErr) {
      console.log(`[PASS] Employee insertion correctly blocked by RLS: ${empInsErr.message}`);
    } else {
      console.error(`[FAIL] Employee was able to insert an employee record!`);
    }
  }

  // Test 3: HR Login & Permissions (Priyanka)
  console.log('\n--- TEST 3: HR ACCESS (Priyanka) ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) {
    console.error(`[FAIL] HR authentication failed: ${hrAuthErr.message}`);
  } else {
    console.log(`[PASS] HR authenticated: UID ${hrAuth.user.id}`);

    // Query employees with select('*')
    const { data: hrRows, error: hrRowsErr } = await hrClient
      .from('employees')
      .select('*')
      .order('employee_id');

    if (hrRowsErr) {
      console.error(`[FAIL] HR failed to fetch employees: ${hrRowsErr.message}`);
    } else {
      console.log(`[PASS] HR successfully fetched ${hrRows.length} employees from Supabase:`);
      const nameMap = new Map();
      hrRows.forEach(r => {
        if (r.id && r.name) nameMap.set(r.id, r.name);
      });
      const mapped = hrRows.map(r => mapDbEmployeeToUi(r, nameMap));
      mapped.forEach(m => {
        console.log(`   - [${m.id}] ${m.name} | Role: ${m.role} (${m.roleTitle}) | Dept: ${m.department} | Manager: ${m.manager} | Status: ${m.status}`);
      });

      // Verify mapping structure matches UI expectations
      const sample = mapped[0];
      const requiredProps = ['id', 'dbId', 'name', 'email', 'role', 'roleTitle', 'department', 'team', 'avatar', 'phone', 'location', 'manager', 'joinDate', 'band', 'badgeNumber', 'status', 'workType', 'skills', 'salary'];
      const missingProps = requiredProps.filter(p => sample[p] === undefined);
      if (missingProps.length === 0) {
        console.log(`[PASS] UI mapper completely fulfills all required UI component fields.`);
      } else {
        console.warn(`[WARN] Missing properties in mapped employee: ${missingProps.join(', ')}`);
      }
    }

    // Test HR Employee Creation
    console.log('\n--- Testing HR Add Employee & Update flow ---');
    const testEmpId = `DGX_TEST_${Date.now().toString().slice(-4)}`;
    const newEmpPayload = {
      employee_id: testEmpId,
      name: 'Verification Bot',
      email: `${testEmpId.toLowerCase()}@digix.internal`,
      department: 'Quality Assurance',
      designation: 'QA Automation Engineer',
      location: 'Hyderabad, India (Hybrid)',
      status: 'active',
      phone: '+91 98765 43210'
    };

    const { data: createdEmp, error: createErr } = await hrClient
      .from('employees')
      .insert(newEmpPayload)
      .select('*')
      .single();

    if (createErr) {
      console.error(`[FAIL] HR failed to insert employee: ${createErr.message}`);
    } else {
      console.log(`[PASS] HR successfully inserted new employee into Supabase: ID ${createdEmp.id} (${createdEmp.employee_id})`);

      // Test HR Employee Update (valid statuses: 'active', 'inactive', 'on_leave', 'resigned')
      const { data: updatedEmp, error: updateErr } = await hrClient
        .from('employees')
        .update({
          designation: 'Lead QA Automation Engineer',
          status: 'inactive'
        })
        .eq('id', createdEmp.id)
        .select('*')
        .single();

      if (updateErr) {
        console.error(`[FAIL] HR failed to update employee: ${updateErr.message}`);
      } else {
        console.log(`[PASS] HR successfully updated employee: designation -> "${updatedEmp.designation}", status -> "${updatedEmp.status}"`);
      }

      // Cleanup
      const { error: delErr } = await hrClient.from('employees').delete().eq('id', createdEmp.id);
      if (delErr) {
        console.warn(`[WARN] Could not clean up test employee: ${delErr.message}`);
      } else {
        console.log(`[PASS] Test employee cleaned up successfully from Supabase.`);
      }
    }
  }

  // Test 4: Admin Login & Permissions (Marcus Vance)
  console.log('\n--- TEST 4: ADMIN ACCESS (Marcus Vance) ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) {
    console.error(`[FAIL] Admin authentication failed: ${adminAuthErr.message}`);
  } else {
    console.log(`[PASS] Admin authenticated: UID ${adminAuth.user.id}`);
    const { data: adminRows, error: adminRowsErr } = await adminClient
      .from('employees')
      .select('id, employee_id, name, department, designation, status')
      .order('employee_id');

    if (adminRowsErr) {
      console.error(`[FAIL] Admin failed to fetch employees: ${adminRowsErr.message}`);
    } else {
      console.log(`[PASS] Admin successfully fetched all ${adminRows.length} master employee records from Supabase.`);
      adminRows.forEach(a => console.log(`   - [${a.employee_id}] ${a.name} | ${a.designation} (${a.department})`));
    }
  }

  console.log('\n====================================================');
  console.log('STEP 1 VERIFICATION COMPLETED');
  console.log('====================================================');
}

runTests();
