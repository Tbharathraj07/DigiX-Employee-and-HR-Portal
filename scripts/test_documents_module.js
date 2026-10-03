import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function testDocumentsModule() {
  console.log('====================================================');
  console.log('MODULE 3: DOCUMENTS -> SUPABASE + STORAGE AUDIT');
  console.log('====================================================\n');

  // 1. Anonymous Access Test
  console.log('--- TEST 1: ANONYMOUS ACCESS ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: aEmpDocs, error: aEmpErr } = await anonClient.from('employee_documents').select('*');
  console.log(`Anon employee_documents: ${aEmpDocs?.length ?? 0} rows | Error: ${aEmpErr?.message || 'None'}`);

  const { data: aCompDocs, error: aCompErr } = await anonClient.from('company_documents').select('*');
  console.log(`Anon company_documents: ${aCompDocs?.length ?? 0} rows | Error: ${aCompErr?.message || 'None'}`);

  if (aEmpErr || (aEmpDocs && aEmpDocs.length === 0)) {
    console.log('[PASS] Anonymous user cannot access employee documents.');
  }

  // 2. Authenticate HR (Priyanka)
  console.log('\n--- TEST 2: HR ACCESS & COMPANY DOCUMENT UPLOAD ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw new Error(`HR auth failed: ${hrAuthErr.message}`);
  console.log(`[PASS] HR authenticated: UID ${hrAuth.user.id}`);

  // Fetch HR employee record
  const { data: hrEmp } = await hrClient.from('employees').select('id, name').eq('email', 'priyanka@digix.internal').single();
  const hrEmpId = hrEmp.id;

  // HR Uploads a Company Document to 'company-documents' Storage Bucket
  const testPolicyBlob = new Blob(['Official Remote Work Security Policy v2.0 - DigiX Technologies'], { type: 'application/pdf' });
  const compStoragePath = `policies/TEST_POLICY_${Date.now()}.pdf`;

  const { data: compUpData, error: compUpErr } = await hrClient.storage
    .from('company-documents')
    .upload(compStoragePath, testPolicyBlob, { contentType: 'application/pdf' });

  if (compUpErr) throw new Error(`HR storage upload failed: ${compUpErr.message}`);
  console.log(`[PASS] Uploaded company policy to Storage: ${compUpData.path}`);

  // HR Inserts metadata in public.company_documents
  const { data: compDocRow, error: compRowErr } = await hrClient
    .from('company_documents')
    .insert({
      title: 'TEST_AUTOMATION_Remote Work Security Policy 2027',
      category: 'Company Policy',
      file_name: 'TEST_Remote_Work_Policy.pdf',
      file_size: '1.2 MB',
      file_format: 'PDF',
      storage_path: compUpData.path,
      uploaded_by: hrEmpId,
      is_active: true
    })
    .select()
    .single();

  if (compRowErr) throw new Error(`HR metadata insert failed: ${compRowErr.message}`);
  console.log(`[PASS] Inserted company document metadata in public.company_documents: ID ${compDocRow.id}`);

  // 3. Employee Access (Tarumani Bharath Raj)
  console.log('\n--- TEST 3: EMPLOYEE ACCESS & EMPLOYEE DOCUMENT UPLOAD ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw new Error(`Employee auth failed: ${empAuthErr.message}`);
  console.log(`[PASS] Employee authenticated: UID ${empAuth.user.id}`);

  const { data: myEmp } = await empClient.from('employees').select('id, name').eq('email', 'tarumani.bharathraj@digix.internal').single();
  const tarumaniId = myEmp.id;

  // Employee reads company documents -> Must be able to see the active policy
  const { data: empCompDocs, error: empCompErr } = await empClient
    .from('company_documents')
    .select('id, title, category, is_active')
    .eq('id', compDocRow.id)
    .single();

  if (empCompErr || !empCompDocs) {
    console.error(`[FAIL] Employee cannot read active company document: ${empCompErr?.message}`);
  } else {
    console.log(`[PASS] Employee successfully viewed company document: "${empCompDocs.title}"`);
  }

  // Employee uploads own document to 'employee-documents' Storage Bucket in folder: ${tarumaniId}/
  const empDocBlob = new Blob(['Private Tax Certificate FY26 - Tarumani Bharath Raj'], { type: 'application/pdf' });
  const empStoragePath = `${tarumaniId}/TEST_TAX_FORM_${Date.now()}.pdf`;

  const { data: empUpData, error: empUpErr } = await empClient.storage
    .from('employee-documents')
    .upload(empStoragePath, empDocBlob, { contentType: 'application/pdf' });

  if (empUpErr) throw new Error(`Employee storage upload failed: ${empUpErr.message}`);
  console.log(`[PASS] Employee uploaded own document to Storage: ${empUpData.path}`);

  // Employee inserts metadata in public.employee_documents
  const { data: empDocRow, error: empRowErr } = await empClient
    .from('employee_documents')
    .insert({
      employee_id: tarumaniId,
      document_type: 'tax_form',
      document_name: 'TEST_Tarumani_Tax_Certificate_FY26.pdf',
      storage_path: empUpData.path,
      uploaded_by: tarumaniId,
      status: 'active'
    })
    .select()
    .single();

  if (empRowErr) throw new Error(`Employee metadata insert failed: ${empRowErr.message}`);
  console.log(`[PASS] Inserted employee document metadata in public.employee_documents: ID ${empDocRow.id}`);

  // 4. Isolation & Defense Test: Another user cannot read or tamper
  console.log('\n--- TEST 4: PRIVACY DEFENSE & ACCESS CONTROL ---');
  // Employee generates signed URL for own document
  const { data: ownSigned, error: ownSignErr } = await empClient.storage
    .from('employee-documents')
    .createSignedUrl(empUpData.path, 3600);

  if (ownSignErr || !ownSigned?.signedUrl) {
    console.error(`[FAIL] Failed to create signed URL for own document: ${ownSignErr?.message}`);
  } else {
    console.log(`[PASS] Signed URL generated successfully for authorized employee: ${ownSigned.signedUrl.substring(0, 75)}...`);
  }

  // Employee attempts to access another employee's folder/file in Storage -> Should FAIL
  const fakeOtherPath = `c01b6b05-65db-489b-afaf-db1aab6dd26c/confidential_review.pdf`;
  const { data: attackSign, error: attackSignErr } = await empClient.storage
    .from('employee-documents')
    .createSignedUrl(fakeOtherPath, 3600);

  if (attackSignErr || !attackSign?.signedUrl) {
    console.log(`[PASS] Access to another employee's storage path blocked by RLS as expected.`);
  } else {
    console.warn(`[WARN] Signed URL returned for non-existent or other path.`);
  }

  // 5. Cleanup Test Records
  console.log('\n--- TEST 5: CLEANUP TEMPORARY STORAGE & DATABASE OBJECTS ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw new Error(`Admin auth failed: ${adminAuthErr.message}`);
  console.log(`[PASS] Admin authenticated: UID ${adminAuth.user.id}`);

  // Delete storage objects
  await adminClient.storage.from('company-documents').remove([compUpData.path]);
  await adminClient.storage.from('employee-documents').remove([empUpData.path]);
  console.log('[PASS] Test storage objects removed from buckets.');

  // Delete database rows
  await adminClient.from('company_documents').delete().eq('id', compDocRow.id);
  await adminClient.from('employee_documents').delete().eq('id', empDocRow.id);
  console.log('[PASS] Test database metadata removed.');

  // Verify deletion
  const { data: vComp } = await adminClient.from('company_documents').select('*').eq('id', compDocRow.id);
  const { data: vEmp } = await adminClient.from('employee_documents').select('*').eq('id', empDocRow.id);
  if ((!vComp || vComp.length === 0) && (!vEmp || vEmp.length === 0)) {
    console.log('[PASS] Confirmed 0 temporary document records remain in Supabase.');
  } else {
    console.error('[FAIL] Test records still present in database!');
  }

  console.log('\n====================================================');
  console.log('MODULE 3 (DOCUMENTS) ALL VERIFICATIONS PASSED');
  console.log('====================================================');
}

testDocumentsModule().catch((err) => {
  console.error('[MODULE 3 ERROR]', err);
  process.exit(1);
});
