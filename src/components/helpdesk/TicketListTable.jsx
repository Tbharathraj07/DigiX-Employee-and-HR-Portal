import React from 'react';
import { 
  LifeBuoy, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Paperclip, 
  User, 
  ArrowRight,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export const STATUS_CONFIG = {
  open: {
    label: 'Open',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80 ring-1 ring-sky-500/10',
    dotClass: 'bg-sky-500'
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 ring-1 ring-amber-500/10',
    dotClass: 'bg-amber-500'
  },
  waiting_for_employee: {
    label: 'Waiting on Employee',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80 ring-1 ring-purple-500/10',
    dotClass: 'bg-purple-500'
  },
  resolved: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10',
    dotClass: 'bg-emerald-500'
  },
  closed: {
    label: 'Closed',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 ring-1 ring-slate-400/10',
    dotClass: 'bg-slate-400'
  }
};

export const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    indicator: 'text-rose-500'
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    indicator: 'text-amber-500'
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    indicator: 'text-emerald-500'
  }
};

export const TicketListTable = ({
  tickets = [],
  onSelectTicket,
  isLoading = false,
  emptyMessage = 'No support tickets found.',
  showEmployeeColumn = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden p-8">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-slate-50/70 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-6 bg-slate-200 rounded-md" />
                <div className="space-y-2">
                  <div className="w-64 h-4 bg-slate-200 rounded" />
                  <div className="w-32 h-3 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-6 bg-slate-200 rounded-full" />
                <div className="w-24 h-6 bg-slate-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-digix-50 text-digix-600 flex items-center justify-center mb-3">
          <LifeBuoy className="w-7 h-7 stroke-[1.8]" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">{emptyMessage}</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Need assistance with payroll, leave, health benefits, or company policies? Submit a ticket anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4">Ticket</th>
              {showEmployeeColumn && <th className="py-3.5 px-4">Employee</th>}
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Assigned To</th>
              <th className="py-3.5 px-4">Last Updated</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
            {tickets.map((ticket) => {
              const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
              const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
              const formattedDate = ticket.updatedAt
                ? new Date(ticket.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Just now';

              return (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket && onSelectTicket(ticket)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group"
                >
                  {/* Ticket Info */}
                  <td className="py-4 px-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <span className="font-mono text-[11px] font-semibold text-digix-600 bg-digix-50 px-2 py-0.5 rounded-md border border-digix-100/80">
                          {ticket.ticketNumber}
                        </span>
                      </div>
                      <div className="min-w-0 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-900 truncate group-hover:text-digix-700 transition-colors">
                            {ticket.subject}
                          </p>
                          {(ticket.initialAttachmentName || ticket.initialAttachmentUrl) && (
                            <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" title="Has attachment" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {ticket.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Employee Column (HR / Admin view) */}
                  {showEmployeeColumn && (
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <img
                          src={ticket.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={ticket.employeeName}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">
                            {ticket.employeeName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {ticket.department}
                          </p>
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Category */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {ticket.category}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${priorityCfg.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
                      {priorityCfg.label}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>
                  </td>

                  {/* Assigned To */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {ticket.assignedTo ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <div className="w-5 h-5 rounded-full bg-digix-100 text-digix-700 flex items-center justify-center text-[10px] font-bold">
                          {ticket.assignedTo.charAt(0)}
                        </div>
                        <span className="font-medium truncate max-w-[120px]">{ticket.assignedTo}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Last Updated */}
                  <td className="py-4 px-4 whitespace-nowrap text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center text-xs font-semibold text-digix-600 group-hover:text-digix-700 gap-0.5 transition-colors">
                      View
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
