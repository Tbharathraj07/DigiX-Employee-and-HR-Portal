import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { TicketListTable } from '../../components/helpdesk/TicketListTable';
import { NewTicketModal } from '../../components/helpdesk/NewTicketModal';
import { TicketDetailModal } from '../../components/helpdesk/TicketDetailModal';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { 
  LifeBuoy, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Filter, 
  RefreshCw,
  MessageSquare
} from 'lucide-react';

export const HelpDeskPage = () => {
  const { user } = useAuth();
  const { tickets, isLoadingTickets, fetchTickets } = usePortalData();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'waiting', 'resolved'
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Filter strictly for the logged-in employee's own tickets
  const myTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Must belong to this employee
      const isOwner =
        (t.employeeUuid && (t.employeeUuid === user?.dbId || t.employeeUuid === user?.id)) ||
        (t.employeeId && (t.employeeId === user?.id || t.employeeId === user?.badgeNumber || t.employeeId === user?.dbId));
      return Boolean(isOwner);
    });
  }, [tickets, user]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = myTickets.length;
    const inProgress = myTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
    const waitingOnMe = myTickets.filter((t) => t.status === 'waiting_for_employee').length;
    const resolved = myTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    return { total, inProgress, waitingOnMe, resolved };
  }, [myTickets]);

  // Filtered tickets based on search, tab, and category
  const filteredTickets = useMemo(() => {
    return myTickets.filter((t) => {
      // Tab filter
      if (activeTab === 'active' && !(t.status === 'open' || t.status === 'in_progress')) return false;
      if (activeTab === 'waiting' && t.status !== 'waiting_for_employee') return false;
      if (activeTab === 'resolved' && !(t.status === 'resolved' || t.status === 'closed')) return false;

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSubject = t.subject?.toLowerCase().includes(q);
        const matchesNumber = t.ticketNumber?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesCategory = t.category?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesNumber && !matchesDesc && !matchesCategory) return false;
      }

      return true;
    });
  }, [myTickets, activeTab, selectedCategory, search]);

  const categories = useMemo(() => {
    const set = new Set(myTickets.map((t) => t.category).filter(Boolean));
    return Array.from(set);
  }, [myTickets]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-digix-600 uppercase tracking-wider mb-1">
            <LifeBuoy className="w-4 h-4" />
            <span>Support & Assistance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            HR Help Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Submit questions to People Operations, track resolution progress, and exchange files securely.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => fetchTickets()}
            className="text-xs"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsNewModalOpen(true)}
            className="shadow-sm shadow-digix-500/20 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Raise HR Ticket
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Tickets</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Lifetime queries</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Active / In Progress */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Active / Queue</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.inProgress}</h3>
            <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">Under review</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Awaiting Reply */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Action Required</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.waitingOnMe}</h3>
            <span className="text-[11px] text-purple-600 font-medium mt-0.5 block">Waiting on your reply</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <MessageSquare className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Resolved</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{stats.resolved}</h3>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Successfully closed</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
            {[
              { id: 'all', label: `All Tickets (${stats.total})` },
              { id: 'active', label: `In Progress (${stats.inProgress})` },
              { id: 'waiting', label: `Waiting on You (${stats.waitingOnMe})` },
              { id: 'resolved', label: `Resolved (${stats.resolved})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2.5">
            <div className="w-full sm:w-60">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket #, subject..."
              />
            </div>

            {categories.length > 0 && (
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
            )}
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <TicketListTable
        tickets={filteredTickets}
        onSelectTicket={(ticket) => setSelectedTicket(ticket)}
        isLoading={isLoadingTickets}
        showEmployeeColumn={false}
        emptyMessage={
          search.trim() || selectedCategory !== 'all' || activeTab !== 'all'
            ? 'No tickets match your active filters.'
            : 'You have not submitted any Help Desk tickets yet.'
        }
      />

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(created) => setSelectedTicket(created)}
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
