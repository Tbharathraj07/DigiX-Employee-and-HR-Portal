// ==============================================================================
// DigiX Technologies - HR Help Desk Comprehensive Integration & Security Test
// File: scripts/test_helpdesk_module.js
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

// Load .env.local safely
const envPath = path.resolve('.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((l) => {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq !== -1) {
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  });
}

const SUPABASE_URL = env['VITE_SUPABASE_URL'] || 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = env['VITE_SUPABASE_PUBLISHABLE_KEY'];

const EMP_EMAIL = 'tarumani.bharathraj@digix.internal';
const HR_EMAIL = 'priyanka@digix.internal';
const ADMIN_EMAIL = 'marcus.vance@digix.internal';
const PASS = 'demo';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function record(suite, name, passed, details = '') {
  const status = passed ? 'PASS' : 'FAIL';
  results.tests.push({ suite, name, passed, details });
  if (passed) {
    results.passed++;
    console.log(`  [+] [PASS] [${suite}] ${name} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.failed++;
    console.error(`  [x] [FAIL] [${suite}] ${name}: ${details}`);
  }
}

async function runHelpDeskTestSuite() {
  console.log('================================================================');
  console.log('  DIGIX PORTAL - HR HELP DESK INTEGRATION & SECURITY SUITE      ');
  console.log('================================================================\n');

  // Track created IDs for strict cleanup
  const cleanup = {
    ticketIds: [],
    storagePaths: [],
    notifIds: [],
    auditIds: []
  };

  try {
    // --------------------------------------------------------------------------
    // 1. ANONYMOUS ACCESS DEFENSE TESTS
    // --------------------------------------------------------------------------
    console.log('>>> [1/7] ANONYMOUS ACCESS SECURITY DEFENSE');
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);

    const { data: aTick, error: aTickErr } = await anonClient.from('helpdesk_tickets').select('*');
    record('ANON_DEFENSE', 'Anonymous SELECT on helpdesk_tickets is blocked', aTickErr !== null || !aTick || aTick.length === 0, aTickErr?.message);

    const { error: aTickInsErr } = await anonClient.from('helpdesk_tickets').insert({
      employee_id: '31f16325-1f18-4cd9-afcb-43fc7400bbf0',
      subject: 'Hacked ticket',
      category: 'Payroll & Compensation',
      priority: 'high',
      description: 'Unauthorized anonymous ticket insertion'
    });
    record('ANON_DEFENSE', 'Anonymous INSERT on helpdesk_tickets is blocked', aTickInsErr !== null, aTickInsErr?.message);

    const { data: aMsg, error: aMsgErr } = await anonClient.from('helpdesk_ticket_messages').select('*');
    record('ANON_DEFENSE', 'Anonymous SELECT on helpdesk_ticket_messages is blocked', aMsgErr !== null || !aMsg || aMsg.length === 0, aMsgErr?.message);

    const { error: aMsgInsErr } = await anonClient.from('helpdesk_ticket_messages').insert({
      ticket_id: '00000000-0000-0000-0000-000000000001',
      sender_role: 'employee',
      message: 'Hacked message'
    });
    record('ANON_DEFENSE', 'Anonymous INSERT on helpdesk_ticket_messages is blocked', aMsgInsErr !== null, aMsgInsErr?.message);

    // --------------------------------------------------------------------------
    // 2. AUTHENTICATE PERSONAS
    // --------------------------------------------------------------------------
    console.log('\n>>> [2/7] AUTHENTICATING PERSONAS');
    const empClient = createClient(SUPABASE_URL, ANON_KEY);
    const hrClient = createClient(SUPABASE_URL, ANON_KEY);
    const adminClient = createClient(SUPABASE_URL, ANON_KEY);

    const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({ email: EMP_EMAIL, password: PASS });
    if (empAuthErr) throw new Error(`Employee auth failed: ${empAuthErr.message}`);
    const { data: empRec } = await empClient.from('employees').select('id, name').eq('email', EMP_EMAIL).single();
    const empId = empRec.id;
    record('AUTH', `Employee authenticated: ${empRec.name} (UUID: ${empId})`, true);

    const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({ email: HR_EMAIL, password: PASS });
    if (hrAuthErr) throw new Error(`HR auth failed: ${hrAuthErr.message}`);
    const { data: hrRec } = await hrClient.from('employees').select('id, name').eq('email', HR_EMAIL).single();
    const hrId = hrRec.id;
    record('AUTH', `HR Manager authenticated: ${hrRec.name} (UUID: ${hrId})`, true);

    const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: PASS });
    if (adminAuthErr) throw new Error(`Admin auth failed: ${adminAuthErr.message}`);
    const { data: adminRec } = await adminClient.from('employees').select('id, name').eq('email', ADMIN_EMAIL).single();
    const adminId = adminRec.id;
    record('AUTH', `Admin authenticated: ${adminRec.name} (UUID: ${adminId})`, true);

    // Get an alternate employee ID for isolation tests
    const { data: otherRec } = await hrClient.from('employees').select('id, name, email')
      .neq('id', empId).neq('id', hrId).neq('id', adminId).limit(1).single();
    const otherEmpId = otherRec.id;
    record('AUTH', `Other Employee identified for cross-tenant test: ${otherRec.name} (UUID: ${otherEmpId})`, true);

    // --------------------------------------------------------------------------
    // 3. EMPLOYEE TICKET LIFECYCLE & STORAGE ATTACHMENT
    // --------------------------------------------------------------------------
    console.log('\n>>> [3/7] EMPLOYEE TICKET CREATION & PERMISSIONS');
    const testTimestamp = Date.now();
    const testSubject = `TEST_TICKET_Form 16 Tax Certificate Revision_${testTimestamp}`;
    const testDesc = 'Discrepancy in HRA exemption calculation for Q4 FY26. Please re-verify rent receipts.';

    // 3a. Storage Upload (Private Bucket: employee-documents)
    const testBlob = Buffer.from('%PDF-1.4 Official Confidential Tax Proof - Tarumani Bharath Raj');
    const storagePath = `${empId}/helpdesk/temp_${testTimestamp}/test_tax_proof_${testTimestamp}.pdf`;
    const { data: upData, error: upErr } = await empClient.storage
      .from('employee-documents')
      .upload(storagePath, testBlob, { contentType: 'application/pdf' });

    record('STORAGE', 'Employee uploads ticket attachment to employee-documents', !upErr && upData?.path, upErr?.message);
    if (!upErr && upData?.path) {
      cleanup.storagePaths.push(upData.path);
    }

    // 3b. Pre-signed URL generation
    const { data: signedUrlData, error: signErr } = await empClient.storage
      .from('employee-documents')
      .createSignedUrl(storagePath, 3600);
    record('STORAGE', 'Secure pre-signed download URL generated (1hr validity)', !signErr && Boolean(signedUrlData?.signedUrl), signErr?.message);

    // 3c. Insert Ticket into public.helpdesk_tickets
    const { data: ticketRow, error: ticketErr } = await empClient
      .from('helpdesk_tickets')
      .insert({
        employee_id: empId,
        subject: testSubject,
        category: 'Payroll & Compensation',
        priority: 'high',
        description: testDesc,
        status: 'open',
        initial_attachment_url: storagePath,
        initial_attachment_name: `test_tax_proof_${testTimestamp}.pdf`,
        initial_attachment_size: '420 KB'
      })
      .select()
      .single();

    record('EMPLOYEE', 'Employee creates Help Desk ticket in public.helpdesk_tickets', !ticketErr && Boolean(ticketRow?.id), ticketErr?.message);
    if (ticketRow) cleanup.ticketIds.push(ticketRow.id);

    // 3d. Verify automatic ticket number generation trigger
    const hasTicketNum = ticketRow?.ticket_number && ticketRow.ticket_number.startsWith('HD-');
    record('DATABASE', `Ticket number generated by trigger: ${ticketRow?.ticket_number}`, Boolean(hasTicketNum));

    // 3e. Insert initial message into public.helpdesk_ticket_messages
    const { data: msgRow, error: msgErr } = await empClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: ticketRow.id,
        sender_id: empId,
        sender_role: 'employee',
        message: testDesc,
        attachment_url: storagePath,
        attachment_name: `test_tax_proof_${testTimestamp}.pdf`,
        attachment_size: '420 KB'
      })
      .select()
      .single();

    record('EMPLOYEE', 'Initial message recorded in public.helpdesk_ticket_messages', !msgErr && Boolean(msgRow?.id), msgErr?.message);

    // 3f. Employee can reply to own ticket
    const replyText = 'Adding additional note: Landlord PAN was filed on Sep 15th.';
    const { data: empReply, error: empReplyErr } = await empClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: ticketRow.id,
        sender_id: empId,
        sender_role: 'employee',
        message: replyText
      })
      .select()
      .single();

    record('EMPLOYEE', 'Employee replies to own ticket', !empReplyErr && Boolean(empReply?.id), empReplyErr?.message);

    // 3g. Employee cannot directly modify ticket status (restricted to HR/Admin)
    const { data: empStatusUpdate, error: empStatusUpdateErr } = await empClient
      .from('helpdesk_tickets')
      .update({ status: 'resolved' })
      .eq('id', ticketRow.id)
      .select();

    const employeeUpdateBlocked = Boolean(empStatusUpdateErr) || (!empStatusUpdate || empStatusUpdate.length === 0);
    record('RLS_SECURITY', 'Employee direct status modification is blocked by RLS', employeeUpdateBlocked, empStatusUpdateErr?.message || '0 rows updated');

    // 3h. Employee cannot delete ticket (restricted to Admin only)
    const { data: empDel, error: empDelErr } = await empClient
      .from('helpdesk_tickets')
      .delete()
      .eq('id', ticketRow.id)
      .select();

    const employeeDelBlocked = Boolean(empDelErr) || (!empDel || empDel.length === 0);
    record('RLS_SECURITY', 'Employee DELETE on ticket is blocked by RLS', employeeDelBlocked, empDelErr?.message || '0 rows affected');

    // 3i. Employee cannot forge HR/Admin role message
    const { data: forgeMsg, error: forgeMsgErr } = await empClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: ticketRow.id,
        sender_id: empId,
        sender_role: 'hr_manager',
        message: 'Malicious forged HR message from employee'
      })
      .select();

    record('RLS_SECURITY', 'Employee cannot impersonate hr_manager sender_role', forgeMsgErr !== null || !forgeMsg || forgeMsg.length === 0, forgeMsgErr?.message);

    // --------------------------------------------------------------------------
    // 4. CROSS-USER ISOLATION DEFENSE
    // --------------------------------------------------------------------------
    console.log('\n>>> [4/7] CROSS-USER PRIVACY & TENANT ISOLATION');

    // Create a private ticket for "Other Employee" via HR
    const otherTicketSubject = `TEST_TICKET_Private Health Claim for ${otherRec.name}_${testTimestamp}`;
    const { data: otherTicketRow, error: otherTicketErr } = await hrClient
      .from('helpdesk_tickets')
      .insert({
        employee_id: otherEmpId,
        subject: otherTicketSubject,
        category: 'Benefits & Health',
        priority: 'medium',
        description: 'Private medical claim for dependent surgery',
        status: 'open'
      })
      .select()
      .single();

    if (otherTicketRow) cleanup.ticketIds.push(otherTicketRow.id);
    record('CROSS_USER', 'HR created private test ticket for Other Employee', !otherTicketErr && Boolean(otherTicketRow?.id));

    // Other Employee message
    const { data: otherMsgRow } = await hrClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: otherTicketRow.id,
        sender_id: otherEmpId,
        sender_role: 'employee',
        message: 'Confidential patient records attached'
      })
      .select()
      .single();

    // Test 4a: Employee A (Tarumani) attempts to SELECT Employee B's ticket
    const { data: empViewOtherTicket, error: empViewOtherTicketErr } = await empClient
      .from('helpdesk_tickets')
      .select('*')
      .eq('id', otherTicketRow.id);

    const otherTicketHidden = !empViewOtherTicket || empViewOtherTicket.length === 0;
    record('CROSS_USER', "Employee A CANNOT read Employee B's ticket (isolated by RLS)", otherTicketHidden, otherTicketHidden ? '0 rows visible' : 'LEAK DETECTED');

    // Test 4b: Employee A attempts to SELECT Employee B's messages
    const { data: empViewOtherMsgs, error: empViewOtherMsgsErr } = await empClient
      .from('helpdesk_ticket_messages')
      .select('*')
      .eq('ticket_id', otherTicketRow.id);

    const otherMsgsHidden = !empViewOtherMsgs || empViewOtherMsgs.length === 0;
    record('CROSS_USER', "Employee A CANNOT read Employee B's messages (isolated by RLS subquery)", otherMsgsHidden, otherMsgsHidden ? '0 rows visible' : 'LEAK DETECTED');

    // Test 4c: Employee A attempts to UPDATE Employee B's ticket
    const { data: empUpdateOther, error: empUpdateOtherErr } = await empClient
      .from('helpdesk_tickets')
      .update({ subject: 'Tampered by Employee A' })
      .eq('id', otherTicketRow.id)
      .select();

    const otherUpdateBlocked = Boolean(empUpdateOtherErr) || (!empUpdateOther || empUpdateOther.length === 0);
    record('CROSS_USER', "Employee A CANNOT update Employee B's ticket", otherUpdateBlocked, '0 rows affected');

    // Test 4d: Employee A attempts to INSERT a message into Employee B's ticket
    const { data: empInsertOtherMsg, error: empInsertOtherMsgErr } = await empClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: otherTicketRow.id,
        sender_id: empId,
        sender_role: 'employee',
        message: 'Intruder message into someone elses ticket'
      })
      .select();

    record('CROSS_USER', "Employee A CANNOT insert a message into Employee B's ticket", empInsertOtherMsgErr !== null || !empInsertOtherMsg || empInsertOtherMsg.length === 0, empInsertOtherMsgErr?.message);

    // --------------------------------------------------------------------------
    // 5. HR MANAGER TRIAGE, ASSIGNMENT & STATUS TRANSITIONS
    // --------------------------------------------------------------------------
    console.log('\n>>> [5/7] HR MANAGER WORKFLOW & TRIAGE');

    // 5a. HR can read employee ticket
    const { data: hrReadTickets, error: hrReadErr } = await hrClient
      .from('helpdesk_tickets')
      .select('*')
      .eq('id', ticketRow.id)
      .single();

    record('HR_WORKFLOW', 'HR can view employee ticket in organization queue', !hrReadErr && hrReadTickets?.id === ticketRow.id);

    // 5b. HR can reply to employee
    const hrReplyText = 'Hello Tarumani, I have checked with the tax desk. Your HRA revision is being processed.';
    const { data: hrReplyMsg, error: hrReplyErr } = await hrClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: ticketRow.id,
        sender_id: hrId,
        sender_role: 'hr_manager',
        message: hrReplyText
      })
      .select()
      .single();

    record('HR_WORKFLOW', 'HR sends official reply in ticket conversation', !hrReplyErr && Boolean(hrReplyMsg?.id), hrReplyErr?.message);

    // 5c. HR assigns ticket to self
    const { data: hrAssign, error: hrAssignErr } = await hrClient
      .from('helpdesk_tickets')
      .update({ assigned_to: hrId })
      .eq('id', ticketRow.id)
      .select()
      .single();

    record('HR_WORKFLOW', 'HR assigns ticket handler in public.helpdesk_tickets', !hrAssignErr && hrAssign?.assigned_to === hrId, hrAssignErr?.message);

    // 5d. HR tests every permitted status lifecycle transition:
    // in_progress -> waiting_for_employee -> resolved -> closed
    const statusCycle = ['in_progress', 'waiting_for_employee', 'resolved', 'closed'];
    let allStatusesPassed = true;

    for (const nextStatus of statusCycle) {
      const updatePayload = { status: nextStatus };
      if (nextStatus === 'resolved') updatePayload.resolved_at = new Date().toISOString();
      if (nextStatus === 'closed') updatePayload.closed_at = new Date().toISOString();

      const { data: stData, error: stErr } = await hrClient
        .from('helpdesk_tickets')
        .update(updatePayload)
        .eq('id', ticketRow.id)
        .select()
        .single();

      if (stErr || stData?.status !== nextStatus) {
        allStatusesPassed = false;
        console.error(`Status update to '${nextStatus}' failed:`, stErr?.message);
      }
    }
    record('HR_WORKFLOW', 'HR successfully transitions ticket through full lifecycle (Open -> In Progress -> Waiting -> Resolved -> Closed)', allStatusesPassed);

    // --------------------------------------------------------------------------
    // 6. NOTIFICATIONS & AUDIT LOGGING VERIFICATION
    // --------------------------------------------------------------------------
    console.log('\n>>> [6/7] NOTIFICATIONS & AUDIT LOGGING');

    // 6a. Notifications
    const { data: testNotif, error: notifErr } = await hrClient
      .from('notifications')
      .insert({
        recipient_employee_id: empId,
        title: `Ticket Status Updated: ${ticketRow.ticket_number}`,
        message: 'Your ticket has been marked as Resolved by HR Operations.',
        action_url: '/employee/help-desk',
        is_read: false
      })
      .select()
      .single();

    record('NOTIFICATIONS', 'Notification created for employee on ticket resolution', !notifErr && Boolean(testNotif?.id), notifErr?.message);
    if (testNotif) cleanup.notifIds.push(testNotif.id);

    // Employee reads the notification
    const { data: empNotifs } = await empClient
      .from('notifications')
      .select('*')
      .eq('id', testNotif?.id);
    record('NOTIFICATIONS', 'Employee successfully receives and views ticket notification', empNotifs && empNotifs.length === 1);

    // 6b. Audit Logs with Module = 'HelpDesk'
    const auditActions = ['TICKET_CREATED', 'TICKET_ASSIGNED', 'TICKET_STATUS_UPDATED', 'TICKET_MESSAGE_ADDED', 'TICKET_CLOSED'];
    let allAuditLogsPassed = true;

    for (const act of auditActions) {
      const { data: auditRow, error: auditErr } = await adminClient
        .from('audit_logs')
        .insert({
          actor_employee_id: hrId,
          actor_name: 'Priyanka (HR)',
          role: 'hr_manager',
          action: act,
          module: 'HelpDesk',
          status: 'Success',
          details: { ticket_id: ticketRow.id, ticket_number: ticketRow.ticket_number }
        })
        .select()
        .single();

      if (auditErr || !auditRow) {
        allAuditLogsPassed = false;
        console.error(`Audit insert for '${act}' failed:`, auditErr?.message);
      } else {
        cleanup.auditIds.push(auditRow.id);
      }
    }

    record('AUDIT_LOGS', 'Audit records created for all required HelpDesk lifecycle events (module=HelpDesk)', allAuditLogsPassed);

    // 6c. Verify HR can read HelpDesk audit logs
    const { data: hrAudits, error: hrAuditErr } = await hrClient
      .from('audit_logs')
      .select('*')
      .eq('module', 'HelpDesk')
      .limit(5);

    record('AUDIT_LOGS', 'HR can read HelpDesk module audit records under updated RLS policy', !hrAuditErr && hrAudits && hrAudits.length > 0, hrAuditErr?.message);

    // --------------------------------------------------------------------------
    // 7. SYSTEM ADMIN ORGANIZATIONAL VISIBILITY
    // --------------------------------------------------------------------------
    console.log('\n>>> [7/7] SYSTEM ADMIN OVERSIGHT & METRICS');

    const { data: adminAllTickets, error: adminAllTicketsErr } = await adminClient
      .from('helpdesk_tickets')
      .select('*');

    record('ADMIN', 'Admin has organization-wide visibility into all Help Desk tickets', !adminAllTicketsErr && adminAllTickets && adminAllTickets.length >= 2);

    const { data: adminAllMsgs, error: adminAllMsgsErr } = await adminClient
      .from('helpdesk_ticket_messages')
      .select('*');

    record('ADMIN', 'Admin has organization-wide visibility into all message histories', !adminAllMsgsErr && adminAllMsgs && adminAllMsgs.length >= 3);

  } catch (err) {
    console.error('Test Suite encountered fatal error:', err);
    record('FATAL', 'Test Suite Execution', false, err.message);
  } finally {
    // --------------------------------------------------------------------------
    // CLEANUP TEMPORARY TEST DATA (ZERO-REGRESSION GUARANTEE)
    // --------------------------------------------------------------------------
    console.log('\n>>> CLEANING UP TEMPORARY TEST ARTIFACTS...');
    const adminClean = createClient(SUPABASE_URL, ANON_KEY);
    await adminClean.auth.signInWithPassword({ email: ADMIN_EMAIL, password: PASS });

    if (cleanup.ticketIds.length > 0) {
      const { error: delTicketErr } = await adminClean
        .from('helpdesk_tickets')
        .delete()
        .in('id', cleanup.ticketIds);
      console.log(`Cleaned up ${cleanup.ticketIds.length} test ticket(s):`, delTicketErr ? delTicketErr.message : 'OK');
    }

    if (cleanup.notifIds.length > 0) {
      await adminClean.from('notifications').delete().in('id', cleanup.notifIds);
      console.log(`Cleaned up ${cleanup.notifIds.length} test notification(s).`);
    }

    if (cleanup.storagePaths.length > 0) {
      await adminClean.storage.from('employee-documents').remove(cleanup.storagePaths);
      console.log(`Cleaned up ${cleanup.storagePaths.length} test storage file(s).`);
    }

    console.log('\n================================================================');
    console.log(`TEST SUITE SUMMARY: ${results.passed} PASSED | ${results.failed} FAILED`);
    console.log('================================================================\n');

    if (results.failed > 0) {
      process.exit(1);
    }
  }
}

runHelpDeskTestSuite();
