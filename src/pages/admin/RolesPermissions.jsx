import React from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { KeyRound, ShieldCheck, Check, Save } from 'lucide-react';

export const RolesPermissions = () => {
  const { rolePermissions, toggleRolePermission } = usePortalData();
  const { addToast } = useToast();

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Permissions Synchronized',
      message: 'Role Access Control (RBAC) policies updated across active JWT sessions.'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Roles & Permission Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fine-grained access control policies governing read, write, and deletion privileges for each system module.
          </p>
        </div>

        <Button size="sm" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
          Save Policy Changes
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-x-auto w-full">
        <table className="w-full min-w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">System Module</th>
              <th className="py-3 px-4 text-center">Employee (View / Edit)</th>
              <th className="py-3 px-4 text-center">HR Manager (View / Edit / Del)</th>
              <th className="py-3 px-4 text-center">System Admin (Full Access)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {rolePermissions.map((item, modIdx) => (
              <tr key={modIdx} className="hover:bg-slate-50/50">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  {item.module}
                </td>

                {/* Employee Permissions */}
                <td className="py-3.5 px-4 text-center">
                  <div className="inline-flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.employee.view}
                        onChange={() => toggleRolePermission(modIdx, 'employee', 'view')}
                        className="rounded text-digix-600 focus:ring-digix-500"
                      />
                      <span className="text-slate-600">View</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.employee.edit}
                        onChange={() => toggleRolePermission(modIdx, 'employee', 'edit')}
                        className="rounded text-digix-600 focus:ring-digix-500"
                      />
                      <span className="text-slate-600">Edit</span>
                    </label>
                  </div>
                </td>

                {/* HR Permissions */}
                <td className="py-3.5 px-4 text-center">
                  <div className="inline-flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.hr.view}
                        onChange={() => toggleRolePermission(modIdx, 'hr', 'view')}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-slate-600">View</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.hr.edit}
                        onChange={() => toggleRolePermission(modIdx, 'hr', 'edit')}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-slate-600">Edit</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.hr.delete}
                        onChange={() => toggleRolePermission(modIdx, 'hr', 'delete')}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-slate-600">Del</span>
                    </label>
                  </div>
                </td>

                {/* Admin Permissions */}
                <td className="py-3.5 px-4 text-center">
                  <div className="inline-flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.admin.view}
                        onChange={() => toggleRolePermission(modIdx, 'admin', 'view')}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-slate-600">View</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.admin.edit}
                        onChange={() => toggleRolePermission(modIdx, 'admin', 'edit')}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-slate-600">Edit</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.admin.delete}
                        onChange={() => toggleRolePermission(modIdx, 'admin', 'delete')}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-slate-600">Del</span>
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
