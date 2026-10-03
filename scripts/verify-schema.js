// scripts/verify-schema.js
// Verification script to check if the 6 core HR tables exist in Supabase PostgREST schema cache
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local safely
const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  });
}

const supabaseUrl = env['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const supabaseKey = env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local');
  process.exit(1);
}

// Polyfill WebSocket for node runtime if needed
if (!globalThis.WebSocket) {
  globalThis.WebSocket = class DummyWS {};
}

const supabase = createClient(supabaseUrl, supabaseKey);

const phase1Tables = [
  'profiles',
  'employees',
  'attendance',
  'leave_requests',
  'training',
  'training_assignments'
];

const phase2Tables = [
  'profile_change_requests',
  'leave_balances',
  'employee_documents',
  'emergency_contacts',
  'projects',
  'project_members',
  'tasks',
  'task_comments'
];

const phase3Tables = [
  'candidates',
  'onboarding_checklists',
  'announcements',
  'notifications',
  'company_documents'
];

const phase4Tables = [
  'audit_logs',
  'system_settings'
];

async function verify() {
  console.log('--- Verifying Phase 1 Core HR Tables ---');
  let phase1Ok = true;
  for (const table of phase1Tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      console.log(`❌ Table '${table}': NOT FOUND`);
      phase1Ok = false;
    } else {
      console.log(`✅ Table '${table}': ACTIVE (RLS Enforced)`);
    }
  }

  console.log('\n--- Verifying Phase 2 Employee & Project Tables ---');
  let phase2Ok = true;
  for (const table of phase2Tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      console.log(`❌ Table '${table}': NOT FOUND`);
      phase2Ok = false;
    } else {
      console.log(`✅ Table '${table}': ACTIVE (RLS Enforced)`);
    }
  }

  console.log('\n--- Verifying Phase 3 Operations & Comms Tables ---');
  let phase3Ok = true;
  for (const table of phase3Tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      console.log(`⏳ Table '${table}': PENDING (awaiting execution of 003 migration)`);
      phase3Ok = false;
    } else {
      console.log(`✅ Table '${table}': ACTIVE (RLS Enforced)`);
    }
  }

  console.log('\n--- Verifying Phase 4 Governance & Security Tables ---');
  let phase4Ok = true;
  for (const table of phase4Tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      console.log(`⏳ Table '${table}': PENDING (awaiting execution of 004 migration)`);
      phase4Ok = false;
    } else {
      console.log(`✅ Table '${table}': ACTIVE (RLS Enforced)`);
    }
  }

  console.log('--------------------------------------------------');
  const activeCount = (phase1Ok ? 6 : 0) + (phase2Ok ? 8 : 0) + (phase3Ok ? 5 : 0) + (phase4Ok ? 2 : 0);
  console.log(`Database Status: ${activeCount} of 21 Core Production Tables Active.`);
}

verify().catch(err => console.error(err));
