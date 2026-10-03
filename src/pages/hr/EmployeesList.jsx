import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Table } from '../../components/common/Table';
import { SearchInput } from '../../components/common/SearchInput';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { UserPlus, Download, Eye, RotateCw, AlertCircle } from 'lucide-react';

export const EmployeesList = () => {
  const { isSupabaseAuth } = useAuth();
  const { employees, addEmployee, isLoadingEmployees, employeesError, fetchEmployees } = usePortalData();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New employee state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [location, setLocation] = useState('San Francisco, CA');
  const [salary, setSalary] = useState('$130,000');
  const [band, setBand] = useState('L5 - Senior');

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      await addEmployee({
        name,
        email,
        roleTitle,
        department,
        location,
        salary,
        band,
        role: 'employee'
      });

      setIsModalOpen(false);
      setName('');
      setEmail('');
      setRoleTitle('');
      addToast({
        type: 'success',
        title: 'Employee Added',
        message: `${name} has been enrolled in the DigiX HR Directory.`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Add Employee',
        message: err.message || 'Error creating employee record.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const departments = ['All', 'Engineering', 'Product Design', 'Human Resources', 'Data & AI', 'Marketing', 'IT & Security'];

  const filtered = employees.filter((emp) => {
    const matchesDept = departmentFilter === 'All' || emp.department === departmentFilter;
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.roleTitle.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const columns = [
    {
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatar}
            alt={row.name}
            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200"
          />
          <div>
            <span className="font-bold text-slate-900 block">{row.name}</span>
            <span className="text-xs text-slate-400 font-mono">{row.id}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Designation',
      render: (row) => (
        <div>
          <span className="text-xs font-medium text-slate-800 block">{row.roleTitle}</span>
          <span className="text-[11px] text-slate-400">{row.department}</span>
        </div>
      )
    },
    {
      header: 'Band / Level',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
          {row.band || 'L5'}
        </span>
      )
    },
    { header: 'Location', accessor: 'location', cellClassName: 'text-xs text-slate-600' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge variant="success" size="sm" dot>
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/hr/profiles');
          }}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          View Profile
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive list of active DigiX employees with roles, bands, and departmental records.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() =>
              addToast({
                type: 'info',
                title: 'Export Generated',
                message: 'Exporting complete employee directory as CSV...'
              })
            }
          >
            Export
          </Button>

          <Button
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Employee
          </Button>
        </div>
      </div>

      {employeesError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{employeesError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchEmployees}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search by name, role, email, ID..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setDepartmentFilter(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                departmentFilter === d
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filtered}
        isLoading={isLoadingEmployees}
        emptyMessage="No employees found in directory."
      />

      {/* Add Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Employee"
        subtitle="Register a new workforce member to DigiX Technologies"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Miller"
              required
            />
            <Input
              label="Corporate Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan.m@digix.internal"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Cloud Engineer"
              required
            />
            <Select
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={departments.filter((d) => d !== 'All')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Corporate Band"
              value={band}
              onChange={(e) => setBand(e.target.value)}
              options={['L3 - Associate', 'L4 - Mid Level', 'L5 - Senior', 'L6 - Staff/Lead', 'L7 - Director']}
            />
            <Input
              label="Annual Salary"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="$120,000"
            />
          </div>

          <Input
            label="Work Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Seattle, WA (Remote)"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Employee'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
