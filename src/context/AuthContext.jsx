import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEMO_ACCOUNTS } from '../mock/mockAccounts';

const AuthContext = createContext(null);
const STORAGE_KEY = 'digix_portal_auth_v4';

// Module-level deduplication cache to merge concurrent in-flight profile lookups
const inFlightProfileMap = new Map();

/**
 * Format and merge Supabase Auth User + profiles + employees record
 * into a single unified user object compatible with all portal components.
 */
const formatEmployeeUser = (authUser, profile, empRecord, emergencyContact = null) => {
  const normalizedRole = profile?.role === 'hr_manager' ? 'hr' : (profile?.role || 'employee');
  const roleTitle = empRecord?.designation || (
    profile?.role === 'admin'
      ? 'System Administrator'
      : profile?.role === 'hr_manager'
      ? 'HR Manager'
      : 'Associate Software Developer'
  );

  return {
    id: empRecord?.employee_id || empRecord?.id || authUser?.id,
    dbId: empRecord?.id,
    authId: authUser?.id,
    name: empRecord?.name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'User',
    email: empRecord?.email || authUser?.email,
    role: normalizedRole,
    dbRole: profile?.role || 'employee',
    roleTitle,
    department: empRecord?.department || (profile?.role === 'admin' ? 'IT & Security' : profile?.role === 'hr_manager' ? 'Human Resources' : 'Technology'),
    avatar: empRecord?.profile_photo || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    phone: empRecord?.phone || '+91 98765 43210',
    location: empRecord?.location || 'Hyderabad, India',
    manager: empRecord?.manager_id || 'Management',
    joinDate: empRecord?.joining_date || '2024-06-01',
    band: profile?.role === 'admin' ? 'L8 - Principal' : profile?.role === 'hr_manager' ? 'L6 - Manager' : 'L3 - Associate',
    badgeNumber: empRecord?.employee_id || 'DX-00301',
    status: empRecord?.status || 'Active',
    emergencyContact: emergencyContact || null,
    isSupabaseAuth: true,
    rawProfile: profile,
    rawEmployee: empRecord
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Fetch profiles and linked employees records for a given auth user ID.
   * Optimized with single-roundtrip joined query and in-flight request deduplication.
   */
  const fetchProfileAndEmployee = useCallback(async (authUserId) => {
    if (!isSupabaseConfigured || !authUserId) {
      return { success: false, error: new Error('Supabase client is not configured or user ID is missing.') };
    }

    // Deduplication check: if a fetch is already in flight for this user, reuse the promise
    if (inFlightProfileMap.has(authUserId)) {
      return inFlightProfileMap.get(authUserId);
    }

    const fetchPromise = (async () => {
      try {
        // 1. Single joined query: profile + linked employee via foreign key fk_profiles_employee
        const { data: profileWithEmp, error: profileErr } = await supabase
          .from('profiles')
          .select('id, employee_id, role, created_at, updated_at, employee:employees!fk_profiles_employee(*)')
          .eq('id', authUserId)
          .maybeSingle();

        if (profileErr) {
          console.error('[AuthContext] Error fetching profile:', profileErr);
          return { success: false, error: new Error(`Database error while fetching user profile: ${profileErr.message}`) };
        }

        if (!profileWithEmp) {
          return {
            success: false,
            error: new Error('Account profile not found in DigiX database. Please contact your system administrator to provision your profile.')
          };
        }

        // Check role validity
        const validRoles = ['employee', 'hr_manager', 'admin'];
        if (!validRoles.includes(profileWithEmp.role)) {
          return {
            success: false,
            error: new Error(`Invalid role '${profileWithEmp.role}' configured for this user. Valid roles are: employee, hr_manager, admin.`)
          };
        }

        let empRecord = profileWithEmp.employee || null;

        // Fallback: If not linked via profile.employee_id foreign key, lookup by employees.user_id
        if (!empRecord) {
          const { data: empByUserId } = await supabase
            .from('employees')
            .select('*')
            .eq('user_id', authUserId)
            .maybeSingle();

          if (empByUserId) {
            empRecord = empByUserId;
          }
        }

        // Handle missing employee record
        if (!empRecord) {
          // If user is admin, allow login with a minimal admin directory record, else report missing employee
          if (profileWithEmp.role === 'admin') {
            empRecord = {
              id: authUserId,
              employee_id: 'ADM-SYS',
              user_id: authUserId,
              name: 'System Administrator',
              email: 'admin@digix.internal',
              department: 'IT & Security',
              designation: 'System Administrator',
              location: 'Corporate HQ',
              status: 'active'
            };
          } else {
            return {
              success: false,
              profile: profileWithEmp,
              error: new Error('Linked employee directory record was not found for this profile. Please ask HR to link your employee profile.')
            };
          }
        }

        // Separate clean profile object without nested employee alias
        const { employee: _joinedEmp, ...profileData } = profileWithEmp;

        // Query emergency contact (fast lookup by employee id)
        let emergencyContact = null;
        if (empRecord?.id) {
          try {
            const { data: ecData } = await supabase
              .from('emergency_contacts')
              .select('id, employee_id, name, relationship, phone, email, is_primary')
              .eq('employee_id', empRecord.id)
              .order('is_primary', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (ecData) {
              emergencyContact = ecData;
            }
          } catch (ecEx) {
            console.warn('[AuthContext] Emergency contact lookup warning:', ecEx);
          }
        }

        return {
          success: true,
          profile: profileData,
          employee: empRecord,
          emergencyContact
        };
      } catch (err) {
        console.error('[AuthContext] Unexpected error during profile lookup:', err);
        return { success: false, error: new Error(err.message || 'Failed to retrieve user profile.') };
      } finally {
        inFlightProfileMap.delete(authUserId);
      }
    })();

    inFlightProfileMap.set(authUserId, fetchPromise);
    return fetchPromise;
  }, []);

  /**
   * Initialize session on mount:
   * 1. Check supabase.auth.getSession()
   * 2. If valid session, load profile + employee
   * 3. Fallback to localStorage demo state if no Supabase session
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured) {
          const { data, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) throw sessionErr;

          const session = data?.session;
          if (session?.user) {
            const lookup = await fetchProfileAndEmployee(session.user.id);
            if (lookup.success && isMounted) {
              const fullUser = formatEmployeeUser(session.user, lookup.profile, lookup.employee, lookup.emergencyContact);
              setUser(fullUser);
              setProfile(lookup.profile);
              setEmployee(lookup.employee);
              setIsAuthenticated(true);
              setAuthError(null);
              setLoading(false);
              return;
            } else if (!lookup.success && isMounted) {
              console.warn('[AuthContext] Session restore profile error:', lookup.error?.message);
              setAuthError(lookup.error?.message);
              await supabase.auth.signOut();
            }
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session initialization error:', err);
        if (isMounted) setAuthError(err.message);
      }

      // Fallback: Check local storage for mock demo account session
      if (isMounted) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.user && !parsed.user.isSupabaseAuth) {
              setUser(parsed.user);
              setIsAuthenticated(parsed.isAuthenticated ?? true);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('[AuthContext] Failed to read demo storage fallback', e);
        }

        // Default: unauthenticated
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to Supabase Auth state changes
    let subscription = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setEmployee(null);
          setIsAuthenticated(false);
          setAuthError(null);
          localStorage.removeItem(STORAGE_KEY);
        } else if (
          (event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'PASSWORD_RECOVERY' ||
            event === 'USER_UPDATED') &&
          session?.user
        ) {
          const lookup = await fetchProfileAndEmployee(session.user.id);
          if (lookup.success && isMounted) {
            const fullUser = formatEmployeeUser(session.user, lookup.profile, lookup.employee, lookup.emergencyContact);
            setUser(fullUser);
            setProfile(lookup.profile);
            setEmployee(lookup.employee);
            setIsAuthenticated(true);
            setAuthError(null);
          }
        }
      });
      subscription = data?.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [fetchProfileAndEmployee]);

  /**
   * Sign In handler:
   * Supports:
   * - Supabase Auth (email/password with signInWithPassword)
   * - Demo role selection ('employee', 'hr', 'admin') as fallback
   */
  const login = async (roleOrEmail, password = '') => {
    setAuthError(null);

    const isDemoRoleKey = ['employee', 'hr', 'admin'].includes(roleOrEmail);
    const matchedDemo = DEMO_ACCOUNTS.find(
      (acc) => acc.role === roleOrEmail || acc.email.toLowerCase() === roleOrEmail.toLowerCase()
    );

    // If Supabase is configured and an email was provided (not a 1-click demo role button)
    if (isSupabaseConfigured && !isDemoRoleKey && roleOrEmail.includes('@')) {
      const tAuthStart = typeof performance !== 'undefined' ? performance.now() : 0;
      try {
        const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: roleOrEmail.trim(),
          password
        });
        const authDuration = typeof performance !== 'undefined' ? performance.now() - tAuthStart : 0;

        if (signInErr) {
          // If credentials match a demo account with password 'demo', allow fallback
          if (matchedDemo && password === matchedDemo.password) {
            setUser(matchedDemo);
            setIsAuthenticated(true);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: matchedDemo, isAuthenticated: true }));
            return { success: true, user: matchedDemo };
          }

          let friendly = signInErr.message;
          if (signInErr.message.includes('Invalid login credentials')) {
            friendly = 'Invalid email or password. Please verify your credentials and try again.';
          } else if (signInErr.message.includes('Email not confirmed')) {
            friendly = 'Your email address has not been confirmed yet. Please verify your email.';
          } else if (
            signInErr.message.toLowerCase().includes('fetch') ||
            signInErr.message.toLowerCase().includes('network')
          ) {
            friendly = 'Network connection failed. Please check your internet connection.';
          }

          setAuthError(friendly);
          return { success: false, error: new Error(friendly) };
        }

        if (!authData?.user) {
          const err = new Error('Authentication succeeded but user identity was missing.');
          setAuthError(err.message);
          return { success: false, error: err };
        }

        // Fetch Profile + Employee (uses in-flight deduplication & single joined query)
        const tProfileStart = typeof performance !== 'undefined' ? performance.now() : 0;
        const lookup = await fetchProfileAndEmployee(authData.user.id);
        const profileDuration = typeof performance !== 'undefined' ? performance.now() - tProfileStart : 0;

        if (!lookup.success) {
          await supabase.auth.signOut();
          setAuthError(lookup.error.message);
          return { success: false, error: lookup.error };
        }

        const fullUser = formatEmployeeUser(authData.user, lookup.profile, lookup.employee, lookup.emergencyContact);
        setUser(fullUser);
        setProfile(lookup.profile);
        setEmployee(lookup.employee);
        setIsAuthenticated(true);
        setAuthError(null);
        localStorage.removeItem(STORAGE_KEY);

        // Safe development-only timing log (excludes passwords, tokens, or PII)
        if (import.meta.env?.DEV) {
          console.log(
            `[DigiX Perf] Login: Auth = ${authDuration.toFixed(1)}ms, Profile/Role = ${profileDuration.toFixed(1)}ms, Total = ${(authDuration + profileDuration).toFixed(1)}ms`
          );
        }

        // Record audit log for user login (safe null IP instead of hardcoded private LAN IP)
        try {
          supabase
            .from('audit_logs')
            .insert({
              actor_employee_id: lookup.employee?.id || null,
              actor_name: fullUser.name,
              role: fullUser.roleTitle || fullUser.role || 'user',
              action: `User signed in: ${fullUser.name} (${fullUser.email})`,
              module: 'Security',
              status: 'Success',
              ip_address: null,
              details: { email: fullUser.email, role: fullUser.role }
            })
            .then(() => {})
            .catch((e) => console.warn('[AuthContext] Login audit log error:', e));
        } catch (_) {}

        return { success: true, user: fullUser };
      } catch (err) {
        console.error('[AuthContext] Login error:', err);
        let msg = err.message || 'An unexpected authentication error occurred.';
        if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
          msg = 'Network connection failed. Please check your internet connection.';
        }
        setAuthError(msg);
        return { success: false, error: new Error(msg) };
      }
    }

    // Demo / Local fallback
    let target = matchedDemo;
    if (!target && isDemoRoleKey) {
      target = DEMO_ACCOUNTS.find((acc) => acc.role === roleOrEmail);
    }
    if (!target) {
      target = DEMO_ACCOUNTS[0];
    }

    setUser(target);
    setIsAuthenticated(true);
    setProfile(null);
    setEmployee(null);
    setAuthError(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: target, isAuthenticated: true }));
    return { success: true, user: target };
  };

  /**
   * Sign Out handler:
   * 1. Call supabase.auth.signOut()
   * 2. Clear authentication state
   * 3. Clear sensitive session data from memory/localStorage
   */
  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        if (user && user.isSupabaseAuth) {
          try {
            await supabase.from('audit_logs').insert({
              actor_employee_id: user?.dbId || null,
              actor_name: user?.name || 'System User',
              role: user?.roleTitle || user?.role || 'user',
              action: `User signed out: ${user?.name || user?.email || 'User'}`,
              module: 'Security',
              status: 'Success',
              ip_address: null,
              details: { email: user?.email, role: user?.role }
            });
          } catch (_) {}
        }
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[AuthContext] Supabase signOut error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setEmployee(null);
      setIsAuthenticated(false);
      setAuthError(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // ignore
      }
    }
  };

  /**
   * Switch demo role (for demo switcher)
   */
  const switchRole = (newRole) => {
    // Security: Authenticated sessions cannot switch roles via client demo switcher
    if (user?.isSupabaseAuth) {
      console.warn('[AuthContext] Role switching prohibited for authenticated Supabase sessions.');
      return user;
    }
    const target = DEMO_ACCOUNTS.find((acc) => acc.role === newRole) || DEMO_ACCOUNTS[0];
    setUser(target);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: target, isAuthenticated: true }));
    return target;
  };

  /**
   * Refresh employee profile from Supabase
   */
  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !user?.authId) return;
    try {
      const lookup = await fetchProfileAndEmployee(user.authId);
      if (lookup.success) {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const fullUser = formatEmployeeUser(data.user, lookup.profile, lookup.employee, lookup.emergencyContact);
          setUser(fullUser);
          setProfile(lookup.profile);
          setEmployee(lookup.employee);
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Failed to refresh employee profile:', e);
    }
  }, [user?.authId, fetchProfileAndEmployee]);

  /**
   * Update avatar for current user across app without full page reload
   */
  const updateUserAvatar = useCallback((newAvatarUrl) => {
    setUser((prev) => (prev ? { ...prev, avatar: newAvatarUrl } : prev));
    setEmployee((prev) => (prev ? { ...prev, profile_photo: newAvatarUrl } : prev));
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user) {
          parsed.user.avatar = newAvatarUrl;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const currentRole = user ? (user.role === 'hr_manager' ? 'hr' : user.role) : 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        dbRole: user?.dbRole || currentRole,
        profile,
        employee,
        isAuthenticated,
        loading,
        authError,
        setAuthError,
        login,
        logout,
        switchRole,
        refreshProfile,
        fetchProfileAndEmployee,
        updateUserAvatar,
        availableDemoAccounts: DEMO_ACCOUNTS,
        isSupabaseAuth: Boolean(user?.isSupabaseAuth)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
