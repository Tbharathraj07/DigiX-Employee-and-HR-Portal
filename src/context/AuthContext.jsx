import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_ACCOUNTS } from '../mock/mockAccounts';

const AuthContext = createContext(null);
const STORAGE_KEY = 'digix_portal_auth_v4';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.user && parsed.user.name !== 'Alex Rivera' && parsed.user.name !== 'Sarah Jenkins') {
          return parsed.user;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved auth state', e);
    }
    return DEMO_ACCOUNTS[0]; // Tarumani Bharath Raj (Employee) default
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved).isAuthenticated ?? true;
      }
    } catch (e) {
      // fallback
    }
    return true;
  });

  const role = user ? user.role : 'employee';

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isAuthenticated }));
    } catch (e) {
      console.warn('Failed to persist auth state', e);
    }
  }, [user, isAuthenticated]);

  const login = (roleOrEmail, password = '') => {
    let matchedAccount = null;

    // Check if role name was passed ('employee', 'hr', 'admin')
    matchedAccount = DEMO_ACCOUNTS.find((acc) => acc.role === roleOrEmail);

    // Or check if email was passed
    if (!matchedAccount) {
      matchedAccount = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === roleOrEmail.toLowerCase()
      );
    }

    // Default fallback to first account if unmatched
    if (!matchedAccount) {
      matchedAccount = DEMO_ACCOUNTS[0];
    }

    setUser(matchedAccount);
    setIsAuthenticated(true);
    return matchedAccount;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const switchRole = (newRole) => {
    const target = DEMO_ACCOUNTS.find((acc) => acc.role === newRole) || DEMO_ACCOUNTS[0];
    setUser(target);
    setIsAuthenticated(true);
    return target;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        login,
        logout,
        switchRole,
        availableDemoAccounts: DEMO_ACCOUNTS
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
