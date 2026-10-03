import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu } from './ProfileMenu';

export const Header = ({ onOpenSidebar, onOpenSearch, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();

  // Compute clean breadcrumb
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const sectionTitle = pathSegments[1]
    ? pathSegments[1]
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Dashboard';

  const rolePrefix = pathSegments[0]
    ? pathSegments[0].toUpperCase()
    : 'PORTAL';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between transition-portal w-full">
      {/* Left: Mobile Hamburger Drawer Trigger & Desktop Rail Toggle & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Rail Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors items-center justify-center flex-shrink-0"
          title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-slate-600" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-slate-600" />
          )}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
            <span>{rolePrefix}</span>
            <span>/</span>
            <span className="text-slate-600 font-semibold truncate">{sectionTitle}</span>
          </div>
          <h1 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight hidden sm:block truncate">
            {sectionTitle}
          </h1>
        </div>
      </div>

      {/* Middle: Quick Search bar (Clickable trigger for Command Palette) */}
      <div className="hidden md:flex items-center max-w-xs w-full mx-4">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-100/80 hover:bg-slate-100 text-slate-400 rounded-xl border border-slate-200/60 transition-colors text-xs font-normal text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Quick search...</span>
          </div>
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded border border-slate-200 text-[10px] font-mono text-slate-400">
            <span>⌘</span>
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Controls: Notifications, User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        <button
          onClick={onOpenSearch}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
          title="Search"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Notifications Dropdown */}
        <NotificationsMenu />

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Profile Dropdown */}
        <ProfileMenu />
      </div>
    </header>
  );
};
