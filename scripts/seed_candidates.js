import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function seedCandidates() {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  // Sign in as Admin Marcus Vance
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (authErr) throw authErr;
  console.log('Logged in as Admin Marcus Vance:', auth.user.id);

  // Check if candidates already exist
  const { data: existing, error: countErr } = await client.from('candidates').select('id, candidate_code');
  if (countErr) throw countErr;

  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing candidates in public.candidates. Skipping seed.`);
    return;
  }

  // Fetch employees to map interviewer_id
  const { data: employees } = await client.from('employees').select('id, employee_id, name');
  const priyanka = employees?.find(e => e.employee_id === 'HR001');
  const marcus = employees?.find(e => e.employee_id === 'ADM001');

  const initialCandidates = [
    {
      candidate_code: 'REC-401',
      name: 'Devante Washington',
      email: 'devante.w@example.com',
      phone: '+1 (555) 234-5678',
      role_applied: 'Senior Backend Engineer',
      department: 'Technology',
      stage: 'Technical Interview',
      rating: 4.6,
      experience: '7 years',
      current_company: 'Stripe',
      salary_expectation: '$165,000',
      applied_date: '2026-09-10',
      interviewer_id: null
    },
    {
      candidate_code: 'REC-402',
      name: 'Elena Vasquez',
      email: 'elena.v@example.com',
      phone: '+1 (555) 345-6789',
      role_applied: 'Staff Product Designer',
      department: 'Product Design',
      stage: 'Offered',
      rating: 4.9,
      experience: '9 years',
      current_company: 'Figma',
      salary_expectation: '$175,000',
      applied_date: '2026-08-28',
      interviewer_id: null
    },
    {
      candidate_code: 'REC-403',
      name: 'Karan Johar',
      email: 'karan.j@example.com',
      phone: '+1 (555) 456-7890',
      role_applied: 'DevOps & SRE Specialist',
      department: 'IT & Security',
      stage: 'Screening',
      rating: 4.2,
      experience: '5 years',
      current_company: 'Datadog',
      salary_expectation: '$130,000',
      applied_date: '2026-09-16',
      interviewer_id: marcus?.id || null
    },
    {
      candidate_code: 'REC-404',
      name: 'Nia Brooks',
      email: 'nia.b@example.com',
      phone: '+1 (555) 567-8901',
      role_applied: 'Engineering Manager - Platform',
      department: 'Technology',
      stage: 'HR Round',
      rating: 4.8,
      experience: '11 years',
      current_company: 'Atlassian',
      salary_expectation: '$210,000',
      applied_date: '2026-09-02',
      interviewer_id: priyanka?.id || null
    },
    {
      candidate_code: 'REC-405',
      name: 'Tariq Mansoor',
      email: 'tariq.m@example.com',
      phone: '+1 (555) 678-9012',
      role_applied: 'Machine Learning Researcher',
      department: 'Data & AI',
      stage: 'Applied',
      rating: 4.5,
      experience: '4 years',
      current_company: 'Cohere',
      salary_expectation: '$155,000',
      applied_date: '2026-09-17',
      interviewer_id: null
    },
    {
      candidate_code: 'REC-406',
      name: 'Samantha Reed',
      email: 'sam.reed@example.com',
      phone: '+1 (555) 789-0123',
      role_applied: 'Senior Product Manager',
      department: 'Product',
      stage: 'Hired',
      rating: 5.0,
      experience: '8 years',
      current_company: 'Notion',
      salary_expectation: '$170,000',
      applied_date: '2026-08-14',
      interviewer_id: priyanka?.id || null
    }
  ];

  console.log(`Seeding ${initialCandidates.length} initial candidate records into public.candidates...`);
  const { data: inserted, error: insErr } = await client
    .from('candidates')
    .insert(initialCandidates)
    .select();

  if (insErr) throw insErr;

  console.log(`✅ Successfully seeded ${inserted.length} candidates in public.candidates!`);
  inserted.forEach(c => console.log(`  - [${c.candidate_code}] ${c.name} (${c.role_applied}) -> ${c.stage}`));
}

seedCandidates().catch(console.error);
