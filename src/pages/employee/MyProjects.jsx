import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { FolderKanban, Users, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';

export const MyProjects = () => {
  const { projects } = usePortalData();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredProjects = projects.filter((p) => {
    const matchesFilter =
      filter === 'all' ||
      p.status.toLowerCase().replace(/\s+/g, '_') === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Assigned Projects</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active strategic initiatives and cross-functional technical squads you are contributing to.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search projects..."
            className="w-48 sm:w-64"
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-300 text-xs py-2 px-3 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-digix-500"
          >
            <option value="all">All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="planning">Planning</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-mono font-bold text-digix-600 bg-digix-50 px-2 py-0.5 rounded border border-digix-100">
                  {project.code}
                </span>
                <Badge
                  variant={
                    project.status === 'Completed'
                      ? 'success'
                      : project.status === 'Review'
                      ? 'purple'
                      : project.status === 'Planning'
                      ? 'neutral'
                      : 'primary'
                  }
                  size="sm"
                >
                  {project.status}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-2.5">
                {project.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                {project.description}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span className="font-medium">Sprint Completion</span>
                    <span className="font-bold text-slate-900">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        project.progress > 80
                          ? 'bg-emerald-500'
                          : project.progress > 50
                          ? 'bg-digix-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Team Members */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{project.teamMembers.length} Contributors</span>
                  </div>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {project.teamMembers.map((member, i) => (
                      <div
                        key={i}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-700"
                        title={member}
                      >
                        {member.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due {project.deadline}
              </span>
              <span className="font-medium text-slate-600">Lead: {project.lead}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
