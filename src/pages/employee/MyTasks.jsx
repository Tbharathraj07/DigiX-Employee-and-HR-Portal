import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SearchInput } from '../../components/common/SearchInput';
import { Plus, CheckSquare, Calendar, Flag, AlertCircle } from 'lucide-react';

export const MyTasks = () => {
  const { user } = useAuth();
  const { tasks, addTask, toggleTaskStatus } = usePortalData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('Client Enterprise Portal V3');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTask({
      title: newTitle,
      project: newProject,
      assignedTo: user.name,
      priority: newPriority,
      dueDate: newDueDate || '2026-09-30',
      description: newDescription
    });

    setIsModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    addToast({
      type: 'success',
      title: 'Task Created',
      message: 'New task added to your backlog.'
    });
  };

  const filteredTasks = tasks.filter((t) => {
    const isAssigned = t.assignedTo === user?.name || t.assignedTo === 'Tarumani Bharath Raj' || t.assignedTo === user?.id;
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'completed'
        ? t.status === 'completed'
        : activeTab === 'in_progress'
        ? t.status === 'in_progress'
        : activeTab === 'urgent'
        ? t.priority === 'urgent' || t.priority === 'high'
        : true;
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.project.toLowerCase().includes(search.toLowerCase());
    return isAssigned && matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Task Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track, prioritize, and complete engineering sprint action items.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search tasks..."
            className="w-48 sm:w-64"
          />
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'urgent', label: 'Urgent / High Priority' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-digix-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1">
              You are all caught up on deliverables in this category!
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDone
                    ? 'border-slate-200/60 bg-slate-50/40 opacity-75'
                    : 'border-slate-200/90 shadow-subtle hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => {
                      toggleTaskStatus(task.id);
                      addToast({
                        type: isDone ? 'info' : 'success',
                        title: isDone ? 'Task Incomplete' : 'Task Finished!',
                        message: task.title
                      });
                    }}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-digix-600 focus:ring-digix-500 cursor-pointer"
                  />
                  <div>
                    <h4
                      className={`text-sm font-semibold ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                      <span className="font-mono text-slate-500 font-semibold">{task.id}</span>
                      <span>•</span>
                      <span className="text-slate-600">{task.project}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3" /> Due {task.dueDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge
                    variant={
                      task.priority === 'urgent'
                        ? 'danger'
                        : task.priority === 'high'
                        ? 'warning'
                        : 'primary'
                    }
                    size="sm"
                    dot
                  >
                    {task.priority}
                  </Badge>

                  <Badge
                    variant={isDone ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {isDone ? 'Done' : task.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Sprint Task"
        subtitle="Add an engineering task to your sprint backlog"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Implement refresh token mechanism"
            required
          />

          <Select
            label="Associated Project"
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            options={[
              'Client Enterprise Portal V3',
              'CloudMigration 2.0',
              'AI Analytics Suite',
              'DigiX Mobile Core Redesign',
              'Zero-Trust IAM Compliance Audit'
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Priority Level"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              options={[
                { label: 'Low Priority', value: 'low' },
                { label: 'Medium Priority', value: 'medium' },
                { label: 'High Priority', value: 'high' },
                { label: 'Urgent Blockers', value: 'urgent' }
              ]}
            />
            <Input
              label="Due Date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Task Notes / Acceptance Criteria
            </label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Outline deliverables or pull request references..."
              className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:border-digix-500 focus:ring-1 focus:ring-digix-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
