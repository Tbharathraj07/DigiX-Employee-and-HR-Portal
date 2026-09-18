import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, StatCard } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  CalendarCheck,
  CalendarOff,
  CheckSquare,
  FolderKanban,
  Clock,
  ArrowUpRight,
  Sparkles,
  Bot,
  Megaphone,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const {
    tasks,
    toggleTaskStatus,
    projects,
    leaveBalances,
    attendance,
    isPunchedIn,
    togglePunchIn,
    announcements,
    getLiveWorkingDuration
  } = usePortalData();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const userTasks = tasks.filter((t) => t.assignedTo === user?.name || t.assignedTo === 'Tarumani Bharath Raj' || t.assignedTo === user?.id);
  const pendingTasks = userTasks.filter((t) => t.status !== 'completed');
  const userProjects = projects.filter((p) => p.teamMembers.includes(user?.name) || p.teamMembers.includes('Tarumani Bharath Raj'));

  const totalLeavesAvailable =
    leaveBalances.casual.available +
    leaveBalances.sick.available +
    leaveBalances.privilege.available;

  // Real-time today's attendance record
  const todayAttendance = attendance.find(
    (a) =>
      (a.employeeId === user?.id || a.employeeId === user?.badgeNumber || a.employeeName === user?.name) &&
      (a.dateKey === new Date().toISOString().split('T')[0] || a.dateKey === 'TODAY')
  );
  const isActive = todayAttendance?.isActive ?? isPunchedIn;
  const liveDuration = todayAttendance ? getLiveWorkingDuration(todayAttendance) : { formatted: '00h 00m' };

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Punch Widget */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-digix-600 via-digix-500 to-blue-600 text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DigiX Enterprise Portal</span>
              <span>•</span>
              <span>{user?.band || 'L5'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good morning, {user?.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              You are signed in as <span className="font-semibold text-white">{user?.roleTitle}</span> in {user?.department}. Here is your workspace summary for today.
            </p>
          </div>

          {/* Real-Time Shift Status Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex items-center gap-4 flex-shrink-0">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-blue-100 uppercase tracking-wider">
                Shift Status
              </span>
              <span className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                {isActive ? 'Logged In (Active)' : 'Shift Completed'}
              </span>
              <span className="text-[11px] text-blue-200 mt-0.5">
                {todayAttendance
                  ? (isActive
                      ? `Logged in at ${todayAttendance.checkIn} • ${liveDuration.formatted}`
                      : `Logged out at ${todayAttendance.checkOut} (${todayAttendance.workingHours})`)
                  : 'Ready to begin shift'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employee/attendance')}
              className="bg-white text-slate-800 hover:bg-blue-50 border-white font-semibold text-xs shadow-sm"
            >
              View Attendance
            </Button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Leave Balance"
          value={`${totalLeavesAvailable} Days`}
          subtitle="Annual PTO available"
          icon={CalendarOff}
          color="emerald"
          onClick={() => navigate('/employee/leave')}
        />
        <StatCard
          title="Open Tasks"
          value={pendingTasks.length}
          subtitle={`${userTasks.length - pendingTasks.length} completed this cycle`}
          icon={CheckSquare}
          color="blue"
          onClick={() => navigate('/employee/tasks')}
        />
        <StatCard
          title="Active Projects"
          value={userProjects.length}
          subtitle="2 upcoming milestones"
          icon={FolderKanban}
          color="purple"
          onClick={() => navigate('/employee/projects')}
        />
        <StatCard
          title="Attendance Rate"
          value="98.5%"
          subtitle="Current month to date"
          icon={CalendarCheck}
          color="amber"
          onClick={() => navigate('/employee/attendance')}
        />
      </div>

      {/* Main Grid: Projects, Tasks, and Sidebar widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Tasks & Active Projects */}
        <div className="lg:col-span-8 space-y-6">
          {/* My Tasks Snapshot */}
          <Card
            title="My Priority Tasks"
            subtitle="High-impact deliverables for this sprint"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/tasks')}
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                View Board
              </Button>
            }
          >
            <div className="space-y-2.5">
              {userTasks.slice(0, 4).map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {
                          toggleTaskStatus(task.id);
                          addToast({
                            type: 'info',
                            title: isDone ? 'Task Reopened' : 'Task Completed',
                            message: task.title
                          });
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-digix-600 focus:ring-digix-500 cursor-pointer"
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{task.project}</span>
                          <span>•</span>
                          <span>Due {task.dueDate}</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={
                        task.priority === 'urgent'
                          ? 'danger'
                          : task.priority === 'high'
                          ? 'warning'
                          : 'primary'
                      }
                      size="sm"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Active Projects Snapshot */}
          <Card
            title="Enrolled Projects"
            subtitle="Ongoing corporate initiatives and product squads"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/projects')}
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                All Projects
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userProjects.slice(0, 4).map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:shadow-subtle transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-digix-600 bg-digix-50 px-2 py-0.5 rounded">
                        {proj.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                        {proj.name}
                      </h4>
                    </div>
                    <Badge
                      variant={proj.health === 'Good' ? 'success' : 'warning'}
                      size="sm"
                      dot
                    >
                      {proj.health}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {proj.description}
                  </p>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress</span>
                      <span className="font-semibold text-slate-800">{proj.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-digix-500 rounded-full"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Lead: {proj.lead}</span>
                    <span>Deadline: {proj.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right 4 Cols: Quick Actions, AI Assistant Banner, Announcements */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Assistant Quick Callout */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-digix-600 to-digix-700 text-white p-5 shadow-subtle relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                DigiX AI Assistant
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Have questions about policies or benefits?
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Ask DigiX Bot about leave policies, insurance coverage, expense guidelines, and holiday calendars.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employee/ai-assistant')}
              className="mt-4 bg-white text-digix-700 hover:bg-blue-50 border-white font-semibold"
              rightIcon={<Sparkles className="w-3.5 h-3.5 text-digix-600" />}
            >
              Ask AI Assistant
            </Button>
          </div>

          {/* Quick Shortcuts */}
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/employee/leave')}
                className="p-3 text-left rounded-xl border border-slate-100 hover:border-digix-200 hover:bg-digix-50/50 transition-colors flex flex-col items-start"
              >
                <CalendarOff className="w-5 h-5 text-digix-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">Apply Leave</span>
                <span className="text-[10px] text-slate-400">Request PTO</span>
              </button>

              <button
                onClick={() => navigate('/employee/documents')}
                className="p-3 text-left rounded-xl border border-slate-100 hover:border-digix-200 hover:bg-digix-50/50 transition-colors flex flex-col items-start"
              >
                <FileText className="w-5 h-5 text-purple-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">Payslips</span>
                <span className="text-[10px] text-slate-400">View Form 16</span>
              </button>

              <button
                onClick={() => navigate('/employee/team')}
                className="p-3 text-left rounded-xl border border-slate-100 hover:border-digix-200 hover:bg-digix-50/50 transition-colors flex flex-col items-start"
              >
                <Clock className="w-5 h-5 text-emerald-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">My Team</span>
                <span className="text-[10px] text-slate-400">Org Directory</span>
              </button>

              <button
                onClick={() => navigate('/employee/training')}
                className="p-3 text-left rounded-xl border border-slate-100 hover:border-digix-200 hover:bg-digix-50/50 transition-colors flex flex-col items-start"
              >
                <CheckCircle2 className="w-5 h-5 text-amber-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">Trainings</span>
                <span className="text-[10px] text-slate-400">Certifications</span>
              </button>
            </div>
          </Card>

          {/* Announcements Widget */}
          <Card
            title="Latest Announcements"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/announcements')}
              >
                View all
              </Button>
            }
          >
            <div className="space-y-3">
              {announcements.slice(0, 3).map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => navigate('/employee/announcements')}
                  className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <Badge variant="primary" size="sm">
                      {ann.category}
                    </Badge>
                    <span className="text-slate-400">{ann.date}</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {ann.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
