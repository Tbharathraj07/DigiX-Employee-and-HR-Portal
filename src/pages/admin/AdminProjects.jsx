import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { FolderKanban, Plus, DollarSign, Calendar, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export const AdminProjects = () => {
  const { projects, isLoadingProjects, projectError, fetchProjects, addProject } = usePortalData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New project state
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('planned');

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsSubmitting(true);
    try {
      await addProject({
        name: projectName.trim(),
        category: category,
        description: description.trim(),
        deadline: deadline || null,
        status: status
      });

      setIsModalOpen(false);
      setProjectName('');
      setDescription('');
      setDeadline('');
      setStatus('planned');

      addToast({
        type: 'success',
        title: 'Project Initiated',
        message: `Project "${projectName}" has been created in Supabase.`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Create Project',
        message: err.message || 'Unable to create project in Supabase.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Strategic Initiative',
      render: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              {row.code}
            </span>
            <span className="font-bold text-slate-900 text-xs">{row.name}</span>
          </div>
          <span className="text-[11px] text-slate-500">{row.category}</span>
        </div>
      )
    },
    { header: 'Project Lead', accessor: 'lead', cellClassName: 'text-xs text-slate-700 font-medium' },
    {
      header: 'Budget & Burn',
      render: (row) => (
        <div className="text-xs">
          <span className="font-bold text-slate-900">{row.spent}</span>
          <span className="text-slate-400"> / {row.budget}</span>
        </div>
      )
    },
    {
      header: 'Completion',
      render: (row) => (
        <div className="w-28">
          <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
            <span>{row.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${row.progress}%` }} />
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge
          variant={row.status === 'Completed' ? 'success' : row.status === 'Review' ? 'purple' : 'primary'}
          size="sm"
        >
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Health',
      accessor: 'health',
      render: (row) => (
        <Badge variant={row.health === 'Good' ? 'success' : 'warning'} size="sm" dot>
          {row.health}
        </Badge>
      )
    },
    { header: 'Target', accessor: 'deadline', cellClassName: 'text-xs text-slate-500' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Enterprise Project Governance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Portfolio monitoring, capital allocation, and executive roadmap tracking.
          </p>
        </div>

        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          New Strategic Project
        </Button>
      </div>

      {projectError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>Failed to synchronize projects from Supabase: {projectError}</span>
          </div>
          <button
            onClick={() => fetchProjects()}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-300 rounded-md text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {isLoadingProjects && projects.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-digix-600 mb-2" />
          <p className="text-xs font-medium text-slate-600">Loading portfolio initiatives from Supabase...</p>
        </div>
      ) : (
        <Table columns={columns} data={projects} />
      )}

      {/* Project Intake Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Strategic Project"
        subtitle="Initiate a company-wide project initiative in Supabase"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. NextGen Microservices Platform"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Initiative Category / Domain"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                'Infrastructure',
                'AI & Data',
                'Web Platform',
                'Mobile',
                'Security',
                'Operations'
              ]}
            />

            <Select
              label="Initial Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'Planning (Scheduled)', value: 'planned' },
                { label: 'Active (In Progress)', value: 'active' }
              ]}
            />
          </div>

          <Input
            label="Target Completion Date"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Project Scope & Objective
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline executive deliverables, KPIs, and architectural goals..."
              className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:border-digix-500 focus:ring-1 focus:ring-digix-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
            >
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

