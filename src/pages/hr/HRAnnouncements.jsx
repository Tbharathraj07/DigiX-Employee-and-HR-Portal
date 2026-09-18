import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Plus, Megaphone, Calendar, Send } from 'lucide-react';

export const HRAnnouncements = () => {
  const { announcements, addAnnouncement } = usePortalData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('HR');
  const [priority, setPriority] = useState('medium');
  const [targetAudience, setTargetAudience] = useState('All Employees');
  const [content, setContent] = useState('');

  const handlePublish = (e) => {
    e.preventDefault();
    if (!title || !content) return;

    addAnnouncement({
      title,
      category,
      priority,
      author: 'Priyanka (HR Manager)',
      authorRole: 'HR Manager',
      content
    });

    setIsModalOpen(false);
    setTitle('');
    setContent('');
    addToast({
      type: 'success',
      title: 'Announcement Broadcasted',
      message: `Sent to ${targetAudience} across all offices.`
    });
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
          onClick={() => setIsModalOpen(true)}
        >
          Publish Announcement
        </Button>
      </div>

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
                <span className="text-xs text-slate-400">{ann.date}</span>
              </div>
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-line leading-relaxed">
                {ann.content}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Author: {ann.author}</span>
              <span className="font-mono text-[11px]">{ann.id}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Broadcast Announcement"
        subtitle="Distribute news to DigiX workforce"
      >
        <form onSubmit={handlePublish} className="space-y-4">
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
              options={['HR', 'Company', 'Benefits', 'IT & Systems', 'Event']}
            />
            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={['low', 'medium', 'high']}
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" rightIcon={<Send className="w-3.5 h-3.5" />}>
              Broadcast
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
