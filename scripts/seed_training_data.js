import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function seed() {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  // Sign in as HR (Priyanka)
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (authErr) throw authErr;
  console.log('Logged in as HR Priyanka:', auth.user.id);

  // Fetch employees
  const { data: emps, error: empErr } = await client.from('employees').select('id, employee_id, name, department');
  if (empErr) throw empErr;

  const empMap = {};
  emps.forEach(e => {
    empMap[e.employee_id] = e;
  });
  console.log('Found employees:', Object.keys(empMap));

  const priyanka = empMap['HR001'];
  const tarumani = empMap['DGX003'];
  const alex = empMap['DGX004'];
  const bharath = empMap['DGX005'];

  // Check if trainings already exist
  const { data: existing } = await client.from('training').select('id, title');
  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing trainings in Supabase. Skipping seed.`);
    return;
  }

  console.log('Seeding initial production training courses...');

  // Course 1: Zero-Trust Security
  const { data: c1, error: c1Err } = await client.from('training').insert({
    title: 'Zero-Trust Security & SOC2 Compliance 2026',
    description: 'Comprehensive review of passwordless auth, data classification, and incident disclosure requirements for DigiX personnel.',
    category: 'Security & Compliance',
    instructor: 'Marcus Vance',
    duration: '4.5 hours',
    start_date: '2026-09-01',
    end_date: '2026-10-15',
    status: 'ongoing',
    created_by: priyanka.id
  }).select().single();
  if (c1Err) throw c1Err;
  console.log('Created Course 1:', c1.title);

  // Assignments for C1
  await client.from('training_assignments').insert([
    {
      training_id: c1.id,
      employee_id: tarumani.id,
      status: 'completed',
      completion_percent: 100,
      assigned_at: '2026-09-01T09:00:00Z',
      completed_at: '2026-09-15T14:30:00Z'
    },
    ...(alex ? [{
      training_id: c1.id,
      employee_id: alex.id,
      status: 'in_progress',
      completion_percent: 60,
      assigned_at: '2026-09-01T09:00:00Z'
    }] : []),
    ...(bharath ? [{
      training_id: c1.id,
      employee_id: bharath.id,
      status: 'assigned',
      completion_percent: 0,
      assigned_at: '2026-09-01T09:00:00Z'
    }] : [])
  ]);

  // Course 2: React 19 & Modern Web Architecture
  const { data: c2, error: c2Err } = await client.from('training').insert({
    title: 'React 19 & Modern Web Architecture Masterclass',
    description: 'Deep dive into React Server Components, Actions, Asset Loading, and compiler-first optimizations for enterprise SaaS applications.',
    category: 'Technical',
    instructor: 'Tech Guild & Guest Speakers',
    duration: '6.0 hours',
    start_date: '2026-09-10',
    end_date: '2026-10-30',
    status: 'ongoing',
    created_by: priyanka.id
  }).select().single();
  if (c2Err) throw c2Err;
  console.log('Created Course 2:', c2.title);

  await client.from('training_assignments').insert([
    {
      training_id: c2.id,
      employee_id: tarumani.id,
      status: 'in_progress',
      completion_percent: 75,
      assigned_at: '2026-09-10T10:00:00Z'
    },
    ...(alex ? [{
      training_id: c2.id,
      employee_id: alex.id,
      status: 'in_progress',
      completion_percent: 40,
      assigned_at: '2026-09-10T10:00:00Z'
    }] : [])
  ]);

  // Course 3: Generative AI Prompt Engineering
  const { data: c3, error: c3Err } = await client.from('training').insert({
    title: 'Generative AI Prompt Engineering for Developers',
    description: 'Harnessing LLM APIs, function calling, vector embeddings, and RAG pipelines for production software systems at DigiX.',
    category: 'Technical',
    instructor: 'Amara Okafor',
    duration: '5.0 hours',
    start_date: '2026-09-15',
    end_date: '2026-11-15',
    status: 'ongoing',
    created_by: priyanka.id
  }).select().single();
  if (c3Err) throw c3Err;
  console.log('Created Course 3:', c3.title);

  await client.from('training_assignments').insert([
    {
      training_id: c3.id,
      employee_id: tarumani.id,
      status: 'assigned',
      completion_percent: 0,
      assigned_at: '2026-09-15T11:00:00Z'
    },
    ...(bharath ? [{
      training_id: c3.id,
      employee_id: bharath.id,
      status: 'in_progress',
      completion_percent: 50,
      assigned_at: '2026-09-15T11:00:00Z'
    }] : [])
  ]);

  // Course 4: Enterprise Leadership & Inclusive Culture
  const { data: c4, error: c4Err } = await client.from('training').insert({
    title: 'Enterprise Leadership & Inclusive Culture',
    description: 'Strategies for high-performance distributed engineering teams, inclusive leadership, and effective cross-functional collaboration.',
    category: 'Leadership',
    instructor: 'Priyanka, HR Manager',
    duration: '3.0 hours',
    start_date: '2026-10-01',
    end_date: '2026-11-01',
    status: 'upcoming',
    created_by: priyanka.id
  }).select().single();
  if (c4Err) throw c4Err;
  console.log('Created Course 4:', c4.title);

  await client.from('training_assignments').insert([
    {
      training_id: c4.id,
      employee_id: priyanka.id,
      status: 'in_progress',
      completion_percent: 50,
      assigned_at: '2026-09-20T09:00:00Z'
    },
    {
      training_id: c4.id,
      employee_id: tarumani.id,
      status: 'assigned',
      completion_percent: 0,
      assigned_at: '2026-09-20T09:00:00Z'
    }
  ]);

  console.log('✅ Seed completed successfully!');
}

seed().catch(console.error);
