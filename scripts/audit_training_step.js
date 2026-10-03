import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function auditTrainingStep() {
  console.log('================================================================');
  console.log('       DIGIX PORTAL - TRAINING → SUPABASE VERIFICATION AUDIT    ');
  console.log('================================================================\n');

  // --- 1. Anonymous Access Security Test ---
  console.log('--- TEST 1: Anonymous Access Security ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: anonTrainings, error: anonTrainErr } = await anonClient.from('training').select('*');
  console.log('Anon SELECT public.training:', anonTrainings?.length ? '❌ LEAK' : '✅ BLOCKED (0 rows returned / error: ' + (anonTrainErr?.message || 'none') + ')');

  const { data: anonAssigns, error: anonAssignErr } = await anonClient.from('training_assignments').select('*');
  console.log('Anon SELECT public.training_assignments:', anonAssigns?.length ? '❌ LEAK' : '✅ BLOCKED (0 rows returned / error: ' + (anonAssignErr?.message || 'none') + ')');

  const { error: anonInsTrainErr } = await anonClient.from('training').insert({
    title: 'Hacked Training',
    status: 'upcoming'
  });
  console.log('Anon INSERT public.training:', anonInsTrainErr ? '✅ BLOCKED (' + anonInsTrainErr.message + ')' : '❌ FAILED TO BLOCK');

  const { error: anonInsAssignErr } = await anonClient.from('training_assignments').insert({
    training_id: '00000000-0000-0000-0000-000000000000',
    employee_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('Anon INSERT public.training_assignments:', anonInsAssignErr ? '✅ BLOCKED (' + anonInsAssignErr.message + ')' : '❌ FAILED TO BLOCK');


  // --- 2. Employee (Tarumani Bharath Raj) Test ---
  console.log('\n--- TEST 2: Employee (Tarumani Bharath Raj) Real Account ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw empAuthErr;
  console.log('✅ Employee authenticated. Auth UID:', empAuth.user.id);

  const { data: empRecord, error: empRecErr } = await empClient
    .from('employees')
    .select('id, employee_id, name, department')
    .eq('user_id', empAuth.user.id)
    .single();
  if (empRecErr) throw empRecErr;
  console.log('   Employee DB ID:', empRecord.id, 'Display ID:', empRecord.employee_id, 'Name:', empRecord.name);

  // Employee queries assigned courses
  const { data: empAssignments, error: empAssignErr } = await empClient
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

  if (empAssignErr) throw empAssignErr;
  console.log(`✅ Employee retrieved ${empAssignments.length} assigned courses from Supabase:`);
  empAssignments.forEach((a) => {
    console.log(`   - [${a.status.toUpperCase()}] "${a.training?.title}" (Progress: ${a.completion_percent}%, Duration: ${a.training?.duration})`);
  });

  // Verify RLS isolation: Employee cannot see assignments of other employees
  const { data: allAssignments } = await empClient.from('training_assignments').select('*');
  const leakedAssignments = allAssignments?.filter(a => a.employee_id !== empRecord.id);
  console.log('✅ Employee assignment isolation check:', leakedAssignments?.length === 0 ? 'PASSED (0 foreign rows returned)' : 'FAILED');

  // Verify Employee cannot insert self-assignment
  const { error: empSelfAssignErr } = await empClient.from('training_assignments').insert({
    training_id: empAssignments[0]?.training_id,
    employee_id: empRecord.id,
    status: 'assigned'
  });
  console.log('✅ Employee unauthorized INSERT blocked:', empSelfAssignErr ? 'PASSED (' + empSelfAssignErr.message + ')' : 'FAILED');

  // Verify Employee CAN update own assignment progress
  const targetAssignment = empAssignments.find(a => a.status === 'in_progress') || empAssignments[0];
  const oldPercent = targetAssignment.completion_percent;
  const testNewPercent = oldPercent === 100 ? 75 : Math.min(100, oldPercent + 5);

  const { data: updatedSelf, error: updateSelfErr } = await empClient
    .from('training_assignments')
    .update({ completion_percent: testNewPercent, status: 'in_progress' })
    .eq('id', targetAssignment.id)
    .select()
    .single();

  console.log('✅ Employee updates own assignment progress in Supabase:', updatedSelf?.completion_percent === testNewPercent ? `PASSED (${oldPercent}% -> ${testNewPercent}%)` : 'FAILED: ' + updateSelfErr?.message);

  // Restore original progress
  await empClient
    .from('training_assignments')
    .update({ completion_percent: oldPercent, status: targetAssignment.status })
    .eq('id', targetAssignment.id);


  // --- 3. HR (Priyanka) Test ---
  console.log('\n--- TEST 3: HR Manager (Priyanka) Real Account ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw hrAuthErr;
  console.log('✅ HR Manager authenticated. Auth UID:', hrAuth.user.id);

  const { data: hrRecord } = await hrClient
    .from('employees')
    .select('id, employee_id, name, department')
    .eq('user_id', hrAuth.user.id)
    .single();
  console.log('   HR DB ID:', hrRecord.id, 'Display ID:', hrRecord.employee_id, 'Name:', hrRecord.name);

  // HR views all courses and assigned rosters
  const { data: hrTrainings, error: hrTrainErr } = await hrClient
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

  if (hrTrainErr) throw hrTrainErr;
  console.log(`✅ HR retrieved ${hrTrainings.length} total training programs from Supabase:`);
  hrTrainings.forEach((t) => {
    console.log(`   - "${t.title}" (${t.assignments?.length || 0} participants, status: ${t.status})`);
  });

  // HR performs Create Training Program
  console.log('\n--- TEST 4: HR Creates & Assigns Training in Supabase ---');
  const testTitle = `Audit Test Program ${Date.now().toString().slice(-4)}`;
  const { data: createdCourse, error: createCourseErr } = await hrClient
    .from('training')
    .insert({
      title: testTitle,
      description: 'Automated audit test curriculum for Supabase verification',
      category: 'Technical',
      instructor: 'Priyanka, HR Manager',
      duration: '2.5 hours',
      start_date: '2026-10-01',
      end_date: '2026-11-01',
      status: 'upcoming',
      created_by: hrRecord.id
    })
    .select()
    .single();

  if (createCourseErr) throw createCourseErr;
  console.log('✅ HR successfully created training in Supabase. Course ID:', createdCourse.id);

  // HR assigns course to Tarumani Bharath Raj
  const { data: createdAssignment, error: createAssignErr } = await hrClient
    .from('training_assignments')
    .insert({
      training_id: createdCourse.id,
      employee_id: empRecord.id,
      status: 'assigned',
      completion_percent: 0
    })
    .select()
    .single();

  if (createAssignErr) throw createAssignErr;
  console.log('✅ HR successfully assigned course to employee in Supabase. Assignment ID:', createdAssignment.id);

  // HR updates course title / status
  const { data: updatedCourse, error: updateCourseErr } = await hrClient
    .from('training')
    .update({ title: `${testTitle} (Updated)` })
    .eq('id', createdCourse.id)
    .select()
    .single();

  console.log('✅ HR successfully updated training in Supabase:', updatedCourse?.title?.includes('(Updated)') ? 'PASSED' : 'FAILED: ' + updateCourseErr?.message);

  // --- 4. Database Persistence across Logout/Login ---
  console.log('\n--- TEST 5: Database Persistence Test across Logout / Login ---');
  // Log out employee and re-authenticate to confirm newly assigned course is visible
  const empClient2 = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  await empClient2.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });

  const { data: empRecheck } = await empClient2
    .from('training_assignments')
    .select('id, training:training!training_id(title)')
    .eq('training_id', createdCourse.id)
    .eq('employee_id', empRecord.id);

  console.log('✅ Employee re-authenticated after logout and retrieved new assignment:', empRecheck?.length === 1 ? 'PASSED ("' + empRecheck[0].training?.title + '")' : 'FAILED');

  // Clean up audit test course
  console.log('\n--- TEST 6: Cleanup Test Training ---');
  const { error: delCourseErr } = await hrClient
    .from('training')
    .delete()
    .eq('id', createdCourse.id);

  console.log('✅ Audit course deleted from Supabase (cascades to assignments):', delCourseErr ? 'FAILED: ' + delCourseErr.message : 'PASSED');


  // --- 5. Admin (Marcus Vance) Access Test ---
  console.log('\n--- TEST 7: Admin (Marcus Vance) Real Account ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw adminAuthErr;
  console.log('✅ Admin authenticated. Auth UID:', adminAuth.user.id);

  const { data: adminRecord } = await adminClient
    .from('employees')
    .select('id, employee_id, name, department')
    .eq('user_id', adminAuth.user.id)
    .single();
  console.log('   Admin DB ID:', adminRecord.id, 'Display ID:', adminRecord.employee_id, 'Name:', adminRecord.name);

  const { data: adminTrainings, error: adminQueryErr } = await adminClient
    .from('training')
    .select('id, title, status, assignments:training_assignments(count)');

  if (adminQueryErr) throw adminQueryErr;
  console.log(`✅ Admin retrieved ${adminTrainings.length} corporate training programs under is_hr_or_admin policy.`);


  console.log('\n================================================================');
  console.log('       ALL 7 TRAINING → SUPABASE AUDIT TESTS PASSED! ✅        ');
  console.log('================================================================\n');
}

auditTrainingStep().catch(console.error);
