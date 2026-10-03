import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function checkBuckets() {
  const client = createClient(SUPABASE_URL, ANON_KEY);

  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  const userId = auth.user.id;
  const { data: emp } = await client.from('employees').select('id, employee_id, role:profiles(role)').eq('user_id', userId).single();
  console.log('Tarumani:', { userId, empId: emp.id, role: emp.role });

  const testBlob = new Blob(['test-file-content'], { type: 'application/pdf' });

  // Test employee-documents
  const { data: empDocUp, error: empDocErr } = await client.storage
    .from('employee-documents')
    .upload(`${emp.id}/test_ping.pdf`, testBlob);
  console.log('employee-documents upload:', empDocUp ? 'SUCCESS' : 'FAILED', empDocErr?.message);
  if (empDocUp) {
    await client.storage.from('employee-documents').remove([empDocUp.path]);
  }

  // Test company-documents
  const { data: compDocUp, error: compDocErr } = await client.storage
    .from('company-documents')
    .upload(`policies/test_ping.pdf`, testBlob);
  console.log('company-documents upload (expected blocked for employee):', compDocUp ? 'SUCCESS' : 'BLOCKED', compDocErr?.message);

  // Check storage.buckets from database if readable
  const { data: dbBuckets, error: dbBucketsErr } = await client.from('storage.buckets').select('*');
  console.log('storage.buckets direct query:', dbBuckets, dbBucketsErr?.message);
}

checkBuckets().catch(console.error);
