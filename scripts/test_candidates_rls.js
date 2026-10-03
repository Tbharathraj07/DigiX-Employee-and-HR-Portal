import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testCandidatesRLS() {
  console.log('=== CANDIDATES TABLE RLS & PERMISSION AUDIT ===\n');

  // 1. Anonymous Access
  console.log('--- 1. Anonymous Access ---');
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  
  const { data: anonData, error: aErr } = await anon.from('candidates').select('*');
  console.log('Anon select candidates count:', anonData?.length ?? 0, 'error:', aErr?.message || 'None (empty)');

  const { error: aInsErr } = await anon.from('candidates').insert({
    candidate_code: 'REC-HACK',
    name: 'Anonymous Hacker',
    email: 'hacker@example.com',
    role_applied: 'Hacker',
    department: 'Technology'
  });
  console.log('Anon insert candidates blocked:', aInsErr ? 'YES (' + aInsErr.message + ')' : 'FAIL: NOT BLOCKED');

  // 2. Employee (Tarumani Bharath Raj)
  console.log('\n--- 2. Employee (Tarumani Bharath Raj) Restrictions ---');
  const emp = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await emp.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });

  const { data: empCandidates, error: empSelErr } = await emp.from('candidates').select('*');
  console.log('Employee select candidates count:', empCandidates?.length ?? 0, 'error:', empSelErr?.message || 'None (empty)');

  const { error: empInsErr } = await emp.from('candidates').insert({
    candidate_code: 'REC-EMP-UNAUTH',
    name: 'Unauth Candidate',
    email: 'unauth@example.com',
    role_applied: 'Software Dev',
    department: 'Technology'
  });
  console.log('Employee insert candidates blocked:', empInsErr ? 'YES (' + empInsErr.message + ')' : 'FAIL: NOT BLOCKED');

  // Attempt to update candidate 1
  const { data: anyCand } = await createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    .from('candidates')
    .select('id')
    .limit(1);
  const targetId = anyCand?.[0]?.id;

  if (targetId) {
    const { data: empUpdData, error: empUpdErr } = await emp.from('candidates').update({ stage: 'Hired' }).eq('id', targetId).select();
    console.log('Employee update candidate blocked/empty:', (!empUpdData || empUpdData.length === 0) ? 'YES (0 rows affected)' : 'FAIL: UPDATED');
  }

  // 3. HR (Priyanka) Access
  console.log('\n--- 3. HR Manager (Priyanka) Access ---');
  const hr = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await hr.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });

  const { data: hrCandidates, error: hrSelErr } = await hr
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
      interviewer:employees!interviewer_id (id, employee_id, name)
    `);
  console.log(`HR retrieved ${hrCandidates?.length} candidates under is_hr_or_admin():`, hrSelErr?.message || 'SUCCESS');
  if (hrCandidates && hrCandidates.length > 0) {
    console.log('Sample candidate with interviewer join:', {
      code: hrCandidates[0].candidate_code,
      name: hrCandidates[0].name,
      stage: hrCandidates[0].stage,
      interviewer: hrCandidates[0].interviewer
    });
  }

  // 4. Admin (Marcus Vance) Access
  console.log('\n--- 4. Admin (Marcus Vance) Access ---');
  const admin = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await admin.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });

  const { data: adminCandidates, error: adminSelErr } = await admin.from('candidates').select('id, candidate_code, name');
  console.log(`Admin retrieved all ${adminCandidates?.length} candidates under is_hr_or_admin():`, adminSelErr?.message || 'SUCCESS');

  console.log('\n=== RLS & PERMISSION AUDIT COMPLETED ===');
}

testCandidatesRLS().catch(console.error);
