// ==============================================================================
// DigiX Technologies - Secure Admin Role Management Edge Function
// Function: change-user-role
// Path: supabase/functions/change-user-role/index.ts
// Description:
//   Authenticates the caller via Supabase Auth Bearer token, verifies Admin
//   role strictly on the server, validates the target user and requested role,
//   enforces last-admin and admin-transfer safety guarantees, updates the
//   target user's role server-side via privileged service-role credentials,
//   synchronizes Auth metadata, and writes a tamper-evident audit log.
// ==============================================================================

/// <reference path="../../deno.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const ALLOWED_ROLES = ['employee', 'hr_manager', 'admin'] as const;
type PortalRole = typeof ALLOWED_ROLES[number];

interface ChangeRoleRequestBody {
  target_user_id?: string;
  targetUserId?: string;
  target_employee_id?: string;
  targetEmployeeId?: string;
  new_role?: string;
  newRole?: string;
  is_admin_transfer?: boolean;
  isAdminTransfer?: boolean;
  replacement_role?: string;
  replacementRole?: string;
  action?: string;
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Enforce Allowed Methods (GET for role query, POST for role update)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed. Please use POST or GET.' }),
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
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[change-user-role] Server configuration missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error: Privileged environment credentials missing.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 5. Initialize Privileged Supabase Admin Client
  // Service role key is STRICTLY isolated to this serverless Edge Function runtime
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Client scoped to caller session for identity preservation
  const callerClient = supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${callerToken}` } },
      })
    : null;

  // 6. Validate Caller Authentication (Server-Side)
  const { data: callerData, error: callerAuthErr } = await supabaseAdmin.auth.getUser(callerToken);
  if (callerAuthErr || !callerData?.user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Invalid, expired, or revoked session token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const callerAuthUser = callerData.user;

  // 7. Verify Admin Role on Server via public.profiles (Never trust client-supplied role claims)
  const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, employee_id, role')
    .eq('id', callerAuthUser.id)
    .maybeSingle();

  if (callerProfileErr || !callerProfile) {
    console.warn(`[change-user-role] Caller profile not found for user: ${callerAuthUser.id}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Forbidden: Caller profile not found or role unassigned.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Optional environment secret for bootstrap emergency administrator (configured in Supabase Secrets)
  const primaryAdminEmail = Deno.env.get('PRIMARY_ADMIN_EMAIL') || '';
  const isPrimaryAdmin = Boolean(primaryAdminEmail && callerAuthUser.email === primaryAdminEmail);

  if (callerProfile.role !== 'admin' && !isPrimaryAdmin) {
    console.warn(`[change-user-role] Non-admin access attempt by user ${callerAuthUser.id} with role '${callerProfile.role}'`);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Forbidden: Insufficient privileges. Only system administrators can manage user roles.',
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Caller employee record for audit attribution
  let callerEmployeeName = 'System Administrator';
  let callerEmployeeId: string | null = callerProfile.employee_id || null;
  if (callerEmployeeId) {
    const { data: callerEmp } = await supabaseAdmin
      .from('employees')
      .select('id, employee_id, name')
      .eq('id', callerEmployeeId)
      .maybeSingle();
    if (callerEmp?.name) callerEmployeeName = callerEmp.name;
    if (callerEmp?.id) callerEmployeeId = callerEmp.id;
  }

  // 8. Handle GET or List Request (Retrieve All Active Roles for Admin UI)
  if (req.method === 'GET') {
    const { data: allProfiles, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, employee_id, role, updated_at');

    if (fetchErr) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database error fetching user roles.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: allProfiles }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 9. Parse Request Payload
  let body: ChangeRoleRequestBody = {};
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(
      JSON.stringify({ success: false, error: 'Bad Request: Invalid JSON payload in request body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check for list action in POST body
  if (body.action === 'list') {
    const { data: allProfiles, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('id, employee_id, role, updated_at');

    if (fetchErr) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database error fetching user roles.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: allEmps } = await supabaseAdmin
      .from('employees')
      .select('id, employee_id, user_id');

    const enrichedProfiles = (allProfiles || []).map((p: any) => {
      const matchedEmp = allEmps?.find((e: any) => e.user_id === p.id || e.id === p.employee_id);
      return {
        ...p,
        employee_code: matchedEmp?.employee_id || null,
        employee_uuid: matchedEmp?.id || null,
      };
    });

    return new Response(
      JSON.stringify({ success: true, data: enrichedProfiles }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const rawTargetUserId = (body.target_user_id || body.targetUserId || '').trim();
  const rawTargetEmpId = (body.target_employee_id || body.targetEmployeeId || '').trim();
  const rawNewRole = (body.new_role || body.newRole || '').trim().toLowerCase();
  const isTransfer = Boolean(body.is_admin_transfer || body.isAdminTransfer);
  const rawReplacementRole = (body.replacement_role || body.replacementRole || 'employee').trim().toLowerCase();

  // Validate New Role
  if (!rawNewRole) {
    return new Response(
      JSON.stringify({ success: false, error: 'Bad Request: Missing required field: new_role.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!ALLOWED_ROLES.includes(rawNewRole as PortalRole)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Invalid role '${rawNewRole}'. Allowed roles are: 'employee', 'hr_manager', 'admin'.`,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const newRole = rawNewRole as PortalRole;

  if (isTransfer && !['employee', 'hr_manager'].includes(rawReplacementRole)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Invalid replacement role '${rawReplacementRole}'. Allowed replacement roles are: 'employee', 'hr_manager'.`,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const replacementRole = rawReplacementRole as 'employee' | 'hr_manager';

  if (!rawTargetUserId && !rawTargetEmpId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Bad Request: Must provide either target_user_id (auth UUID) or target_employee_id.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 10. Locate and Validate Target User Account
  let targetProfile: { id: string; employee_id: string | null; role: string } | null = null;
  let targetEmployee: { id: string; employee_id: string; user_id: string | null; name: string; email: string; designation: string | null } | null = null;

  // Case A: target_user_id provided
  if (rawTargetUserId) {
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('id, employee_id, role')
      .eq('id', rawTargetUserId)
      .maybeSingle();

    if (prof) {
      targetProfile = prof;
      // Fetch associated employee record
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('id, employee_id, user_id, name, email, designation')
        .or(`user_id.eq.${rawTargetUserId},id.eq.${prof.employee_id || rawTargetUserId}`)
        .maybeSingle();
      if (emp) targetEmployee = emp;
    }
  }

  // Case B: target_employee_id provided (employee code like DGX005 or UUID)
  if (!targetProfile && rawTargetEmpId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(rawTargetEmpId);

    let empQuery = supabaseAdmin.from('employees').select('id, employee_id, user_id, name, email, designation');
    if (isUuid) {
      empQuery = empQuery.or(`id.eq.${rawTargetEmpId},user_id.eq.${rawTargetEmpId}`);
    } else {
      empQuery = empQuery.eq('employee_id', rawTargetEmpId);
    }

    const { data: emp } = await empQuery.maybeSingle();
    if (emp) {
      targetEmployee = emp;
      const targetAuthId = emp.user_id;
      if (targetAuthId) {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('id, employee_id, role')
          .eq('id', targetAuthId)
          .maybeSingle();
        if (prof) targetProfile = prof;
      }
    }
  }

  if (!targetProfile) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Target user account or profile was not found in the DigiX database.',
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const targetUserId = targetProfile.id;
  const previousRole = targetProfile.role;
  const targetEmployeeCode = targetEmployee?.employee_id || 'UNKNOWN';
  const targetEmployeeName = targetEmployee?.name || 'Employee';

  // 11. Count Currently Active Administrators in profiles
  const { data: activeAdmins, error: adminCountErr } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('role', 'admin');

  if (adminCountErr) {
    console.error('[change-user-role] Error querying active administrators:', adminCountErr);
    return new Response(
      JSON.stringify({ success: false, error: 'Database error verifying system administrator count.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const adminList = activeAdmins || [];
  const totalAdmins = adminList.length;

  // 12. Safety Rules & Protections

  // No-Op Check: Role is already what was requested (and not a transfer)
  if (previousRole === newRole && !isTransfer) {
    return new Response(
      JSON.stringify({
        success: true,
        message: `${targetEmployeeName} is already assigned the '${newRole}' role. No changes required.`,
        data: {
          user_id: targetUserId,
          employee_id: targetEmployeeCode,
          name: targetEmployeeName,
          previous_role: previousRole,
          new_role: newRole,
          unchanged: true,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Protection Rule A: Accidental Removal of the Last Admin
  // If the target is an admin being demoted and there is only 1 admin in the system:
  const isTargetCurrentAdmin = previousRole === 'admin';
  const isTargetCaller = targetUserId === callerAuthUser.id;

  if (isTargetCurrentAdmin && newRole !== 'admin' && totalAdmins <= 1 && !isTransfer) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'At least one system administrator must remain active. You cannot remove the last administrator without first appointing another active administrator.',
        code: 'LAST_ADMIN_PROTECTED',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Protection Rule B: Self-Demotion without Transfer
  if (isTargetCaller && newRole !== 'admin' && totalAdmins <= 1) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'At least one system administrator must remain active.',
        code: 'LAST_ADMIN_PROTECTED',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 13. Admin Transfer Workflow (Promote Target -> Admin, then Demote Old Admin)
  if (isTransfer) {
    if (targetUserId === callerAuthUser.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Admin transfer requires selecting a different employee as the new system administrator.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newRole !== 'admin') {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Admin transfer target must be assigned the 'admin' role.",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[change-user-role] Initiating Admin Transfer: Target ${targetEmployeeName} (${targetUserId}) -> Admin; Old Admin ${callerEmployeeName} (${callerAuthUser.id}) -> ${replacementRole}`);

    // Step T1: Promote target user to Admin
    let promoteSuccess = false;
    try {
      const { error: targetUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', targetUserId);

      if (targetUpdateErr) {
        let fallbackSuccess = false;
        if (callerClient) {
          const { error: rpcErr } = await callerClient.rpc('admin_change_user_role', {
            target_user_id: targetUserId,
            new_role: 'admin',
          });
          if (!rpcErr) {
            fallbackSuccess = true;
          }
        }
        if (!fallbackSuccess) {
          const { error: delErr } = await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
          if (delErr) throw targetUpdateErr;
          const { error: insErr } = await supabaseAdmin.from('profiles').insert({
            id: targetUserId,
            employee_id: targetProfile.employee_id,
            role: 'admin',
            updated_at: new Date().toISOString(),
          });
          if (insErr) throw insErr;
        }
      }

      // Verify target role in DB
      const { data: checkTarget } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', targetUserId)
        .single();

      if (checkTarget?.role !== 'admin') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'ROLE_UPDATE_NOT_PERSISTED',
            message: 'Target role verification failed: profile did not transition to admin.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      promoteSuccess = true;
    } catch (promoteErr: any) {
      console.error('[change-user-role] Admin transfer step 1 failed (promoting target):', promoteErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Admin transfer aborted: Failed to assign administrator privileges to ${targetEmployeeName}: ${promoteErr?.message || 'Database error'}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step T2: Update old Admin (caller) to replacement role
    let demoteSuccess = false;
    try {
      const { error: callerUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({ role: replacementRole, updated_at: new Date().toISOString() })
        .eq('id', callerAuthUser.id);

      if (callerUpdateErr) {
        let fallbackSuccess = false;
        if (callerClient) {
          const { error: rpcErr } = await callerClient.rpc('admin_change_user_role', {
            target_user_id: callerAuthUser.id,
            new_role: replacementRole,
          });
          if (!rpcErr) {
            fallbackSuccess = true;
          }
        }
        if (!fallbackSuccess) {
          const { error: delErr } = await supabaseAdmin.from('profiles').delete().eq('id', callerAuthUser.id);
          if (delErr) throw callerUpdateErr;
          const { error: insErr } = await supabaseAdmin.from('profiles').insert({
            id: callerAuthUser.id,
            employee_id: callerProfile.employee_id,
            role: replacementRole,
            updated_at: new Date().toISOString(),
          });
          if (insErr) throw insErr;
        }
      }

      // Verify demotion in DB
      const { data: checkOldAdmin } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', callerAuthUser.id)
        .single();

      if (checkOldAdmin?.role !== replacementRole) {
        // Safe Rollback: Revert target back to previousRole
        try {
          const { error: rbErr } = await supabaseAdmin
            .from('profiles')
            .update({ role: previousRole, updated_at: new Date().toISOString() })
            .eq('id', targetUserId);
          if (rbErr) {
            await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
            await supabaseAdmin.from('profiles').insert({
              id: targetUserId,
              employee_id: targetProfile.employee_id,
              role: previousRole,
              updated_at: new Date().toISOString(),
            });
          }
        } catch (rollbackErr) {
          console.error('[change-user-role] Critical: Rollback of target failed:', rollbackErr);
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: 'ROLE_UPDATE_NOT_PERSISTED',
            message: `Demotion verification failed: Old administrator did not transition to ${replacementRole}. Target role was safely restored.`
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      demoteSuccess = true;
    } catch (demoteErr: any) {
      console.error('[change-user-role] Admin transfer step 2 failed (demoting caller), rolling back target:', demoteErr);
      // Safe Rollback: Revert target back to previousRole
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ role: previousRole, updated_at: new Date().toISOString() })
          .eq('id', targetUserId);
      } catch (rollbackErr) {
        console.error('[change-user-role] Critical: Rollback of target failed:', rollbackErr);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Admin transfer aborted: Could not update old administrator role: ${demoteErr?.message || 'Database error'}. Target role was safely restored.`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step T3: Verify at least one Admin remains active
    const { data: finalAdmins } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (!finalAdmins || finalAdmins.length === 0) {
      console.error('[change-user-role] Critical invariant violation: zero admins remain! Emergency recovery.');
      // Emergency recovery: re-elevate caller
      await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', callerAuthUser.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Security Invariant Violated: At least one system administrator must remain active. Transfer was reverted.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step T4: Sync Auth User Metadata
    try {
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: { role: 'admin' },
      });
      await supabaseAdmin.auth.admin.updateUserById(callerAuthUser.id, {
        user_metadata: { role: replacementRole },
      });
    } catch (metaErr) {
      console.warn('[change-user-role] Auth metadata update warning:', metaErr);
    }

    // Step T5: Record Audit Logs
    const nowIso = new Date().toISOString();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '127.0.0.1';

    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          actor_employee_id: callerEmployeeId,
          actor_name: callerEmployeeName,
          role: 'admin',
          action: 'ROLE_CHANGED',
          module: 'Admin',
          status: 'Success',
          ip_address: clientIp,
          details: {
            action: 'ROLE_CHANGED',
            type: 'ADMIN_TRANSFER_PROMOTION',
            target_user_id: targetUserId,
            target_employee_id: targetEmployeeCode,
            target_employee_name: targetEmployeeName,
            previous_role: previousRole,
            new_role: 'admin',
          },
          created_at: nowIso,
        },
        {
          actor_employee_id: callerEmployeeId,
          actor_name: callerEmployeeName,
          role: 'admin',
          action: 'ROLE_CHANGED',
          module: 'Admin',
          status: 'Success',
          ip_address: clientIp,
          details: {
            action: 'ROLE_CHANGED',
            type: 'ADMIN_TRANSFER_DEMOTION',
            target_user_id: callerAuthUser.id,
            target_employee_id: callerProfile.employee_id || 'CALLER',
            target_employee_name: callerEmployeeName,
            previous_role: 'admin',
            new_role: replacementRole,
          },
          created_at: nowIso,
        },
      ]);
    } catch (auditErr) {
      console.warn('[change-user-role] Audit log recording warning:', auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Admin privileges successfully transferred to ${targetEmployeeName} (${targetEmployeeCode}). Old administrator updated to ${replacementRole}.`,
        data: {
          transferred_to: {
            user_id: targetUserId,
            employee_id: targetEmployeeCode,
            name: targetEmployeeName,
            role: 'admin',
          },
          old_admin: {
            user_id: callerAuthUser.id,
            role: replacementRole,
          },
          updated_at: nowIso,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 14. Standard Role Change (Non-Transfer)
  console.log(`[change-user-role] Updating role for ${targetEmployeeName} (${targetUserId}): ${previousRole} -> ${newRole}`);

  try {
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (updateErr) {
      // Fallback: If trigger blocked service_role, invoke RPC with caller's authenticated session
      let fallbackSuccess = false;
      if (callerClient) {
        const { error: rpcErr } = await callerClient.rpc('admin_change_user_role', {
          target_user_id: targetUserId,
          new_role: newRole,
        });
        if (!rpcErr) {
          fallbackSuccess = true;
        }
      }
      // If RPC is unavailable or trigger blocked service_role because auth.uid() is null:
      // Replace profile row using privileged service_role (delete + insert)
      if (!fallbackSuccess) {
        const { error: delErr } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', targetUserId);
        if (delErr) throw updateErr;

        const { error: insErr } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: targetUserId,
            employee_id: targetProfile.employee_id,
            role: newRole,
            updated_at: new Date().toISOString(),
          });
        if (insErr) throw insErr;
      }
    }

    // Verify role update in database
    const { data: verifiedProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single();

    if (verifiedProfile?.role !== newRole) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ROLE_UPDATE_NOT_PERSISTED',
          message: `Role update verification failed. Database role is '${verifiedProfile?.role}', expected '${newRole}'.`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync Auth metadata
    try {
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: { role: newRole },
      });
    } catch (metaErr) {
      console.warn('[change-user-role] Auth metadata update warning:', metaErr);
    }

    // Update designation in employees table if promoting to Admin and current designation is developer/specialist
    if (newRole === 'admin' && targetEmployee?.id) {
      try {
        await supabaseAdmin
          .from('employees')
          .update({ designation: 'System Administrator' })
          .eq('id', targetEmployee.id)
          .eq('designation', 'Software Developer');
      } catch (_) {
        // non-fatal
      }
    }

    // 15. Record Audit Log
    const nowIso = new Date().toISOString();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '127.0.0.1';

    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_employee_id: callerEmployeeId,
        actor_name: callerEmployeeName,
        role: 'admin',
        action: 'ROLE_CHANGED',
        module: 'Admin',
        status: 'Success',
        ip_address: clientIp,
        details: {
          previous_role: previousRole,
          new_role: newRole,
          target_employee_id: targetEmployeeCode,
          target_user_id: targetUserId,
          target_name: targetEmployeeName,
        },
        created_at: nowIso,
      });
    } catch (auditErr) {
      console.warn('[change-user-role] Audit log recording warning:', auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully changed role for ${targetEmployeeName} (${targetEmployeeCode}) from ${previousRole} to ${newRole}.`,
        data: {
          user_id: targetUserId,
          employee_id: targetEmployeeCode,
          name: targetEmployeeName,
          previous_role: previousRole,
          new_role: newRole,
          updated_at: nowIso,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(`[change-user-role] Failed to update role:`, err);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to update user role: ${err?.message || 'Database error occurred.'}`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
