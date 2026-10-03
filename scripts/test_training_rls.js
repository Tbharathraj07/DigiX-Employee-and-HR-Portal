import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testSecurity() {
  console.log('=== TRAINING MODULE SECURITY & RLS VERIFICATION ===\n');

  // 1. Anon user test
  console.log('--- 1. Anonymous Access Test ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: anonTrainings, error: aTErr } = await anonClient.from('training').select('*');
  console.log('Anon select training count:', anonTrainings?.length ?? 0, 'error:', aTErr?.message || 'None (empty)');

  const { data: anonAssignments, error: aAErr } = await anonClient.from('training_assignments').select('*');
  console.log('Anon select training_assignments count:', anonAssignments?.length ?? 0, 'error:', aAErr?.message || 'None (empty)');

  const { error: anonInsErr } = await anonClient.from('training').insert({
    title: 'Anon Course',
    status: 'upcoming'
  });
  console.log('Anon insert training blocked:', anonInsErr ? 'YES: ' + anonInsErr.message : 'FAILED TO BLOCK');

  // 2. HR creates course and assigns to Tarumani
  console.log('\n--- 2. HR Login & Course Creation ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  const { data: hrEmp } = await hrClient.from('employees').select('id, employee_id').eq('employee_id', 'HR001').single();
  const { data: taruEmp } = await hrClient.from('employees').select('id, employee_id').eq('employee_id', 'DGX003').single();
  const { data: alexEmp } = await hrClient.from('employees').select('id, employee_id').eq('employee_id', 'DGX004').single();

  const { data: course1, error: c1Err } = await hrClient.from('training').insert({
    title: 'RLS Security Validation Course',
    description: 'Testing employee RLS isolation and progress tracking',
    category: 'Security & Compliance',
    instructor: 'Priyanka, HR Manager',
    duration: '1.0 hour',
    start_date: '2026-09-28',
    end_date: '2026-10-28',
    status: 'upcoming',
    created_by: hrEmp.id
  }).select().single();
  console.log('Course created by HR:', course1.id, 'title:', course1.title, 'error:', c1Err);

  // Assign to Tarumani only
  const { data: assign1, error: as1Err } = await hrClient.from('training_assignments').insert({
    training_id: course1.id,
    employee_id: taruEmp.id,
    status: 'assigned',
    completion_percent: 0
  }).select().single();
  console.log('Course assigned to Tarumani:', assign1.id, 'error:', as1Err);

  // 3. Employee Tarumani tests
  console.log('\n--- 3. Employee (Tarumani) Access & Isolation Test ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });

  // Tarumani selects training
  const { data: empCourses } = await empClient.from('training').select('*');
  console.log('Tarumani sees assigned courses count:', empCourses?.length, 'includes course1:', empCourses?.some(c => c.id === course1.id));

  // Tarumani selects own assignments
  const { data: empAssignments } = await empClient.from('training_assignments').select('*');
  console.log('Tarumani sees own assignments count:', empAssignments?.length, 'includes assign1:', empAssignments?.some(a => a.id === assign1.id));

  // Tarumani tries to self-enroll/insert into training_assignments (should be blocked)
  const { error: selfAssignErr } = await empClient.from('training_assignments').insert({
    training_id: course1.id,
    employee_id: taruEmp.id,
    status: 'assigned'
  });
  console.log('Tarumani self-insert into training_assignments blocked:', selfAssignErr ? 'YES: ' + selfAssignErr.message : 'FAILED TO BLOCK');

  // Tarumani tries to update own assignment (allowed)
  const { data: updatedOwn, error: updateOwnErr } = await empClient.from('training_assignments')
    .update({ completion_percent: 25, status: 'in_progress' })
    .eq('id', assign1.id)
    .select()
    .single();
  console.log('Tarumani updates own progress:', updatedOwn?.completion_percent === 25 ? 'SUCCESS (25%)' : 'FAILED', 'error:', updateOwnErr);

  // Tarumani tries to update someone else's assignment (assign to Alex first by HR)
  const { data: alexAssign } = await hrClient.from('training_assignments').insert({
    training_id: course1.id,
    employee_id: alexEmp.id,
    status: 'assigned',
    completion_percent: 0
  }).select().single();

  const { data: updateOther, error: updateOtherErr } = await empClient.from('training_assignments')
    .update({ completion_percent: 100, status: 'completed' })
    .eq('id', alexAssign.id)
    .select();
  console.log('Tarumani modifies Alex assignment blocked:', (updateOther?.length === 0 || updateOtherErr) ? 'YES (0 rows affected / rejected)' : 'FAILED TO BLOCK');

  // Cleanup
  console.log('\n--- 4. Cleanup Test Course ---');
  const { error: cleanupErr } = await hrClient.from('training').delete().eq('id', course1.id);
  console.log('Cleanup error:', cleanupErr);

  console.log('\n=== RLS SECURITY TESTS ALL COMPLETED ===');
}

testSecurity().catch(console.error);
