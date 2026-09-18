import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const HRSettings = () => {
  const { addToast } = useToast();
  const [casualLimit, setCasualLimit] = useState(12);
  const [sickLimit, setSickLimit] = useState(10);
  const [privilegeLimit, setPrivilegeLimit] = useState(18);
  const [carryForward, setCarryForward] = useState(5);

  const handleSave = (e) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Leave Policies Saved',
      message: 'Leave quota configurations updated for next fiscal cycle.'
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">HR Policy Configuration</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Define global time-off entitlements, carryover ceilings, and probation guidelines.
        </p>
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
            <Button type="submit" variant="primary" size="sm">
              Save Policies
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
