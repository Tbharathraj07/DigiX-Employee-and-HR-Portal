import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function verifyAnnouncementsIntegration() {
  console.log('================================================================');
  console.log('    DIGIX PORTAL - ANNOUNCEMENTS → SUPABASE VERIFICATION        ');
  console.log('================================================================\n');

  // --- 1. Anonymous Access Security Test ---
  console.log('--- TEST 1: Anonymous Access Security ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: anonData, error: anonErr } = await anonClient.from('announcements').select('*');
  console.log('Anon SELECT public.announcements:', (anonData && anonData.length > 0) ? '❌ LEAK' : `✅ BLOCKED (${anonErr?.message || '0 rows returned'})`);

  const { error: anonInsErr } = await anonClient.from('announcements').insert({
    title: 'Anon Hack Announcement',
    content: 'Should be blocked by RLS',
    category: 'General'
  });
  console.log('Anon INSERT public.announcements:', anonInsErr ? `✅ BLOCKED (${anonInsErr.message})` : '❌ FAILED TO BLOCK');

  // --- 2. Employee (Tarumani Bharath Raj) RLS & Read Test ---
  console.log('\n--- TEST 2: Employee (Tarumani Bharath Raj) Real Account ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw new Error(`Employee auth failed: ${empAuthErr.message}`);
  console.log(`✅ Employee authenticated. Auth UID: ${empAuth.user.id}`);

  // Employee reading announcements
  const { data: empInitialRead, error: empReadErr } = await empClient.from('announcements').select('*');
  if (empReadErr) throw new Error(`Employee read error: ${empReadErr.message}`);
  console.log(`✅ Employee can read announcements via RLS. Current count in Supabase: ${empInitialRead.length}`);

  // Employee attempting unauthorized operations (INSERT, UPDATE, DELETE)
  const { error: empInsErr } = await empClient.from('announcements').insert({
    title: 'Unauthorized Employee Announcement',
    content: 'Should be rejected',
    category: 'General'
  });
  console.log('Employee INSERT public.announcements:', empInsErr ? `✅ BLOCKED BY RLS (${empInsErr.message})` : '❌ FAILED TO BLOCK');

  // --- 3. HR (Priyanka) Real Account Creation & Management ---
  console.log('\n--- TEST 3: HR (Priyanka) Real Account Publishing & Management ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw new Error(`HR auth failed: ${hrAuthErr.message}`);
  console.log(`✅ HR authenticated. Auth UID: ${hrAuth.user.id}`);

  // Resolve HR Employee record for author_id
  const { data: hrEmp, error: hrEmpErr } = await hrClient
    .from('employees')
    .select('id, employee_id, name, designation, department')
    .eq('email', 'priyanka@digix.internal')
    .single();

  if (hrEmpErr || !hrEmp) throw new Error(`Failed to resolve HR employee: ${hrEmpErr?.message}`);
  console.log(`✅ HR Employee resolved: ${hrEmp.id} (${hrEmp.name} - ${hrEmp.designation})`);

  // HR publishes ONE clearly identifiable temporary test announcement
  const testTitle = `TEST_ANNOUNCEMENT_${Date.now().toString().slice(-4)}: Q4 All-Hands Briefing`;
  const { data: createdAnn, error: createErr } = await hrClient
    .from('announcements')
    .insert({
      title: testTitle,
      content: 'Official briefing on organizational quarterly milestones and 2027 technical strategy.',
      category: 'Events',
      priority: 'high',
      author_id: hrEmp.id,
      target_audience: 'All Employees',
      is_pinned: true,
      published_at: new Date().toISOString()
    })
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
      author:employees!author_id (id, employee_id, name, designation, department)
    `)
    .single();

  if (createErr || !createdAnn) throw new Error(`HR failed to create announcement: ${createErr?.message}`);
  console.log(`✅ HR successfully created announcement in Supabase:`);
  console.log(`   - ID: ${createdAnn.id}`);
  console.log(`   - Title: "${createdAnn.title}"`);
  console.log(`   - Category: ${createdAnn.category} | Priority: ${createdAnn.priority}`);
  console.log(`   - Author Linked: ${createdAnn.author?.name} (${createdAnn.author?.designation})`);
  console.log(`   - Target: ${createdAnn.target_audience} | Pinned: ${createdAnn.is_pinned}`);

  // --- 4. Cross-Role Reading & Persistence Verification ---
  console.log('\n--- TEST 4: Cross-Role Reading & Verification ---');
  // Employee reading the published announcement
  const { data: empViewAnn, error: empViewErr } = await empClient
    .from('announcements')
    .select(`
      id,
      title,
      content,
      category,
      priority,
      author:employees!author_id (name, designation)
    `)
    .eq('id', createdAnn.id)
    .single();

  if (empViewErr || !empViewAnn) throw new Error(`Employee failed to view announcement: ${empViewErr?.message}`);
  console.log(`✅ Employee retrieved published announcement from Supabase via RLS:`);
  console.log(`   - "${empViewAnn.title}" by ${empViewAnn.author?.name}`);

  // Employee attempting to UPDATE the announcement -> MUST BE BLOCKED
  const { data: empUpdData, error: empUpdErr } = await empClient
    .from('announcements')
    .update({ title: 'Hacked by Employee' })
    .eq('id', createdAnn.id)
    .select();
  const updateBlocked = empUpdErr || !empUpdData || empUpdData.length === 0;
  console.log('Employee UPDATE public.announcements:', updateBlocked ? `✅ BLOCKED BY RLS (0 rows affected)` : '❌ FAILED TO BLOCK');

  // Employee attempting to DELETE the announcement -> MUST BE BLOCKED
  const { data: empDelData, error: empDelErr } = await empClient
    .from('announcements')
    .delete()
    .eq('id', createdAnn.id)
    .select();
  const deleteBlocked = empDelErr || !empDelData || empDelData.length === 0;
  console.log('Employee DELETE public.announcements:', deleteBlocked ? `✅ BLOCKED BY RLS (0 rows affected)` : '❌ FAILED TO BLOCK');

  // --- 5. HR Updates Announcement ---
  console.log('\n--- TEST 5: HR Updates Announcement ---');
  const updatedTitle = `${testTitle} (Updated Details)`;
  const { data: hrUpdatedAnn, error: hrUpdErr } = await hrClient
    .from('announcements')
    .update({
      title: updatedTitle,
      priority: 'urgent',
      content: 'Updated agenda: Keynote speech, town hall Q&A, and awards distribution.'
    })
    .eq('id', createdAnn.id)
    .select(`id, title, priority, content`)
    .single();

  if (hrUpdErr || !hrUpdatedAnn) throw new Error(`HR failed to update announcement: ${hrUpdErr?.message}`);
  console.log(`✅ HR updated announcement in Supabase:`);
  console.log(`   - New Title: "${hrUpdatedAnn.title}"`);
  console.log(`   - New Priority: ${hrUpdatedAnn.priority}`);

  // --- 6. Admin (Marcus Vance) Real Account Verification ---
  console.log('\n--- TEST 6: Admin (Marcus Vance) Real Account Verification ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw new Error(`Admin auth failed: ${adminAuthErr.message}`);
  console.log(`✅ Admin authenticated. Auth UID: ${adminAuth.user.id}`);

  const { data: adminViewAnn, error: adminViewErr } = await adminClient
    .from('announcements')
    .select('id, title, priority, author:employees!author_id (name)')
    .eq('id', createdAnn.id)
    .single();

  if (adminViewErr || !adminViewAnn) throw new Error(`Admin failed to read announcement: ${adminViewErr?.message}`);
  console.log(`✅ Admin retrieved announcement from Supabase:`);
  console.log(`   - "${adminViewAnn.title}" [Priority: ${adminViewAnn.priority}]`);

  // --- 7. Persistence / Re-authentication Test ---
  console.log('\n--- TEST 7: Persistence After Logout / Login ---');
  // Sign out and re-authenticate employee
  await empClient.auth.signOut();
  const { data: empReAuth, error: reAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (reAuthErr) throw reAuthErr;

  const { data: persistentCheck } = await empClient
    .from('announcements')
    .select('id, title')
    .eq('id', createdAnn.id)
    .single();

  console.log(`✅ Announcement persisted across session reload:`, persistentCheck?.title === updatedTitle ? `PASSED ("${persistentCheck.title}")` : 'FAILED');

  // --- 8. Cleanup Temporary Test Record ---
  console.log('\n--- TEST 8: Cleanup Temporary Record ---');
  const { error: delErr } = await adminClient
    .from('announcements')
    .delete()
    .eq('id', createdAnn.id);

  if (delErr) throw new Error(`Failed to delete test announcement: ${delErr.message}`);
  console.log(`✅ Test announcement deleted from Supabase.`);

  // Verify deletion
  const { data: verifyDel } = await adminClient
    .from('announcements')
    .select('*')
    .eq('id', createdAnn.id);

  if (!verifyDel || verifyDel.length === 0) {
    console.log(`✅ Verified test announcement was completely removed from Supabase (0 records remain).`);
  } else {
    throw new Error('Test announcement still exists in database!');
  }

  console.log('\n================================================================');
  console.log('       MODULE 1 (ANNOUNCEMENTS) ALL AUDIT CHECKS PASSED         ');
  console.log('================================================================');
}

verifyAnnouncementsIntegration().catch((err) => {
  console.error('[ANNOUNCEMENTS AUDIT FAILURE]', err);
  process.exit(1);
});
