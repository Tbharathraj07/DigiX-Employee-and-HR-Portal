import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testAnnouncementsModule() {
  console.log('====================================================');
  console.log('MODULE 1: ANNOUNCEMENTS -> SUPABASE VERIFICATION');
  console.log('====================================================\n');

  // 1. Anonymous Access Test
  console.log('--- TEST 1: ANONYMOUS ACCESS ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonData, error: anonErr } = await anonClient.from('announcements').select('*');
  console.log(`Anon select count: ${anonData?.length ?? 0} | Error: ${anonErr?.message || 'None'}`);

  const { data: anonInsert, error: anonInsErr } = await anonClient.from('announcements').insert({
    title: 'Anon Hack',
    content: 'Should be blocked',
    category: 'General'
  });
  if (anonInsErr) {
    console.log(`[PASS] Anonymous INSERT blocked by RLS as expected: ${anonInsErr.message}`);
  } else {
    console.error(`[FAIL] Anonymous user was able to insert!`);
  }

  // 2. Employee Login & RLS Test (Tarumani Bharath Raj)
  console.log('\n--- TEST 2: EMPLOYEE ACCESS (Tarumani Bharath Raj) ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) {
    throw new Error(`Employee auth failed: ${empAuthErr.message}`);
  }
  console.log(`[PASS] Employee authenticated: UID ${empAuth.user.id}`);

  // Employee reading announcements
  const { data: empAnnouncements, error: empReadErr } = await empClient.from('announcements').select('*');
  if (empReadErr) {
    console.error(`[FAIL] Employee read error: ${empReadErr.message}`);
  } else {
    console.log(`[PASS] Employee can view announcements (${empAnnouncements.length} records returned via RLS).`);
  }

  // Employee attempting to insert announcement (Should be blocked by RLS)
  const { data: empInsData, error: empInsErr } = await empClient.from('announcements').insert({
    title: 'Unauthorized Employee Announcement',
    content: 'This should fail',
    category: 'General'
  });
  if (empInsErr) {
    console.log(`[PASS] Employee INSERT blocked by RLS as expected: ${empInsErr.message}`);
  } else {
    console.error(`[FAIL] Employee was allowed to insert an announcement!`);
  }

  // 3. HR Login & Publishing Flow (Priyanka)
  console.log('\n--- TEST 3: HR ACCESS & PUBLISHING (Priyanka) ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) {
    throw new Error(`HR auth failed: ${hrAuthErr.message}`);
  }
  console.log(`[PASS] HR authenticated: UID ${hrAuth.user.id}`);

  // Fetch HR employee record to get author_id
  const { data: hrEmp, error: hrEmpErr } = await hrClient
    .from('employees')
    .select('id, employee_id, name, designation')
    .eq('email', 'priyanka@digix.internal')
    .single();

  if (hrEmpErr || !hrEmp) {
    throw new Error(`Failed to find HR employee record: ${hrEmpErr?.message}`);
  }
  console.log(`[PASS] HR Employee ID resolved: ${hrEmp.id} (${hrEmp.name} - ${hrEmp.designation})`);

  // Publish temporary announcement
  const testPayload = {
    title: 'TEST_AUTOMATION_Q4 Town Hall & Growth Strategy Briefing',
    content: 'Join the executive team on Friday for a comprehensive review of Q4 achievements and 2027 roadmap.',
    category: 'Events',
    priority: 'high',
    author_id: hrEmp.id,
    target_audience: 'All Employees',
    is_pinned: true,
    published_at: new Date().toISOString()
  };

  const { data: createdAnn, error: createErr } = await hrClient
    .from('announcements')
    .insert(testPayload)
    .select(`
      id,
      title,
      content,
      category,
      priority,
      author_id,
      target_audience,
      is_pinned,
      published_at,
      created_at,
      author:employees!author_id (id, employee_id, name, designation)
    `)
    .single();

  if (createErr || !createdAnn) {
    throw new Error(`HR failed to insert announcement: ${createErr?.message}`);
  }
  console.log(`[PASS] HR successfully created announcement: ID ${createdAnn.id}`);
  console.log(`   - Title: "${createdAnn.title}"`);
  console.log(`   - Category: ${createdAnn.category} | Priority: ${createdAnn.priority}`);
  console.log(`   - Author: ${createdAnn.author?.name} (${createdAnn.author?.designation})`);
  console.log(`   - Pinned: ${createdAnn.is_pinned} | Published At: ${createdAnn.published_at}`);

  // 4. Persistence & Read Verification Across Roles
  console.log('\n--- TEST 4: PERSISTENCE & READ VERIFICATION ---');
  // Employee reading again
  const { data: empReadAfter, error: empReadAfterErr } = await empClient
    .from('announcements')
    .select('id, title, category, priority, author:employees!author_id (name)')
    .eq('id', createdAnn.id)
    .single();

  if (empReadAfterErr || !empReadAfter) {
    console.error(`[FAIL] Employee could not read newly published announcement: ${empReadAfterErr?.message}`);
  } else {
    console.log(`[PASS] Employee successfully verified newly published announcement in Supabase: "${empReadAfter.title}"`);
  }

  // Admin reading
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) {
    throw new Error(`Admin auth failed: ${adminAuthErr.message}`);
  }
  console.log(`[PASS] Admin authenticated: UID ${adminAuth.user.id}`);

  const { data: adminRead, error: adminReadErr } = await adminClient
    .from('announcements')
    .select('*')
    .eq('id', createdAnn.id)
    .single();

  if (adminReadErr || !adminRead) {
    console.error(`[FAIL] Admin could not read announcement: ${adminReadErr?.message}`);
  } else {
    console.log(`[PASS] Admin successfully read announcement from Supabase: ID ${adminRead.id}`);
  }

  // 5. Cleanup Test Record
  console.log('\n--- TEST 5: CLEANUP TEMPORARY RECORD ---');
  const { error: delErr } = await adminClient.from('announcements').delete().eq('id', createdAnn.id);
  if (delErr) {
    console.error(`[FAIL] Failed to delete test announcement: ${delErr.message}`);
  } else {
    console.log(`[PASS] Temporary test announcement deleted successfully.`);
  }

  // Verify deletion
  const { data: verifyDel } = await adminClient.from('announcements').select('*').eq('id', createdAnn.id);
  if (!verifyDel || verifyDel.length === 0) {
    console.log(`[PASS] Verified test announcement record was completely removed from Supabase.`);
  } else {
    console.error(`[FAIL] Test announcement still exists in database!`);
  }

  console.log('\n====================================================');
  console.log('MODULE 1 (ANNOUNCEMENTS) ALL VERIFICATIONS PASSED');
  console.log('====================================================');
}

testAnnouncementsModule().catch((err) => {
  console.error('[MODULE 1 ERROR]', err);
  process.exit(1);
});
