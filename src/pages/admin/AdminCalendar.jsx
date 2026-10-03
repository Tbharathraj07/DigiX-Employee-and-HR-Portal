import React from 'react';
import { CalendarView } from '../../components/calendar/CalendarView';

export const AdminCalendar = () => {
  return (
    <div className="space-y-6">
      <CalendarView
        canManage={true}
        title="Admin Organization Calendar"
        subtitle="Company-wide calendar management, public holiday governance, and global event scheduling."
      />
    </div>
  );
};
