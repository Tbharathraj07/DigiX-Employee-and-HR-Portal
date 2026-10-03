import React from 'react';
import { CalendarView } from '../../components/calendar/CalendarView';

export const CalendarPage = () => {
  return (
    <div className="space-y-6">
      <CalendarView
        canManage={false}
        title="Employee Calendar"
        subtitle="Official holidays, company events, your approved leaves, and assigned training sessions."
      />
    </div>
  );
};
