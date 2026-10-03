import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { FileText, Upload, Download, RotateCw, AlertCircle, Trash2, Building, User } from 'lucide-react';

export const HRDocuments = () => {
  const {
    companyDocuments,
    employeeDocuments,
    fetchCompanyDocuments,
    fetchEmployeeDocuments,
    uploadCompanyDocument,
    deleteCompanyDocument,
    deleteEmployeeDocument,
    getDocumentDownloadUrl,
    isLoadingCompanyDocuments,
    isLoadingEmployeeDocuments,
    companyDocumentsError,
    employeeDocumentsError
  } = usePortalData();

  const { isSupabaseAuth } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('company'); // 'company' | 'employee'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Company Policy');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSupabaseAuth) {
      if (fetchCompanyDocuments) fetchCompanyDocuments();
      if (fetchEmployeeDocuments) fetchEmployeeDocuments();
    }
  }, [isSupabaseAuth, fetchCompanyDocuments, fetchEmployeeDocuments]);

  const handleDownload = async (row) => {
    try {
      if (row.storagePath) {
        const signedUrl = await getDocumentDownloadUrl(row.bucket, row.storagePath);
        if (signedUrl) {
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
          addToast({
            type: 'success',
            title: 'Document Opened',
            message: `Opening secure file: ${row.name || row.title}`
          });
          return;
        } else if (isSupabaseAuth) {
          throw new Error('Unable to generate secure download link. Please check permissions or file availability.');
        }
      }

      if (row.url && row.url !== '#') {
        window.open(row.url, '_blank', 'noopener,noreferrer');
        addToast({
          type: 'success',
          title: 'Document Opened',
          message: `Opened: ${row.name || row.title}`
        });
      } else if (!isSupabaseAuth) {
        addToast({
          type: 'info',
          title: 'File Download',
          message: `Simulating document download: ${row.name || row.title}`
        });
      } else {
        throw new Error('No storage path or valid download link found for this document.');
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: err.message || 'Unable to open document.'
      });
    }
  };

  const handleDelete = (row) => {
    setDocToDelete(row);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      if (activeTab === 'company') {
        await deleteCompanyDocument(docToDelete.id);
      } else {
        await deleteEmployeeDocument(docToDelete.id);
      }
      addToast({
        type: 'success',
        title: 'Document Deleted',
        message: `Removed ${docToDelete.name || docToDelete.title} from repository.`
      });
      setDocToDelete(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete document.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublishCompanyDoc = async (e) => {
    e.preventDefault();
    if (!docTitle || !selectedFile) {
      addToast({
        type: 'error',
        title: 'Missing Fields',
        message: 'Please provide a title and select a file.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await uploadCompanyDocument({
        file: selectedFile,
        title: docTitle,
        category: docCategory
      });

      setIsModalOpen(false);
      setDocTitle('');
      setSelectedFile(null);
      addToast({
        type: 'success',
        title: 'Policy Document Published',
        message: `Successfully uploaded to company repository.`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Could not upload document.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const companyColumns = [
    {
      header: 'Document Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div>
            <span className="text-xs font-bold text-slate-900 block">{row.title || row.name}</span>
            {row.uploaderName && (
              <span className="text-[10px] text-slate-500 block">Uploaded by: {row.uploaderName}</span>
            )}
          </div>
        </div>
      )
    },
    { header: 'Category', accessor: 'category', cellClassName: 'text-xs text-slate-600' },
    { header: 'Format', accessor: 'type', cellClassName: 'text-xs font-mono font-medium text-slate-700' },
    { header: 'Size', accessor: 'fileSize', cellClassName: 'text-xs text-slate-500' },
    { header: 'Publish Date', accessor: 'uploadDate', cellClassName: 'text-xs text-slate-400' },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleDownload(row)}
          >
            Download
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Document"
            aria-label={`Delete ${row.name || row.title || 'document'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const employeeColumns = [
    {
      header: 'Employee Document',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-digix-600 flex-shrink-0" />
          <div>
            <span className="text-xs font-bold text-slate-900 block">{row.name}</span>
            <span className="text-[10px] text-slate-500 block">
              Employee: {row.employeeName || row.employeeCode || row.employeeId}
            </span>
          </div>
        </div>
      )
    },
    { header: 'Category', accessor: 'category', cellClassName: 'text-xs text-slate-600' },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'} size="sm">
          {row.status}
        </Badge>
      )
    },
    { header: 'Upload Date', accessor: 'uploadDate', cellClassName: 'text-xs text-slate-400' },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleDownload(row)}
          >
            Download
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Document"
            aria-label={`Delete ${row.name || row.title || 'document'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const currentLoading = activeTab === 'company' ? isLoadingCompanyDocuments : isLoadingEmployeeDocuments;
  const currentError = activeTab === 'company' ? companyDocumentsError : employeeDocumentsError;
  const currentData = activeTab === 'company' ? companyDocuments : employeeDocuments;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">HR Document Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Central repository for corporate policy handbooks, compliance forms, and employee records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSupabaseAuth && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RotateCw className={`w-3.5 h-3.5 ${currentLoading ? 'animate-spin' : ''}`} />}
              onClick={activeTab === 'company' ? fetchCompanyDocuments : fetchEmployeeDocuments}
              disabled={currentLoading}
            >
              Refresh
            </Button>
          )}

          <Button
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Publish Policy Document
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
            activeTab === 'company'
              ? 'bg-digix-50 text-digix-700 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Company Policies ({companyDocuments.length})
        </button>
        <button
          onClick={() => setActiveTab('employee')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
            activeTab === 'employee'
              ? 'bg-digix-50 text-digix-700 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          Employee Records ({employeeDocuments.length})
        </button>
      </div>

      {currentError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{currentError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={activeTab === 'company' ? fetchCompanyDocuments : fetchEmployeeDocuments}>
            Retry
          </Button>
        </div>
      )}

      <Table
        columns={activeTab === 'company' ? companyColumns : employeeColumns}
        data={currentData}
        isLoading={currentLoading}
        emptyMessage={
          activeTab === 'company'
            ? 'No company policy documents published yet.'
            : 'No employee documents found in repository.'
        }
      />

      {/* Upload Policy Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Publish Corporate Policy Document"
        subtitle="Upload official guides, handbooks, or compliance documents"
      >
        <form onSubmit={handlePublishCompanyDoc} className="space-y-4">
          <Input
            label="Document Title"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="e.g. Employee Code of Conduct 2027"
            required
          />

          <Select
            label="Category"
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value)}
            options={['Company Policy', 'Benefits', 'Compliance', 'Legal', 'General']}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Document File
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-digix-50 file:text-digix-700 hover:file:bg-digix-100 border border-slate-200 rounded-xl p-2 cursor-pointer"
              required
            />
            {selectedFile && (
              <p className="text-[11px] text-slate-500 mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Upload className="w-3.5 h-3.5" />}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Uploading to Storage...' : 'Publish Document'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(docToDelete)}
        onClose={() => !isDeleting && setDocToDelete(null)}
        title="Confirm Document Deletion"
        subtitle="This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-slate-900 font-semibold">
              "{docToDelete?.name || docToDelete?.title}"
            </strong>
            {activeTab === 'employee' && docToDelete?.employeeName && (
              <span>
                {' '}for employee <strong className="text-slate-900 font-semibold">{docToDelete.employeeName}</strong>
              </span>
            )}
            ? This will remove the document file from secure storage and delete its database record.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDocToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Document'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
