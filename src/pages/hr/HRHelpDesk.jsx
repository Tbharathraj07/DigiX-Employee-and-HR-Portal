import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { TicketListTable } from '../../components/helpdesk/TicketListTable';
import { TicketDetailModal } from '../../components/helpdesk/TicketDetailModal';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { 
  LifeBuoy, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Filter, 
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Inbox,
  Sparkles
} from 'lucide-react';

export const HRHelpDesk = () => {
  const { user } = useAuth();
  const { tickets, isLoadingTickets, fetchTickets, employees } = usePortalData();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all'); // 'all', 'unassigned', 'me', or UUID
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Queue Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'open').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const waitingEmployee = tickets.filter((t) => t.status === 'waiting_for_employee').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    const closed = tickets.filter((t) => t.status === 'closed').length;
    const unassigned = tickets.filter((t) => !t.assignedTo).length;
    return { total, open, inProgress, waitingEmployee, resolved, closed, unassigned };
  }, [tickets]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(tickets.map((t) => t.category).filter(Boolean));
    return Array.from(set);
  }, [tickets]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Status
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;

      // Priority
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;

      // Category
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Assignee
      if (selectedAssignee === 'unassigned' && t.assignedTo) return false;
      if (selectedAssignee === 'me') {
        const isMe = t.assignedTo === user?.name || (user?.dbId && t.assignedToId === user?.dbId);
        if (!isMe) return false;
      } else if (selectedAssignee !== 'all' && selectedAssignee !== 'unassigned') {
        if (t.assignedToId !== selectedAssignee && t.assignedTo !== selectedAssignee) return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSubject = t.subject?.toLowerCase().includes(q);
        const matchesNumber = t.ticketNumber?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesEmployee = t.employeeName?.toLowerCase().includes(q);
        const matchesDept = t.department?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesNumber && !matchesDesc && !matchesEmployee && !matchesDept) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, selectedStatus, selectedPriority, selectedCategory, selectedAssignee, search, user]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-digix-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-digix-600" />
            <span>People Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            HR Help Desk & Queue Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Triage employee inquiries, respond to tickets, manage SLA resolutions, and reassign team specialists.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => fetchTickets()}
            className="text-xs"
            title="Refresh queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total In Queue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Inquiries</p>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</h3>
          <span className="text-[10px] text-slate-400">All submissions</span>
        </div>

        {/* Open */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">Open / New</p>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.open}</h3>
          <span className="text-[10px] text-sky-600 font-medium">Pending triage</span>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">In Progress</p>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.inProgress}</h3>
          <span className="text-[10px] text-amber-600 font-medium">Under active review</span>
        </div>

        {/* Waiting on Employee */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Waiting on Staff</p>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.waitingEmployee}</h3>
          <span className="text-[10px] text-purple-600 font-medium">Clarification requested</span>
        </div>

        {/* Resolved */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Resolved</p>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.resolved}</h3>
          <span className="text-[10px] text-emerald-600 font-medium">Solution provided</span>
        </div>

        {/* Unassigned */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-subtle">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Unassigned</p>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.unassigned}</h3>
          <span className="text-[10px] text-rose-600 font-medium">Requires handler</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle space-y-3.5">
        {/* Row 1: Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          {[
            { id: 'all', label: `All (${stats.total})` },
            { id: 'open', label: `Open (${stats.open})` },
            { id: 'in_progress', label: `In Progress (${stats.inProgress})` },
            { id: 'waiting_for_employee', label: `Waiting on Staff (${stats.waitingEmployee})` },
            { id: 'resolved', label: `Resolved (${stats.resolved})` },
            { id: 'closed', label: `Closed (${stats.closed})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === tab.id
                  ? 'bg-digix-50 text-digix-700 border border-digix-200/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 2: Search and Select Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 max-w-sm">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket #, employee, subject..."
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-digix-500 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-digix-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Assignee Filter */}
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-digix-500 cursor-pointer"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned Only</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Queue Table */}
      <TicketListTable
        tickets={filteredTickets}
        onSelectTicket={(ticket) => setSelectedTicket(ticket)}
        isLoading={isLoadingTickets}
        showEmployeeColumn={true}
        emptyMessage="No tickets found matching the selected filters."
      />

      {/* Ticket Conversation Detail Modal */}
      <TicketDetailModal
        isOpen={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        onTicketUpdated={(updated) => {
          if (updated) setSelectedTicket(updated);
        }}
      />
    </div>
  );
};
