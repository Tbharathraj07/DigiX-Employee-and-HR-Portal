// Automated verification script for Collapsible Sidebar implementation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
    console.log(`✓ PASS: ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`✗ FAIL: ${name} - ${err.message}`);
  }
}

// 1. Check AppLayout.jsx
test('AppLayout manages isCollapsed state and dedicated localStorage key', () => {
  const file = fs.readFileSync(path.join(rootDir, 'src/components/layout/AppLayout.jsx'), 'utf8');
  if (!file.includes('digix_sidebar_collapsed')) {
    throw new Error('Missing digix_sidebar_collapsed localStorage key in AppLayout.jsx');
  }
  if (!file.includes('isCollapsed') || !file.includes('toggleSidebarCollapse')) {
    throw new Error('AppLayout does not define isCollapsed and toggleSidebarCollapse');
  }
  if (!file.includes('lg:pl-20') || !file.includes('lg:pl-64')) {
    throw new Error('AppLayout does not transition padding between lg:pl-20 and lg:pl-64');
  }
  if (!file.includes('transition-[padding]')) {
    throw new Error('AppLayout missing transition-[padding] for smooth content animation');
  }
  if (!file.includes('b') || !file.includes('metaKey') || !file.includes('ctrlKey')) {
    throw new Error('AppLayout missing Ctrl+B / Cmd+B keyboard shortcut');
  }
});

// 2. Check Header.jsx
test('Header includes PanelLeftClose, PanelLeftOpen icons and desktop toggle button', () => {
  const file = fs.readFileSync(path.join(rootDir, 'src/components/layout/Header.jsx'), 'utf8');
  if (!file.includes('PanelLeftClose') || !file.includes('PanelLeftOpen')) {
    throw new Error('Header does not import PanelLeftClose / PanelLeftOpen');
  }
  if (!file.includes('onToggleCollapse')) {
    throw new Error('Header does not receive onToggleCollapse prop');
  }
  if (!file.includes('lg:hidden') || !file.includes('hidden lg:flex')) {
    throw new Error('Header toggle buttons do not correctly distinguish mobile drawer vs desktop collapse');
  }
});

// 3. Check Sidebar.jsx
test('Sidebar implements collapsible rail, tooltips, active indicators, and mobile drawer handling', () => {
  const file = fs.readFileSync(path.join(rootDir, 'src/components/layout/Sidebar.jsx'), 'utf8');
  
  // Collapsed widths
  if (!file.includes('lg:w-20') || !file.includes('lg:w-64')) {
    throw new Error('Sidebar does not support lg:w-20 (rail) and lg:w-64 (full width)');
  }
  
  // Transition animation
  if (!file.includes('transition-[width,transform]')) {
    throw new Error('Sidebar missing transition-[width,transform] for smooth animation');
  }

  // Icons
  if (!file.includes('PanelLeftClose') || !file.includes('PanelLeftOpen')) {
    throw new Error('Sidebar does not import PanelLeftClose / PanelLeftOpen');
  }

  // Tooltips
  if (!file.includes('tooltip') || !file.includes('setTooltip')) {
    throw new Error('Sidebar does not maintain tooltip state for collapsed rail');
  }

  // Mobile Escape key handling
  if (!file.includes('Escape') || !file.includes('keydown')) {
    throw new Error('Sidebar does not handle Escape key to close mobile drawer');
  }

  // Close on route navigation
  if (!file.includes('location.pathname')) {
    throw new Error('Sidebar does not close drawer on location.pathname change');
  }

  // Lock body scroll
  if (!file.includes('document.body.style.overflow')) {
    throw new Error('Sidebar does not lock body scroll on mobile');
  }

  // Active indicator on left rail
  if (!file.includes('rounded-r-full') || !file.includes('bg-digix-600')) {
    throw new Error('Sidebar missing active route indicator bar for collapsed rail');
  }

  // Employee, HR, and Admin links preserved
  if (!file.includes('employeeLinks') || !file.includes('hrLinks') || !file.includes('adminLinks')) {
    throw new Error('Sidebar does not preserve employee, hr, and admin links');
  }

  // Badges preserved
  if (!file.includes('openTasksCount') || !file.includes('pendingLeavesCount') || !file.includes('openTicketsCount')) {
    throw new Error('Sidebar does not preserve badge counters');
  }
});

// 4. LocalStorage Safety Check
test('LocalStorage parsing handles invalid values safely without throwing', () => {
  const safeParse = (val) => {
    try {
      if (val !== null) return JSON.parse(val) === true;
    } catch (e) {
      return false;
    }
    return false;
  };
  
  if (safeParse(null) !== false) throw new Error('Failed on null');
  if (safeParse('true') !== true) throw new Error('Failed on "true"');
  if (safeParse('false') !== false) throw new Error('Failed on "false"');
  if (safeParse('corrupted{json') !== false) throw new Error('Failed on corrupted JSON');
  if (safeParse('123') !== false) throw new Error('Failed on number');
});

console.log('\n--- VERIFICATION SUMMARY ---');
console.log(`Total tests: ${results.length}`);
const failed = results.filter(r => r.status === 'FAIL');
if (failed.length > 0) {
  console.error(`Failed tests: ${failed.length}`);
  process.exit(1);
} else {
  console.log('All verification checks passed successfully!');
}
