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
  if (hrErr) {
    console.error('HR Login error:', hrErr);
    return;
  }
  console.log('HR logged in:', hrAuth.user.id);

  // Get Priyanka's employee ID
  const { data: hrEmp } = await client.from('employees').select('id, employee_id, name').eq('user_id', hrAuth.user.id).single();
  console.log('HR Employee record:', hrEmp);

  // Test insert into public.training
  const { data: insertedTraining, error: insErr } = await client.from('training').insert({
    title: 'Test Training Course 2026',
    description: 'A test course for schema verification',
    category: 'Security & Compliance',
    instructor: 'Priyanka, HR Manager',
    duration: '2.5 hours',
    start_date: '2026-09-28',
    end_date: '2026-10-28',
    status: 'upcoming',
    created_by: hrEmp.id
  }).select().single();

  console.log('Insert result:', insertedTraining, 'error:', insErr);

  if (insertedTraining) {
    // Test insert into public.training_assignments for Tarumani Bharath Raj
    const { data: empTarumani } = await client.from('employees').select('id, employee_id, name').eq('employee_id', 'DGX003').single();
    console.log('Tarumani employee record:', empTarumani);

    const { data: insertedAssign, error: aInsErr } = await client.from('training_assignments').insert({
      training_id: insertedTraining.id,
      employee_id: empTarumani.id,
      status: 'assigned',
      completion_percent: 0
    }).select().single();

    console.log('Assignment insert:', insertedAssign, 'error:', aInsErr);

    // Now clean up test records
    const { error: delErr } = await client.from('training').delete().eq('id', insertedTraining.id);
    console.log('Cleanup delete error:', delErr);
  }
}
check();
