import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { TicketListTable } from '../../components/helpdesk/TicketListTable';
import { TicketDetailModal } from '../../components/helpdesk/TicketDetailModal';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { 
  ShieldCheck, 
  LifeBuoy, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  Building,
  TrendingUp,
  Layers
} from 'lucide-react';

export const AdminHelpDesk = () => {
  const { user } = useAuth();
  const { tickets, isLoadingTickets, fetchTickets, auditLogs } = usePortalData();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Help Desk audit logs
  const helpDeskAuditLogs = useMemo(() => {
    return (auditLogs || []).filter(
      (l) => l.module === 'HelpDesk' || l.action?.includes('TICKET') || l.details?.ticket_id
    );
  }, [auditLogs]);

  // Macro Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    const highPriority = tickets.filter((t) => t.priority === 'high').length;
    const active = total - resolved;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    return { total, resolved, highPriority, active, resolutionRate };
  }, [tickets]);

  // Category Distribution
  const categoryStats = useMemo(() => {
    const map = {};
    tickets.forEach((t) => {
      const cat = t.category || 'General';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  // Department Breakdown
  const deptStats = useMemo(() => {
    const map = {};
    tickets.forEach((t) => {
      const dept = t.department || 'Other';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSubject = t.subject?.toLowerCase().includes(q);
        const matchesNumber = t.ticketNumber?.toLowerCase().includes(q);
        const matchesEmployee = t.employeeName?.toLowerCase().includes(q);
        const matchesDept = t.department?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesNumber && !matchesEmployee && !matchesDept) return false;
      }
      return true;
    });
  }, [tickets, selectedStatus, selectedCategory, search]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-digix-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-digix-600" />
            <span>System Administration & Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Help Desk Oversight & SLA Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organization-level Help Desk visibility, SLA turnaround metrics, category distribution, and tamper-evident audit records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/security-logs"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            Security & Audit Trail ({helpDeskAuditLogs.length})
          </Link>

          <Button
            variant="secondary"
            onClick={() => fetchTickets()}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTickets ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inquiries */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Organization Tickets</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</h3>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Across all departments</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">SLA Resolution Rate</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.resolutionRate}%</h3>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">{stats.resolved} of {stats.total} resolved</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <TrendingUp className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Active Backlog */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Active Queue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.active}</h3>
            <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">Open or in-progress</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* High Priority Attention */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">High Priority Queries</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.highPriority}</h3>
            <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">Escalated inquiries</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertTriangle className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-digix-600" />
              Volume by Inquiry Category
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">{categoryStats.length} Categories</span>
          </div>
          <div className="space-y-3">
            {categoryStats.map(([cat, count]) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat}</span>
                    <span className="font-semibold text-slate-900">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-digix-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              Volume by Employee Department
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">{deptStats.length} Departments</span>
          </div>
          <div className="space-y-3">
            {deptStats.map(([dept, count]) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{dept}</span>
                    <span className="font-semibold text-slate-900">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Organization Tickets Explorer */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            All Organization Tickets ({filteredTickets.length})
          </h3>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-full sm:w-60">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket, employee..."
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-digix-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_for_employee">Waiting for Employee</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <TicketListTable
          tickets={filteredTickets}
          onSelectTicket={(ticket) => setSelectedTicket(ticket)}
          isLoading={isLoadingTickets}
          showEmployeeColumn={true}
          emptyMessage="No tickets found matching the selected filters."
        />
      </div>

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
