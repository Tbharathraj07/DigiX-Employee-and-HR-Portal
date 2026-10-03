import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testLifecycle() {
  console.log('===========================================================');
  console.log('  TESTING PROFILE CHANGE REQUEST & EMERGENCY CONTACT FLOW  ');
  console.log('===========================================================\n');

  // 1. Employee Login (Tarumani Bharath Raj)
  const empClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw empAuthErr;
  console.log('1. Logged in as Employee (Tarumani Bharath Raj):', empAuth.user.id);

  // Get employee dbId
  const { data: empRecord } = await empClient.from('employees').select('id, name, employee_id').eq('user_id', empAuth.user.id).single();
  console.log('   Employee DB ID:', empRecord.id, 'Display ID:', empRecord.employee_id);

  // 2. Submit Profile Change Request from Employee
  console.log('\n2. Submitting Profile Change Request for Emergency Contact Name...');
  const newRequestPayload = {
    employee_id: empRecord.id,
    field_name: 'emergencyName',
    current_value: '',
    requested_value: 'Srinivas Raj',
    reason: 'Adding father as primary emergency contact',
    supporting_document_url: null,
    status: 'pending'
  };

  const { data: submittedReq, error: submitErr } = await empClient
    .from('profile_change_requests')
    .insert(newRequestPayload)
    .select()
    .single();

  if (submitErr) {
    console.error('❌ Failed to insert profile change request:', submitErr);
    return;
  }
  console.log('✅ Request successfully stored in public.profile_change_requests:');
  console.log('   ID:', submittedReq.id);
  console.log('   Status:', submittedReq.status);
  console.log('   Field:', submittedReq.field_name);
  console.log('   Requested Value:', submittedReq.requested_value);

  // 3. Security Check: Can the employee self-approve the request?
  console.log('\n3. Security Check: Can Employee self-approve their own request?');
  const { data: selfApproveData, error: selfApproveErr } = await empClient
    .from('profile_change_requests')
    .update({ status: 'approved' })
    .eq('id', submittedReq.id)
    .select();

  console.log('   Self-approve attempt result:', {
    rowsUpdated: selfApproveData?.length ?? 0,
    error: selfApproveErr?.message || 'RLS returned 0 rows updated (Blocked)'
  });
  if ((selfApproveData?.length ?? 0) === 0) {
    console.log('✅ PASS: Employee CANNOT self-approve profile change requests (Enforced by RLS)!');
  } else {
    console.error('❌ SECURITY FAILURE: Employee was able to approve their own request!');
  }

  // 4. HR Login (Priyanka)
  console.log('\n4. Logging in as HR Manager (Priyanka)...');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw hrAuthErr;
  console.log('   HR Auth UID:', hrAuth.user.id);

  // Get HR employee dbId
  const { data: hrRecord } = await hrClient.from('employees').select('id, name').eq('user_id', hrAuth.user.id).single();
  console.log('   HR Employee DB ID:', hrRecord?.id);

  // HR reviews and finds the pending request
  const { data: pendingRequests, error: hrFetchErr } = await hrClient
    .from('profile_change_requests')
    .select('*')
    .eq('id', submittedReq.id);

  console.log('   HR fetched submitted request:', pendingRequests?.length === 1 ? '✅ Found' : '❌ Not Found');

  // 5. HR Approves the Request
  console.log('\n5. HR Approving Request and Updating Database...');
  const nowIso = new Date().toISOString();
  const { error: hrApproveErr } = await hrClient
    .from('profile_change_requests')
    .update({
      status: 'approved',
      reviewed_by: hrRecord?.id,
      reviewed_at: nowIso,
      hr_comment: 'Approved after verification.'
    })
    .eq('id', submittedReq.id);

  if (hrApproveErr) {
    console.error('❌ HR approval failed:', hrApproveErr);
  } else {
    console.log('✅ HR marked profile_change_requests as approved in Supabase!');
  }

  // 6. Update Emergency Contacts record
  console.log('\n6. Checking/Creating Emergency Contact record in public.emergency_contacts...');
  const { data: existingEc } = await hrClient
    .from('emergency_contacts')
    .select('*')
    .eq('employee_id', empRecord.id)
    .maybeSingle();

  if (existingEc) {
    const { error: ecUpErr } = await hrClient
      .from('emergency_contacts')
      .update({ name: submittedReq.requested_value })
      .eq('id', existingEc.id);
    console.log('   Updated existing emergency contact:', ecUpErr ? ecUpErr.message : '✅ Success');
  } else {
    const { data: newEc, error: ecInsErr } = await hrClient
      .from('emergency_contacts')
      .insert({
        employee_id: empRecord.id,
        name: submittedReq.requested_value,
        relationship: 'Father',
        phone: '+91 98765 12345',
        is_primary: true
      })
      .select()
      .single();
    console.log('   Created new emergency contact in Supabase:', ecInsErr ? ecInsErr.message : '✅ Success', newEc);
  }

  // 7. Verify from Employee session (persists after re-fetch)
  console.log('\n7. Verifying Emergency Contact from Employee Session...');
  const { data: empVisibleEc, error: empEcErr } = await empClient
    .from('emergency_contacts')
    .select('id, employee_id, name, relationship, phone, is_primary')
    .eq('employee_id', empRecord.id);

  console.log('   Employee emergency contacts visible:', empVisibleEc);
  if (empVisibleEc?.length > 0 && empVisibleEc[0].name === 'Srinivas Raj') {
    console.log('✅ PASS: Emergency contact is stored in Supabase public.emergency_contacts and visible to Employee!');
  } else {
    console.error('❌ FAILURE: Emergency contact not found or name does not match');
  }

  // 8. Verify Employee cannot see HR review private data of others
  const { data: updatedReqForEmp } = await empClient
    .from('profile_change_requests')
    .select('id, status, reviewed_at, hr_comment')
    .eq('id', submittedReq.id)
    .single();

  console.log('   Employee views their approved request:', updatedReqForEmp);
  console.log('\n===========================================================');
  console.log('               LIFECYCLE TEST COMPLETED                    ');
  console.log('===========================================================');
}

testLifecycle().catch(console.error);
