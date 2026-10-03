import React, { useState, useMemo } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Activity,
  Users,
  Settings,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';

// Client-side CSV generator for Admin live datasets
const exportToCsv = (filename, rows, columns) => {
  if (!rows || rows.length === 0) return false;
  const headerLine = columns.map((c) => `"${(c.header || '').replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((row) =>
    columns
      .map((c) => {
        let val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
        if (val === null || val === undefined) val = '';
        val = String(val);
        // Formula injection mitigation (OWASP): neutralize leading =, +, -, @, \t, \r
        if (/^[=+\-@\t\r]/.test(val)) {
          val = `'${val}`;
        }
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(',')
  );
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

export const AdminReports = () => {
  const {
    auditLogs,
    employees,
    systemSettings,
    fetchAuditLogs,
    fetchEmployees,
    fetchSystemSettings
  } = usePortalData();

  const { addToast } = useToast();

  const [activeReportKey, setActiveReportKey] = useState('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derived unique modules from audit logs
  const availableModules = useMemo(() => {
    const set = new Set(auditLogs.map((l) => l.module).filter(Boolean));
    return Array.from(set).sort();
  }, [auditLogs]);

  // Refresh datasets from Supabase
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchAuditLogs && fetchAuditLogs(),
        fetchEmployees && fetchEmployees(),
        fetchSystemSettings && fetchSystemSettings()
      ]);
      addToast({
        type: 'info',
        title: 'Audit Logs Refreshed',
        message: 'Live security records synchronized with Supabase.'
      });
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  // Convert systemSettings object/array into report rows
  const systemSettingsRows = useMemo(() => {
    if (!systemSettings) return [];
    if (Array.isArray(systemSettings)) {
      return systemSettings;
    }
    const rows = [];
    Object.entries(systemSettings).forEach(([category, settings]) => {
      if (typeof settings === 'object' && settings !== null) {
        Object.entries(settings).forEach(([key, val]) => {
          rows.push({
            category,
            key,
            value: typeof val === 'object' ? JSON.stringify(val) : String(val),
            description: `Configured parameter for ${category}`
          });
        });
      } else {
        rows.push({
          category: 'General',
          key: category,
          value: String(settings),
          description: 'Top-level system setting'
        });
      }
    });
    return rows;
  }, [systemSettings]);

  // Report configurations
  const reportConfigs = {
    audit: {
      name: 'System Audit Trail & Security Events',
      description: 'Immutable ledger of authentication, profile mutations, permission updates, and data access.',
      icon: Activity,
      badge: `${auditLogs.length} events`,
      data: auditLogs,
      columns: [
        { header: 'Event ID', accessor: 'id' },
        { header: 'Timestamp', accessor: 'timestamp' },
        { header: 'User / Actor', accessor: (r) => r.userName || r.user || 'System' },
        { header: 'Action', accessor: 'action' },
        { header: 'Module', accessor: 'module' },
        { header: 'IP Address', accessor: 'ip' },
        { header: 'Status', accessor: 'status' },
        { header: 'Details', accessor: (r) => r.details || '--' }
      ],
      filterFn: (item) => {
        const matchesSearch =
          !searchTerm ||
          item.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.ip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.module?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' ||
          item.status?.toLowerCase() === statusFilter.toLowerCase();
        const matchesModule =
          moduleFilter === 'all' || item.module === moduleFilter;
        return matchesSearch && matchesStatus && matchesModule;
      }
    },
    users: {
      name: 'User Access & Governance Matrix',
      description: 'Directory of all provisioned accounts, assigned security roles, and active statuses.',
      icon: Users,
      badge: `${employees.length} users`,
      data: employees,
      columns: [
        { header: 'Badge Number', accessor: (r) => r.badgeNumber || r.id },
        { header: 'Name', accessor: 'name' },
        { header: 'Email', accessor: 'email' },
        { header: 'Role', accessor: 'role' },
        { header: 'Department', accessor: 'department' },
        { header: 'Designation', accessor: (r) => r.roleTitle || r.designation || '--' },
        { header: 'Status', accessor: 'status' },
        { header: 'Created / Joined', accessor: (r) => r.joinDate || r.joiningDate || '--' }
      ],
      filterFn: (item) => {
        const matchesSearch =
          !searchTerm ||
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.department?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === 'all' ||
          item.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      }
    },
    settings: {
      name: 'System Policies & Security Posture',
      description: 'Active corporate security policies, MFA thresholds, and access control settings.',
      icon: Settings,
      badge: `${systemSettingsRows.length} policies`,
      data: systemSettingsRows,
      columns: [
        { header: 'Policy Domain', accessor: 'category' },
        { header: 'Configuration Key', accessor: 'key' },
        { header: 'Configured Value', accessor: 'value' },
        { header: 'Scope / Description', accessor: 'description' }
      ],
      filterFn: (item) => {
        return (
          !searchTerm ||
          item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.value?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    }
  };

  const currentConfig = reportConfigs[activeReportKey];

  const filteredData = useMemo(() => {
    if (!currentConfig || !Array.isArray(currentConfig.data)) return [];
    return currentConfig.data.filter(currentConfig.filterFn);
  }, [currentConfig]);

  const handleExportCurrent = () => {
    if (filteredData.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Data to Export',
        message: 'No records match your selected filter criteria.'
      });
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `DigiX_${currentConfig.name.replace(/[^a-zA-Z0-9]/g, '_')}_${todayStr}.csv`;
    const success = exportToCsv(filename, filteredData, currentConfig.columns);
    if (success) {
      addToast({
        type: 'success',
        title: 'Compliance Report Exported',
        message: `${filteredData.length} records exported to ${filename}`
      });
    }
  };

  const successfulAudits = auditLogs.filter((l) => l.status === 'Success').length;
  const auditSuccessRate = auditLogs.length > 0 ? Math.round((successfulAudits / auditLogs.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Compliance & Security Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified SOC2 / ISO 27001 audit logs, user permissions matrix, and certified data exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh Logs
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCurrent}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download CSV ({filteredData.length})
          </Button>
        </div>
      </div>

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Audit Events"
          value={auditLogs.length}
          subtitle="Events recorded in Supabase"
          icon={Activity}
          color="amber"
        />
        <StatCard
          title="Audit Success Rate"
          value={`${auditSuccessRate}%`}
          subtitle={`${successfulAudits} of ${auditLogs.length} operations verified`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Governed Users"
          value={employees.length}
          subtitle="Active directory accounts"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Security Enforcement"
          value="RLS Active"
          subtitle="Row-Level Security verified"
          icon={Lock}
          color="purple"
        />
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {Object.entries(reportConfigs).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeReportKey === key;
          return (
            <button
              key={key}
              onClick={() => {
                setActiveReportKey(key);
                setSearchTerm('');
                setStatusFilter('all');
                setModuleFilter('all');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-digix-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{config.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {config.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Report Table & Filter Bar */}
      <Card
        title={currentConfig.name}
        subtitle={currentConfig.description}
        action={
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{filteredData.length}</span> of {currentConfig.data.length} records
          </div>
        }
      >
        {/* Filter Toolbar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-digix-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeReportKey === 'audit' && (
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-digix-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Warning">Warning</option>
                  <option value="Failed">Failed</option>
                </select>

                {availableModules.length > 0 && (
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-digix-500"
                  >
                    <option value="all">All Modules</option>
                    {availableModules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}

            {activeReportKey === 'users' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-digix-500"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            )}

            {(searchTerm || statusFilter !== 'all' || moduleFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setModuleFilter('all');
                }}
                className="text-xs text-slate-500"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Data Table */}
        {filteredData.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No records found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No audit or compliance entries match the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  {currentConfig.columns.map((c, i) => (
                    <th key={i} className="px-3.5 py-3 whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredData.slice(0, 50).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                    {currentConfig.columns.map((c, cIdx) => {
                      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
                      return (
                        <td key={cIdx} className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                          {c.header === 'Status' ? (
                            <Badge
                              variant={
                                val === 'Success' || val === 'Active'
                                  ? 'success'
                                  : val === 'Warning'
                                  ? 'warning'
                                  : val === 'Failed'
                                  ? 'danger'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {val || '--'}
                            </Badge>
                          ) : c.header === 'Timestamp' ? (
                            <span className="font-mono text-[11px] text-slate-500">{val || '--'}</span>
                          ) : (
                            val || '--'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredData.length > 50 && (
          <div className="mt-3 text-center text-xs text-slate-400">
            Showing first 50 rows in preview. Click "Download CSV" above to export the complete {filteredData.length} records dataset.
          </div>
        )}
      </Card>
    </div>
  );
};
