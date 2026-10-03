import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { CheckSquare, UserPlus, Users, Calendar, Plus, CheckCircle2, Clock, Trash2, RotateCw } from 'lucide-react';

const DEFAULT_ONBOARDING_TASKS = [
  { id: 'task-1', title: 'Provision MacBook Pro & YubiKey Hardware', done: true, completed: true, completed_at: new Date().toISOString() },
  { id: 'task-2', title: 'Grant Google Workspace & Slack Enterprise Access', done: true, completed: true, completed_at: new Date().toISOString() },
  { id: 'task-3', title: 'Assign Corporate Mentor / Buddy', done: true, completed: true, completed_at: new Date().toISOString() },
  { id: 'task-4', title: 'Complete SOC2 & InfoSec Mandatory Training', done: false, completed: false, completed_at: null },
  { id: 'task-5', title: '30-Day Manager Performance Alignment Check-in', done: false, completed: false, completed_at: null }
];

export const OnboardingPage = () => {
  const {
    onboarding,
    employees,
    createOnboardingChecklist,
    updateOnboardingChecklist,
    toggleOnboardingTask,
    deleteOnboardingChecklist,
    fetchOnboardingChecklists,
    isLoadingOnboarding
  } = usePortalData();
  const { addToast } = useToast();

  // Modal states
  const [isCohortModalOpen, setIsCohortModalOpen] = useState(false);
  const [selectedHire, setSelectedHire] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [hireToDelete, setHireToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form states for new cohort
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedBuddyId, setSelectedBuddyId] = useState('');
  const [cohortName, setCohortName] = useState('October 2026 Orientation Cohort');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter employees who don't already have an active onboarding record
  const existingEmployeeIds = new Set(onboarding.map((o) => o.employeeId));
  const availableEmployees = employees.filter((e) => !existingEmployeeIds.has(e.dbId || e.id));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchOnboardingChecklists();
      addToast({
        type: 'info',
        title: 'Checklists Refreshed',
        message: 'Onboarding records synced with Supabase.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Refresh Failed',
        message: err.message || 'Could not refresh checklists.'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateCohort = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      addToast({
        type: 'error',
        title: 'Employee Required',
        message: 'Please select an employee to onboard.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const targetEmp = employees.find((e) => (e.dbId || e.id) === selectedEmployeeId);
      await createOnboardingChecklist({
        employeeId: selectedEmployeeId,
        buddyId: selectedBuddyId || null,
        cohortName: cohortName || 'Orientation Cohort',
        checklistItems: DEFAULT_ONBOARDING_TASKS
      });

      setIsCohortModalOpen(false);
      setSelectedEmployeeId('');
      setSelectedBuddyId('');
      setCohortName('October 2026 Orientation Cohort');

      addToast({
        type: 'success',
        title: 'Onboarding Cohort Created',
        message: `Successfully provisioned onboarding dossier for ${targetEmp?.name || 'new employee'}.`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'Could not create onboarding record.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    if (!selectedHire) return;
    const currentItems = selectedHire.checklistItems && selectedHire.checklistItems.length > 0
      ? selectedHire.checklistItems
      : DEFAULT_ONBOARDING_TASKS;

    const nowIso = new Date().toISOString();
    const updatedItems = currentItems.map((item) => {
      if (item.id === taskId || String(item.id) === String(taskId)) {
        const isDone = !(item.done || item.completed);
        return {
          ...item,
          done: isDone,
          completed: isDone,
          completed_at: isDone ? (item.completed_at || nowIso) : null
        };
      }
      return item;
    });

    const completedCount = updatedItems.filter((i) => i.done || i.completed).length;
    const newProgress = Math.round((completedCount / updatedItems.length) * 100);

    // Optimistically update local selected hire
    const updatedSelectedHire = {
      ...selectedHire,
      checklistItems: updatedItems,
      progress: newProgress,
      tasksCompleted: completedCount,
      totalTasks: updatedItems.length
    };
    setSelectedHire(updatedSelectedHire);

    try {
      await updateOnboardingChecklist({
        id: selectedHire.id,
        checklistItems: updatedItems,
        progress: newProgress
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update task status.'
      });
    }
  };

  const handleDeleteHire = async () => {
    if (!hireToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOnboardingChecklist(hireToDelete.id);
      addToast({
        type: 'success',
        title: 'Checklist Deleted',
        message: `Removed onboarding record for ${hireToDelete.employeeName}.`
      });
      setHireToDelete(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete onboarding record.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openManageModal = (hire) => {
    const items = hire.checklistItems && hire.checklistItems.length > 0
      ? hire.checklistItems
      : DEFAULT_ONBOARDING_TASKS;
    setSelectedHire({
      ...hire,
      checklistItems: items
    });
    setIsManageModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">New Hire Onboarding Tracker</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor orientation progress, equipment provisioning, and buddy allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCohortModalOpen(true)}
          >
            New Orientation Cohort
          </Button>
        </div>
      </div>

      {isLoadingOnboarding && onboarding.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500">
          <p className="text-sm font-medium">Loading onboarding dossiers...</p>
        </div>
      ) : onboarding.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Active Onboarding Cohorts</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All new hires have completed orientation or no cohorts are currently scheduled.
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={() => setIsCohortModalOpen(true)}>
              Schedule Orientation
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {onboarding.map((hire) => {
            const tasks = hire.checklistItems && hire.checklistItems.length > 0
              ? hire.checklistItems
              : DEFAULT_ONBOARDING_TASKS;

            return (
              <div
                key={hire.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
                      {hire.cohort || hire.cohortName || 'Orientation'}
                    </span>
                    <Badge variant={hire.status === 'completed' ? 'success' : 'primary'} size="sm">
                      {hire.department}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-3">{hire.employeeName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{hire.role}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Start Date:</span>
                      <span className="font-semibold text-slate-800">{hire.joinDate}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Assigned Buddy:</span>
                      <span className="font-semibold text-purple-700">{hire.buddy}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Milestone Completion</span>
                      <span className="font-bold text-slate-900">{hire.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full transition-all duration-300"
                        style={{ width: `${hire.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Checklist Progress ({tasks.filter((t) => t.done || t.completed).length}/{tasks.length}):
                    </span>
                    {tasks.slice(0, 3).map((t, idx) => {
                      const isTaskDone = t.done || t.completed;
                      return (
                        <div key={t.id || idx} className="flex items-center gap-2 text-xs text-slate-600">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isTaskDone ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          <span className={`truncate ${isTaskDone ? 'line-through text-slate-400' : ''}`}>
                            {t.title}
                          </span>
                        </div>
                      );
                    })}
                    {tasks.length > 3 && (
                      <p className="text-[10px] text-slate-400 font-medium pl-3.5">
                        +{tasks.length - 3} additional tasks
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => openManageModal(hire)}
                  >
                    Manage Checklist
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2"
                    title="Delete onboarding record"
                    onClick={() => setHireToDelete(hire)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Orientation Cohort */}
      <Modal
        isOpen={isCohortModalOpen}
        onClose={() => setIsCohortModalOpen(false)}
        title="Schedule Orientation Cohort"
        subtitle="Provision equipment and mentorship for a new team member"
      >
        <form onSubmit={handleCreateCohort} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select New Hire Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 text-sm p-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
            >
              <option value="">-- Choose employee --</option>
              {availableEmployees.map((emp) => (
                <option key={emp.dbId || emp.id} value={emp.dbId || emp.id}>
                  {emp.name} ({emp.designation || emp.role} • {emp.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Assigned Buddy / Mentor
            </label>
            <select
              value={selectedBuddyId}
              onChange={(e) => setSelectedBuddyId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 text-sm p-2.5 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              <option value="">-- Optional: Assign Buddy --</option>
              {employees.map((emp) => (
                <option key={emp.dbId || emp.id} value={emp.dbId || emp.id}>
                  {emp.name} ({emp.department})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Cohort / Program Name"
            value={cohortName}
            onChange={(e) => setCohortName(e.target.value)}
            placeholder="e.g. Q4 2026 Orientation Cohort"
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCohortModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Provision Onboarding'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Checklist */}
      <Modal
        isOpen={isManageModalOpen && Boolean(selectedHire)}
        onClose={() => setIsManageModalOpen(false)}
        title={`Checklist: ${selectedHire?.employeeName}`}
        subtitle={`${selectedHire?.role} • ${selectedHire?.department}`}
      >
        {selectedHire && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Cohort: <span className="font-semibold text-slate-800">{selectedHire.cohort || selectedHire.cohortName}</span></p>
                <p className="text-xs text-slate-500 mt-0.5">Buddy: <span className="font-semibold text-purple-700">{selectedHire.buddy}</span></p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{selectedHire.progress}% Completed</span>
                <p className="text-[11px] text-slate-400">
                  {selectedHire.checklistItems?.filter((t) => t.done || t.completed).length || 0} of {selectedHire.checklistItems?.length || 0} tasks
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedHire.checklistItems?.map((task) => {
                const isDone = task.done || task.completed;
                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`p-3 rounded-xl border text-xs flex items-center gap-3 cursor-pointer transition-all ${
                      isDone
                        ? 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                        : 'bg-white border-slate-200 hover:border-purple-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(isDone)}
                      onChange={() => {}} // handled by parent onClick
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </p>
                      {isDone && task.completed_at && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">
                          Completed: {new Date(task.completed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                    {isDone ? (
                      <Badge variant="success" size="sm">Completed</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Pending</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button size="sm" onClick={() => setIsManageModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Confirm Delete */}
      <Modal
        isOpen={Boolean(hireToDelete)}
        onClose={() => setHireToDelete(null)}
        title="Delete Onboarding Record"
        subtitle="This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete the onboarding checklist for{' '}
            <span className="font-bold text-slate-900">{hireToDelete?.employeeName}</span> ({hireToDelete?.cohort || hireToDelete?.cohortName})?
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHireToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteHire}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Record'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
