import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testSecurity() {
  console.log('=== PROJECTS & TASKS RLS SECURITY TESTS ===\n');

  // --- 1. Anonymous Access ---
  console.log('--- 1. Anonymous Access Test ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  const { data: anonProjects, error: aPrjErr } = await anonClient.from('projects').select('*');
  console.log('Anon select projects count:', anonProjects?.length ?? 0, 'error:', aPrjErr?.message || 'None (empty)');

  const { data: anonMembers, error: aMemErr } = await anonClient.from('project_members').select('*');
  console.log('Anon select project_members count:', anonMembers?.length ?? 0, 'error:', aMemErr?.message || 'None (empty)');

  const { data: anonTasks, error: aTskErr } = await anonClient.from('tasks').select('*');
  console.log('Anon select tasks count:', anonTasks?.length ?? 0, 'error:', aTskErr?.message || 'None (empty)');

  const { data: anonComments, error: aComErr } = await anonClient.from('task_comments').select('*');
  console.log('Anon select task_comments count:', anonComments?.length ?? 0, 'error:', aComErr?.message || 'None (empty)');

  const { error: anonInsPrjErr } = await anonClient.from('projects').insert({ name: 'Hacked Project' });
  console.log('Anon insert projects blocked:', anonInsPrjErr ? 'YES: ' + anonInsPrjErr.message : 'FAILED TO BLOCK');

  const { error: anonInsTskErr } = await anonClient.from('tasks').insert({ title: 'Hacked Task' });
  console.log('Anon insert tasks blocked:', anonInsTskErr ? 'YES: ' + anonInsTskErr.message : 'FAILED TO BLOCK');

  // --- 2. Employee (Tarumani Bharath Raj) ---
  console.log('\n--- 2. Employee (Tarumani Bharath Raj) Project & Task Isolation ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });

  const { data: empRecord } = await empClient.from('employees').select('id, employee_id, name').eq('employee_id', 'DGX003').single();

  // Employee selects projects
  const { data: empProjects, error: empPrjErr } = await empClient.from('projects').select('id, name, status');
  console.log(`Employee retrieved ${empProjects?.length} projects:`);
  empProjects?.forEach(p => console.log(`  - "${p.name}" (Status: ${p.status})`));

  const hasPrivateProject = empProjects?.some(p => p.name === 'Zero-Trust IAM Compliance Audit');
  console.log('Private project isolation (Zero-Trust IAM Compliance Audit NOT visible):', !hasPrivateProject ? 'PASSED (Hidden)' : 'FAILED (Leaked)');

  // Employee selects tasks
  const { data: empTasks, error: empTskErr } = await empClient.from('tasks').select('id, title, status, priority, assigned_to');
  console.log(`Employee retrieved ${empTasks?.length} accessible tasks:`);
  empTasks?.forEach(t => console.log(`  - "${t.title}" (Status: ${t.status}, AssignedTo: ${t.assigned_to === empRecord.id ? 'Self' : 'Other'})`));

  const hasSecretTask = empTasks?.some(t => t.title.includes('Implement SSO OAuth2'));
  console.log('Secret task in unassigned project isolation:', !hasSecretTask ? 'PASSED (Hidden)' : 'FAILED (Leaked)');

  // Employee updates own task
  const myTask = empTasks?.find(t => t.assigned_to === empRecord.id);
  if (myTask) {
    const oldStatus = myTask.status;
    const newStatus = oldStatus === 'completed' ? 'in_progress' : 'completed';
    const { data: updatedTask, error: updTskErr } = await empClient
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', myTask.id)
      .select()
      .single();

    console.log('Employee updates own task status:', updatedTask?.status === newStatus ? `PASSED (${oldStatus} -> ${newStatus})` : 'FAILED: ' + updTskErr?.message);

    // Revert back
    await empClient.from('tasks').update({ status: oldStatus }).eq('id', myTask.id);
  }

  // Employee tries to create task in project they are NOT a member of
  const { data: allProjectsAdmin } = await createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    .from('projects')
    .select('id, name')
    .eq('name', 'Zero-Trust IAM Compliance Audit');
  const privatePrjId = allProjectsAdmin?.[0]?.id;

  if (privatePrjId) {
    const { error: unauthTaskErr } = await empClient.from('tasks').insert({
      project_id: privatePrjId,
      title: 'Unauthorized Task in Private Project',
      assigned_to: empRecord.id,
      created_by: empRecord.id
    });
    console.log('Employee unauthorized task insert in non-member project blocked:', unauthTaskErr ? 'YES: ' + unauthTaskErr.message : 'FAILED TO BLOCK');
  }

  // --- 3. HR (Priyanka) Access ---
  console.log('\n--- 3. HR Manager (Priyanka) Access Test ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });

  const { data: hrProjects } = await hrClient.from('projects').select('id, name');
  console.log(`HR retrieved ${hrProjects?.length} projects under is_hr_or_admin policy.`);

  const { data: hrTasks } = await hrClient.from('tasks').select('id, title');
  console.log(`HR retrieved ${hrTasks?.length} tasks under is_hr_or_admin policy.`);

  // --- 4. Admin (Marcus Vance) Access ---
  console.log('\n--- 4. Admin (Marcus Vance) Access Test ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });

  const { data: adminProjects } = await adminClient.from('projects').select('id, name');
  console.log(`Admin retrieved all ${adminProjects?.length} projects under is_hr_or_admin policy.`);

  const { data: adminTasks } = await adminClient.from('tasks').select('id, title');
  console.log(`Admin retrieved all ${adminTasks?.length} tasks under is_hr_or_admin policy.`);

  console.log('\n=== RLS SECURITY TESTS ALL COMPLETED ===');
}

testSecurity().catch(console.error);
