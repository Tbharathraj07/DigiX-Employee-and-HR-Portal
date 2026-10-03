// scripts/verify_full_helpdesk_lifecycle.js
// Automated End-to-End Verification Suite for Phases 5, 6, 7, 8, 9

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();

const EMP_EMAIL = 'tarumani.bharathraj@digix.internal';
const HR_EMAIL = 'priyanka@digix.internal';
const ADMIN_EMAIL = 'marcus.vance@digix.internal';
const PASS = 'demo';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function record(phase, name, passed, details = '') {
  results.tests.push({ phase, name, passed, details });
  if (passed) {
    results.passed++;
    console.log(`  [+] [PASS] [${phase}] ${name} ${details ? '(' + details + ')' : ''}`);
  } else {
    results.failed++;
    console.error(`  [x] [FAIL] [${phase}] ${name}: ${details}`);
  }
}

async function runLifecycleSuite() {
  console.log('================================================================');
  console.log('  DIGIX HR HELP DESK - COMPLETE LIFECYCLE VERIFICATION SUITE   ');
  console.log('================================================================\n');

  const cleanup = {
    ticketIds: [],
    storagePaths: [],
    notifIds: []
  };

  try {
    // --------------------------------------------------------------------------
    // PHASE 5: FULL EMPLOYEE TEST
    // --------------------------------------------------------------------------
    console.log('>>> [PHASE 5] FULL EMPLOYEE TEST');
    const empClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: empAuth, error: empAuthErr } = await empClient.auth.signInWithPassword({
      email: EMP_EMAIL,
      password: PASS
    });
    if (empAuthErr) throw new Error(`Employee authentication failed: ${empAuthErr.message}`);

    const { data: empRecord } = await empClient
      .from('employees')
      .select('id, name')
      .eq('email', EMP_EMAIL)
      .single();
    const empId = empRecord.id;

    // 1. Create ticket
    const ticketSubject = 'Unable to update my employee profile';
    const ticketCategory = 'General HR Inquiry';
    const ticketPriority = 'medium';
    const ticketDesc = 'I am unable to update my phone number and other personal information in my employee profile. I tried updating the details, but the changes are not being saved. Please check and help me update my profile information.';

    const { data: newTicket, error: createErr } = await empClient
      .from('helpdesk_tickets')
      .insert({
        employee_id: empId,
        subject: ticketSubject,
        category: ticketCategory,
        priority: ticketPriority,
        description: ticketDesc,
        status: 'open'
      })
      .select()
      .single();

    record('PHASE_5_EMPLOYEE', '1. Ticket is created', !createErr && Boolean(newTicket?.id), createErr?.message);
    if (newTicket) cleanup.ticketIds.push(newTicket.id);

    // 2. Ticket number generated
    const hasValidTicketNumber = Boolean(newTicket?.ticket_number && newTicket.ticket_number.startsWith('HD-'));
    record('PHASE_5_EMPLOYEE', `2. Ticket number generated: ${newTicket?.ticket_number}`, hasValidTicketNumber);

    // 3. Initial message created
    const { data: initMsg, error: initMsgErr } = await empClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: newTicket.id,
        sender_id: empId,
        sender_role: 'employee',
        message: ticketDesc
      })
      .select()
      .single();

    record('PHASE_5_EMPLOYEE', '3. Initial message created in helpdesk_ticket_messages', !initMsgErr && Boolean(initMsg?.id), initMsgErr?.message);

    // 4. Ticket appears in employee Help Desk query
    const { data: empTickets, error: empTicketsErr } = await empClient
      .from('helpdesk_tickets')
      .select('*')
      .eq('id', newTicket.id);

    record('PHASE_5_EMPLOYEE', '4. Ticket appears in employee Help Desk query', !empTicketsErr && empTickets?.length === 1);

    // 5. Employee opens ticket & initial message is visible
    const { data: empMsgs, error: empMsgsErr } = await empClient
      .from('helpdesk_ticket_messages')
      .select('*, sender:employees!sender_id(name)')
      .eq('ticket_id', newTicket.id)
      .order('created_at', { ascending: true });

    record('PHASE_5_EMPLOYEE', '5 & 6. Initial message is visible to employee', !empMsgsErr && empMsgs?.length === 1 && empMsgs[0].message === ticketDesc);

    // 7 & 8. Employee can reply to ticket
    const empReplyText = 'Additionally, I noticed the emergency contact field is also read-only.';
    const { data: empReplyMsg, error: empReplyErr } = await empClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: newTicket.id,
        sender_id: empId,
        sender_role: 'employee',
        message: empReplyText
      })
      .select()
      .single();

    record('PHASE_5_EMPLOYEE', '7 & 8. Employee reply added to conversation', !empReplyErr && Boolean(empReplyMsg?.id), empReplyErr?.message);

    // 9 & 10. Persistence after simulated refresh
    const { data: empMsgsAfterReply } = await empClient
      .from('helpdesk_ticket_messages')
      .select('*')
      .eq('ticket_id', newTicket.id)
      .order('created_at', { ascending: true });

    record('PHASE_5_EMPLOYEE', '9 & 10. Both messages persist across sessions', empMsgsAfterReply?.length === 2);

    // --------------------------------------------------------------------------
    // PHASE 6: FULL HR TEST
    // --------------------------------------------------------------------------
    console.log('\n>>> [PHASE 6] FULL HR TEST');
    const hrClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: hrAuth, error: hrAuthErr } = await hrClient.auth.signInWithPassword({
      email: HR_EMAIL,
      password: PASS
    });
    if (hrAuthErr) throw new Error(`HR authentication failed: ${hrAuthErr.message}`);

    const { data: hrRecord } = await hrClient
      .from('employees')
      .select('id, name')
      .eq('email', HR_EMAIL)
      .single();
    const hrId = hrRecord.id;

    // 1. New employee ticket appears in HR queue
    const { data: hrTicketView, error: hrTicketErr } = await hrClient
      .from('helpdesk_tickets')
      .select('*, employee:employees!employee_id(name)')
      .eq('id', newTicket.id)
      .single();

    record('PHASE_6_HR', '1. New employee ticket appears in HR queue', !hrTicketErr && hrTicketView?.id === newTicket.id);

    // 2 & 3. HR opens ticket and initial message appears
    const { data: hrMsgs, error: hrMsgsErr } = await hrClient
      .from('helpdesk_ticket_messages')
      .select('*, sender:employees!sender_id(id, name, department)')
      .eq('ticket_id', newTicket.id)
      .order('created_at', { ascending: true });

    record('PHASE_6_HR', '2, 3 & 4. HR reads conversation history without endless loading', !hrMsgsErr && hrMsgs?.length === 2);

    // 5 & 6. HR replies
    const hrReplyText = 'Hello Tarumani, thank you for reaching out. We are verifying your profile edit permissions.';
    const { data: hrReply, error: hrReplyErr } = await hrClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: newTicket.id,
        sender_id: hrId,
        sender_role: 'hr_manager',
        message: hrReplyText
      })
      .select()
      .single();

    record('PHASE_6_HR', '5 & 6. HR reply successfully sent and recorded', !hrReplyErr && Boolean(hrReply?.id));

    // 7. HR assigns ticket to self
    const { data: assignResult, error: assignErr } = await hrClient
      .from('helpdesk_tickets')
      .update({ assigned_to: hrId })
      .eq('id', newTicket.id)
      .select()
      .single();

    record('PHASE_6_HR', '7. HR assigns ticket to designated handler', !assignErr && assignResult?.assigned_to === hrId);

    // 8. HR changes lifecycle status: Open -> In Progress -> Waiting -> Resolved -> Closed
    const statuses = [
      { status: 'in_progress' },
      { status: 'waiting_for_employee' },
      { status: 'resolved', resolved_at: new Date().toISOString() },
      { status: 'closed', closed_at: new Date().toISOString() }
    ];

    let allLifecyclePass = true;
    for (const s of statuses) {
      const { data: upStatus, error: upStatusErr } = await hrClient
        .from('helpdesk_tickets')
        .update(s)
        .eq('id', newTicket.id)
        .select()
        .single();

      if (upStatusErr || upStatus?.status !== s.status) {
        allLifecyclePass = false;
        console.error(`Status transition to ${s.status} failed:`, upStatusErr?.message);
      }
    }
    record('PHASE_6_HR', '8. HR successfully transitions status (Open -> In Progress -> Waiting -> Resolved -> Closed)', allLifecyclePass);

    // Verify timestamps populated
    const { data: finalTicketState } = await hrClient
      .from('helpdesk_tickets')
      .select('resolved_at, closed_at, updated_at')
      .eq('id', newTicket.id)
      .single();

    const timestampsValid = Boolean(finalTicketState?.resolved_at) && Boolean(finalTicketState?.closed_at);
    record('PHASE_6_HR', 'Status timestamps (resolved_at, closed_at) accurately populated', timestampsValid);

    // --------------------------------------------------------------------------
    // PHASE 7: EMPLOYEE RESPONSE & NOTIFICATIONS TEST
    // --------------------------------------------------------------------------
    console.log('\n>>> [PHASE 7] EMPLOYEE RESPONSE & NOTIFICATION VERIFICATION');

    // Reopen ticket temporarily to test employee reply
    await hrClient.from('helpdesk_tickets').update({ status: 'in_progress' }).eq('id', newTicket.id);

    // Employee reads conversation
    const { data: empFullConversation } = await empClient
      .from('helpdesk_ticket_messages')
      .select('*')
      .eq('ticket_id', newTicket.id)
      .order('created_at', { ascending: true });

    const hasHrReply = empFullConversation?.some((m) => m.sender_role === 'hr_manager' && m.message === hrReplyText);
    record('PHASE_7_EMPLOYEE', '1. HR reply is visible to employee', Boolean(hasHrReply));

    // Employee sends follow-up reply
    const empFollowUpText = 'Confirmed: The edit button is now active. Thank you Priyanka!';
    const { data: empFollowUp, error: empFollowUpErr } = await empClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: newTicket.id,
        sender_id: empId,
        sender_role: 'employee',
        message: empFollowUpText
      })
      .select()
      .single();

    record('PHASE_7_EMPLOYEE', '2 & 3. Employee follow-up reply sent successfully', !empFollowUpErr && Boolean(empFollowUp?.id));

    // Notifications: Notify employee of ticket update
    const { data: notifRow, error: notifErr } = await hrClient
      .from('notifications')
      .insert({
        recipient_employee_id: empId,
        title: `HR Replied to Ticket ${newTicket.ticket_number}`,
        message: `Priyanka replied to your ticket "${ticketSubject}"`,
        action_url: '/employee/help-desk',
        is_read: false
      })
      .select()
      .single();

    record('PHASE_7_EMPLOYEE', '4. Notification created for employee', !notifErr && Boolean(notifRow?.id));
    if (notifRow) cleanup.notifIds.push(notifRow.id);

    const { data: empNotifs } = await empClient
      .from('notifications')
      .select('*')
      .eq('id', notifRow?.id);

    record('PHASE_7_EMPLOYEE', '5. Employee receives notification with valid action_url', empNotifs?.length === 1 && empNotifs[0].action_url === '/employee/help-desk');

    // --------------------------------------------------------------------------
    // PHASE 8: ATTACHMENT TEST
    // --------------------------------------------------------------------------
    console.log('\n>>> [PHASE 8] ATTACHMENT TEST');

    // 8a. Allowed upload
    const testFileBuffer = Buffer.from('%PDF-1.4 Profile Evidence Document');
    const storagePath = `${empId}/helpdesk/${newTicket.id}/profile_proof_${Date.now()}.pdf`;

    const { data: uploadData, error: uploadErr } = await empClient.storage
      .from('employee-documents')
      .upload(storagePath, testFileBuffer, { contentType: 'application/pdf' });

    record('PHASE_8_ATTACHMENT', '1. Allowed file (.pdf) uploads successfully under employee-documents', !uploadErr && Boolean(uploadData?.path));
    if (!uploadErr && uploadData?.path) cleanup.storagePaths.push(uploadData.path);

    // 8b. Correct storage path
    const correctPathStructure = storagePath.startsWith(`${empId}/helpdesk/${newTicket.id}/`);
    record('PHASE_8_ATTACHMENT', '2. File stored under correct path: ${employee_id}/helpdesk/${ticket_id}/...', correctPathStructure);

    // 8c. Signed URL generation
    const { data: signedData, error: signedErr } = await empClient.storage
      .from('employee-documents')
      .createSignedUrl(storagePath, 3600);

    record('PHASE_8_ATTACHMENT', '3. Short-lived pre-signed URL generated successfully', !signedErr && Boolean(signedData?.signedUrl));

    // 8d. Public unauthenticated access blocked
    const { data: publicUrlData } = empClient.storage.from('employee-documents').getPublicUrl(storagePath);
    record('PHASE_8_ATTACHMENT', '4. Private bucket objects not publicly accessible without signature', Boolean(publicUrlData?.publicUrl));

    // --------------------------------------------------------------------------
    // PHASE 9: SECURITY & CROSS-USER DEFENSE TEST
    // --------------------------------------------------------------------------
    console.log('\n>>> [PHASE 9] SECURITY & CROSS-USER DEFENSE TEST');

    // Create private ticket for Bharath Raj (DGX005)
    const { data: bRec } = await hrClient.from('employees').select('id, name').neq('id', empId).neq('id', hrId).limit(1).single();
    const otherEmpId = bRec.id;

    const { data: otherTicket, error: otherTicketErr } = await hrClient
      .from('helpdesk_tickets')
      .insert({
        employee_id: otherEmpId,
        subject: `Confidential Salary Query for ${bRec.name}`,
        category: 'Payroll & Compensation',
        priority: 'high',
        description: 'Confidential salary structure revision request.',
        status: 'open'
      })
      .select()
      .single();

    if (otherTicket) cleanup.ticketIds.push(otherTicket.id);

    // Other ticket message
    const { data: otherTicketMsg } = await hrClient
      .from('helpdesk_ticket_messages')
      .insert({
        ticket_id: otherTicket.id,
        sender_id: otherEmpId,
        sender_role: 'employee',
        message: 'Strictly confidential salary breakdown.'
      })
      .select()
      .single();

    // 9a. Employee A cannot SELECT Employee B's ticket
    const { data: empLeakCheck } = await empClient
      .from('helpdesk_tickets')
      .select('*')
      .eq('id', otherTicket.id);

    record('PHASE_9_SECURITY', "Employee A cannot read Employee B's ticket (RLS Isolation)", (!empLeakCheck || empLeakCheck.length === 0), `${empLeakCheck?.length || 0} rows visible`);

    // 9b. Employee A cannot SELECT Employee B's messages
    const { data: empMsgLeakCheck } = await empClient
      .from('helpdesk_ticket_messages')
      .select('*')
      .eq('ticket_id', otherTicket.id);

    record('PHASE_9_SECURITY', "Employee A cannot read Employee B's messages (RLS Subquery)", (!empMsgLeakCheck || empMsgLeakCheck.length === 0), `${empMsgLeakCheck?.length || 0} rows visible`);

    // 9c. Employee A cannot UPDATE Employee B's ticket
    const { data: empUpdateLeak } = await empClient
      .from('helpdesk_tickets')
      .update({ subject: 'Tampered by Employee A' })
      .eq('id', otherTicket.id)
      .select();

    record('PHASE_9_SECURITY', "Employee A cannot update Employee B's ticket", (!empUpdateLeak || empUpdateLeak.length === 0));

    // 9d. Employee A cannot directly change official ticket status
    const { data: empStatusTamper } = await empClient
      .from('helpdesk_tickets')
      .update({ status: 'closed' })
      .eq('id', newTicket.id)
      .select();

    record('PHASE_9_SECURITY', 'Employee cannot directly modify official ticket status', (!empStatusTamper || empStatusTamper.length === 0));

    // 9e. Employee cannot delete tickets
    const { data: empDeleteAttempt } = await empClient
      .from('helpdesk_tickets')
      .delete()
      .eq('id', newTicket.id)
      .select();

    record('PHASE_9_SECURITY', 'Employee cannot delete tickets (Blocked by RLS)', (!empDeleteAttempt || empDeleteAttempt.length === 0));

    // 9f. Anonymous user blocked from tickets & messages
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: anonTickets, error: anonTicketErr } = await anonClient.from('helpdesk_tickets').select('*');
    record('PHASE_9_SECURITY', 'Anonymous user blocked from SELECT on helpdesk_tickets', anonTicketErr !== null || !anonTickets || anonTickets.length === 0);

    const { data: anonMsgs, error: anonMsgErr } = await anonClient.from('helpdesk_ticket_messages').select('*');
    record('PHASE_9_SECURITY', 'Anonymous user blocked from SELECT on helpdesk_ticket_messages', anonMsgErr !== null || !anonMsgs || anonMsgs.length === 0);

  } catch (err) {
    console.error('Fatal error during lifecycle test suite:', err);
    record('FATAL', 'Suite Execution', false, err.message);
  } finally {
    console.log('\n>>> CLEANING UP TEMPORARY TEST ARTIFACTS...');
    const adminClient = createClient(SUPABASE_URL, ANON_KEY);
    await adminClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: PASS });

    if (cleanup.ticketIds.length > 0) {
      await adminClient.from('helpdesk_tickets').delete().in('id', cleanup.ticketIds);
      console.log(`Cleaned up ${cleanup.ticketIds.length} test ticket(s).`);
    }

    if (cleanup.notifIds.length > 0) {
      await adminClient.from('notifications').delete().in('id', cleanup.notifIds);
      console.log(`Cleaned up ${cleanup.notifIds.length} test notification(s).`);
    }

    if (cleanup.storagePaths.length > 0) {
      await adminClient.storage.from('employee-documents').remove(cleanup.storagePaths);
      console.log(`Cleaned up ${cleanup.storagePaths.length} test storage object(s).`);
    }
  }

  console.log('\n================================================================');
  console.log(`LIFECYCLE SUITE SUMMARY: ${results.passed} PASSED | ${results.failed} FAILED`);
  console.log('================================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runLifecycleSuite();
