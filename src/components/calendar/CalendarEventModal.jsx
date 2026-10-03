import React from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building,
  User,
  Trash2,
  Edit2,
  Award,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export const CalendarEventModal = ({
  isOpen,
  onClose,
  item,
  canManage = false,
  onEdit,
  onDelete
}) => {
  if (!isOpen || !item) return null;

  const itemType = item._itemType || (item.holidayType ? 'holiday' : item.eventDate ? 'event' : item.leaveType ? 'leave' : 'item');

  const typeConfig = {
    holiday: {
      title: 'Government Holiday',
      badgeColor: 'rose',
      borderLeft: 'border-l-rose-500',
      badgeText: '🔴 Public Holiday'
    },
    event: {
      title: 'Company Event',
      badgeColor: 'sky',
      borderLeft: 'border-l-sky-500',
      badgeText: '🔵 Company Event'
    },
    leave: {
      title: 'Approved Leave',
      badgeColor: 'emerald',
      borderLeft: 'border-l-emerald-500',
      badgeText: '🟢 Approved Leave'
    },
    training: {
      title: 'Training Session',
      badgeColor: 'purple',
      borderLeft: 'border-l-purple-500',
      badgeText: '🟣 Training'
    }
  }[itemType] || {
    title: 'Calendar Entry',
    badgeColor: 'slate',
    borderLeft: 'border-l-slate-400',
    badgeText: 'Calendar Item'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 border-l-6 ${typeConfig.borderLeft}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                {typeConfig.badgeText}
              </span>
              {item.holidayType && (
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  {item.holidayType}
                </span>
              )}
              {item.eventType && (
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  {item.eventType.replace('_', ' ')}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {item.title || item.name || item.type || 'Calendar Details'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Calendar className="w-4 h-4 text-digix-500 shrink-0" />
              <div>
                <span className="block text-[11px] font-medium text-slate-400 uppercase">Date</span>
                <span className="font-semibold text-slate-900">
                  {item.date || item.eventDate || (item.startDate ? `${item.startDate} to ${item.endDate}` : 'N/A')}
                </span>
              </div>
            </div>

            {(item.startTime || item.duration) && (
              <div className="flex items-center gap-2.5 text-slate-700">
                <Clock className="w-4 h-4 text-digix-500 shrink-0" />
                <div>
                  <span className="block text-[11px] font-medium text-slate-400 uppercase">Time / Duration</span>
                  <span className="font-semibold text-slate-900">
                    {item.startTime ? `${item.startTime}${item.endTime ? ` - ${item.endTime}` : ''}` : item.duration}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Location / Meeting Room */}
          {item.location && (
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="block text-[11px] font-medium text-slate-400 uppercase">Location / Link</span>
                <span className="font-medium text-slate-900">{item.location}</span>
              </div>
            </div>
          )}

          {/* Target Audience (for Company Events) */}
          {item.targetAudience && (
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700">
              <Users className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="block text-[11px] font-medium text-slate-400 uppercase">Target Audience</span>
                <span className="font-medium text-slate-900">
                  {item.targetAudience === 'all'
                    ? 'All Employees (Company-wide)'
                    : item.targetAudience === 'department'
                    ? `Department: ${item.targetDepartment || 'All Departments'}`
                    : `Specific Employee: ${item.targetEmployeeName || item.targetEmployeeId || 'Selected'}`}
                </span>
              </div>
            </div>
          )}

          {/* Instructor / Organizer */}
          {(item.instructor || item.creatorName || item.createdBy) && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Organized by: <strong className="text-slate-800">{item.instructor || item.creatorName || item.createdBy}</strong>
              </span>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Description
              </h4>
              <p className="text-sm text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>
          )}

          {/* Reason (for Leave) */}
          {item.reason && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Leave Reason
              </h4>
              <p className="text-sm text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100 leading-relaxed">
                {item.reason}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canManage && (itemType === 'event' || itemType === 'holiday') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit && onEdit(item)}
                  className="flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete && onDelete(item)}
                  className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
