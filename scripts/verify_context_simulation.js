import { createClient } from '@supabase/supabase-js';

if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const SUPABASE_URL = 'https://ytgvckjfbsvvmqhqqvyj.supabase.co';
const ANON_KEY = 'sb_publishable_jT5WqCp5Z_6M4z594GCDfA_f22nNNz7';

// Inline mappers identical to DataContext.jsx for testing
const mapDbProjectToUi = (row, taskList = [], currentUser = null) => {
  let code = 'PRJ';
  if (row.name) {
    const parts = row.name.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      code = parts.map((p) => p[0]).join('').toUpperCase().slice(0, 4);
    } else if (parts.length === 1) {
      code = parts[0].slice(0, 3).toUpperCase();
    }
  }

  const statusMap = {
    planned: 'Planning',
    active: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  const uiStatus =
    statusMap[row.status] ||
    (row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'In Progress');

  const lead =
    row.manager?.name ||
    (currentUser && row.project_manager_id === currentUser.dbId ? currentUser.name : 'Marcus Vance');

  const memberNames = (row.members || [])
    .map((m) => m.employee?.name)
    .filter(Boolean);

  if (currentUser?.name && !memberNames.includes(currentUser.name)) {
    memberNames.unshift(currentUser.name);
  }
  if (!memberNames.includes(lead)) {
    memberNames.unshift(lead);
  }

  const projTasks = (taskList || []).filter(
    (t) => t.projectId === row.id || t.project_id === row.id || t.project === row.name
  );
  let progress = 50;
  if (projTasks.length > 0) {
    const completedCount = projTasks.filter((t) => t.status === 'completed').length;
    progress = Math.round((completedCount / projTasks.length) * 100);
  } else if (row.status === 'completed') {
    progress = 100;
  } else if (row.status === 'planned') {
    progress = 25;
  } else if (row.status === 'active') {
    progress = 75;
  }

  const deadline = row.end_date
    ? new Date(row.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Dec 31, 2026';

  return {
    id: row.id,
    code,
    name: row.name,
    description: row.description || '',
    category: row.client_name || 'Strategic Initiative',
    lead,
    projectManagerId: row.project_manager_id,
    status: uiStatus,
    rawStatus: row.status,
    health: progress >= 60 ? 'Good' : 'Attention',
    progress,
    budget: '$350,000',
    spent: `$${Math.round(350000 * (progress / 100)).toLocaleString()}`,
    startDate: row.start_date || '2026-03-01',
    deadline,
    teamMembers: Array.from(new Set(memberNames))
  };
};

const mapDbTaskToUi = (row, currentUser = null) => {
  const assigneeName =
    row.assignee?.name ||
    (currentUser && row.assigned_to === currentUser.dbId ? currentUser.name : 'Tarumani Bharath Raj');
  const assigneeEmpId =
    row.assignee?.employee_id ||
    (currentUser && row.assigned_to === currentUser.dbId ? currentUser.id : 'DGX003');
  const projectName = row.project?.name || 'Client Enterprise Portal V3';

  return {
    id: row.id,
    displayId: `TSK-${row.id.slice(0, 6).toUpperCase()}`,
    title: row.title,
    project: projectName,
    projectId: row.project_id,
    assignedTo: assigneeName,
    assignedToId: assigneeEmpId,
    assignedToDbId: row.assigned_to,
    status: row.status || 'todo',
    priority: row.priority || 'medium',
    dueDate: row.due_date || new Date().toISOString().split('T')[0],
    description: row.description || '',
    completedAt: row.completed_at,
    createdBy: row.created_by
  };
};

async function testSimulation() {
  console.log('=== DATA CONTEXT & UI LOGIC SIMULATION ===\n');

  // 1. Employee Session (Tarumani)
  console.log('--- 1. Employee Session (Tarumani Bharath Raj) ---');
  const empClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await empClient.auth.signInWithPassword({ email: 'tarumani.bharathraj@digix.internal', password: 'demo' });
  
  const empUser = {
    id: 'DGX003',
    dbId: '31f16325-1f18-4cd9-afcb-43fc7400bbf0',
    name: 'Tarumani Bharath Raj',
    role: 'employee',
    department: 'Technology'
  };

  const { data: dbTasks } = await empClient
    .from('tasks')
    .select(`
      id,
      project_id,
      assigned_to,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_by,
      project:projects!project_id (id, name),
      assignee:employees!assigned_to (id, employee_id, name)
    `)
    .order('due_date', { ascending: true });

  const mappedTasks = dbTasks.map(t => mapDbTaskToUi(t, empUser));
  console.log(`Mapped ${mappedTasks.length} tasks for Tarumani:`);
  mappedTasks.forEach(t => console.log(`  - [${t.status}] ${t.title} (${t.project}) -> Assigned: ${t.assignedTo}`));

  const { data: dbProjects } = await empClient
    .from('projects')
    .select(`
      id,
      name,
      description,
      client_name,
      start_date,
      end_date,
      status,
      project_manager_id,
      manager:employees!project_manager_id (id, employee_id, name),
      members:project_members (
        id,
        employee_id,
        project_role,
        employee:employees!employee_id (id, employee_id, name)
      )
    `)
    .order('created_at', { ascending: false });

  const mappedProjects = dbProjects.map(p => mapDbProjectToUi(p, mappedTasks, empUser));
  console.log(`\nMapped ${mappedProjects.length} projects for Tarumani:`);
  mappedProjects.forEach(p => console.log(`  - [${p.code}] ${p.name} (Status: ${p.status}, Progress: ${p.progress}%, Lead: ${p.lead}, Members: ${p.teamMembers.join(', ')})`));

  // Test EmployeeDashboard filter
  const userProjects = mappedProjects.filter(p => p.teamMembers.includes(empUser.name) || p.teamMembers.includes('Tarumani Bharath Raj'));
  console.log(`\nEmployee Dashboard Active Projects count: ${userProjects.length} (Expected: 3)`);
  if (userProjects.length !== 3) throw new Error('Employee Dashboard project filter mismatch');

  const userTasks = mappedTasks.filter(t => t.assignedTo === empUser.name || t.assignedTo === 'Tarumani Bharath Raj' || t.assignedTo === empUser.id);
  console.log(`Employee Dashboard Priority Tasks count: ${userTasks.length} (Expected: 4)`);
  if (userTasks.length !== 4) throw new Error('Employee Dashboard task filter mismatch');

  // Test MyTasks filter tabs
  const completedTasks = mappedTasks.filter(t => t.status === 'completed');
  const inProgressTasks = mappedTasks.filter(t => t.status === 'in_progress');
  const urgentTasks = mappedTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
  console.log(`MyTasks Tabs: All: ${mappedTasks.length}, In Progress: ${inProgressTasks.length}, Urgent: ${urgentTasks.length}, Completed: ${completedTasks.length}`);

  // Test MyProjects filter
  const inProgressProjects = mappedProjects.filter(p => p.status === 'In Progress');
  const planningProjects = mappedProjects.filter(p => p.status === 'Planning');
  console.log(`MyProjects Filter: In Progress: ${inProgressProjects.length}, Planning: ${planningProjects.length}`);

  // 2. HR Session (Priyanka)
  console.log('\n--- 2. HR Session (Priyanka) ---');
  const hrClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await hrClient.auth.signInWithPassword({ email: 'priyanka@digix.internal', password: 'demo' });
  const hrUser = {
    id: 'HR001',
    dbId: '15678713-b35b-4837-8464-51e0e7c80d4a',
    name: 'Priyanka',
    role: 'hr'
  };

  const { data: hrDbProjects } = await hrClient.from('projects').select('id, name');
  console.log(`HR sees ${hrDbProjects?.length} total company projects.`);

  // 3. Admin Session (Marcus Vance)
  console.log('\n--- 3. Admin Session (Marcus Vance) ---');
  const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await adminClient.auth.signInWithPassword({ email: 'marcus.vance@digix.internal', password: 'demo' });
  const adminUser = {
    id: 'ADM001',
    dbId: 'e55760de-4644-400c-b73b-94c2f2174dc2',
    name: 'Marcus Vance',
    role: 'admin'
  };

  const { data: adminDbProjects } = await adminClient.from('projects').select('id, name');
  console.log(`Admin sees ${adminDbProjects?.length} total strategic projects.`);

  console.log('\n✅ All Data Context and UI logic simulations succeeded without errors!');
}

testSimulation().catch(console.error);
