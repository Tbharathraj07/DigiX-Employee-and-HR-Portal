import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Building, User, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { usePortalData } from '../../context/DataContext';

export const CreateCalendarEventModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialEvent = null
}) => {
  const { employees = [] } = usePortalData();

  const isEditing = Boolean(initialEvent?.id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    eventType: 'company_event',
    targetAudience: 'all',
    targetDepartment: 'Technology',
    targetEmployeeId: '',
    location: ''
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setFormData({
        title: initialEvent.title || '',
        description: initialEvent.description || '',
        eventDate: initialEvent.eventDate || initialEvent.date || new Date().toISOString().split('T')[0],
        startTime: initialEvent.startTime || '10:00',
        endTime: initialEvent.endTime || '11:00',
        eventType: initialEvent.eventType || 'company_event',
        targetAudience: initialEvent.targetAudience || 'all',
        targetDepartment: initialEvent.targetDepartment || 'Technology',
        targetEmployeeId: initialEvent.targetEmployeeId || (employees[0]?.dbId || employees[0]?.id || ''),
        location: initialEvent.location || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        eventDate: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        eventType: 'company_event',
        targetAudience: 'all',
        targetDepartment: 'Technology',
        targetEmployeeId: employees[0]?.dbId || employees[0]?.id || '',
        location: ''
      });
    }
    setError(null);
  }, [initialEvent, isOpen, employees]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim() || formData.title.trim().length < 3) {
      setError('Event title must be at least 3 characters.');
      return;
    }

    if (!formData.eventDate) {
      setError('Please choose a valid event date.');
      return;
    }

    if (formData.startTime && formData.endTime && formData.endTime < formData.startTime) {
      setError('End time cannot be earlier than start time.');
      return;
    }

    if (formData.targetAudience === 'department' && !formData.targetDepartment) {
      setError('Please select a target department.');
      return;
    }

    if (formData.targetAudience === 'employee' && !formData.targetEmployeeId) {
      setError('Please select a target employee.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('[CreateCalendarEventModal] Submit error:', err);
      setError(err.message || 'Failed to save event. Please check inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const departmentOptions = [
    { value: 'Technology', label: 'Technology' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'IT & Security', label: 'IT & Security' },
    { value: 'Product Management', label: 'Product Management' }
  ];

  const eventTypeOptions = [
    { value: 'company_event', label: 'Company Event' },
    { value: 'town_hall', label: 'Town Hall Meeting' },
    { value: 'meeting', label: 'Team Meeting' },
    { value: 'workshop', label: 'Workshop / Learning' },
    { value: 'engagement', label: 'Employee Engagement' },
    { value: 'holiday_celebration', label: 'Holiday Celebration' },
    { value: 'company_activity', label: 'Company Activity' },
    { value: 'other', label: 'Other Activity' }
  ];

  const employeeOptions = employees.map((emp) => ({
    value: emp.dbId || emp.id,
    label: `${emp.name} (${emp.department || 'Staff'})`
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? 'Edit Company Event' : 'Schedule New Company Event'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add an event to the company calendar with audience targeting.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Q4 Town Hall Meeting"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Event Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Event Type
              </label>
              <Select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                options={eventTypeOptions}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Start Time & End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Time
              </label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                End Time
              </label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          {/* Location / Meeting Room */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Location / Link
            </label>
            <Input
              type="text"
              placeholder="e.g. Conference Room 3B or Zoom Link"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetAudience: 'all' })}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  formData.targetAudience === 'all'
                    ? 'bg-digix-50 border-digix-500 text-digix-700 font-semibold ring-1 ring-digix-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetAudience: 'department' })}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  formData.targetAudience === 'department'
                    ? 'bg-digix-50 border-digix-500 text-digix-700 font-semibold ring-1 ring-digix-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Department
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetAudience: 'employee' })}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
                  formData.targetAudience === 'employee'
                    ? 'bg-digix-50 border-digix-500 text-digix-700 font-semibold ring-1 ring-digix-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Specific Employee
              </button>
            </div>
          </div>

          {/* Department Selection */}
          {formData.targetAudience === 'department' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Department
              </label>
              <Select
                value={formData.targetDepartment}
                onChange={(e) => setFormData({ ...formData, targetDepartment: e.target.value })}
                options={departmentOptions}
              />
            </div>
          )}

          {/* Specific Employee Selection */}
          {formData.targetAudience === 'employee' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Employee
              </label>
              <Select
                value={formData.targetEmployeeId}
                onChange={(e) => setFormData({ ...formData, targetEmployeeId: e.target.value })}
                options={employeeOptions.length > 0 ? employeeOptions : [{ value: '', label: 'No employees found' }]}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide agenda, expectations, or notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-digix-500/20 focus:border-digix-500 transition-all resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Schedule Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
