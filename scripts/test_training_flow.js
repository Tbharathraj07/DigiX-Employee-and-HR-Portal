import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testTrainingFlow() {
  console.log('=== TESTING REAL-USER TRAINING FLOW ===\n');

  // --- 1. EMPLOYEE TEST (Tarumani Bharath Raj) ---
  console.log('--- 1. Testing as Employee Tarumani Bharath Raj ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw empAuthErr;

  const { data: empRecord } = await empClient.from('employees').select('id, employee_id, name, department').eq('user_id', empAuth.user.id).single();
  console.log('Logged in as Employee:', empRecord.name, `(${empRecord.employee_id})`);

  // Query employee assignments
  const { data: empAssignments, error: empQueryErr } = await empClient
    .from('training_assignments')
    .select(`
      id,
      training_id,
      employee_id,
      status,
      completion_percent,
      assigned_at,
      completed_at,
      training:training!training_id (
        id,
        title,
        description,
        category,
        instructor,
        duration,
        start_date,
        end_date,
        status,
        created_at
      )
    `)
    .eq('employee_id', empRecord.id);

  if (empQueryErr) throw empQueryErr;
  console.log(`Employee retrieved ${empAssignments.length} assigned courses from Supabase:`);
  empAssignments.forEach((a) => {
    console.log(`  - [${a.status.toUpperCase()}] "${a.training?.title}" (Progress: ${a.completion_percent}%)`);
  });

  // Verify Employee cannot see other employees' assignments
  const { data: allAssignments } = await empClient.from('training_assignments').select('*');
  const leakedAssignments = allAssignments?.filter(a => a.employee_id !== empRecord.id);
  console.log('Employee assignment isolation check:', leakedAssignments?.length === 0 ? 'PASSED (0 leaked)' : 'FAILED (' + leakedAssignments?.length + ' leaked)');

  // --- 2. HR TEST (Priyanka) ---
  console.log('\n--- 2. Testing as HR Manager Priyanka ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw hrAuthErr;

  const { data: hrRecord } = await hrClient.from('employees').select('id, employee_id, name, department').eq('user_id', hrAuth.user.id).single();
  console.log('Logged in as HR:', hrRecord.name, `(${hrRecord.employee_id})`);

  // HR queries all trainings with assignments
  const { data: hrTrainings, error: hrQueryErr } = await hrClient
    .from('training')
    .select(`
      id,
      title,
      description,
      category,
      instructor,
      duration,
      start_date,
      end_date,
      status,
      created_by,
      created_at,
      updated_at,
      assignments:training_assignments (
        id,
        employee_id,
        status,
        completion_percent,
        assigned_at,
        completed_at,
        employee:employees!employee_id (
          id,
          employee_id,
          name,
          department
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (hrQueryErr) throw hrQueryErr;
  console.log(`HR retrieved ${hrTrainings.length} total training curriculums:`);
  hrTrainings.forEach((t) => {
    console.log(`  - "${t.title}" (${t.assignments?.length || 0} enrolled staff, category: ${t.category})`);
  });

  // --- 3. ADMIN TEST (Marcus Vance) ---
  console.log('\n--- 3. Testing as Admin Marcus Vance ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw adminAuthErr;

  const { data: adminRecord } = await adminClient.from('employees').select('id, employee_id, name, department').eq('user_id', adminAuth.user.id).single();
  console.log('Logged in as Admin:', adminRecord.name, `(${adminRecord.employee_id})`);

  const { data: adminTrainings, error: adminQueryErr } = await adminClient
    .from('training')
    .select('id, title, status, assignments:training_assignments(count)');
  if (adminQueryErr) throw adminQueryErr;
  console.log(`Admin successfully verified ${adminTrainings.length} training courses via is_hr_or_admin policy.`);

  console.log('\n=== REAL-USER TRAINING FLOW TESTS COMPLETE ===');
}

testTrainingFlow().catch(console.error);
