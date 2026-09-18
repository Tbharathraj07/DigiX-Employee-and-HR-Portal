import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Mail, Phone, MapPin, Users, Award } from 'lucide-react';

export const MyTeam = () => {
  const { user } = useAuth();
  const { employees } = usePortalData();

  // Teammates in Engineering
  const teamMembers = employees.filter((e) => e.department === user.department || e.department === 'Engineering');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Team & Department</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Engineering & Product Platform division directory and reporting tree.
        </p>
      </div>

      {/* Reporting Manager Hero Card */}
      <Card title="Direct Reporting Manager">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2">
          <div className="flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
              alt="Priyanka"
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Priyanka</h3>
                <Badge variant="purple" size="sm">
                  Manager
                </Badge>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                HR Manager • Human Resources
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> priyanka@digix.internal
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Hyderabad, India
                </span>
              </div>
            </div>
          </div>

          <a
            href="mailto:priyanka@digix.internal"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Schedule 1:1 Check-in
          </a>
        </div>
      </Card>

      {/* Team Members Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-digix-500" />
          <span>Department Colleagues ({teamMembers.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all"
            >
              <div className="flex items-start gap-3.5">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {member.name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {member.roleTitle}
                  </p>
                  <span className="text-[10px] font-mono text-digix-600 font-semibold mt-1 inline-block">
                    {member.id}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Location</span>
                  <span className="font-medium text-slate-700">{member.location.split('(')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Work Mode</span>
                  <span className="font-medium text-slate-700">{member.workType}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={`mailto:${member.email}`}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                </a>
                <span className="text-xs px-2.5 py-1.5 bg-digix-50 text-digix-700 rounded-lg font-medium">
                  {member.band || 'L5'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
