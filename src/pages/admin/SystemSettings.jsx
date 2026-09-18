import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ShieldCheck, Server, AlertTriangle } from 'lucide-react';

export const SystemSettings = () => {
  const { systemSettings, updateSystemSettings } = usePortalData();
  const { addToast } = useToast();

  const [portalName, setPortalName] = useState(systemSettings.portalName);
  const [companyName, setCompanyName] = useState(systemSettings.companyName);
  const [timeout, setTimeoutVal] = useState(systemSettings.sessionTimeoutMinutes);
  const [enforce2FA, setEnforce2FA] = useState(systemSettings.enforce2FA);
  const [allowRemote, setAllowRemote] = useState(systemSettings.allowRemotePunchIn);

  const handleSave = (e) => {
    e.preventDefault();
    updateSystemSettings({
      portalName,
      companyName,
      sessionTimeoutMinutes: Number(timeout),
      enforce2FA,
      allowRemotePunchIn: allowRemote
    });
    addToast({
      type: 'success',
      title: 'System Settings Saved',
      message: 'Portal environment configuration synchronized.'
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Global System Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure DigiX portal branding, identity parameters, and security policies.
        </p>
      </div>

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
            <Button type="submit" variant="primary" size="sm">
              Save Global Configuration
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
