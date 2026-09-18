import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { DEMO_ACCOUNTS } from '../../mock/mockAccounts';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  Layers,
  ShieldCheck,
  UserCheck,
  Users,
  ArrowRight,
  Lock,
  Mail,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const { recordLoginAttendance } = usePortalData();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (roleKey) => {
    setIsLoading(true);
    setTimeout(() => {
      const loggedUser = login(roleKey);
      // Auto-record real-time login attendance for employee
      recordLoginAttendance(loggedUser);
      setIsLoading(false);
      addToast({
        type: 'success',
        title: `Welcome, ${loggedUser.name}!`,
        message: `Signed in as ${loggedUser.roleTitle}`
      });

      if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'hr') {
        navigate('/hr/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    }, 400);
  };

  const handleCustomLogin = (e) => {
    e.preventDefault();
    if (!email) {
      addToast({
        type: 'warning',
        title: 'Email Required',
        message: 'Please enter a demo email address or select a preset below.'
      });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const loggedUser = login(email, password);
      // Auto-record real-time login attendance
      recordLoginAttendance(loggedUser);
      setIsLoading(false);
      addToast({
        type: 'success',
        title: `Welcome back, ${loggedUser.name}!`,
        message: `Logged in to ${loggedUser.role.toUpperCase()} workspace.`
      });

      if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'hr') {
        navigate('/hr/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    }, 400);
  };

  const handleAutofill = (demoUser) => {
    setEmail(demoUser.email);
    setPassword('••••••••');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8 overflow-x-hidden w-full">
      <div className="max-w-4xl w-full mx-auto">
        {/* Top DigiX Brand */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-digix-500 flex items-center justify-center text-white shadow-md shadow-digix-500/25 flex-shrink-0">
              <Layers className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div className="text-center sm:text-left">
              <span className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight leading-none block">
                Digi<span className="text-digix-500">X</span> Technologies
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block mt-1">
                Enterprise Employee & HR Intelligence Portal
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto px-2">
            Secure internal gateway for employee self-service, talent management, and administrative operations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: 1-Click Role Access */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-subtle">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Select Demo Persona
                  </h2>
                  <p className="text-xs text-slate-500">
                    Instant 1-click access to test role-specific dashboards & workflows.
                  </p>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider bg-digix-50 text-digix-700 px-2 py-1 rounded-md border border-digix-200">
                  Demo Mode
                </span>
              </div>

              <div className="space-y-3">
                {/* Employee Card */}
                <div
                  onClick={() => handleRoleSelect('employee')}
                  className="group relative p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-digix-400 bg-slate-50/50 hover:bg-digix-50/40 cursor-pointer transition-all duration-200 hover:shadow-card flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <img
                      src={DEMO_ACCOUNTS[0].avatar}
                      alt={DEMO_ACCOUNTS[0].name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover ring-2 ring-white shadow-xs flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-digix-700 truncate">
                          {DEMO_ACCOUNTS[0].name}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                          Employee
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                        {DEMO_ACCOUNTS[0].roleTitle} • {DEMO_ACCOUNTS[0].department}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                        {DEMO_ACCOUNTS[0].email}
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200 group-hover:bg-digix-500 group-hover:border-transparent flex items-center justify-center text-slate-400 group-hover:text-white transition-all shadow-xs flex-shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                {/* HR Card */}
                <div
                  onClick={() => handleRoleSelect('hr')}
                  className="group relative p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-purple-400 bg-slate-50/50 hover:bg-purple-50/40 cursor-pointer transition-all duration-200 hover:shadow-card flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <img
                      src={DEMO_ACCOUNTS[1].avatar}
                      alt={DEMO_ACCOUNTS[1].name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover ring-2 ring-white shadow-xs flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-700 truncate">
                          {DEMO_ACCOUNTS[1].name}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-semibold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                          HR Manager
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                        {DEMO_ACCOUNTS[1].roleTitle} • {DEMO_ACCOUNTS[1].department}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                        {DEMO_ACCOUNTS[1].email}
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200 group-hover:bg-purple-600 group-hover:border-transparent flex items-center justify-center text-slate-400 group-hover:text-white transition-all shadow-xs flex-shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                {/* Admin Card */}
                <div
                  onClick={() => handleRoleSelect('admin')}
                  className="group relative p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/40 cursor-pointer transition-all duration-200 hover:shadow-card flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <img
                      src={DEMO_ACCOUNTS[2].avatar}
                      alt={DEMO_ACCOUNTS[2].name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover ring-2 ring-white shadow-xs flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-700 truncate">
                          {DEMO_ACCOUNTS[2].name}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                          System Admin
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                        {DEMO_ACCOUNTS[2].roleTitle} • {DEMO_ACCOUNTS[2].department}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                        {DEMO_ACCOUNTS[2].email}
                      </p>
                    </div>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200 group-hover:bg-amber-600 group-hover:border-transparent flex items-center justify-center text-slate-400 group-hover:text-white transition-all shadow-xs flex-shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Highlights Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-digix-500/10 via-digix-50 to-indigo-50 border border-digix-100 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-digix-600 flex-shrink-0" />
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-digix-900">Multi-Role Testing Mode:</span> You can also toggle roles on the fly at any time using the role pill in the top navigation bar!
              </div>
            </div>
          </div>

          {/* Right Column: Custom Login Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-subtle">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Corporate Account Sign In
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4 sm:mb-5">
              Enter your corporate DigiX credentials to access the system.
            </p>

            <form onSubmit={handleCustomLogin} className="space-y-3.5 sm:space-y-4">
              <Input
                label="Work Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@digix.internal"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-digix-600 focus:ring-digix-500 border-slate-300"
                  />
                  <span>Remember session</span>
                </label>
                <span className="text-digix-600 font-medium hover:underline cursor-pointer">
                  Forgot Password?
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full py-2.5 sm:py-3 font-semibold text-xs sm:text-sm"
              >
                Sign In to DigiX
              </Button>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 font-medium mb-2">
                  Click to prefill demo credentials:
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAutofill(acc)}
                      className="text-[10px] sm:text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      {acc.role.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-slate-400 text-[10px] sm:text-[11px]">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>SOC2 Certified</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-digix-500" />
                <span>256-bit AES</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <span>ISO 27001</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-xs text-slate-400">
          © 2026 DigiX Technologies Inc. All internal rights reserved. Authorized employee access only.
        </div>
      </div>
    </div>
  );
};
