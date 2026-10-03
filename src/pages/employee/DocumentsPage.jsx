import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  FileText,
  Download,
  Upload,
  RotateCw,
  AlertCircle,
  FileQuestion,
  Building,
  User
} from 'lucide-react';

export const DocumentsPage = () => {
  const {
    employeeDocuments,
    companyDocuments,
    fetchEmployeeDocuments,
    fetchCompanyDocuments,
    uploadEmployeeDocument,
    getDocumentDownloadUrl,
    isLoadingEmployeeDocuments,
    isLoadingCompanyDocuments,
    employeeDocumentsError,
    companyDocumentsError,
    user
  } = usePortalData();

  const { isSupabaseAuth } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'company'
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('tax_form');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSupabaseAuth) {
      if (fetchEmployeeDocuments) fetchEmployeeDocuments();
      if (fetchCompanyDocuments) fetchCompanyDocuments();
    }
  }, [isSupabaseAuth, fetchEmployeeDocuments, fetchCompanyDocuments]);

  const handleDownload = async (doc) => {
    try {
      if (doc.storagePath) {
        const signedUrl = await getDocumentDownloadUrl(doc.bucket, doc.storagePath);
        if (signedUrl) {
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
          addToast({
            type: 'success',
            title: 'Document Opened',
            message: `Opening secure file: ${doc.name || doc.title}`
          });
          return;
        } else if (isSupabaseAuth) {
          throw new Error('Unable to generate secure download link. Please check permissions or file availability.');
        }
      }

      if (doc.url && doc.url !== '#') {
        window.open(doc.url, '_blank', 'noopener,noreferrer');
        addToast({
          type: 'success',
          title: 'Document Opened',
          message: `Opening file: ${doc.name || doc.title}`
        });
      } else if (!isSupabaseAuth) {
        addToast({
          type: 'info',
          title: 'Document Download',
          message: `Simulating document download: ${doc.name || doc.title}`
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

  const handleUploadPersonalDoc = async (e) => {
    e.preventDefault();
    if (!docName || !selectedFile) {
      addToast({
        type: 'error',
        title: 'Missing Fields',
        message: 'Please provide document title and select a file.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await uploadEmployeeDocument({
        file: selectedFile,
        employeeId: user?.dbId,
        documentType: docType,
        documentName: docName
      });

      setIsUploadModalOpen(false);
      setDocName('');
      setSelectedFile(null);
      addToast({
        type: 'success',
        title: 'Document Uploaded',
        message: 'Your personal document has been securely stored.'
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

  const currentLoading = activeTab === 'personal' ? isLoadingEmployeeDocuments : isLoadingCompanyDocuments;
  const currentError = activeTab === 'personal' ? employeeDocumentsError : companyDocumentsError;
  const currentDocs = activeTab === 'personal' ? employeeDocuments : companyDocuments;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Documents & Records</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Access payslips, tax certificates, and verified corporate agreements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSupabaseAuth && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RotateCw className={`w-3.5 h-3.5 ${currentLoading ? 'animate-spin' : ''}`} />}
              onClick={activeTab === 'personal' ? fetchEmployeeDocuments : fetchCompanyDocuments}
              disabled={currentLoading}
            >
              Refresh
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
            activeTab === 'personal'
              ? 'bg-digix-50 text-digix-700 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          My Personal Documents ({employeeDocuments.length})
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
            activeTab === 'company'
              ? 'bg-digix-50 text-digix-700 font-bold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Company Policies & Handbooks ({companyDocuments.length})
        </button>
      </div>

      {/* Loading State */}
      {currentLoading && currentDocs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-subtle flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-digix-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading documents...</p>
        </div>
      ) : currentError ? (
        /* Error State */
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center shadow-subtle flex flex-col items-center justify-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <h3 className="text-sm font-bold text-rose-900">Unable to load documents</h3>
          <p className="text-xs text-rose-700 max-w-md mt-1 mb-4">{currentError}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={activeTab === 'personal' ? fetchEmployeeDocuments : fetchCompanyDocuments}
          >
            Retry
          </Button>
        </div>
      ) : currentDocs.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-subtle flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
            <FileQuestion className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {activeTab === 'personal' ? 'No Personal Documents Found' : 'No Company Policies Available'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {activeTab === 'personal'
              ? 'You do not have any personal employee documents stored yet. Use the upload button to submit tax forms or certificates.'
              : 'No company policies have been published yet.'}
          </p>
        </div>
      ) : (
        /* Documents Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-digix-50 text-digix-600 flex items-center justify-center border border-digix-100">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge variant="neutral" size="sm">
                    {doc.type || doc.format || 'PDF'}
                  </Badge>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-3 line-clamp-1">
                  {doc.name || doc.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Category: <span className="text-slate-600 font-medium">{doc.category}</span>
                </p>

                <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Size: {doc.fileSize}</span>
                  <span>Date: {doc.uploadDate}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleDownload(doc)}
                >
                  Download {doc.type || doc.format || 'PDF'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Personal Document Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !isSubmitting && setIsUploadModalOpen(false)}
        title="Upload Personal Document"
        subtitle="Submit personal tax proofs, certifications, or identity documentation"
      >
        <form onSubmit={handleUploadPersonalDoc} className="space-y-4">
          <Input
            label="Document Title"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="e.g. FY2026 Form 16 Tax Certificate"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-digix-500"
            >
              <option value="tax_form">Tax Document / Form 16</option>
              <option value="payslip">Previous Employer Payslip</option>
              <option value="degree">Degree Certificate</option>
              <option value="certification">Professional Certification</option>
              <option value="id_proof">Identity Document</option>
              <option value="other">Other Official Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select File
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
              onClick={() => setIsUploadModalOpen(false)}
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
              {isSubmitting ? 'Uploading to Storage...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
