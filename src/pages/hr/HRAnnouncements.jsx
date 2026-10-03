import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Plus, Megaphone, Calendar, Send, Trash2, Edit3, AlertCircle } from 'lucide-react';

export const HRAnnouncements = () => {
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    fetchAnnouncements,
    isLoadingAnnouncements,
    announcementsError,
    user
  } = usePortalData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('HR');
  const [priority, setPriority] = useState('medium');
  const [targetAudience, setTargetAudience] = useState('All Employees');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('HR');
    setPriority('medium');
    setTargetAudience('All Employees');
    setContent('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann) => {
    setEditingId(ann.id);
    setTitle(ann.title || '');
    setCategory(ann.category || 'HR');
    setPriority(ann.priority || 'medium');
    setTargetAudience(ann.targetAudience || 'All Employees');
    setContent(ann.content || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title || !content) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, {
          title,
          category,
          priority,
          targetAudience,
          content
        });
        addToast({
          type: 'success',
          title: 'Announcement Updated',
          message: `Successfully modified "${title}".`
        });
      } else {
        await addAnnouncement({
          title,
          category,
          priority,
          targetAudience,
          author: user?.name ? `${user.name} (${user.roleTitle || user.role})` : undefined,
          authorRole: user?.roleTitle || user?.role || 'Staff',
          authorId: user?.dbId,
          content
        });
        addToast({
          type: 'success',
          title: 'Announcement Broadcasted',
          message: `Sent to ${targetAudience} across all offices.`
        });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      addToast({
        type: 'error',
        title: editingId ? 'Update Failed' : 'Broadcast Failed',
        message: err.message || 'Could not save announcement.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, annTitle) => {
    if (!window.confirm(`Are you sure you want to delete announcement "${annTitle}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
      addToast({
        type: 'success',
        title: 'Announcement Deleted',
        message: `"${annTitle}" was removed.`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete announcement.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">HR Broadcast & Announcements</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish organization-wide notices, policy amendments, and town hall invites.
          </p>
        </div>

        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
        >
          Publish Announcement
        </Button>
      </div>

      {/* Error state */}
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

      {/* Loading state */}
      {isLoadingAnnouncements && announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500">
          <p className="text-sm font-medium">Loading broadcasts and announcements from Supabase...</p>
        </div>
      ) : announcements.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Announcements Published</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No organization broadcasts have been published yet. Broadcast news, town hall updates, or policy changes to staff.
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={handleOpenCreate}>
              Publish First Announcement
            </Button>
          </div>
        </div>
      ) : (
        /* Feed of announcements */
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={ann.priority === 'high' ? 'danger' : 'primary'} size="sm">
                      {ann.category}
                    </Badge>
                    <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{ann.date}</span>
                    <button
                      onClick={() => handleOpenEdit(ann)}
                      className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Edit announcement"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id, ann.title)}
                      disabled={deletingId === ann.id}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-3 whitespace-pre-line leading-relaxed">
                  {ann.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="text-slate-600 font-medium">
                  Author: {ann.author} {ann.authorRole ? `(${ann.authorRole})` : ''}
                </span>
                <span className="font-mono text-[11px]">{ann.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Broadcast / Edit Announcement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingId ? 'Edit Announcement' : 'Broadcast Announcement'}
        subtitle={editingId ? 'Modify broadcast details' : 'Distribute news to DigiX workforce'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Announcement Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q4 Performance Appraisal Cycle Launch"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={['HR', 'Company News', 'Policy', 'Events', 'Leadership', 'General']}
            />
            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={['low', 'medium', 'high', 'urgent']}
            />
          </div>

          <Select
            label="Target Audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            options={['All Employees', 'Engineering Only', 'Product & Design', 'HR & Admin', 'North America Teams']}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Message Content
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Draft the announcement text..."
              className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Broadcast'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
