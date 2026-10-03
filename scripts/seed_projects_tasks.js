import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function seed() {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  // Sign in as Admin Marcus Vance
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (authErr) throw authErr;
  console.log('Logged in as Admin Marcus Vance:', auth.user.id);

  // Fetch employees
  const { data: emps, error: empErr } = await client.from('employees').select('id, employee_id, name, department');
  if (empErr) throw empErr;

  const empMap = {};
  emps.forEach(e => {
    empMap[e.employee_id] = e;
  });
  console.log('Found employees:', Object.keys(empMap));

  const marcus = empMap['ADM001'];
  const priyanka = empMap['HR001'];
  const tarumani = empMap['DGX003'];
  const alex = empMap['DGX004'];
  const bharath = empMap['DGX005'];

  // Check if projects already exist
  const { data: existing } = await client.from('projects').select('id, name');
  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing projects in Supabase. Skipping seed.`);
    return;
  }

  console.log('Seeding initial production projects and members...');

  // Project 1: CloudMigration 2.0
  const { data: p1, error: p1Err } = await client.from('projects').insert({
    name: 'CloudMigration 2.0',
    description: 'Enterprise multi-region cloud migration to AWS EKS with zero-downtime database replication.',
    client_name: 'Infrastructure',
    start_date: '2026-03-01',
    end_date: '2026-11-30',
    status: 'active',
    project_manager_id: marcus.id
  }).select().single();
  if (p1Err) throw p1Err;
  console.log('Created Project 1:', p1.name);

  await client.from('project_members').insert([
    { project_id: p1.id, employee_id: marcus.id, project_role: 'project_manager' },
    { project_id: p1.id, employee_id: tarumani.id, project_role: 'developer' },
    ...(alex ? [{ project_id: p1.id, employee_id: alex.id, project_role: 'tester' }] : [])
  ]);

  // Project 2: AI Analytics Suite
  const { data: p2, error: p2Err } = await client.from('projects').insert({
    name: 'AI Analytics Suite',
    description: 'Real-time client telemetry and generative business intelligence report engine for enterprise accounts.',
    client_name: 'AI & Data',
    start_date: '2026-05-15',
    end_date: '2026-12-15',
    status: 'active',
    project_manager_id: priyanka.id
  }).select().single();
  if (p2Err) throw p2Err;
  console.log('Created Project 2:', p2.name);

  await client.from('project_members').insert([
    { project_id: p2.id, employee_id: priyanka.id, project_role: 'project_manager' },
    { project_id: p2.id, employee_id: tarumani.id, project_role: 'developer' },
    ...(bharath ? [{ project_id: p2.id, employee_id: bharath.id, project_role: 'analyst' }] : [])
  ]);

  // Project 3: Client Enterprise Portal V3
  const { data: p3, error: p3Err } = await client.from('projects').insert({
    name: 'Client Enterprise Portal V3',
    description: 'Next-generation partner management portal with self-serve billing, usage metering, and API keys.',
    client_name: 'Web Platform',
    start_date: '2026-08-01',
    end_date: '2027-02-28',
    status: 'planned',
    project_manager_id: tarumani.id
  }).select().single();
  if (p3Err) throw p3Err;
  console.log('Created Project 3:', p3.name);

  await client.from('project_members').insert([
    { project_id: p3.id, employee_id: tarumani.id, project_role: 'project_manager' },
    ...(alex ? [{ project_id: p3.id, employee_id: alex.id, project_role: 'developer' }] : []),
    ...(bharath ? [{ project_id: p3.id, employee_id: bharath.id, project_role: 'tester' }] : [])
  ]);

  // Project 4: Zero-Trust IAM Compliance Audit (Tarumani is NOT a member)
  const { data: p4, error: p4Err } = await client.from('projects').insert({
    name: 'Zero-Trust IAM Compliance Audit',
    description: 'Full SOC2 Type II and ISO 27001 readiness review, role-based access review, and credential rotation.',
    client_name: 'Security',
    start_date: '2026-06-01',
    end_date: '2026-09-30',
    status: 'active',
    project_manager_id: marcus.id
  }).select().single();
  if (p4Err) throw p4Err;
  console.log('Created Project 4 (Private):', p4.name);

  await client.from('project_members').insert([
    { project_id: p4.id, employee_id: marcus.id, project_role: 'project_manager' },
    ...(alex ? [{ project_id: p4.id, employee_id: alex.id, project_role: 'tester' }] : [])
  ]);

  console.log('Seeding initial production tasks...');

  await client.from('tasks').insert([
    {
      project_id: p3.id,
      assigned_to: tarumani.id,
      title: 'Optimize frontend bundle size & code splitting',
      description: 'Analyze chunk sizes with rollup-plugin-visualizer and introduce dynamic imports on heavy charts.',
      status: 'todo',
      priority: 'medium',
      due_date: '2026-10-15',
      created_by: tarumani.id
    },
    {
      project_id: p1.id,
      assigned_to: tarumani.id,
      title: 'Review PR #481: Database connection pool auto-scaler',
      description: 'Verify dynamic PgBouncer connection tuning benchmarks under load.',
      status: 'in_progress',
      priority: 'urgent',
      due_date: '2026-10-10',
      created_by: marcus.id
    },
    {
      project_id: p2.id,
      assigned_to: tarumani.id,
      title: 'Conduct latency benchmark on AI Inference endpoints',
      description: 'Benchmark response latency across regional clusters and test embeddings cache.',
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-10-20',
      created_by: priyanka.id
    },
    {
      project_id: p1.id,
      assigned_to: tarumani.id,
      title: 'Update security header policies (CSP, HSTS, X-Frame)',
      description: 'Configure strict CSP policies on staging and production edge distributions.',
      status: 'completed',
      priority: 'high',
      due_date: '2026-09-28',
      completed_at: '2026-09-28T10:00:00Z',
      created_by: marcus.id
    },
    ...(alex ? [{
      project_id: p4.id,
      assigned_to: alex.id,
      title: 'Implement SSO OAuth2 integration with Okta',
      description: 'Connect DigiX authorization provider with Okta SAML/OAuth endpoints and test user token refresh.',
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-10-05',
      created_by: marcus.id
    }] : [])
  ]);

  console.log('✅ Projects and Tasks seed completed successfully!');
}

seed().catch(console.error);
