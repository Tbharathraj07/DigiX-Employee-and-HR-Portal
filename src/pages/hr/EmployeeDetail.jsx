import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { User, Mail, Phone, MapPin, Award, Building, Calendar, Star, FileText, RotateCw, Users } from 'lucide-react';

export const EmployeeDetail = () => {
  const { isSupabaseAuth } = useAuth();
  const { employees, isLoadingEmployees, fetchEmployees } = usePortalData();
  const { addToast } = useToast();
  const [selectedEmpId, setSelectedEmpId] = useState('');

  // Synchronize selection when employees load or update
  useEffect(() => {
    if (employees.length > 0) {
      if (!selectedEmpId || !employees.some((e) => e.id === selectedEmpId)) {
        setSelectedEmpId(employees[0].id);
      }
    }
  }, [employees, selectedEmpId]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId) || employees[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employee Dossier</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            In-depth personnel record, performance metrics, and compliance status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSupabaseAuth && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isLoadingEmployees ? 'animate-spin' : ''}`} />}
              onClick={fetchEmployees}
              disabled={isLoadingEmployees}
            >
              Refresh
            </Button>
          )}

          {/* Employee selector pill */}
          {employees.length > 0 && (
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="rounded-xl border border-slate-300 text-xs font-semibold py-2 px-3 bg-white text-slate-800"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id}) - {emp.department}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingEmployees ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-subtle flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading employee dossier from database...</p>
        </div>
      ) : !selectedEmployee ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-subtle flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
            <Users className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Employees Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            There are no employee records available in the directory.
          </p>
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <img
              src={selectedEmployee.avatar}
              alt={selectedEmployee.name}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-purple-100 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-slate-900">{selectedEmployee.name}</h3>
                <Badge variant="success" size="sm" dot>
                  {selectedEmployee.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {selectedEmployee.roleTitle} • {selectedEmployee.department}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
                  {selectedEmployee.id}
                </span>
                <span>•</span>
                <span>{selectedEmployee.email}</span>
                <span>•</span>
                <span>{selectedEmployee.location}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Review Scheduled',
                  message: `Annual performance review initiated for ${selectedEmployee.name}`
                })
              }
            >
              Initiate Review
            </Button>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card title="Employment Information">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Corporate Band</span>
                <span className="font-semibold text-slate-900">{selectedEmployee.band || 'L5 - Senior'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date Joined</span>
                <span className="font-medium text-slate-900">{selectedEmployee.joinDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Work Policy</span>
                <span className="font-medium text-slate-900">{selectedEmployee.workType}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Annual Base CTC</span>
                <span className="font-bold text-slate-900">{selectedEmployee.salary || '$145,000'}</span>
              </div>
            </div>
          </Card>

          <Card title="Performance & Review">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Rating</span>
                <span className="font-bold text-purple-700 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                  {selectedEmployee.performanceScore || '4.8'} / 5.0
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Promotion Eligibility</span>
                <Badge variant="primary" size="sm">Eligible Q4</Badge>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Manager</span>
                <span className="font-medium text-slate-900">{selectedEmployee.manager || 'Priyanka'}</span>
              </div>
            </div>
          </Card>

          <Card title="Technical & Core Skills">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(selectedEmployee.skills || ['React', 'TypeScript', 'Node.js', 'Vite', 'GraphQL']).map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
};
