import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { 
  LifeBuoy, 
  UploadCloud, 
  Paperclip, 
  X, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  FileText
} from 'lucide-react';

const CATEGORIES = [
  'Payroll & Compensation',
  'Benefits & Health',
  'Leave & Attendance',
  'Company Policies & Workplace',
  'Performance & Appraisals',
  'Verification & Documentation',
  'General HR Inquiry'
];

export const NewTicketModal = ({ isOpen, onClose, onSuccess }) => {
  const { createTicket } = usePortalData();
  const { addToast } = useToast();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSubject('');
    setCategory(CATEGORIES[0]);
    setPriority('medium');
    setDescription('');
    setSelectedFile(null);
    setFileError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const ALLOWED = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'doc'];
    if (!ALLOWED.includes(ext)) {
      setFileError('Invalid file format. Please upload PDF, PNG, JPG, or DOCX.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File exceeds 10 MB limit. Please select a smaller file.');
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      addToast({ type: 'warning', title: 'Subject Required', message: 'Please provide a clear ticket subject.' });
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      addToast({ type: 'warning', title: 'Description Too Short', message: 'Please provide at least a few words describing your request.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        attachmentFile: selectedFile
      });

      addToast({
        type: 'success',
        title: 'Ticket Created Successfully',
        message: `Your ticket ${created.ticketNumber} has been submitted to HR Operations.`
      });

      resetForm();
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      console.error('[NewTicketModal] Submission failed:', err);
      addToast({
        type: 'error',
        title: 'Failed to Raise Ticket',
        message: err.message || 'An unexpected error occurred while submitting your ticket.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Raise HR Help Desk Ticket"
      subtitle="Submit a support request to People Operations and track its resolution in real-time."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Subject <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Discrepancy in Q4 Form 16 Tax Certificate"
            className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-digix-500/20 focus:border-digix-500 transition-all placeholder:text-slate-400 font-medium text-slate-900"
          />
        </div>

        {/* Category & Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-digix-500/20 focus:border-digix-500 transition-all text-slate-800 font-medium cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority Urgency <span className="text-rose-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-digix-500/20 focus:border-digix-500 transition-all text-slate-800 font-medium cursor-pointer"
            >
              <option value="low">Low (General Query)</option>
              <option value="medium">Medium (Standard Request)</option>
              <option value="high">High (Urgent / Time-Sensitive)</option>
            </select>
          </div>
        </div>

        {/* Detailed Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description / Inquiry Details <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please detail your request or question clearly with any relevant context, dates, or employee references..."
            className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-digix-500/20 focus:border-digix-500 transition-all placeholder:text-slate-400 font-normal text-slate-900 resize-none leading-relaxed"
          />
        </div>

        {/* Secure Document Attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Supporting Document / Screenshot (Optional)
          </label>
          
          {!selectedFile ? (
            <div className="relative border-2 border-dashed border-slate-200 hover:border-digix-400 bg-slate-50/50 hover:bg-digix-50/20 rounded-xl p-4 text-center transition-colors">
              <input
                type="file"
                id="ticket-file-input"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1 stroke-[1.8]" />
                <p className="text-xs font-medium text-slate-700">
                  <span className="text-digix-600 font-semibold underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  PDF, PNG, JPG, or DOCX (Max 10 MB). Stored securely.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-digix-50/70 border border-digix-100 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-digix-500 text-white flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for upload
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {fileError && (
            <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {fileError}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Ticket'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
