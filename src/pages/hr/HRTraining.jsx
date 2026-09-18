import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  Plus,
  GraduationCap,
  Users,
  Clock,
  Calendar,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  UserPlus,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Technical',
  'Security & Compliance',
  'Compliance',
  'Leadership',
  'Soft Skills',
  'Product & Design'
];

const DEPARTMENT_OPTIONS = [
  'Technology',
  'Product',
  'Product Design',
  'Human Resources',
  'Data & AI',
  'Finance & Ops'
];

export const HRTraining = () => {
  const { trainings, createTraining, updateTraining, deleteTraining, joinTraining, employees } = usePortalData();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);

  // Form states for Create / Edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    instructor: '',
    duration: '3.0 hours',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    isMandatory: false,
    assignmentType: 'all', // 'all' | 'department' | 'specific'
    assignedDepartments: ['Technology'],
    assignedEmployees: []
  });

  // Additional employee to enroll from details modal
  const [employeeToEnroll, setEmployeeToEnroll] = useState('');

  // Metrics
  const totalPrograms = trainings.length;
  const mandatoryPrograms = trainings.filter((t) => t.isMandatory).length;
  const totalEnrollments = trainings.reduce((acc, t) => acc + (t.enrolledEmployees?.length || 0), 0);
  const avgCompletion = totalPrograms > 0
    ? Math.round(trainings.reduce((acc, t) => acc + (t.completionPercentage || 0), 0) / totalPrograms)
    : 0;

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Technical',
      instructor: user?.name ? `${user.name}, HR Manager` : 'Priyanka, HR Manager',
      duration: '3.0 hours',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      isMandatory: false,
      assignmentType: 'all',
      assignedDepartments: ['Technology'],
      assignedEmployees: []
    });
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (course) => {
    setSelectedTraining(course);
    setFormData({
      title: course.title || '',
      description: course.description || '',
      category: course.category || 'Technical',
      instructor: course.instructor || '',
      duration: course.duration || '3.0 hours',
      startDate: course.startDate || new Date().toISOString().split('T')[0],
      endDate: course.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      isMandatory: !!course.isMandatory,
      assignmentType: course.assignmentType || 'all',
      assignedDepartments: course.assignedDepartments || ['Technology'],
      assignedEmployees: course.assignedEmployees || []
    });
    setIsEditOpen(true);
  };

  // Open Details Modal
  const openDetailsModal = (course) => {
    setSelectedTraining(course);
    setEmployeeToEnroll('');
    setIsDetailsOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (course) => {
    setSelectedTraining(course);
    setIsDeleteOpen(true);
  };

  // Handle Create Submit
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const createdBy = user?.name ? `${user.name}, ${user.roleTitle || 'HR Manager'}` : 'Priyanka, HR Manager';
    const newCourse = createTraining(formData, createdBy);

    setIsCreateOpen(false);
    addToast({
      type: 'success',
      title: 'Training Module Published',
      message: `"${newCourse.title}" is now available and assigned in the portal.`
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!selectedTraining || !formData.title.trim()) return;

    updateTraining(selectedTraining.id, formData);
    setIsEditOpen(false);
    setSelectedTraining(null);
    addToast({
      type: 'success',
      title: 'Training Updated',
      message: `Modifications to "${formData.title}" have been saved.`
    });
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = () => {
    if (!selectedTraining) return;
    deleteTraining(selectedTraining.id);
    setIsDeleteOpen(false);
    setSelectedTraining(null);
    addToast({
      type: 'info',
      title: 'Training Program Removed',
      message: 'The training curriculum has been successfully archived.'
    });
  };

  // Handle Manual Enrollment from Details Modal
  const handleManualEnroll = () => {
    if (!selectedTraining || !employeeToEnroll) return;
    const targetEmp = employees.find((e) => e.id === employeeToEnroll);
    if (!targetEmp) return;

    joinTraining(selectedTraining.id, targetEmp);
    setEmployeeToEnroll('');

    // Update local selectedTraining view
    setSelectedTraining((prev) => {
      const already = prev.enrolledEmployees?.some((e) => (typeof e === 'string' ? e === targetEmp.id : e.id === targetEmp.id));
      if (already) return prev;
      return {
        ...prev,
        enrolledEmployees: [
          ...(prev.enrolledEmployees || []),
          {
            id: targetEmp.id,
            name: targetEmp.name,
            enrolledDate: new Date().toISOString().split('T')[0],
            progress: 0,
            completedDate: null
          }
        ]
      };
    });

    addToast({
      type: 'success',
      title: 'Employee Enrolled',
      message: `${targetEmp.name} has been enrolled in ${selectedTraining.title}.`
    });
  };

  // Specific employee toggle in Create / Edit
  const toggleSpecificEmployee = (empId) => {
    setFormData((prev) => {
      const current = prev.assignedEmployees || [];
      const updated = current.includes(empId)
        ? current.filter((id) => id !== empId)
        : [...current, empId];
      return { ...prev, assignedEmployees: updated };
    });
  };

  const columns = [
    {
      header: 'Course Title & Category',
      render: (row) => (
        <div className="space-y-1 py-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-xs">{row.title}</span>
            {row.isMandatory && (
              <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-500" /> Mandatory
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Badge variant="primary" size="sm">
              {row.category}
            </Badge>
            <span>•</span>
            <span className="font-mono">{row.id}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Instructor & Duration',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <p className="font-medium text-slate-800">{row.instructor}</p>
          <p className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {row.duration}
          </p>
        </div>
      )
    },
    {
      header: 'Schedule',
      render: (row) => (
        <div className="text-xs text-slate-600 space-y-0.5">
          <p>{row.startDate}</p>
          <p className="text-slate-400 text-[11px]">to {row.endDate}</p>
        </div>
      )
    },
    {
      header: 'Target Audience',
      render: (row) => {
        if (row.assignmentType === 'all') {
          return (
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
              All Employees
            </span>
          );
        }
        if (row.assignmentType === 'department') {
          return (
            <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
              Dept: {row.assignedDepartments?.join(', ') || 'General'}
            </span>
          );
        }
        return (
          <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
            {row.assignedEmployees?.length || 0} Employees
          </span>
        );
      }
    },
    {
      header: 'Enrolled',
      render: (row) => (
        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
          {row.enrolledEmployees?.length || 0} staff
        </span>
      )
    },
    {
      header: 'Compliance Rate',
      render: (row) => {
        const comp = row.completionPercentage ?? 0;
        return (
          <div className="w-28">
            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
              <span className="font-medium text-slate-700">{comp}% avg</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  comp === 100 ? 'bg-emerald-500' : 'bg-digix-500'
                }`}
                style={{ width: `${comp}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openDetailsModal(row)}
            title="View Details"
            className="p-1.5 text-slate-600 hover:text-digix-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(row)}
            title="Edit Course"
            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteModal(row)}
            title="Delete Course"
            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Corporate Training Programs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Design mandatory compliance curriculums, target department cohorts, and monitor completion rates across teams.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
          Create Training Program
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Active Programs</p>
            <BookOpen className="w-4 h-4 text-digix-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalPrograms}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Corporate modules available</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Mandatory Programs</p>
            <ShieldCheck className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{mandatoryPrograms}</p>
          <p className="text-[11px] text-rose-600 mt-0.5">Required compliance tracks</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Staff Enrollments</p>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalEnrollments}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active participant slots</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Average Compliance</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{avgCompletion}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Organization completion rate</p>
        </Card>
      </div>

      {/* Main Table */}
      <Table columns={columns} data={trainings} />

      {/* CREATE TRAINING MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Training Curriculum"
        subtitle="Publish a new corporate course to the DigiX Portal and target employees"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Course Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Advanced System Architecture & Security"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Course Description & Objectives
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Outline syllabus, key topics covered, prerequisites, and learning objectives..."
              className="block w-full rounded-lg border border-slate-300 text-sm py-2 px-3 focus:border-digix-500 focus:ring-1 focus:ring-digix-500 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={CATEGORY_OPTIONS}
            />
            <Input
              label="Lead Instructor / Speaker"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              placeholder="e.g. Priyanka, HR Manager"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Estimated Duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="e.g. 3.0 hours"
              required
            />
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date (Deadline)"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>

          {/* Mandatory Checkbox */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Mandatory Compliance Training</p>
              <p className="text-[11px] text-slate-500">
                Flag this curriculum as mandatory for employee compliance and annual review.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isMandatory}
                onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-digix-600"></div>
            </label>
          </div>

          {/* Assign To Options */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Target Audience / Assign To</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, assignmentType: 'all' })}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  formData.assignmentType === 'all'
                    ? 'bg-digix-50 border-digix-500 text-digix-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Employees
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, assignmentType: 'department' })}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  formData.assignmentType === 'department'
                    ? 'bg-digix-50 border-digix-500 text-digix-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                By Department
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, assignmentType: 'specific' })}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  formData.assignmentType === 'specific'
                    ? 'bg-digix-50 border-digix-500 text-digix-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Specific Employees
              </button>
            </div>

            {formData.assignmentType === 'department' && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Select
                  label="Select Department Target"
                  value={formData.assignedDepartments[0] || 'Technology'}
                  onChange={(e) => setFormData({ ...formData, assignedDepartments: [e.target.value] })}
                  options={DEPARTMENT_OPTIONS}
                />
              </div>
            )}

            {formData.assignmentType === 'specific' && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 mb-1">
                  Select Employees to Assign ({formData.assignedEmployees.length} selected):
                </p>
                {employees.map((emp) => {
                  const isSelected = formData.assignedEmployees.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'bg-digix-50 border-digix-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSpecificEmployee(emp.id)}
                          className="rounded text-digix-600 focus:ring-digix-500 border-slate-300"
                        />
                        <span className="font-semibold text-slate-800">{emp.name}</span>
                        <span className="text-[11px] text-slate-400">({emp.id} • {emp.department})</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Publish Program
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TRAINING MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Training Program"
        subtitle={`Update settings for ${selectedTraining?.title}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Course Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Course Description & Objectives
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 text-sm py-2 px-3 focus:border-digix-500 focus:ring-1 focus:ring-digix-500 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={CATEGORY_OPTIONS}
            />
            <Input
              label="Lead Instructor / Speaker"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Estimated Duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              required
            />
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date (Deadline)"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Mandatory Compliance Training</p>
              <p className="text-[11px] text-slate-500">
                Flag this curriculum as mandatory for employee compliance.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isMandatory}
                onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-digix-600"></div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTraining?.title || 'Training Program Details'}
        subtitle={`Module Code: ${selectedTraining?.id} • Published by ${selectedTraining?.createdBy || 'HR Operations'}`}
        maxWidth="max-w-3xl"
      >
        {selectedTraining && (
          <div className="space-y-5">
            {/* Meta summary pill bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <Badge variant="primary" size="sm">
                {selectedTraining.category}
              </Badge>
              {selectedTraining.isMandatory && (
                <Badge variant="danger" size="sm">
                  Mandatory Compliance
                </Badge>
              )}
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">Instructor: <strong className="text-slate-800">{selectedTraining.instructor}</strong></span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">Duration: <strong className="text-slate-800">{selectedTraining.duration}</strong></span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">Schedule: <strong className="text-slate-800">{selectedTraining.startDate} to {selectedTraining.endDate}</strong></span>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">Course Description & Curriculum</h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                {selectedTraining.description}
              </p>
            </div>

            {/* Enrolled Employees Roster */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Enrolled Staff Roster ({selectedTraining.enrolledEmployees?.length || 0})</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  Average completion: {selectedTraining.completionPercentage || 0}%
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Enrolled Date</th>
                      <th className="py-2.5 px-3">Progress</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTraining.enrolledEmployees && selectedTraining.enrolledEmployees.length > 0 ? (
                      selectedTraining.enrolledEmployees.map((empItem, idx) => {
                        const empId = typeof empItem === 'string' ? empItem : empItem.id;
                        const empName = typeof empItem === 'string' ? (employees.find((e) => e.id === empItem)?.name || empItem) : empItem.name;
                        const progress = selectedTraining.progressByEmployee?.[empId] ?? (typeof empItem === 'object' ? empItem.progress : 0) ?? 0;
                        const enrolledDate = typeof empItem === 'object' ? empItem.enrolledDate : '2026-09-01';
                        const isDone = progress === 100;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {empName} <span className="text-slate-400 font-mono text-[11px]">({empId})</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{enrolledDate || 'Recent'}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : 'bg-digix-500'}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-semibold text-slate-700">{progress}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {isDone ? (
                                <Badge variant="success" size="sm">Completed</Badge>
                              ) : (
                                <Badge variant="primary" size="sm">In Progress</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                          No employees enrolled in this program yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Enroll More Staff Action Box */}
            <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-purple-600" /> Enroll More Employees
                </p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Directly register staff members into this course from People Operations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={employeeToEnroll}
                  onChange={(e) => setEmployeeToEnroll(e.target.value)}
                  className="rounded-lg border border-purple-200 text-xs py-1.5 px-2 bg-white text-slate-800 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees
                    .filter(
                      (emp) =>
                        !selectedTraining.enrolledEmployees?.some((en) =>
                          (typeof en === 'string' ? en === emp.id : en.id === emp.id)
                        )
                    )
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!employeeToEnroll}
                  onClick={handleManualEnroll}
                >
                  Enroll
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Archive Training Program"
        subtitle="Are you sure you wish to delete this course curriculum?"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Deleting <strong className="text-slate-900">"{selectedTraining?.title}"</strong> will remove it from both HR management and the employee learning catalog. This action will be logged in the DigiX compliance audit log.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
              Yes, Delete Program
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
