import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

async function verifyDocumentsIntegration() {
  console.log('================================================================');
  console.log('    DIGIX PORTAL - DOCUMENTS → SUPABASE + STORAGE VERIFICATION   ');
  console.log('================================================================\n');

  let allTestsPassed = true;

  // Track temporary test items for cleanup
  const cleanupTasks = {
    storageEmployee: [],
    storageCompany: [],
    dbEmployee: [],
    dbCompany: []
  };

  // --- TEST 1: Anonymous Access Security Test ---
  console.log('--- TEST 1: Anonymous Access Security Test ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 1a. Anon SELECT metadata
  const { data: anonEmpDocs, error: anonEmpErr } = await anonClient.from('employee_documents').select('*');
  const anonEmpBlocked = Boolean(anonEmpErr) || (!anonEmpDocs || anonEmpDocs.length === 0);
  console.log('Anon SELECT employee_documents:', anonEmpBlocked ? `✅ BLOCKED (${anonEmpErr?.message || '0 rows'})` : '❌ LEAKED');
  if (!anonEmpBlocked) allTestsPassed = false;

  const { data: anonCompDocs, error: anonCompErr } = await anonClient.from('company_documents').select('*');
  const anonCompBlocked = Boolean(anonCompErr) || (!anonCompDocs || anonCompDocs.length === 0);
  console.log('Anon SELECT company_documents:', anonCompBlocked ? `✅ BLOCKED (${anonCompErr?.message || '0 rows'})` : '❌ LEAKED');
  if (!anonCompBlocked) allTestsPassed = false;

  // 1b. Anon INSERT metadata
  const { data: anonEmpIns, error: anonEmpInsErr } = await anonClient.from('employee_documents').insert({
    employee_id: '31f16325-1f18-4cd9-afcb-43fc7400bbf0',
    document_type: 'tax_form',
    document_name: 'Hacked_Doc.pdf'
  }).select();
  const anonInsBlocked = Boolean(anonEmpInsErr) || (!anonEmpIns || anonEmpIns.length === 0);
  console.log('Anon INSERT employee_documents:', anonInsBlocked ? `✅ BLOCKED (${anonEmpInsErr?.message || 'RLS denied'})` : '❌ LEAKED');
  if (!anonInsBlocked) allTestsPassed = false;

  // 1c. Anon Storage Upload
  const dummyPdf = Buffer.from('%PDF-1.4 anon test pdf');
  const anonStorageUp = await anonClient.storage.from('employee-documents').upload('anon_test.pdf', dummyPdf, { contentType: 'application/pdf' });
  const anonStorageBlocked = Boolean(anonStorageUp.error);
  console.log('Anon Storage upload employee-documents:', anonStorageBlocked ? `✅ BLOCKED (${anonStorageUp.error?.message})` : '❌ LEAKED');
  if (!anonStorageBlocked) allTestsPassed = false;

  const anonCompStorageUp = await anonClient.storage.from('company-documents').upload('anon_policy.pdf', dummyPdf, { contentType: 'application/pdf' });
  const anonCompStorageBlocked = Boolean(anonCompStorageUp.error);
  console.log('Anon Storage upload company-documents:', anonCompStorageBlocked ? `✅ BLOCKED (${anonCompStorageUp.error?.message})` : '❌ LEAKED');
  if (!anonCompStorageBlocked) allTestsPassed = false;

  // --- Authenticate Real Accounts ---
  console.log('\n--- Authenticating Real Accounts ---');
  // Employee Tarumani
  const empClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (empAuthErr) throw new Error(`Emp login error: ${empAuthErr.message}`);
  const { data: empRecord } = await empClient.from('employees').select('id, name').eq('email', 'tarumani.bharathraj@digix.internal').single();
  const tarumaniEmpId = empRecord.id;
  console.log(`✅ Employee logged in: ${empRecord.name} (DB ID: ${tarumaniEmpId})`);

  // HR Priyanka
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
    email: 'priyanka@digix.internal',
    password: 'demo'
  });
  if (hrAuthErr) throw new Error(`HR login error: ${hrAuthErr.message}`);
  const { data: hrRecord } = await hrClient.from('employees').select('id, name').eq('email', 'priyanka@digix.internal').single();
  const priyankaEmpId = hrRecord.id;
  console.log(`✅ HR logged in: ${hrRecord.name} (DB ID: ${priyankaEmpId})`);

  // Admin Marcus
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'marcus.vance@digix.internal',
    password: 'demo'
  });
  if (adminAuthErr) throw new Error(`Admin login error: ${adminAuthErr.message}`);
  const { data: adminRecord } = await adminClient.from('employees').select('id, name').eq('email', 'marcus.vance@digix.internal').single();
  const marcusEmpId = adminRecord.id;
  console.log(`✅ Admin logged in: ${adminRecord.name} (DB ID: ${marcusEmpId})`);

  // Find another employee for isolation tests
  const { data: otherRecord } = await hrClient.from('employees').select('id, name').neq('id', tarumaniEmpId).neq('id', priyankaEmpId).limit(1).single();
  const otherEmpId = otherRecord.id;
  console.log(`Other employee for isolation tests: ${otherRecord.name} (DB ID: ${otherEmpId})`);

  // --- TEST 2: Company Documents Lifecycle (HR / Admin) ---
  console.log('\n--- TEST 2: Company Documents Lifecycle ---');
  const compDocTimestamp = Date.now();
  const testPolicyContent = Buffer.from('%PDF-1.4 DigiX Hybrid Work Policy 2026 Test Content');
  const compStoragePath = `policies/TEST_POLICY_${compDocTimestamp}.pdf`;

  // 2a. HR uploads to company-documents Storage bucket
  const { data: compUpData, error: compUpErr } = await hrClient.storage
    .from('company-documents')
    .upload(compStoragePath, testPolicyContent, { contentType: 'application/pdf' });

  if (compUpErr) {
    console.error('❌ HR company-documents storage upload failed:', compUpErr.message);
    allTestsPassed = false;
  } else {
    cleanupTasks.storageCompany.push(compStoragePath);
    console.log(`✅ HR uploaded company policy to Storage: ${compUpData.path}`);
  }

  // 2b. HR creates metadata in public.company_documents
  const { data: compDocRow, error: compDocErr } = await hrClient
    .from('company_documents')
    .insert({
      title: `TEST_COMPANY_POLICY_${compDocTimestamp}`,
      category: 'Company Policy',
      file_name: `TEST_POLICY_${compDocTimestamp}.pdf`,
      file_size: '1.2 MB',
      file_format: 'PDF',
      storage_path: compStoragePath,
      uploaded_by: priyankaEmpId,
      is_active: true
    })
    .select()
    .single();

  if (compDocErr) {
    console.error('❌ HR insert company_documents metadata failed:', compDocErr.message);
    allTestsPassed = false;
  } else {
    cleanupTasks.dbCompany.push(compDocRow.id);
    console.log(`✅ HR inserted company_documents metadata: ID ${compDocRow.id}`);
  }

  // 2c. Employee views the published company document
  const { data: empViewComp, error: empViewCompErr } = await empClient
    .from('company_documents')
    .select('*')
    .eq('id', compDocRow?.id)
    .single();

  const empCanViewComp = !empViewCompErr && empViewComp && empViewComp.id === compDocRow?.id;
  console.log('Employee views active company document:', empCanViewComp ? '✅ SUCCESS' : '❌ FAILED');
  if (!empCanViewComp) allTestsPassed = false;

  // 2d. Employee blocked from uploading into company-documents storage
  const empCompHackUp = await empClient.storage
    .from('company-documents')
    .upload(`policies/hack_${compDocTimestamp}.pdf`, testPolicyContent, { contentType: 'application/pdf' });
  const empCompUploadBlocked = Boolean(empCompHackUp.error);
  console.log('Employee blocked from uploading to company-documents storage:', empCompUploadBlocked ? `✅ BLOCKED (${empCompHackUp.error?.message})` : '❌ LEAKED');
  if (!empCompUploadBlocked) allTestsPassed = false;

  // 2e. Employee blocked from inserting metadata into public.company_documents
  const { data: empCompHackIns, error: empCompHackInsErr } = await empClient
    .from('company_documents')
    .insert({
      title: 'Hacked Policy',
      category: 'Company Policy',
      file_name: 'hack.pdf',
      storage_path: 'policies/hack.pdf',
      uploaded_by: tarumaniEmpId,
      is_active: true
    })
    .select();
  const empCompInsertBlocked = Boolean(empCompHackInsErr) || (!empCompHackIns || empCompHackIns.length === 0);
  console.log('Employee blocked from INSERT public.company_documents:', empCompInsertBlocked ? `✅ BLOCKED (${empCompHackInsErr?.message || 'RLS denied'})` : '❌ LEAKED');
  if (!empCompInsertBlocked) allTestsPassed = false;

  // 2f. Employee generates signed URL for active company document
  const { data: compSignedUrl, error: compSignedUrlErr } = await empClient.storage
    .from('company-documents')
    .createSignedUrl(compStoragePath, 3600);
  const compSignedUrlOk = !compSignedUrlErr && compSignedUrl?.signedUrl;
  console.log('Employee signed URL for active company document:', compSignedUrlOk ? '✅ SUCCESS (Secure URL generated)' : '❌ FAILED');
  if (!compSignedUrlOk) allTestsPassed = false;

  // --- TEST 3: Employee Documents Lifecycle ---
  console.log('\n--- TEST 3: Employee Personal Documents Lifecycle ---');
  const empDocTimestamp = Date.now();
  const testTaxContent = Buffer.from('%PDF-1.4 Confidential Form 16 Tax Certificate for Tarumani');
  const empStoragePath = `${tarumaniEmpId}/TEST_TAX_FORM_${empDocTimestamp}.pdf`;

  // 3a. Employee uploads to own storage directory: ${tarumaniEmpId}/...
  const { data: empUpData, error: empUpErr } = await empClient.storage
    .from('employee-documents')
    .upload(empStoragePath, testTaxContent, { contentType: 'application/pdf' });

  if (empUpErr) {
    console.error('❌ Employee storage upload failed:', empUpErr.message);
    allTestsPassed = false;
  } else {
    cleanupTasks.storageEmployee.push(empStoragePath);
    console.log(`✅ Employee uploaded personal document to Storage: ${empUpData.path}`);
  }

  // 3b. Employee inserts metadata in public.employee_documents
  const { data: empDocRow, error: empDocErr } = await empClient
    .from('employee_documents')
    .insert({
      employee_id: tarumaniEmpId,
      document_type: 'tax_form',
      document_name: `TEST_Tax_Certificate_FY26_${empDocTimestamp}.pdf`,
      storage_path: empStoragePath,
      uploaded_by: tarumaniEmpId,
      status: 'active'
    })
    .select()
    .single();

  if (empDocErr) {
    console.error('❌ Employee insert employee_documents failed:', empDocErr.message);
    allTestsPassed = false;
  } else {
    cleanupTasks.dbEmployee.push(empDocRow.id);
    console.log(`✅ Employee inserted employee_documents metadata: ID ${empDocRow.id}`);
  }

  // 3c. Employee generates signed URL for own document
  const { data: empSignedUrl, error: empSignedUrlErr } = await empClient.storage
    .from('employee-documents')
    .createSignedUrl(empStoragePath, 3600);
  const empSignedUrlOk = !empSignedUrlErr && empSignedUrl?.signedUrl;
  console.log('Employee generates signed URL for own document:', empSignedUrlOk ? '✅ SUCCESS' : '❌ FAILED');
  if (!empSignedUrlOk) allTestsPassed = false;

  // --- TEST 4: Cross-User Access Isolation & Security ---
  console.log('\n--- TEST 4: Cross-User Access Isolation & Security ---');

  // 4a. Create a private document for "other employee" via HR
  const otherStoragePath = `${otherEmpId}/TEST_OTHER_DOC_${empDocTimestamp}.pdf`;
  const otherContent = Buffer.from('%PDF-1.4 Confidential Performance Review for Other Employee');

  const { data: otherUpData, error: otherUpErr } = await hrClient.storage
    .from('employee-documents')
    .upload(otherStoragePath, otherContent, { contentType: 'application/pdf' });

  if (otherUpErr) {
    console.error('❌ HR upload other employee document failed:', otherUpErr.message);
    allTestsPassed = false;
  } else {
    cleanupTasks.storageEmployee.push(otherStoragePath);
  }

  const { data: otherDocRow, error: otherDocRowErr } = await hrClient
    .from('employee_documents')
    .insert({
      employee_id: otherEmpId,
      document_type: 'contract',
      document_name: `TEST_Confidential_Contract_${empDocTimestamp}.pdf`,
      storage_path: otherStoragePath,
      uploaded_by: priyankaEmpId,
      status: 'active'
    })
    .select()
    .single();

  if (otherDocRowErr) {
    console.error('❌ HR insert other doc metadata failed:', otherDocRowErr.message);
    allTestsPassed = false;
  } else {
    cleanupTasks.dbEmployee.push(otherDocRow.id);
  }

  // 4b. Tarumani queries employee_documents: Must NOT see other employee's document
  const { data: tarumaniAllDocs } = await empClient.from('employee_documents').select('*');
  const tarumaniCanSeeOwn = tarumaniAllDocs.some(d => d.id === empDocRow?.id);
  const tarumaniCanSeeOther = tarumaniAllDocs.some(d => d.id === otherDocRow?.id);

  console.log('Tarumani sees own document metadata:', tarumaniCanSeeOwn ? '✅ YES' : '❌ NO');
  console.log('Tarumani ISOLATED from other employee metadata:', !tarumaniCanSeeOther ? '✅ YES (Hidden by RLS)' : '❌ LEAKED');
  if (!tarumaniCanSeeOwn || tarumaniCanSeeOther) allTestsPassed = false;

  // 4c. Tarumani attempts to upload to other employee's storage folder
  const tarumaniOtherFolderUp = await empClient.storage
    .from('employee-documents')
    .upload(`${otherEmpId}/attack_${empDocTimestamp}.pdf`, testTaxContent, { contentType: 'application/pdf' });
  const tarumaniUploadOtherBlocked = Boolean(tarumaniOtherFolderUp.error);
  console.log("Tarumani blocked from uploading into other employee's folder:", tarumaniUploadOtherBlocked ? `✅ BLOCKED (${tarumaniOtherFolderUp.error?.message})` : '❌ LEAKED');
  if (!tarumaniUploadOtherBlocked) allTestsPassed = false;

  // 4d. Tarumani attempts to delete other employee's document metadata
  const { data: hackDel, error: hackDelErr } = await empClient
    .from('employee_documents')
    .delete()
    .eq('id', otherDocRow?.id)
    .select();
  const hackDelBlocked = Boolean(hackDelErr) || (!hackDel || hackDel.length === 0);
  console.log("Tarumani blocked from deleting other employee's document:", hackDelBlocked ? '✅ BLOCKED (0 rows affected)' : '❌ LEAKED');
  if (!hackDelBlocked) allTestsPassed = false;

  // 4e. HR Priyanka queries all employee documents: HR can see both
  const { data: hrAllDocs } = await hrClient.from('employee_documents').select('*');
  const hrSeesTarumani = hrAllDocs.some(d => d.id === empDocRow?.id);
  const hrSeesOther = hrAllDocs.some(d => d.id === otherDocRow?.id);
  console.log('HR Priyanka can view Tarumani document:', hrSeesTarumani ? '✅ YES' : '❌ NO');
  console.log('HR Priyanka can view other employee document:', hrSeesOther ? '✅ YES' : '❌ NO');
  if (!hrSeesTarumani || !hrSeesOther) allTestsPassed = false;

  // 4f. Admin Marcus queries all employee documents: Admin has full access
  const { data: adminAllDocs } = await adminClient.from('employee_documents').select('*');
  const adminSeesBoth = adminAllDocs.some(d => d.id === empDocRow?.id) && adminAllDocs.some(d => d.id === otherDocRow?.id);
  console.log('Admin Marcus has full access to all documents:', adminSeesBoth ? '✅ YES' : '❌ NO');
  if (!adminSeesBoth) allTestsPassed = false;

  // --- TEST 5: Persistence Across Logout / Login ---
  console.log('\n--- TEST 5: Persistence Across Logout & Re-authentication ---');
  const reauthClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: reauthEmp, error: reauthErr } = await reauthClient.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (reauthErr) throw new Error(`Reauth failed: ${reauthErr.message}`);

  const { data: reauthDoc, error: reauthDocErr } = await reauthClient
    .from('employee_documents')
    .select('*')
    .eq('id', empDocRow?.id)
    .single();

  const persistedOk = !reauthDocErr && reauthDoc && reauthDoc.id === empDocRow?.id;
  console.log('Document metadata persisted across fresh session:', persistedOk ? '✅ PERSISTED' : '❌ LOST');
  if (!persistedOk) allTestsPassed = false;

  // --- TEST 6: Cleanup Test Data (Database + Storage) ---
  console.log('\n--- TEST 6: Cleanup Temporary Test Data ---');
  // 6a. Delete storage objects
  if (cleanupTasks.storageCompany.length > 0) {
    const { error: remCompErr } = await adminClient.storage.from('company-documents').remove(cleanupTasks.storageCompany);
    console.log(`Cleaned up ${cleanupTasks.storageCompany.length} company-documents storage file(s):`, remCompErr ? `❌ ${remCompErr.message}` : '✅ OK');
    if (remCompErr) allTestsPassed = false;
  }

  if (cleanupTasks.storageEmployee.length > 0) {
    const { error: remEmpErr } = await adminClient.storage.from('employee-documents').remove(cleanupTasks.storageEmployee);
    console.log(`Cleaned up ${cleanupTasks.storageEmployee.length} employee-documents storage file(s):`, remEmpErr ? `❌ ${remEmpErr.message}` : '✅ OK');
    if (remEmpErr) allTestsPassed = false;
  }

  // 6b. Delete database rows
  if (cleanupTasks.dbCompany.length > 0) {
    const { error: delCompErr } = await adminClient.from('company_documents').delete().in('id', cleanupTasks.dbCompany);
    console.log(`Cleaned up ${cleanupTasks.dbCompany.length} company_documents row(s):`, delCompErr ? `❌ ${delCompErr.message}` : '✅ OK');
    if (delCompErr) allTestsPassed = false;
  }

  if (cleanupTasks.dbEmployee.length > 0) {
    const { error: delEmpErr } = await adminClient.from('employee_documents').delete().in('id', cleanupTasks.dbEmployee);
    console.log(`Cleaned up ${cleanupTasks.dbEmployee.length} employee_documents row(s):`, delEmpErr ? `❌ ${delEmpErr.message}` : '✅ OK');
    if (delEmpErr) allTestsPassed = false;
  }

  // 6c. Verify both database and storage are completely clean of test records
  const { data: vCompRows } = await adminClient.from('company_documents').select('id').in('id', cleanupTasks.dbCompany);
  const { data: vEmpRows } = await adminClient.from('employee_documents').select('id').in('id', cleanupTasks.dbEmployee);
  const verifyDbClean = (!vCompRows || vCompRows.length === 0) && (!vEmpRows || vEmpRows.length === 0);
  console.log('Verified 0 test document records remain in database:', verifyDbClean ? '✅ 100% CLEAN' : '❌ LEAKED ROWS');
  if (!verifyDbClean) allTestsPassed = false;

  // --- TEST 7: Previous Modules Regression Checks ---
  console.log('\n--- TEST 7: Previous Modules Regression Checks ---');
  // Announcements
  const { data: annCheck, error: annCheckErr } = await empClient.from('announcements').select('*');
  const annOk = !annCheckErr && Array.isArray(annCheck);
  console.log('Module 1 (Announcements) status:', annOk ? '✅ FUNCTIONAL' : `❌ ERROR (${annCheckErr?.message})`);
  if (!annOk) allTestsPassed = false;

  // Notifications
  const { data: notifCheck, error: notifCheckErr } = await empClient.from('notifications').select('*');
  const notifOk = !notifCheckErr && Array.isArray(notifCheck);
  console.log('Module 2 (Notifications) status:', notifOk ? '✅ FUNCTIONAL' : `❌ ERROR (${notifCheckErr?.message})`);
  if (!notifOk) allTestsPassed = false;

  // --- Summary ---
  console.log('\n================================================================');
  if (allTestsPassed) {
    console.log('🎉 ALL DOCUMENTS → SUPABASE + STORAGE TESTS PASSED!');
  } else {
    console.log('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('================================================================\n');

  if (!allTestsPassed) {
    process.exit(1);
  }
}

verifyDocumentsIntegration().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
