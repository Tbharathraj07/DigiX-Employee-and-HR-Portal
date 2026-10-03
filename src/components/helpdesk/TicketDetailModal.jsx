import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './TicketListTable';
import { 
  Send, 
  Paperclip, 
  Download, 
  FileText, 
  Clock, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  X,
  ExternalLink,
  MessageSquare,
  Lock,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export const TicketDetailModal = ({
  isOpen,
  onClose,
  ticket,
  onTicketUpdated
}) => {
  const { user, role } = useAuth();
  const { 
    ticketMessages, 
    fetchTicketMessages, 
    addTicketMessage, 
    updateTicketStatus, 
    assignTicket, 
    getDocumentDownloadUrl,
    employees
  } = usePortalData();
  const { addToast } = useToast();

  const isHrOrAdmin = role === 'hr' || role === 'hr_manager' || role === 'admin';
  const isEmployee = !isHrOrAdmin;

  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // HR Assignee state
  const [selectedAssignee, setSelectedAssignee] = useState(ticket?.assignedToId || '');

  const messagesEndRef = useRef(null);
  const activeTicketIdRef = useRef(null);

  // HR candidates for assignment
  const hrTeamMembers = employees.filter(
    (e) => e.department === 'Human Resources' || e.role === 'hr_manager' || e.dbRole === 'hr_manager'
  );

  const loadMessages = useCallback(async (ticketId) => {
    if (!ticketId) return;
    setIsLoadingMessages(true);
    setMessagesError(null);
    try {
      const loaded = await fetchTicketMessages(ticketId);
      if (activeTicketIdRef.current === ticketId) {
        setMessages(loaded || []);
      }
    } catch (err) {
      if (activeTicketIdRef.current === ticketId) {
        console.error('[TicketDetailModal] Error loading messages:', err);
        setMessagesError('Unable to load conversation. Please try again.');
      }
    } finally {
      if (activeTicketIdRef.current === ticketId) {
        setIsLoadingMessages(false);
      }
    }
  }, [fetchTicketMessages]);

  // Load ticket messages when modal opens or ticket changes
  useEffect(() => {
    if (isOpen && ticket?.id) {
      activeTicketIdRef.current = ticket.id;
      setSelectedAssignee(ticket.assignedToId || '');
      loadMessages(ticket.id);
    } else {
      activeTicketIdRef.current = null;
      setMessages([]);
      setMessagesError(null);
      setIsLoadingMessages(false);
    }
    return () => {
      activeTicketIdRef.current = null;
    };
  }, [isOpen, ticket?.id, loadMessages]);

  // Sync messages from global context when new messages are added
  useEffect(() => {
    if (ticket?.id && ticketMessages.length > 0) {
      const filtered = ticketMessages.filter((m) => m.ticketId === ticket.id);
      if (filtered.length > 0) {
        setMessages(filtered);
      }
    }
  }, [ticketMessages, ticket?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!ticket) return null;

  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const isClosed = ticket.status === 'closed';

  const handleDownloadAttachment = async (storagePath, fileName) => {
    try {
      const url = await getDocumentDownloadUrl('employee-documents', storagePath);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        addToast({
          type: 'error',
          title: 'Attachment Access Failed',
          message: 'Unable to generate secure download link for this attachment.'
        });
      }
    } catch (err) {
      console.error('[TicketDetailModal] Download error:', err);
      addToast({
        type: 'error',
        title: 'Download Error',
        message: err.message || 'Failed to download attachment.'
      });
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSending(true);
    try {
      await addTicketMessage({
        ticketId: ticket.id,
        message: replyText.trim(),
        attachmentFile: replyFile
      });

      setReplyText('');
      setReplyFile(null);
      addToast({
        type: 'success',
        title: 'Reply Sent',
        message: 'Your message has been added to the ticket conversation.'
      });
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      console.error('[TicketDetailModal] Reply failed:', err);
      addToast({
        type: 'error',
        title: 'Failed to Send Reply',
        message: err.message || 'Failed to submit your message.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === ticket.status) return;

    setIsUpdatingStatus(true);
    try {
      const updated = await updateTicketStatus(ticket.id, newStatus);
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Ticket ${ticket.ticketNumber} transitioned to ${newStatus.toUpperCase().replace(/_/g, ' ')}.`
      });
      if (onTicketUpdated) onTicketUpdated(updated);
    } catch (err) {
      console.error('[TicketDetailModal] Status update error:', err);
      addToast({
        type: 'error',
        title: 'Status Change Failed',
        message: err.message || 'Could not update ticket status.'
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    setSelectedAssignee(newAssigneeId);
    try {
      const updated = await assignTicket(ticket.id, newAssigneeId || null);
      addToast({
        type: 'success',
        title: 'Assignee Updated',
        message: `Ticket assigned successfully.`
      });
      if (onTicketUpdated) onTicketUpdated(updated);
    } catch (err) {
      console.error('[TicketDetailModal] Assignment error:', err);
      addToast({
        type: 'error',
        title: 'Assignment Failed',
        message: err.message || 'Could not assign ticket.'
      });
    }
  };

  const handleEmployeeConfirmResolution = async () => {
    try {
      setIsSending(true);
      await addTicketMessage({
        ticketId: ticket.id,
        message: "I have reviewed the HR resolution and confirm this issue is fully resolved. Thank you for your assistance!"
      });
      addToast({
        type: 'success',
        title: 'Confirmation Sent to HR',
        message: 'Your resolution confirmation has been logged. HR will close the ticket.'
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const handleEmployeeRequestReopen = async () => {
    try {
      setIsSending(true);
      await addTicketMessage({
        ticketId: ticket.id,
        message: "I am still experiencing this issue or require further clarification. Please continue reviewing this ticket."
      });
      addToast({
        type: 'info',
        title: 'Follow-up Request Sent',
        message: 'Your message has been sent to HR People Operations.'
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-xs font-bold text-digix-600 bg-digix-50 px-2.5 py-1 rounded-md border border-digix-100">
            {ticket.ticketNumber}
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-md">
            {ticket.subject}
          </span>
        </div>
      }
      subtitle={`Submitted by ${ticket.employeeName} (${ticket.department}) on ${new Date(ticket.createdAt).toLocaleDateString()}`}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Top Metadata Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category */}
            <span className="font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              {ticket.category}
            </span>

            {/* Priority */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border ${priorityCfg.badgeClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {priorityCfg.label} Priority
            </span>

            {/* Status */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold border ${statusCfg.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
              {statusCfg.label}
            </span>
          </div>

          {/* Assigned HR Rep / Assignment control */}
          <div className="flex items-center gap-2">
            {isHrOrAdmin ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Assignee:</span>
                <select
                  value={selectedAssignee}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 font-medium focus:ring-1 focus:ring-digix-500"
                >
                  <option value="">Unassigned</option>
                  {hrTeamMembers.map((hr) => (
                    <option key={hr.id || hr.dbId} value={hr.id || hr.dbId}>
                      {hr.name}
                    </option>
                  ))}
                  {/* Fallback to current assignee if not in HR list */}
                  {ticket.assignedTo && !hrTeamMembers.some(m => m.name === ticket.assignedTo) && (
                    <option value={ticket.assignedToId || 'current'}>{ticket.assignedTo}</option>
                  )}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-600">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Handled by: <strong className="text-slate-800">{ticket.assignedTo || 'HR Operations'}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* HR Status Transition Controller (HR/Admin only) */}
        {isHrOrAdmin && !isClosed && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="font-semibold text-indigo-900">Manage Status Lifecycle:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'open', label: 'Open' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'waiting_for_employee', label: 'Waiting for Employee' },
                { key: 'resolved', label: 'Resolved' },
                { key: 'closed', label: 'Closed' }
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  disabled={isUpdatingStatus || ticket.status === st.key}
                  onClick={() => handleStatusChange(st.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    ticket.status === st.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Initial Attachment Card (if submitted with ticket) */}
        {(ticket.initialAttachmentName || ticket.initialAttachmentUrl) && (
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-digix-50 text-digix-600 border border-digix-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {ticket.initialAttachmentName || 'Attached Document'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {ticket.initialAttachmentSize || 'Secure Attachment'} • Initial Request File
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadAttachment(ticket.initialAttachmentUrl, ticket.initialAttachmentName)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-digix-600 bg-white border border-slate-200 rounded-lg hover:bg-digix-50 hover:border-digix-200 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        )}

        {/* Conversation Thread */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-100">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Conversation History</span>
          </div>

          {isLoadingMessages ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-digix-500" />
              <span>Loading messages...</span>
            </div>
          ) : messagesError ? (
            <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-xl text-center space-y-2.5">
              <div className="flex items-center justify-center gap-2 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{messagesError}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                onClick={() => loadMessages(ticket.id)}
              >
                Retry
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              No replies yet. Use the reply box below to communicate.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isMsgFromHR = msg.senderRole === 'hr_manager' || msg.senderRole === 'admin';
                const isMsgFromMe = (msg.senderId && (msg.senderId === user?.dbId || msg.senderId === user?.id)) ||
                                    (!msg.senderId && msg.senderRole === (role === 'admin' ? 'admin' : (role === 'hr' || role === 'hr_manager') ? 'hr_manager' : 'employee'));

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col p-4 rounded-2xl border transition-all ${
                      isMsgFromHR
                        ? 'bg-indigo-50/40 border-indigo-100 ml-2 sm:ml-6'
                        : 'bg-white border-slate-200/90 mr-2 sm:mr-6'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100/80 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isMsgFromHR ? 'bg-indigo-600 text-white' : 'bg-digix-600 text-white'
                        }`}>
                          {msg.senderName?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {msg.senderName}
                        </span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                          isMsgFromHR ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isMsgFromHR ? 'HR Team' : 'Employee'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {/* Message Body */}
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {msg.message}
                    </p>

                    {/* Attachment if present */}
                    {(msg.attachmentName || msg.attachmentUrl) && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium truncate max-w-xs">{msg.attachmentName || 'Attachment'}</span>
                          {msg.attachmentSize && <span className="text-[10px] text-slate-400">({msg.attachmentSize})</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(msg.attachmentUrl, msg.attachmentName)}
                          className="text-[11px] font-semibold text-digix-600 hover:text-digix-700 hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Employee Resolution Actions (when status is Resolved) */}
        {isEmployee && ticket.status === 'resolved' && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-emerald-900">HR has marked this ticket as Resolved</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Please confirm if the resolution meets your requirements.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEmployeeRequestReopen}
                disabled={isSending}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Need More Help
              </button>
              <button
                type="button"
                onClick={handleEmployeeConfirmResolution}
                disabled={isSending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        )}

        {/* Closed Banner */}
        {isClosed ? (
          <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-600 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>This ticket is closed. New replies are disabled for archived records.</span>
          </div>
        ) : (
          /* Reply Composer */
          <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="relative">
              <textarea
                rows={3}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={isHrOrAdmin ? "Reply to employee or request clarification..." : "Type your reply to HR Operations..."}
                className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-digix-500/20 focus:border-digix-500 transition-all placeholder:text-slate-400 text-slate-900 resize-none font-normal leading-relaxed"
              />
            </div>

            {/* Optional Reply Attachment */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="reply-file"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  <span>{replyFile ? 'Change File' : 'Attach File'}</span>
                </label>
                <input
                  id="reply-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
                  onChange={(e) => setReplyFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {replyFile && (
                  <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
                    <span className="truncate max-w-[150px] font-medium">{replyFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setReplyFile(null)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSending || !replyText.trim()}
                className="min-w-[110px]"
              >
                {isSending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Send Reply
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
