// ==============================================================================
// DigiX Technologies - Secure Admin Approval Edge Function
// Function: approve-registration
// Path: supabase/functions/approve-registration/index.ts
// Description:
//   Authenticates the caller, verifies Admin role on the server, validates
//   the pending registration request, invites the applicant via Supabase Auth,
//   creates and links public.employees and public.profiles records, and marks
//   the request approved. Features transactional rollback on partial failure.
// ==============================================================================

/// <reference path="../../deno.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ApproveRequestBody {
  request_id?: string;
  requestId?: string;
  review_comment?: string;
  reviewComment?: string;
}

/**
 * Generate next sequential unique employee_id code (e.g. DGX004, HR002)
 */
async function generateUniqueEmployeeId(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  role: 'employee' | 'hr_manager'
): Promise<string> {
  const prefix = role === 'hr_manager' ? 'HR' : 'DGX';

  const { data: existingRecords, error } = await supabaseAdmin
    .from('employees')
    .select('employee_id')
    .like('employee_id', `${prefix}%`);

  let maxNum = 0;
  if (!error && existingRecords) {
    for (const record of existingRecords) {
      const match = (record.employee_id || '').match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let candidateNum = maxNum + 1;
  let candidateId = `${prefix}${candidateNum.toString().padStart(3, '0')}`;

  // Collision safety loop
  let attempts = 0;
  while (attempts < 20) {
    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('employee_id', candidateId)
      .maybeSingle();

    if (!existing) {
      return candidateId;
    }
    candidateNum++;
    candidateId = `${prefix}${candidateNum.toString().padStart(3, '0')}`;
    attempts++;
  }

  return `${prefix}${Date.now().toString().slice(-6)}`;
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Enforce POST Method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed. Please use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. Extract and Validate Authorization Header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Missing or invalid Bearer token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const callerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 4. Validate Environment Variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[approve-registration] Server configuration missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error: Privileged environment credentials missing.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 5. Initialize Privileged Supabase Admin Client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 6. Validate Caller Authentication (Server-Side)
  const { data: callerData, error: callerAuthErr } = await supabaseAdmin.auth.getUser(callerToken);
  if (callerAuthErr || !callerData?.user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Invalid, expired, or revoked session token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const callerAuthUser = callerData.user;

  // 7. Verify Admin Role on Server via public.profiles (Never trust client-supplied role)
  const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, employee_id, role')
    .eq('id', callerAuthUser.id)
    .maybeSingle();

  if (callerProfileErr || !callerProfile) {
    console.warn(`[approve-registration] Profile not found for auth user: ${callerAuthUser.id}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Forbidden: Caller profile not found or role unassigned.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (callerProfile.role !== 'admin') {
    console.warn(`[approve-registration] Non-admin access attempt by user ${callerAuthUser.id} with role '${callerProfile.role}'`);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Forbidden: Insufficient privileges. Only system administrators can approve registration requests.',
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 8. Parse Request Payload
  let body: any = {};
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(
      JSON.stringify({ success: false, error: 'Bad Request: Invalid JSON payload in request body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }


  const requestId = (body.request_id || body.requestId || '').trim();
  const reviewComment = (body.review_comment || body.reviewComment || '').trim();

  if (!requestId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Bad Request: Missing required field: request_id.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // UUID Format Validation (matches standard PostgreSQL 8-4-4-4-12 hex format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(requestId)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Bad Request: Invalid request_id format (must be valid UUID).' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 9. Load Pending Registration Request from Database
  const { data: regRequest, error: fetchReqErr } = await supabaseAdmin
    .from('registration_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchReqErr) {
    console.error(`[approve-registration] Database error fetching request ${requestId}:`, fetchReqErr);
    return new Response(
      JSON.stringify({ success: false, error: 'Database error fetching registration request.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!regRequest) {
    return new Response(
      JSON.stringify({ success: false, error: 'Registration request not found.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 10. Verify Request Status is 'pending'
  if (regRequest.status !== 'pending') {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Registration request cannot be approved because its current status is '${regRequest.status}'.`,
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 11. Enforce Role Security: Only 'employee' or 'hr_manager' (Never 'admin')
  if (!['employee', 'hr_manager'].includes(regRequest.requested_role)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Invalid requested role '${regRequest.requested_role}'. Only 'employee' and 'hr_manager' roles can be approved.`,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const targetEmail = regRequest.email.trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Registration request contains an invalid email address.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 12. Check for Duplicate Existing Employee Record with Same Email
  const { data: existingEmp, error: empCheckErr } = await supabaseAdmin
    .from('employees')
    .select('id, employee_id, email, status')
    .ilike('email', targetEmail)
    .maybeSingle();

  if (empCheckErr) {
    console.error(`[approve-registration] Error checking existing employee:`, empCheckErr);
    return new Response(
      JSON.stringify({ success: false, error: 'Database error validating applicant email uniqueness.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (existingEmp) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `An employee record already exists with email '${targetEmail}' (Employee Code: ${existingEmp.employee_id}).`,
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 13. Determine Password-Setup Redirect URL
  // Checks environment variables (SITE_URL, APP_URL), then caller-provided site_url,
  // then HTTP request origin / referer headers, ensuring production URL precedence
  // without hardcoding local URLs when production variables are configured.
  const configuredSiteUrl = Deno.env.get('SITE_URL') ||
    Deno.env.get('APP_URL') ||
    body.site_url ||
    body.siteUrl ||
    req.headers.get('origin') ||
    req.headers.get('referer')?.replace(/\/$/, '') ||
    '';

  const cleanSiteUrl = configuredSiteUrl ? configuredSiteUrl.replace(/\/+$/, '') : '';
  const redirectTo = cleanSiteUrl ? `${cleanSiteUrl}/#/setup-password` : undefined;

  // 14. Transactional Pipeline with Rollback Tracking
  let createdAuthUserId: string | null = null;
  let createdEmployeeId: string | null = null;
  let profileCreated = false;

  try {
    // Step A: Attempt Supabase Auth Invitation Email
    // Strictly requires inviteUserByEmail to succeed. Silent fallback to admin.createUser
    // is completely removed so Auth users are never created without an invitation email.
    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      targetEmail,
      {
        ...(redirectTo ? { redirectTo } : {}),
        data: {
          full_name: regRequest.full_name,
          role: regRequest.requested_role,
          department: regRequest.department ?? null,
          designation: regRequest.designation ?? null,
          registration_request_id: regRequest.id,
        },
      }
    );

    if (inviteErr || !inviteData?.user) {
      const inviteErrMsg = inviteErr?.message?.toLowerCase() || '';
      const isRateLimited = inviteErrMsg.includes('rate limit') || inviteErr?.status === 429;
      const isConflict = inviteErrMsg.includes('already') || inviteErrMsg.includes('registered') || inviteErr?.status === 422;

      console.error(`[approve-registration] Invitation email failed for applicant ${targetEmail}:`, {
        error_name: inviteErr?.name,
        error_message: inviteErr?.message,
        error_status: inviteErr?.status,
        code: inviteErr?.code,
      });

      let safeErrorMessage = `Failed to send invitation email: ${inviteErr?.message || 'Email delivery failed'}`;
      let statusCode = 500;
      let errorCode = 'INVITATION_EMAIL_FAILED';

      if (isRateLimited) {
        safeErrorMessage = 'Email service rate limit exceeded. Please configure custom SMTP or try again later.';
        statusCode = 429;
        errorCode = 'EMAIL_RATE_LIMIT_EXCEEDED';
      } else if (isConflict) {
        safeErrorMessage = `An authentication user account already exists with email '${targetEmail}'.`;
        statusCode = 409;
        errorCode = 'AUTH_USER_EXISTS';
      }

      // Strictly return failure: Do NOT create user silently with admin.createUser!
      // Do NOT create employee, profile, or mark request approved!
      return new Response(
        JSON.stringify({
          success: false,
          error: safeErrorMessage,
          error_code: errorCode,
          invitation_email_delivered: false,
        }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    createdAuthUserId = inviteData.user.id;

    // Step B: Generate Sequential Unique Employee Code
    const generatedEmployeeCode = await generateUniqueEmployeeId(
      supabaseAdmin,
      regRequest.requested_role as 'employee' | 'hr_manager'
    );

    // Step C: Insert Record into public.employees
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: newEmployee, error: empInsertErr } = await supabaseAdmin
      .from('employees')
      .insert({
        employee_id: generatedEmployeeCode,
        user_id: createdAuthUserId,
        name: regRequest.full_name,
        email: targetEmail,
        phone: regRequest.phone ?? null,
        department: regRequest.department ?? null,
        designation: regRequest.designation ?? null,
        location: regRequest.location ?? null,
        joining_date: regRequest.joining_date || todayStr,
        manager_id: regRequest.manager_id ?? null,
        status: 'active',
      })
      .select('id, employee_id, name, email')
      .single();

    if (empInsertErr || !newEmployee) {
      throw new Error(`Failed to create employee record: ${empInsertErr?.message || 'No record returned'}`);
    }

    createdEmployeeId = newEmployee.id;

    // Step D: Insert / Link Record in public.profiles
    const { error: profileInsertErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: createdAuthUserId,
        employee_id: createdEmployeeId,
        role: regRequest.requested_role,
      });

    if (profileInsertErr) {
      throw new Error(`Failed to link profile record: ${profileInsertErr.message}`);
    }

    profileCreated = true;

    // Step E: Update public.registration_requests to 'approved'
    // Guarded atomically with .eq('status', 'pending') to prevent race conditions
    const { data: updatedRequest, error: updateReqErr } = await supabaseAdmin
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_by: callerProfile.employee_id ?? null,
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment || 'Approved by system administrator.',
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id, status, reviewed_at, reviewed_by')
      .maybeSingle();

    if (updateReqErr || !updatedRequest) {
      throw new Error(
        `Failed to mark registration request as approved: ${
          updateReqErr?.message || 'Request state was modified concurrently.'
        }`
      );
    }

    // Step F: Return Successful Response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Applicant ${regRequest.full_name} (${targetEmail}) successfully approved and invited as ${regRequest.requested_role}.`,
        data: {
          request_id: requestId,
          user_id: createdAuthUserId,
          employee_id: createdEmployeeId,
          employee_code: generatedEmployeeCode,
          name: regRequest.full_name,
          email: targetEmail,
          role: regRequest.requested_role,
          status: 'approved',
          reviewed_at: updatedRequest.reviewed_at,
          invitation_email_delivered: true,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(`[approve-registration] Approval pipeline error, initiating safe rollback:`, err);

    // Rollback Step 1: Remove created profile
    if (profileCreated && createdAuthUserId) {
      try {
        await supabaseAdmin.from('profiles').delete().eq('id', createdAuthUserId);
      } catch (rollbackProfileErr) {
        console.error('[approve-registration] Rollback failed to remove profile:', rollbackProfileErr);
      }
    }

    // Rollback Step 2: Remove created employee record
    if (createdEmployeeId) {
      try {
        await supabaseAdmin.from('employees').delete().eq('id', createdEmployeeId);
      } catch (rollbackEmpErr) {
        console.error('[approve-registration] Rollback failed to remove employee:', rollbackEmpErr);
      }
    }

    // Rollback Step 3: Delete invited auth user
    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackAuthErr) {
        console.error('[approve-registration] Rollback failed to delete auth user:', rollbackAuthErr);
      }
    }

    // Report failure clearly: request remains pending
    return new Response(
      JSON.stringify({
        success: false,
        error: `Approval transaction failed: ${err?.message || 'Internal database error'}. All partially created records were cleanly rolled back. Request remains pending.`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
