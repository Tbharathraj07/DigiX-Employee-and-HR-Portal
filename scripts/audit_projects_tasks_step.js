import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function runAudit() {
  console.log('================================================================');
  console.log('   DIGIX PORTAL - PROJECTS & TASKS SUPABASE AUDIT SUITE');
  console.log('================================================================\n');

  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition, message) {
    testsTotal++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // -------------------------------------------------------------
  // 1. Anonymous Access Tests
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Anonymous Access Restrictions ---');
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  const { data: aPrj, error: aPrjErr } = await anon.from('projects').select('*');
  assert(!aPrj || aPrj.length === 0, 'Anonymous cannot read public.projects (returned 0 rows)');

  const { data: aMem, error: aMemErr } = await anon.from('project_members').select('*');
  assert(!aMem || aMem.length === 0, 'Anonymous cannot read public.project_members (returned 0 rows)');

  const { data: aTsk, error: aTskErr } = await anon.from('tasks').select('*');
  assert(!aTsk || aTsk.length === 0, 'Anonymous cannot read public.tasks (returned 0 rows)');

  const { data: aCom, error: aComErr } = await anon.from('task_comments').select('*');
  assert(!aCom || aCom.length === 0, 'Anonymous cannot read public.task_comments (returned 0 rows)');

  const { error: aInsPrjErr } = await anon.from('projects').insert({ name: 'Hacked Project' });
  assert(Boolean(aInsPrjErr), 'Anonymous cannot insert into public.projects');

  const { error: aInsTskErr } = await anon.from('tasks').insert({ title: 'Hacked Task' });
  assert(Boolean(aInsTskErr), 'Anonymous cannot insert into public.tasks');

  // -------------------------------------------------------------
  // 2. Employee (Tarumani Bharath Raj) Access & Isolation Tests
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Employee (Tarumani Bharath Raj) Functionality & Isolation ---');
  const emp = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: empAuth, error: empAuthErr } = await emp.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  assert(!empAuthErr && empAuth?.user, 'Employee Tarumani Bharath Raj signs in successfully');

  const { data: empRec } = await emp.from('employees').select('id, employee_id, name').eq('employee_id', 'DGX003').single();
  assert(Boolean(empRec?.id), `Found employee record: ${empRec?.name} (${empRec?.id})`);

  // Projects isolation
  const { data: empProjects } = await emp.from('projects').select('id, name, status, project_manager_id');
  assert(empProjects && empProjects.length === 3, `Employee retrieves exactly 3 assigned projects (found ${empProjects?.length})`);

  const hasPrivatePrj = empProjects?.some(p => p.name === 'Zero-Trust IAM Compliance Audit');
  assert(!hasPrivatePrj, 'Private project "Zero-Trust IAM Compliance Audit" is completely hidden from non-member employee');

  // Tasks isolation
  const { data: empTasks } = await emp.from('tasks').select('id, title, status, priority, assigned_to, project:projects!project_id(name)');
  assert(empTasks && empTasks.length === 4, `Employee retrieves exactly 4 accessible tasks (found ${empTasks?.length})`);

  const hasSecretTask = empTasks?.some(t => t.title.includes('Implement SSO OAuth2'));
  assert(!hasSecretTask, 'Secret task in private project is completely hidden from employee');

  // Employee creates sprint task in member project
  const memberPrj = empProjects?.find(p => p.name === 'Client Enterprise Portal V3');
  const testTaskTitle = 'QA Auto Audit Task ' + Date.now();
  const { data: createdTask, error: createTaskErr } = await emp.from('tasks').insert({
    project_id: memberPrj.id,
    assigned_to: empRec.id,
    title: testTaskTitle,
    description: 'Automated test task for persistence verification',
    status: 'todo',
    priority: 'medium',
    due_date: '2026-10-30',
    created_by: empRec.id
  }).select().single();
  assert(!createTaskErr && createdTask?.id, `Employee successfully creates task "${testTaskTitle}" in member project`);

  // Employee updates own task status to completed
  const { data: updatedTask, error: updateTaskErr } = await emp.from('tasks').update({
    status: 'completed',
    completed_at: new Date().toISOString()
  }).eq('id', createdTask.id).select().single();
  assert(!updateTaskErr && updatedTask?.status === 'completed' && Boolean(updatedTask?.completed_at), 'Employee updates own task status to "completed" with timestamp');

  // Employee verifies update persistence after re-querying
  const { data: recheckTask } = await emp.from('tasks').select('id, status, completed_at').eq('id', createdTask.id).single();
  assert(recheckTask?.status === 'completed', 'Task update persisted in Supabase database');

  // Employee tries to create task in non-member project (Zero-Trust IAM)
  // Retrieve private project ID via Admin
  const adminTemp = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await adminTemp.auth.signInWithPassword({ email: 'marcus.vance@digix.internal', password: 'demo' });
  const { data: privatePrj } = await adminTemp.from('projects').select('id').eq('name', 'Zero-Trust IAM Compliance Audit').single();

  const { error: unauthInsertErr } = await emp.from('tasks').insert({
    project_id: privatePrj.id,
    assigned_to: empRec.id,
    title: 'Illegal Task in Private Project',
    status: 'todo',
    created_by: empRec.id
  });
  assert(Boolean(unauthInsertErr), 'Employee is strictly BLOCKED from inserting task into non-member project');

  // Cleanup created test task via admin
  await adminTemp.from('tasks').delete().eq('id', createdTask.id);

  // -------------------------------------------------------------
  // 3. HR Manager (Priyanka) Access Tests
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: HR Manager (Priyanka) Access ---');
  const hr = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: hrAuth, error: hrAuthErr } = await hr.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  assert(!hrAuthErr && hrAuth?.user, 'HR Manager Priyanka signs in successfully');

  const { data: hrProjects } = await hr.from('projects').select('id, name');
  assert(hrProjects && hrProjects.length >= 4, `HR retrieves all ${hrProjects?.length} company projects under is_hr_or_admin()`);

  const { data: hrTasks } = await hr.from('tasks').select('id, title');
  assert(hrTasks && hrTasks.length >= 5, `HR retrieves all ${hrTasks?.length} company tasks under is_hr_or_admin()`);

  // -------------------------------------------------------------
  // 4. Admin (Marcus Vance) Access & Governance Tests
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Admin (Marcus Vance) Administrative Governance ---');
  const admin = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: adminAuth, error: adminAuthErr } = await admin.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  assert(!adminAuthErr && adminAuth?.user, 'Admin Marcus Vance signs in successfully');

  const { data: adminProjects } = await admin.from('projects').select('id, name');
  assert(adminProjects && adminProjects.length >= 4, `Admin retrieves all ${adminProjects?.length} projects under is_hr_or_admin()`);

  const { data: adminTasks } = await admin.from('tasks').select('id, title');
  assert(adminTasks && adminTasks.length >= 5, `Admin retrieves all ${adminTasks?.length} tasks under is_hr_or_admin()`);

  // Admin creates a strategic project
  const { data: adminRec } = await admin.from('employees').select('id').eq('employee_id', 'ADM001').single();
  const testPrjName = 'Strategic QA Project ' + Date.now();
  const { data: newPrj, error: newPrjErr } = await admin.from('projects').insert({
    name: testPrjName,
    description: 'Executive roadmap verification project',
    client_name: 'Strategic QA',
    start_date: '2026-10-01',
    end_date: '2026-12-31',
    status: 'planned',
    project_manager_id: adminRec.id
  }).select().single();
  assert(!newPrjErr && newPrj?.id, `Admin successfully creates strategic project "${testPrjName}"`);

  // Admin assigns project member
  const { data: newMem, error: newMemErr } = await admin.from('project_members').insert({
    project_id: newPrj.id,
    employee_id: empRec.id,
    project_role: 'developer'
  }).select().single();
  assert(!newMemErr && newMem?.id, 'Admin successfully assigns employee as project member');

  // Verify employee can now see the newly assigned project
  const { data: empRecheckProjects } = await emp.from('projects').select('id, name').eq('id', newPrj.id);
  assert(empRecheckProjects && empRecheckProjects.length === 1, 'Employee dynamically gains access to newly assigned project');

  // Admin updates project status to active
  const { data: updPrj, error: updPrjErr } = await admin.from('projects').update({ status: 'active' }).eq('id', newPrj.id).select().single();
  assert(!updPrjErr && updPrj?.status === 'active', 'Admin updates project status to "active"');

  // Admin deletes strategic project (cleanup)
  const { error: delPrjErr } = await admin.from('projects').delete().eq('id', newPrj.id);
  assert(!delPrjErr, 'Admin successfully cleans up test strategic project');

  // Verify cascade delete on members
  const { data: orphanMems } = await admin.from('project_members').select('id').eq('project_id', newPrj.id);
  assert(!orphanMems || orphanMems.length === 0, 'Foreign key cascade successfully removed project_members');

  // -------------------------------------------------------------
  // 5. Task Comments Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Task Comments Architecture Verification ---');
  const { data: comments, error: comErr } = await emp.from('task_comments').select('*');
  assert(!comErr, 'task_comments table queried cleanly without database errors');
  console.log('  ℹ️  Current task comments count in DB:', comments?.length ?? 0);
  console.log('  ℹ️  Task comments table is defined with full RLS in schema, but not exposed in current UI.');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`AUDIT SUMMARY: ${testsPassed} / ${testsTotal} PASSED`);
  if (testsPassed === testsTotal) {
    console.log('STATUS: ALL TESTS PASSED ✅ - READY FOR PRODUCTION');
  } else {
    console.log('STATUS: SOME TESTS FAILED ❌');
  }
  console.log('================================================================\n');
}

runAudit().catch(console.error);
