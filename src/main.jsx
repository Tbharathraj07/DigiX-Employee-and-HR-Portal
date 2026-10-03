import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { App } from './App';
import './index.css';

// Normalize incoming Supabase Auth recovery / invite / error redirects for HashRouter
(function normalizeAuthRouting() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  const hasAuthPayload =
    hash.includes('access_token=') ||
    hash.includes('type=recovery') ||
    hash.includes('type=invite') ||
    hash.includes('error_code=') ||
    hash.includes('token_hash=') ||
    search.includes('code=') ||
    search.includes('error_code=') ||
    search.includes('token_hash=');

  if (hasAuthPayload && !hash.startsWith('#/setup-password')) {
    if (hash.startsWith('#')) {
      window.location.hash = '#/setup-password' + hash;
    } else {
      window.location.hash = '#/setup-password';
    }
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
);
