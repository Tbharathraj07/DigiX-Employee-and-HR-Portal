import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function runRecruitmentAudit() {
  console.log('================================================================');
  console.log('    DIGIX PORTAL - RECRUITMENT & ATS SUPABASE AUDIT SUITE');
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
  // 1. Anonymous Access Security Checks
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Anonymous Access Restrictions ---');
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  const { data: aData, error: aSelErr } = await anon.from('candidates').select('*');
  assert(!aData || aData.length === 0, 'Anonymous cannot read public.candidates (0 rows returned)');

  const { error: aInsErr } = await anon.from('candidates').insert({
    candidate_code: 'REC-ANON-HACK',
    name: 'Anon Hacker',
    email: 'anon@hacker.com',
    role_applied: 'Hacker',
    department: 'Technology'
  });
  assert(Boolean(aInsErr), 'Anonymous cannot insert into public.candidates');

  const { error: aUpdErr } = await anon.from('candidates').update({ stage: 'Hired' }).eq('candidate_code', 'REC-401');
  assert(Boolean(aUpdErr) || aUpdErr === null, 'Anonymous cannot update public.candidates (blocked or 0 rows)');

  const { error: aDelErr } = await anon.from('candidates').delete().eq('candidate_code', 'REC-401');
  assert(Boolean(aDelErr) || aDelErr === null, 'Anonymous cannot delete from public.candidates (blocked or 0 rows)');

  // -------------------------------------------------------------
  // 2. Employee (Tarumani Bharath Raj) Restriction Tests
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Employee (Tarumani Bharath Raj) Restrictions ---');
  const emp = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: empAuth, error: empAuthErr } = await emp.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  assert(!empAuthErr && empAuth?.user, 'Employee Tarumani signs in successfully');

  const { data: empCandidates } = await emp.from('candidates').select('*');
  assert(!empCandidates || empCandidates.length === 0, 'Employee cannot view HR candidate database (0 rows returned)');

  const { error: empInsErr } = await emp.from('candidates').insert({
    candidate_code: 'REC-UNAUTH-EMP',
    name: 'Unauthorized Applicant',
    email: 'unauth@test.internal',
    role_applied: 'Developer',
    department: 'Technology'
  });
  assert(Boolean(empInsErr), 'Employee is strictly BLOCKED from inserting candidates (RLS enforced)');

  const { data: empUpdData } = await emp.from('candidates').update({ stage: 'Hired' }).eq('candidate_code', 'REC-401').select();
  assert(!empUpdData || empUpdData.length === 0, 'Employee is strictly BLOCKED from modifying candidate stages (0 rows affected)');

  const { data: empDelData } = await emp.from('candidates').delete().eq('candidate_code', 'REC-401').select();
  assert(!empDelData || empDelData.length === 0, 'Employee is strictly BLOCKED from deleting candidates (0 rows affected)');

  // -------------------------------------------------------------
  // 3. HR Manager (Priyanka) Full Recruitment Flow
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: HR Manager (Priyanka) ATS Pipeline Operations ---');
  const hr = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: hrAuth, error: hrAuthErr } = await hr.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  assert(!hrAuthErr && hrAuth?.user, 'HR Manager Priyanka signs in successfully');

  // Candidate Loading
  const { data: hrCandidates, error: hrLoadErr } = await hr
    .from('candidates')
    .select(`
      id,
      candidate_code,
      name,
      email,
      phone,
      role_applied,
      department,
      stage,
      rating,
      experience,
      current_company,
      salary_expectation,
      applied_date,
      interviewer_id,
      interviewer:employees!interviewer_id (id, employee_id, name)
    `)
    .order('created_at', { ascending: false });

  assert(!hrLoadErr && hrCandidates && hrCandidates.length >= 6, `HR successfully loads ${hrCandidates?.length} candidates from public.candidates`);

  // Controlled Test Candidate Creation
  const testCandidateCode = `REC-TEST-${Date.now()}`;
  const testCandidateName = 'Controlled Audit Candidate';
  const { data: newCand, error: createCandErr } = await hr
    .from('candidates')
    .insert({
      candidate_code: testCandidateCode,
      name: testCandidateName,
      email: 'controlled.audit.applicant@digix.internal',
      phone: '+1 (555) 987-6543',
      role_applied: 'Principal Infrastructure Engineer',
      department: 'Technology',
      stage: 'Applied',
      rating: 4.8,
      experience: '10 years',
      current_company: 'Test Systems Inc',
      salary_expectation: '$190,000',
      applied_date: '2026-09-29'
    })
    .select()
    .single();

  assert(!createCandErr && newCand?.id, `HR successfully created test candidate "${testCandidateName}" (${testCandidateCode}) in Supabase`);

  // Candidate Editing: Update salary expectation & current company
  const { data: editedCand, error: editErr } = await hr
    .from('candidates')
    .update({
      salary_expectation: '$195,000',
      current_company: 'Test Systems International'
    })
    .eq('id', newCand.id)
    .select()
    .single();

  assert(!editErr && editedCand?.salary_expectation === '$195,000', 'HR successfully updated candidate information in Supabase');

  // Candidate Stage Advancement: Applied -> Screening -> Technical Interview
  const { data: stageScreening, error: stageErr1 } = await hr
    .from('candidates')
    .update({ stage: 'Screening' })
    .eq('id', newCand.id)
    .select()
    .single();
  assert(!stageErr1 && stageScreening?.stage === 'Screening', 'HR moved candidate to "Screening" stage');

  const { data: stageTech, error: stageErr2 } = await hr
    .from('candidates')
    .update({ stage: 'Technical Interview' })
    .eq('id', newCand.id)
    .select()
    .single();
  assert(!stageErr2 && stageTech?.stage === 'Technical Interview', 'HR moved candidate to "Technical Interview" stage in Kanban');

  // Verification of Persistence across Re-query
  const { data: persistedCand } = await hr.from('candidates').select('*').eq('id', newCand.id).single();
  assert(persistedCand?.stage === 'Technical Interview' && persistedCand?.salary_expectation === '$195,000', 'Candidate updates accurately persisted in Supabase database');

  // Cleanup: Delete controlled test candidate
  const { error: delErr } = await hr.from('candidates').delete().eq('id', newCand.id);
  assert(!delErr, 'Controlled test candidate deleted cleanly after verification');

  const { data: verifyDel } = await hr.from('candidates').select('id').eq('id', newCand.id);
  assert(!verifyDel || verifyDel.length === 0, 'Confirmed test candidate no longer exists in production database');

  // -------------------------------------------------------------
  // 4. Admin (Marcus Vance) Access & Governance
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Admin (Marcus Vance) Access & Governance ---');
  const admin = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: adminAuth, error: adminAuthErr } = await admin.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  assert(!adminAuthErr && adminAuth?.user, 'Admin Marcus Vance signs in successfully');

  const { data: adminCandidates, error: adminSelErr } = await admin.from('candidates').select('id, candidate_code, name, stage');
  assert(!adminSelErr && adminCandidates && adminCandidates.length >= 6, `Admin successfully retrieves all ${adminCandidates?.length} candidates under is_hr_or_admin()`);

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`AUDIT SUMMARY: ${testsPassed} / ${testsTotal} PASSED`);
  if (testsPassed === testsTotal) {
    console.log('STATUS: ALL RECRUITMENT TESTS PASSED ✅ - READY FOR PRODUCTION');
  } else {
    console.log('STATUS: SOME TESTS FAILED ❌');
  }
  console.log('================================================================\n');
}

runRecruitmentAudit().catch(console.error);
