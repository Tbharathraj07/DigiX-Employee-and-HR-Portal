import React from 'react';
import { CalendarView } from '../../components/calendar/CalendarView';

export const HRCalendar = () => {
  return (
    <div className="space-y-6">
      <CalendarView
        canManage={true}
        title="HR & People Operations Calendar"
        subtitle="Manage company events, holidays, training schedules, and view employee timeline."
      />
    </div>
  );
};
