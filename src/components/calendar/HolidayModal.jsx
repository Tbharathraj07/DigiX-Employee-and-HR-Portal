import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

export const HolidayModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialHoliday = null
}) => {
  const isEditing = Boolean(initialHoliday?.id);

  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    holidayType: 'national',
    location: 'All Locations',
    description: ''
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialHoliday) {
      setFormData({
        name: initialHoliday.name || '',
        date: initialHoliday.date || new Date().toISOString().split('T')[0],
        holidayType: initialHoliday.holidayType || 'national',
        location: initialHoliday.location || 'All Locations',
        description: initialHoliday.description || ''
      });
    } else {
      setFormData({
        name: '',
        date: new Date().toISOString().split('T')[0],
        holidayType: 'national',
        location: 'All Locations',
        description: ''
      });
    }
    setError(null);
  }, [initialHoliday, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Holiday name must be at least 2 characters.');
      return;
    }

    if (!formData.date) {
      setError('Please choose a valid holiday date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('[HolidayModal] Submit error:', err);
      setError(err.message || 'Failed to save holiday record. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const holidayTypeOptions = [
    { value: 'national', label: 'National Holiday' },
    { value: 'public', label: 'Public / Gazetted Holiday' },
    { value: 'state', label: 'State / Regional Holiday' },
    { value: 'restricted', label: 'Restricted / Optional Holiday' },
    { value: 'company', label: 'Company Declared Holiday' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/40 border-l-6 border-l-rose-500">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? 'Edit Government Holiday' : 'Add Government Holiday'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Holidays will be highlighted in RED on the calendar for all employees.
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

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Holiday Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Independence Day"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Date & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Holiday Type
              </label>
              <Select
                value={formData.holidayType}
                onChange={(e) => setFormData({ ...formData, holidayType: e.target.value })}
                options={holidayTypeOptions}
              />
            </div>
          </div>

          {/* Location / Applicable Centers */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Applicable Location
            </label>
            <Input
              type="text"
              placeholder="e.g. All Locations, Hyderabad, or Austin"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Significance
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of the holiday..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700">
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Holiday' : 'Add Holiday'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
