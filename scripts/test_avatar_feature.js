import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

function validateAvatarFile(fileName, mimeType, sizeBytes) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
    return { valid: false, error: 'Unsupported file format. Please upload a JPG, JPEG, PNG, or WEBP image.' };
  }
  if (mimeType && !ALLOWED_IMAGE_MIMES.includes(mimeType.toLowerCase())) {
    return { valid: false, error: 'Invalid image type detected. Please select a valid JPG, JPEG, PNG, or WEBP image.' };
  }
  if (sizeBytes > MAX_AVATAR_SIZE) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File size is ${sizeMb} MB, which exceeds the 5 MB limit. Please select an image under 5 MB.` };
  }
  return { valid: true };
}

async function runAvatarTests() {
  console.log('===============================================================');
  console.log('   DIGIX EMPLOYEE PROFILE PICTURE FEATURE VERIFICATION SUITE   ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function record(testName, isSuccess, details = '') {
    total++;
    if (isSuccess) passed++;
    const icon = isSuccess ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} [${testName}]: ${details}`);
  }

  // 1. Validation Tests
  console.log('--- 1. FILE PICKER & VALIDATION RULES ---');
  const testPdf = validateAvatarFile('document.pdf', 'application/pdf', 1024 * 500);
  record('Reject PDF file', !testPdf.valid && testPdf.error.includes('Unsupported file format'), testPdf.error);

  const testExe = validateAvatarFile('virus.exe', 'application/x-msdownload', 1024 * 100);
  record('Reject executable file', !testExe.valid, testExe.error);

  const testOversized = validateAvatarFile('large_photo.png', 'image/png', 6 * 1024 * 1024);
  record('Reject > 5MB image (6MB)', !testOversized.valid && testOversized.error.includes('exceeds the 5 MB limit'), testOversized.error);

  const testValidPng = validateAvatarFile('my_headshot.png', 'image/png', 1.2 * 1024 * 1024);
  record('Accept valid PNG under 5MB', testValidPng.valid, '1.2 MB PNG accepted');

  const testValidJpg = validateAvatarFile('headshot.jpg', 'image/jpeg', 2.5 * 1024 * 1024);
  record('Accept valid JPG under 5MB', testValidJpg.valid, '2.5 MB JPG accepted');

  const testValidWebp = validateAvatarFile('avatar.webp', 'image/webp', 800 * 1024);
  record('Accept valid WEBP under 5MB', testValidWebp.valid, '800 KB WEBP accepted');

  // 2. Storage & Security Tests
  console.log('\n--- 2. SUPABASE STORAGE RLS & ISOLATION ---');
  const client = createClient(SUPABASE_URL, ANON_KEY);

  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'tarumani.bharathraj@digix.internal',
    password: 'demo'
  });
  if (authErr) {
    console.error('Failed to log in as Tarumani:', authErr);
    return;
  }

  const { data: empRecord } = await client
    .from('employees')
    .select('id, employee_id, name, department, designation, email, profile_photo')
    .eq('user_id', auth.user.id)
    .single();

  const tarumaniEmpId = empRecord.id;
  const otherEmpId = '00000000-0000-0000-0000-000000000001';

  // Realistic sample PNG buffer (1x1 pixel)
  const dummyAvatar = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);

  const testFileName = `avatar_${Date.now()}.png`;
  const ownStoragePath = `${tarumaniEmpId}/avatars/${testFileName}`;

  // Test 2a: Tarumani uploads avatar to own employee folder
  const { data: ownUpload, error: ownUpErr } = await client.storage
    .from('employee-documents')
    .upload(ownStoragePath, dummyAvatar, {
      contentType: 'image/png',
      upsert: false
    });
  record('Employee upload to own folder', ownUpload !== null && !ownUpErr, `Path: ${ownStoragePath}`);

  // Test 2b: Tarumani attempts to upload to another employee's folder
  const crossStoragePath = `${otherEmpId}/avatars/malicious_${Date.now()}.png`;
  const { data: crossUpload, error: crossUpErr } = await client.storage
    .from('employee-documents')
    .upload(crossStoragePath, dummyAvatar, {
      contentType: 'image/png'
    });
  record('Cross-employee storage upload blocked', crossUpload === null && crossUpErr !== null, crossUpErr?.message);

  // Test 2c: Generate signed URL
  const { data: signData, error: signErr } = await client.storage
    .from('employee-documents')
    .createSignedUrl(ownStoragePath, 31536000);
  record('Generate 1-year signed URL', signData?.signedUrl !== null && !signErr, 'Signed URL successfully generated');

  // Test 2d: Verify signed URL HTTP response
  if (signData?.signedUrl) {
    const fetchResp = await fetch(signData.signedUrl);
    record('Access avatar via signed URL (HTTP 200)', fetchResp.status === 200, `Status: ${fetchResp.status} Content-Type: ${fetchResp.headers.get('content-type')}`);
  }

  // 3. Protected Fields Integrity Test
  console.log('\n--- 3. PROTECTED EMPLOYEE PROFILE FIELDS INTEGRITY ---');
  const { data: currentEmp } = await client
    .from('employees')
    .select('id, employee_id, name, department, designation, email')
    .eq('id', tarumaniEmpId)
    .single();

  record('Employee ID remains DGX003', currentEmp.employee_id === 'DGX003', currentEmp.employee_id);
  record('Name remains Tarumani Bharath Raj', currentEmp.name === 'Tarumani Bharath Raj', currentEmp.name);
  record('Department remains Technology', currentEmp.department === 'Technology', currentEmp.department);
  record('Designation remains unchanged', currentEmp.designation === 'Associate Software Developer', currentEmp.designation);
  record('Email remains unchanged', currentEmp.email === 'tarumani.bharathraj@digix.internal', currentEmp.email);

  // 4. Clean up test avatar safely with Marcus
  console.log('\n--- 4. CLEANUP TEST AVATAR ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  await adminClient.auth.signInWithPassword({ email: 'marcus.vance@digix.internal', password: 'demo' });
  const { data: cleanRes, error: cleanErr } = await adminClient.storage
    .from('employee-documents')
    .remove([ownStoragePath]);
  record('Safe test avatar cleanup', cleanRes?.length > 0 && !cleanErr, 'Cleaned up temporary test avatar');

  console.log('\n===============================================================');
  console.log(`               TEST RESULTS: ${passed} / ${total} PASSED              `);
  console.log('===============================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAvatarTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
