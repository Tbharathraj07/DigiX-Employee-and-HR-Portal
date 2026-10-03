import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Mail,
  KeyRound,
  Sparkles
} from 'lucide-react';

/**
 * Helper to robustly extract authentication tokens, codes, or error states
 * from window.location.href, search queries, or hash fragments (compatible with HashRouter).
 */
function extractAuthParams() {
  const params = new URLSearchParams();
  const href = window.location.href;
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  // 1. Parse standard search query params
  if (search) {
    const sp = new URLSearchParams(search);
    for (const [k, v] of sp.entries()) params.set(k, v);
  }

  // 2. Parse hash query params and hash fragments
  // In HashRouter, URLs might look like:
  //   /#/setup-password#access_token=...&refresh_token=...&type=invite
  //   /#/setup-password?code=...
  //   /?code=...#/setup-password
  //   /#/setup-password#error=access_denied&error_code=otp_expired...
  const hashParts = hash.split('#');
  for (const part of hashParts) {
    if (!part) continue;

    // Check for query strings inside hash segment
    const qIndex = part.indexOf('?');
    if (qIndex !== -1) {
      const qs = part.substring(qIndex + 1);
      const sp = new URLSearchParams(qs);
      for (const [k, v] of sp.entries()) params.set(k, v);
    }

    // Check for key=value parameters in hash segment
    if (part.includes('=')) {
      const cleanPart = part.startsWith('/') ? part.substring(part.indexOf('?') + 1) : part;
      const sp = new URLSearchParams(cleanPart);
      for (const [k, v] of sp.entries()) params.set(k, v);
    }
  }

  return params;
}

export const SetupPasswordPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user: authContextUser, fetchProfileAndEmployee, setUser, setIsAuthenticated } = useAuth();

  // Status: 'CHECKING' | 'READY' | 'SUCCESS' | 'ERROR'
  const [status, setStatus] = useState('CHECKING');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSessionUser, setActiveSessionUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  // Form inputs
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Attempt to establish or restore the session from invitation tokens or existing session
   */
  const resolveInvitationSession = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus('ERROR');
      setErrorMessage('Supabase is not configured. Please verify your environment configuration.');
      return;
    }

    const params = extractAuthParams();
    const tokenType = params.get('type') || '';
    if (tokenType === 'recovery' || window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
      setIsRecoveryFlow(true);
    }

    // 1. Check for explicit error parameters passed by Supabase Auth (e.g. otp_expired)
    const urlError = params.get('error') || params.get('error_code');
    const urlErrorDescription = params.get('error_description');

    if (urlError) {
      console.warn('[SetupPassword] Invitation link error from URL:', urlError, urlErrorDescription);
      setStatus('ERROR');
      if (urlError.includes('expired') || urlErrorDescription?.toLowerCase().includes('expired')) {
        setErrorMessage('This invitation link has expired. Please contact your system administrator to request a new invitation.');
      } else {
        setErrorMessage(
          urlErrorDescription?.replace(/\+/g, ' ') ||
          'This invitation or recovery link is invalid or has already been used. Please contact your system administrator.'
        );
      }
      return;
    }

    try {
      // 2. Check for PKCE exchange code (?code=...)
      const code = params.get('code');
      if (code) {
        console.info('[SetupPassword] Exchanging authorization code for session...');
        const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (codeErr) {
          console.warn('[SetupPassword] Code exchange error:', codeErr);
          setStatus('ERROR');
          setErrorMessage('Unable to verify invitation link. The authorization code may be invalid or expired.');
          return;
        }
        if (codeData?.session?.user) {
          await handleSessionEstablished(codeData.session.user);
          return;
        }
      }

      // 3. Check for implicit tokens in hash (#access_token=...&refresh_token=...)
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        console.info('[SetupPassword] Setting session from URL tokens...');
        const { data: tokenData, error: tokenErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (tokenErr) {
          console.warn('[SetupPassword] setSession error:', tokenErr);
          setStatus('ERROR');
          setErrorMessage('Unable to establish session from invitation token. The link may have expired.');
          return;
        }
        if (tokenData?.session?.user) {
          await handleSessionEstablished(tokenData.session.user);
          return;
        }
      }

      // 4. Check for OTP token_hash (?token_hash=...&type=invite)
      const tokenHash = params.get('token_hash');
      const tokenType = params.get('type') || 'invite';
      if (tokenHash) {
        console.info('[SetupPassword] Verifying OTP token hash...');
        const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType
        });
        if (otpErr) {
          console.warn('[SetupPassword] verifyOtp error:', otpErr);
          setStatus('ERROR');
          setErrorMessage('Failed to verify invitation token. The link may have expired or is invalid.');
          return;
        }
        if (otpData?.session?.user) {
          await handleSessionEstablished(otpData.session.user);
          return;
        }
      }

      // 5. Check if an active session already exists in Supabase Auth
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await handleSessionEstablished(sessionData.session.user);
        return;
      }

      // 6. No session and no tokens found
      setStatus('ERROR');
      setErrorMessage(
        'No active invitation or recovery session was found. Please open the activation link sent to your corporate email.'
      );
    } catch (err) {
      console.error('[SetupPassword] Unexpected error during session resolution:', err);
      setStatus('ERROR');
      setErrorMessage('An unexpected error occurred while verifying your invitation. Please try again.');
    }
  }, []);

  /**
   * Once a valid user session is verified, load their profile and prepare password entry
   */
  const handleSessionEstablished = async (authUser) => {
    setActiveSessionUser(authUser);

    try {
      // Query profiles table for role and employee linkage
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, employee_id, role, created_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileErr) {
        console.warn('[SetupPassword] Profile lookup warning:', profileErr);
      }

      setUserProfile(profileData || null);
      setStatus('READY');
    } catch (e) {
      console.warn('[SetupPassword] Profile lookup exception:', e);
      setStatus('READY');
    }
  };

  useEffect(() => {
    resolveInvitationSession();

    // Listen to Supabase auth events (e.g. PASSWORD_RECOVERY or SIGNED_IN from URL parser)
    if (isSupabaseConfigured) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryFlow(true);
        }
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          await handleSessionEstablished(session.user);
        }
      });

      return () => {
        listener?.subscription?.unsubscribe();
      };
    }
  }, [resolveInvitationSession]);

  /**
   * Validate password inputs
   */
  const validateForm = () => {
    const errors = {};

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Execute password setup via supabase.auth.updateUser({ password })
   */
  const handleSetPassword = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    setIsSubmitting(true);
    setFormErrors({});

    try {
      // 1. Securely update the user's password in Supabase Auth
      const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
        password
      });

      if (updateErr) {
        console.error('[SetupPassword] Failed updating password:', updateErr);
        addToast({
          type: 'error',
          title: 'Password Update Failed',
          message: updateErr.message || 'Unable to update password. Please try again.'
        });
        setIsSubmitting(false);
        return;
      }

      const updatedAuthUser = updateData.user || activeSessionUser;

      // 2. Fetch full profile and employee data to sync AuthContext
      let resolvedRole = userProfile?.role || 'employee';
      if (fetchProfileAndEmployee && updatedAuthUser?.id) {
        try {
          const lookup = await fetchProfileAndEmployee(updatedAuthUser.id);
          if (lookup.success && lookup.profile) {
            resolvedRole = lookup.profile.role;
          }
        } catch (ctxErr) {
          console.warn('[SetupPassword] AuthContext sync warning:', ctxErr);
        }
      }

      // 3. Mark status as success
      setStatus('SUCCESS');
      setIsSubmitting(false);

      if (isRecoveryFlow) {
        addToast({
          type: 'success',
          title: 'Password Updated!',
          message: 'Your password has been successfully reset. Redirecting to sign in...'
        });

        setTimeout(async () => {
          try {
            await supabase.auth.signOut();
          } catch (_) {}
          navigate('/login', { replace: true });
        }, 1500);
      } else {
        addToast({
          type: 'success',
          title: 'Account Activated!',
          message: 'Your password has been successfully configured. Redirecting to your workspace...'
        });

        // 4. Redirect based on resolved role
        setTimeout(() => {
          if (resolvedRole === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else if (resolvedRole === 'hr' || resolvedRole === 'hr_manager') {
            navigate('/hr/dashboard', { replace: true });
          } else {
            navigate('/employee/dashboard', { replace: true });
          }
        }, 1500);
      }
    } catch (err) {
      console.error('[SetupPassword] Unexpected error setting password:', err);
      addToast({
        type: 'error',
        title: 'Activation Error',
        message: err.message || 'An unexpected error occurred while activating your account.'
      });
      setIsSubmitting(false);
    }
  };

  // Determine user display metadata
  const userEmail = activeSessionUser?.email || '';
  const userFullName =
    activeSessionUser?.user_metadata?.full_name ||
    activeSessionUser?.user_metadata?.name ||
    userEmail.split('@')[0];
  const userRole = userProfile?.role || activeSessionUser?.user_metadata?.role || 'employee';
  const roleDisplay =
    userRole === 'admin'
      ? 'System Administrator'
      : userRole === 'hr_manager' || userRole === 'hr'
      ? 'HR Manager'
      : 'Employee';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-digix-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-xl ring-2 ring-white/30 flex items-center justify-center mb-3">
            <img
              src="/images/digix-logo.png"
              alt="DigiX Technologies Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>DigiX</span>
            <span className="text-xs uppercase font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 px-2 py-0.5 rounded-md tracking-wider">
              Portal
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide">
            ENTERPRISE ACCOUNT ACTIVATION
          </p>
        </div>

        {/* Card Container */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-6 sm:p-8">
          {/* ================================================================= */}
          {/* STATE 1: CHECKING / LOADING                                        */}
          {/* ================================================================= */}
          {status === 'CHECKING' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-10 h-10 border-3 border-digix-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Verifying Invitation Link</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Validating your secure activation credentials with DigiX Cloud...
                </p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STATE 2: ERROR / EXPIRED / INVALID LINK                            */}
          {/* ================================================================= */}
          {status === 'ERROR' && (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Invalid or Expired Link</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {errorMessage ||
                    'This password setup link is invalid, has expired, or has already been used to activate an account.'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-left text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>What should you do?</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  If you were invited to DigiX, please contact your System Administrator to issue a new activation link, or sign in if you have already set your password.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  variant="primary"
                  className="w-full text-xs font-semibold py-2.5"
                  onClick={() => navigate('/login')}
                >
                  Return to Sign In
                </Button>
                <Link
                  to="/register"
                  className="block text-xs text-slate-500 hover:text-digix-600 font-medium text-center py-1 transition-colors"
                >
                  Submit New Access Request →
                </Link>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STATE 3: READY / SET PASSWORD FORM                                 */}
          {/* ================================================================= */}
          {status === 'READY' && (
            <div>
              <div className="mb-5 pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Set Account Password</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Welcome to DigiX Technologies! Configure your secure credentials below to activate your account.
                </p>

                {/* Dossier pill */}
                {userEmail && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-digix-100 text-digix-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{userFullName}</span>
                        <span className="text-[11px] text-slate-500 font-mono block truncate">{userEmail}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex-shrink-0">
                      {roleDisplay}
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSetPassword} className="space-y-4">
                {/* Password field */}
                <div className="space-y-1">
                  <Input
                    label="New Password"
                    id="setup-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 8 characters..."
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    error={formErrors.password}
                    required
                  />
                </div>

                {/* Confirm password field */}
                <div className="space-y-1">
                  <Input
                    label="Confirm Password"
                    id="setup-confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password to confirm..."
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    error={formErrors.confirmPassword}
                    required
                  />
                </div>

                {/* Password requirements hint */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1.5">
                  <span className="font-semibold text-slate-700 block">Password Guidelines:</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        password.length >= 8 ? 'text-emerald-500' : 'text-slate-300'
                      }`}
                    />
                    <span className={password.length >= 8 ? 'text-slate-800' : 'text-slate-400'}>
                      At least 8 characters long
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        confirmPassword && password === confirmPassword
                          ? 'text-emerald-500'
                          : 'text-slate-300'
                      }`}
                    />
                    <span
                      className={
                        confirmPassword && password === confirmPassword
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }
                    >
                      Passwords match exactly
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full py-2.5 sm:py-3 font-semibold text-xs sm:text-sm mt-2"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  {isRecoveryFlow ? 'Update Password & Sign In' : 'Set Password & Activate Account'}
                </Button>
              </form>
            </div>
          )}

          {/* ================================================================= */}
          {/* STATE 4: SUCCESS                                                  */}
          {/* ================================================================= */}
          {status === 'SUCCESS' && (
            <div className="py-6 text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRecoveryFlow ? 'Password Reset Successfully!' : 'Account Activated Successfully!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isRecoveryFlow
                    ? 'Your new password has been configured. You are being redirected to the sign-in screen...'
                    : 'Your corporate password has been configured. You are being redirected to your DigiX workspace...'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-emerald-700 font-semibold">
                  {isRecoveryFlow ? 'Redirecting to Sign In...' : 'Redirecting to Dashboard...'}
                </span>
              </div>
            </div>
          )}

          {/* Card footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400 text-[10px]">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>TLS 1.3 Encryption</span>
            </div>
            <span>DigiX Access Control</span>
          </div>
        </div>

        {/* Page Footer */}
        <p className="text-center mt-6 text-xs text-slate-500">
          Already have an active account?{' '}
          <Link to="/login" className="font-semibold text-amber-400 hover:text-amber-300 hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SetupPasswordPage;
