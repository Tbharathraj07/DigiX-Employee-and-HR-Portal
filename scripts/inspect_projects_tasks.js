import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';
const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

async function check() {
  const { data: hrAuth, error: hrErr } = await client.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrErr) throw hrErr;

  console.log('HR logged in:', hrAuth.user.id);

  const { data: projects, error: prjErr } = await client.from('projects').select('*');
  console.log('Projects count:', projects?.length, 'error:', prjErr);
  console.log('Projects:', JSON.stringify(projects, null, 2));

  const { data: members, error: memErr } = await client.from('project_members').select('*');
  console.log('Project members count:', members?.length, 'error:', memErr);
  console.log('Members:', JSON.stringify(members, null, 2));

  const { data: tasks, error: tskErr } = await client.from('tasks').select('*');
  console.log('Tasks count:', tasks?.length, 'error:', tskErr);
  console.log('Tasks:', JSON.stringify(tasks, null, 2));

  const { data: comments, error: comErr } = await client.from('task_comments').select('*');
  console.log('Comments count:', comments?.length, 'error:', comErr);
  console.log('Comments:', JSON.stringify(comments, null, 2));
}

check().catch(console.error);
