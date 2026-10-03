import React, { useState, useEffect } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Settings, RotateCw } from 'lucide-react';

export const HRSettings = () => {
  const {
    leavePolicyQuotas,
    updateLeavePolicyQuotas,
    fetchSystemSettings,
    isLoadingSystemSettings
  } = usePortalData();
  const { addToast } = useToast();

  const [casualLimit, setCasualLimit] = useState(leavePolicyQuotas?.casualLimit ?? 12);
  const [sickLimit, setSickLimit] = useState(leavePolicyQuotas?.sickLimit ?? 10);
  const [privilegeLimit, setPrivilegeLimit] = useState(leavePolicyQuotas?.privilegeLimit ?? 18);
  const [carryForward, setCarryForward] = useState(leavePolicyQuotas?.carryForward ?? 5);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (leavePolicyQuotas) {
      setCasualLimit(leavePolicyQuotas.casualLimit ?? 12);
      setSickLimit(leavePolicyQuotas.sickLimit ?? 10);
      setPrivilegeLimit(leavePolicyQuotas.privilegeLimit ?? 18);
      setCarryForward(leavePolicyQuotas.carryForward ?? 5);
    }
  }, [leavePolicyQuotas]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateLeavePolicyQuotas({
        casualLimit: Number(casualLimit),
        sickLimit: Number(sickLimit),
        privilegeLimit: Number(privilegeLimit),
        carryForward: Number(carryForward)
      });
      addToast({
        type: 'success',
        title: 'Leave Policies Saved',
        message: 'Leave quota configurations synchronized with Supabase.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Unable to update leave quotas in Supabase.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-digix-500" />
            HR Policy Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define global time-off entitlements, carryover ceilings, and probation guidelines.
          </p>
        </div>

        <button
          onClick={() => fetchSystemSettings?.()}
          disabled={isLoadingSystemSettings}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
          title="Refresh quotas from Supabase"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoadingSystemSettings ? 'animate-spin text-digix-500' : ''}`} />
          Refresh
        </button>
      </div>

      <Card title="Annual Leave Quotas">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Casual Leave Days / Year"
              type="number"
              value={casualLimit}
              onChange={(e) => setCasualLimit(e.target.value)}
            />
            <Input
              label="Sick Leave Days / Year"
              type="number"
              value={sickLimit}
              onChange={(e) => setSickLimit(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Privilege Leave Days / Year"
              type="number"
              value={privilegeLimit}
              onChange={(e) => setPrivilegeLimit(e.target.value)}
            />
            <Input
              label="Max Carry-forward Days"
              type="number"
              value={carryForward}
              onChange={(e) => setCarryForward(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              Save Policies
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
