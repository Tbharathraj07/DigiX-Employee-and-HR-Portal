import React, { useState, useEffect } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ShieldCheck, Server, AlertTriangle, RotateCw } from 'lucide-react';

export const SystemSettings = () => {
  const {
    systemSettings,
    updateSystemSettings,
    fetchSystemSettings,
    isLoadingSystemSettings,
    systemSettingsError
  } = usePortalData();
  const { addToast } = useToast();

  const [portalName, setPortalName] = useState(systemSettings?.portalName || '');
  const [companyName, setCompanyName] = useState(systemSettings?.companyName || '');
  const [timeout, setTimeoutVal] = useState(systemSettings?.sessionTimeoutMinutes ?? 60);
  const [enforce2FA, setEnforce2FA] = useState(Boolean(systemSettings?.enforce2FA));
  const [allowRemote, setAllowRemote] = useState(Boolean(systemSettings?.allowRemotePunchIn));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (systemSettings) {
      setPortalName(systemSettings.portalName || '');
      setCompanyName(systemSettings.companyName || '');
      setTimeoutVal(systemSettings.sessionTimeoutMinutes ?? 60);
      setEnforce2FA(Boolean(systemSettings.enforce2FA));
      setAllowRemote(Boolean(systemSettings.allowRemotePunchIn));
    }
  }, [systemSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSystemSettings({
        portalName,
        companyName,
        sessionTimeoutMinutes: Number(timeout),
        enforce2FA,
        allowRemotePunchIn: allowRemote
      });
      addToast({
        type: 'success',
        title: 'System Settings Saved',
        message: 'Portal environment configuration synchronized with Supabase.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Unable to update system settings in Supabase.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-digix-500" />
            Global System Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure DigiX portal branding, identity parameters, and security policies.
          </p>
        </div>

        <button
          onClick={() => fetchSystemSettings?.()}
          disabled={isLoadingSystemSettings}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
          title="Refresh settings from Supabase"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoadingSystemSettings ? 'animate-spin text-digix-500' : ''}`} />
          Refresh
        </button>
      </div>

      {systemSettingsError && (
        <div className="flex items-center justify-between p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>Failed to load system settings from Supabase: {systemSettingsError}</span>
          </div>
          <button
            onClick={() => fetchSystemSettings?.()}
            className="px-2.5 py-1 bg-white border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <Card title="Brand & Tenant Details">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Portal Display Name"
              value={portalName}
              onChange={(e) => setPortalName(e.target.value)}
              required
            />
            <Input
              label="Legal Organization Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="JWT Session Timeout (Minutes)"
              type="number"
              value={timeout}
              onChange={(e) => setTimeoutVal(e.target.value)}
            />
            <Input
              label="Notification Gateway Email"
              defaultValue="notifications@digixtechnologies.com"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">Enforce Mandatory Two-Factor Authentication (2FA)</p>
                <p className="text-[11px] text-slate-400">Require authenticator app / hardware security key on all corporate logins.</p>
              </div>
              <input
                type="checkbox"
                checked={enforce2FA}
                onChange={(e) => setEnforce2FA(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">Allow Remote Geolocation Punch-in</p>
                <p className="text-[11px] text-slate-400">Permit employees on hybrid / remote contracts to clock in outside office LAN.</p>
              </div>
              <input
                type="checkbox"
                checked={allowRemote}
                onChange={(e) => setAllowRemote(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              Save Global Configuration
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
