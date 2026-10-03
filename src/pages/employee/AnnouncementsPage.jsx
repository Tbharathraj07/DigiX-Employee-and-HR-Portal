import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Megaphone, Calendar, User, CheckCircle2, AlertCircle } from 'lucide-react';

export const AnnouncementsPage = () => {
  const {
    announcements,
    markAnnouncementRead,
    isLoadingAnnouncements,
    announcementsError,
    fetchAnnouncements
  } = usePortalData();
  const { addToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Company News', 'HR', 'Policy', 'Events', 'Leadership', 'General'];

  const filtered = announcements.filter(
    (a) => selectedCategory === 'All' || (a.category && a.category.toLowerCase().includes(selectedCategory.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Company Announcements</h2>
            {isLoadingAnnouncements && announcements.length > 0 && (
              <span className="text-[11px] text-slate-400 font-normal animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-digix-500 animate-ping" />
                Syncing...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Official broadcasts, executive updates, and corporate event notices.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-digix-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {announcementsError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Error loading announcements: {announcementsError}</span>
          </div>
          <Button size="xs" variant="outline" onClick={fetchAnnouncements}>
            Retry
          </Button>
        </div>
      )}

      {/* Announcements Feed */}
      <div className="space-y-4">
        {isLoadingAnnouncements && announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500">
            <p className="text-sm font-medium">Loading official announcements...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No announcements found</p>
            <p className="text-xs text-slate-400 mt-1">There are no announcements currently published in this category.</p>
          </div>
        ) : (
          filtered.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle hover:shadow-card transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Badge variant={ann.priority === 'high' ? 'danger' : 'primary'} size="sm">
                    {ann.category}
                  </Badge>
                  <h3 className="text-base font-bold text-slate-900">
                    {ann.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {ann.date}
                  </span>
                  {!ann.read && (
                    <button
                      onClick={() => {
                        markAnnouncementRead(ann.id);
                        addToast({ type: 'success', title: 'Marked as Read', message: ann.title });
                      }}
                      className="text-[11px] font-semibold text-digix-600 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-line">
                {ann.content}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Published by: {ann.author} {ann.authorRole ? `(${ann.authorRole})` : ''}
                </span>
                <span className="font-mono text-[11px]">{ann.id}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
