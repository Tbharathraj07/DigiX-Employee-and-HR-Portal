import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Bell, Lock, Globe, Shield, Moon } from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSavePreferences = () => {
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      message: 'Your notification and display preferences have been updated.'
    });
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    addToast({
      type: 'success',
      title: 'Password Updated',
      message: 'Demo credentials updated successfully.'
    });
    setOldPassword('');
    setNewPassword('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Account Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your communication preferences, security credentials, and portal experience.
        </p>
      </div>

      {/* Notification Preferences */}
      <Card title="Notification Preferences" subtitle="Select channels for announcements and task alerts">
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <p className="font-semibold text-slate-900">Email Notifications</p>
              <p className="text-xs text-slate-500">Receive leave approvals, task assignments, and executive broadcasts.</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="w-4 h-4 rounded text-digix-600 focus:ring-digix-500"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <p className="font-semibold text-slate-900">Slack Direct Message Alerts</p>
              <p className="text-xs text-slate-500">Instant ping when a manager reviews your time-off request.</p>
            </div>
            <input
              type="checkbox"
              checked={slackAlerts}
              onChange={(e) => setSlackAlerts(e.target.checked)}
              className="w-4 h-4 rounded text-digix-600 focus:ring-digix-500"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-slate-900">Weekly Performance & Sprint Digest</p>
              <p className="text-xs text-slate-500">Summary email every Monday morning with your upcoming milestones.</p>
            </div>
            <input
              type="checkbox"
              checked={weeklyDigest}
              onChange={(e) => setWeeklyDigest(e.target.checked)}
              className="w-4 h-4 rounded text-digix-600 focus:ring-digix-500"
            />
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <Button size="sm" onClick={handleSavePreferences}>
            Save Preferences
          </Button>
        </div>
      </Card>

      {/* Security Credentials */}
      <Card title="Security & Authentication" subtitle="Update your portal password and view active sessions">
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <Input
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button type="submit" variant="outline" size="sm">
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
};
