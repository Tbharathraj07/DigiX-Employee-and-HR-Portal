import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building,
  Calendar,
  Award,
  Shield,
  CreditCard,
  Edit2,
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertCircle,
  Lock,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

export const MyProfile = () => {
  const { user, refreshProfile, isSupabaseAuth, updateUserAvatar } = useAuth();
  const { employees, profileRequests, submitProfileRequest, fetchProfileRequests, isLoadingProfileRequests, updateOwnAvatar } = usePortalData();
  const { addToast } = useToast();

  // Refresh profile from Supabase on mount if authenticated via Supabase
  useEffect(() => {
    if (isSupabaseAuth && refreshProfile) {
      refreshProfile();
    }
  }, [isSupabaseAuth, refreshProfile]);

  // Get live synced employee record: prefer Supabase-authenticated profile when active
  const liveEmployee = isSupabaseAuth ? user : (employees.find((e) => e.id === user?.id) || user);

  // Live emergency contact state
  const [emergencyContact, setEmergencyContact] = useState(() => {
    if (!isSupabaseAuth) {
      return (employees.find((e) => e.id === user?.id) || user)?.emergencyContact || null;
    }
    return user?.emergencyContact || null;
  });
  const [isLoadingEmergencyContact, setIsLoadingEmergencyContact] = useState(false);

  // Load emergency contact from Supabase for real authenticated employee
  useEffect(() => {
    if (!isSupabaseAuth || !user?.dbId) {
      const fallback = (employees.find((e) => e.id === user?.id) || user)?.emergencyContact || null;
      setEmergencyContact(fallback);
      return;
    }

    let isMounted = true;
    const fetchEmergencyContact = async () => {
      setIsLoadingEmergencyContact(true);
      try {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .select('id, employee_id, name, relationship, phone, email, is_primary')
          .eq('employee_id', user.dbId)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (isMounted) {
          if (!error && data) {
            setEmergencyContact(data);
          } else {
            setEmergencyContact(null);
          }
        }
      } catch (err) {
        console.warn('[MyProfile] Error fetching emergency contact:', err);
        if (isMounted) setEmergencyContact(null);
      } finally {
        if (isMounted) setIsLoadingEmergencyContact(false);
      }
    };

    fetchEmergencyContact();

    return () => {
      isMounted = false;
    };
  }, [isSupabaseAuth, user?.dbId]);

  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Avatar upload and preview modal states
  const fileInputRef = useRef(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState(null);

  const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
  const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleOpenAvatarPicker = () => {
    setAvatarUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleAvatarFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file extension
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
      const msg = 'Unsupported file format. Please upload a JPG, JPEG, PNG, or WEBP image.';
      setAvatarUploadError(msg);
      addToast({
        type: 'error',
        title: 'Unsupported File Format',
        message: msg
      });
      return;
    }

    // Check MIME type if available
    if (file.type && !ALLOWED_IMAGE_MIMES.includes(file.type.toLowerCase())) {
      const msg = 'Invalid image type detected. Please select a valid JPG, JPEG, PNG, or WEBP image.';
      setAvatarUploadError(msg);
      addToast({
        type: 'error',
        title: 'Invalid File Type',
        message: msg
      });
      return;
    }

    // Check file size (5MB maximum)
    if (file.size > MAX_AVATAR_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const msg = `File size is ${sizeMb} MB, which exceeds the 5 MB limit. Please select an image under 5 MB.`;
      setAvatarUploadError(msg);
      addToast({
        type: 'error',
        title: 'File Too Large',
        message: msg
      });
      return;
    }

    // Validation passed -> construct preview and open confirmation dialog
    setAvatarUploadError(null);
    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(objectUrl);
    setIsAvatarModalOpen(true);
  };

  const handleCancelAvatarModal = () => {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl(null);
    setAvatarFile(null);
    setAvatarUploadError(null);
    setIsAvatarModalOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile || !liveEmployee) return;

    setIsUploadingAvatar(true);
    setAvatarUploadError(null);

    const oldAvatarUrl = liveEmployee.avatar;
    const empDbId = liveEmployee.dbId || liveEmployee.id;

    try {
      const ext = (avatarFile.name.split('.').pop() || 'png').toLowerCase();
      const sanitizedName = `avatar_${Date.now()}.${ext}`;
      const storagePath = `${empDbId}/avatars/${sanitizedName}`;

      let persistentAvatarUrl = null;

      if (isSupabaseAuth && supabase) {
        // Upload to employee-documents bucket in caller's folder
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('employee-documents')
          .upload(storagePath, avatarFile, {
            contentType: avatarFile.type || 'image/png',
            upsert: false
          });

        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }

        // Generate signed URL (1-year duration = 31536000 seconds)
        const { data: signData, error: signErr } = await supabase.storage
          .from('employee-documents')
          .createSignedUrl(storagePath, 31536000);

        if (signErr || !signData?.signedUrl) {
          throw new Error(`Failed to generate signed photo URL: ${signErr?.message || 'Unknown error'}`);
        }

        persistentAvatarUrl = signData.signedUrl;

        // Persist database reference (throws if DB update was blocked/failed)
        if (updateOwnAvatar) {
          await updateOwnAvatar(empDbId, persistentAvatarUrl);
        }

        // Safely remove old avatar from storage if it belonged to employee-documents
        try {
          if (oldAvatarUrl && oldAvatarUrl.includes('employee-documents') && oldAvatarUrl.includes('/avatars/')) {
            const match = oldAvatarUrl.match(/employee-documents\/([^?]+)/);
            if (match && match[1]) {
              const oldPath = decodeURIComponent(match[1]);
              if (oldPath !== storagePath) {
                await supabase.storage.from('employee-documents').remove([oldPath]);
              }
            }
          }
        } catch (cleanupErr) {
          console.warn('[MyProfile] Old avatar cleanup skipped or not permitted:', cleanupErr);
        }
      } else {
        // Offline / demo fallback
        persistentAvatarUrl = avatarPreviewUrl;
        if (updateOwnAvatar) {
          await updateOwnAvatar(empDbId, persistentAvatarUrl);
        }
      }

      // Update AuthContext user state immediately after successful persistence
      if (updateUserAvatar) {
        updateUserAvatar(persistentAvatarUrl);
      }
      if (refreshProfile) {
        await refreshProfile();
        // Re-assert fresh avatar to prevent any race condition with stale database reads
        if (updateUserAvatar) {
          updateUserAvatar(persistentAvatarUrl);
        }
      }

      addToast({
        type: 'success',
        title: 'Profile Photo Updated',
        message: 'Your new profile picture has been updated successfully.'
      });

      handleCancelAvatarModal();
    } catch (err) {
      console.error('[MyProfile] Error uploading avatar:', err);
      const userMessage = 'Profile photo upload failed to save. Please try again.';
      setAvatarUploadError(userMessage);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: userMessage
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Form states for profile change request
  const ALLOWED_FIELDS = [
    { id: 'phone', label: 'Contact Phone Number', placeholder: '+1 (555) 000-0000', getCurrent: (emp) => emp.phone },
    { id: 'location', label: 'Work Location / Office', placeholder: 'e.g. New York, NY (Headquarters)', getCurrent: (emp) => emp.location },
    { id: 'name', label: 'Full Legal Name (Requires Govt ID / Gazette)', placeholder: 'e.g. Tarumani Bharath Raj', getCurrent: (emp) => emp.name },
    { id: 'emergencyName', label: 'Emergency Contact - Name', placeholder: 'e.g. Srinivas Raj', getCurrent: (emp) => emergencyContact?.name || emp.emergencyContact?.name || '' },
    { id: 'emergencyRelation', label: 'Emergency Contact - Relationship', placeholder: 'e.g. Spouse / Parent / Sibling', getCurrent: (emp) => emergencyContact?.relationship || emergencyContact?.relation || emp.emergencyContact?.relation || '' },
    { id: 'emergencyPhone', label: 'Emergency Contact - Phone', placeholder: 'e.g. +1 (555) 345-6789', getCurrent: (emp) => emergencyContact?.phone || emp.emergencyContact?.phone || '' },
    { id: 'skills', label: 'Skills & Certifications (Comma-separated)', placeholder: 'e.g. React 19, TypeScript, AWS Solutions Architect', getCurrent: (emp) => emp.skills?.join(', ') || '' }
  ];

  const [selectedFieldId, setSelectedFieldId] = useState('phone');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');

  const currentFieldConfig = ALLOWED_FIELDS.find((f) => f.id === selectedFieldId) || ALLOWED_FIELDS[0];
  const currentValue = currentFieldConfig.getCurrent(liveEmployee);

  const handleFieldChange = (fieldId) => {
    setSelectedFieldId(fieldId);
    setRequestedValue('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
    }
  };

  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestedValue.trim() || !reason.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Details',
        message: 'Please provide the requested new value and a justification reason.'
      });
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await submitProfileRequest({
        employeeId: liveEmployee?.id,
        employeeName: liveEmployee?.name,
        department: liveEmployee?.department,
        avatar: liveEmployee?.avatar,
        field: selectedFieldId,
        fieldLabel: currentFieldConfig.label,
        currentValue: currentValue || '(Not Specified)',
        requestedValue: requestedValue.trim(),
        reason: reason.trim(),
        documentName: attachedFileName || null,
        documentSize: attachedFileName ? '320 KB' : null
      });

      setIsModalOpen(false);
      setRequestedValue('');
      setReason('');
      setAttachedFileName('');
      setActiveTab('requests');

      addToast({
        type: 'success',
        title: 'Change Request Submitted',
        message: 'Your profile amendment has been forwarded to People Operations for review.'
      });
    } catch (err) {
      console.error('[MyProfile] Error submitting profile change request:', err);
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Failed to submit profile change request. Please try again.'
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Filter requests submitted by this employee (supports both display ID like DGX003 and UUID user.dbId)
  const myRequests = profileRequests.filter(
    (r) =>
      r.employeeId === liveEmployee?.id ||
      r.employeeUuid === liveEmployee?.dbId ||
      r.employeeId === liveEmployee?.dbId
  );
  const pendingRequestsCount = myRequests.filter((r) => r.status?.toLowerCase() === 'pending').length;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'employment', label: 'Job & Hierarchy' },
    { id: 'skills', label: 'Skills & Tech' },
    { id: 'compensation', label: 'Compensation & Benefits' },
    { id: 'requests', label: `Change Requests (${myRequests.length})`, badge: pendingRequestsCount }
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        {/* Cover Band */}
        <div className="h-32 bg-gradient-to-r from-digix-700 via-digix-500 to-blue-500 relative" />

        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative group/avatar inline-block flex-shrink-0">
                <img
                  src={liveEmployee?.avatar}
                  alt={liveEmployee?.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white transition-opacity duration-200"
                />
                <button
                  type="button"
                  onClick={handleOpenAvatarPicker}
                  title="Change profile photo"
                  aria-label="Change profile photo"
                  id="btn-change-profile-photo"
                  className="absolute -bottom-1 -right-1 p-2 bg-digix-600 hover:bg-digix-700 active:scale-95 text-white rounded-xl shadow-md ring-2 ring-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-digix-500 cursor-pointer flex items-center justify-center"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="avatar-file-input"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={handleAvatarFileSelected}
                  aria-label="Upload profile photo"
                />
              </div>
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {liveEmployee?.name}
                  </h2>
                  <Badge variant="success" size="sm" dot>
                    Active Employee
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {liveEmployee?.roleTitle} • {liveEmployee?.department}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => setIsModalOpen(true)}
            >
              Request Changes
            </Button>
          </div>

          {/* Quick Details Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">Employee ID</span>
              <span className="font-mono font-semibold text-slate-900">{liveEmployee?.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Reporting Manager</span>
              <span className="font-semibold text-slate-900">{liveEmployee?.manager}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Corporate Band</span>
              <span className="font-semibold text-slate-900">{liveEmployee?.band || 'L5 - Senior'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Location</span>
              <span className="font-semibold text-slate-900">{liveEmployee?.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'requests' && typeof fetchProfileRequests === 'function') {
                fetchProfileRequests();
              }
            }}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-digix-500 text-digix-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Personal Information">
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Full Legal Name</span>
                <span className="font-medium text-slate-900">{liveEmployee?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Corporate Email</span>
                <span className="font-medium text-slate-900">{liveEmployee?.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Phone Number</span>
                <span className="font-medium text-slate-900">{liveEmployee?.phone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Physical Office</span>
                <span className="font-medium text-slate-900">{liveEmployee?.location}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Badge RFID</span>
                <span className="font-mono text-slate-900">{liveEmployee?.badgeNumber}</span>
              </div>
            </div>
          </Card>

          <Card title="Emergency Contact">
            {isLoadingEmergencyContact ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-digix-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading emergency contact...</span>
              </div>
            ) : emergencyContact ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Primary Contact</span>
                  <span className="font-medium text-slate-900">{emergencyContact.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Relationship</span>
                  <span className="font-medium text-slate-900">
                    {emergencyContact.relationship || emergencyContact.relation || 'Contact'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Emergency Phone</span>
                  <span className="font-medium text-slate-900">{emergencyContact.phone}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No emergency contact added</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  No emergency contact is on file for your employee record.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'employment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Employment Details">
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-900">{liveEmployee?.department}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Functional Role</span>
                <span className="font-medium text-slate-900">{liveEmployee?.roleTitle}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Date of Joining</span>
                <span className="font-medium text-slate-900">{liveEmployee?.joinDate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Work Policy</span>
                <span className="font-medium text-slate-900">{liveEmployee?.workType || 'Hybrid (3 days office)'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Annual Review Score</span>
                <span className="font-bold text-emerald-600">{liveEmployee?.performanceScore || '4.8'} / 5.0 (Exceptional)</span>
              </div>
            </div>
          </Card>

          <Card title="Reporting Hierarchy">
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  PR
                </div>
                <div>
                  <p className="font-bold text-slate-900">Priyanka</p>
                  <p className="text-slate-500">HR Manager (Reporting Lead)</p>
                </div>
              </div>

              <div className="pl-6 border-l-2 border-slate-200 ml-4 space-y-3">
                <div className="p-3 rounded-xl bg-digix-50/70 border border-digix-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-digix-500 text-white flex items-center justify-center font-bold">
                    TB
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{liveEmployee?.name} (You)</p>
                    <p className="text-slate-500">{liveEmployee?.roleTitle}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'skills' && (
        <Card title="Skills & Competencies">
          <p className="text-xs text-slate-500 mb-4">
            Verified technical proficiencies and skills matrix on record for DigiX internal project staffing.
          </p>
          <div className="flex flex-wrap gap-2">
            {(liveEmployee?.skills || ['React 19', 'TypeScript', 'Tailwind CSS', 'Vite', 'GraphQL', 'Next.js', 'Jest', 'CI/CD']).map(
              (skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  {skill}
                </span>
              )
            )}
          </div>
        </Card>
      )}

      {activeTab === 'compensation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Compensation Summary (Demo)">
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Annual Base CTC</span>
                <span className="font-semibold text-slate-900">{liveEmployee?.salary || '$145,000'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Discretionary Bonus Pool</span>
                <span className="font-semibold text-slate-900">Up to 15%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Stock Options (ESOPs)</span>
                <span className="font-semibold text-slate-900">4,500 units (Vested: 2,250)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Pay Frequency</span>
                <span className="font-semibold text-slate-900">Monthly (Last business day)</span>
              </div>
            </div>
          </Card>

          <Card title="Enrolled Corporate Benefits">
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>DigiX Comprehensive Medical, Vision, and Dental Insurance</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>$120 / month Health & Wellness Stipend</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>$1,500 / year Annual Learning & Conference Budget</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>401(k) / PF Matching up to 5%</span>
              </li>
            </ul>
          </Card>
        </div>
      )}

      {/* NEW: Change Requests & History Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Profile Change Requests History
              </h3>
              <p className="text-xs text-slate-500">
                Submitted amendments to personal information, verification documents, and HR review status.
              </p>
            </div>
            <Button
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => setIsModalOpen(true)}
            >
              New Change Request
            </Button>
          </div>

          {isLoadingProfileRequests && myRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="w-5 h-5 border-2 border-digix-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading change requests from database...</span>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No change requests submitted</p>
              <p className="text-xs text-slate-400 mt-1">
                Your profile information is currently up to date with official company records.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => {
                const isApproved = req.status?.toLowerCase() === 'approved';
                const isRejected = req.status?.toLowerCase() === 'rejected';
                const isPending = req.status?.toLowerCase() === 'pending';

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {req.id?.length > 15 ? `PCR-${req.id.slice(0, 8).toUpperCase()}` : req.id}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {req.fieldLabel}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          Submitted {req.submittedDate}
                        </span>
                        <Badge
                          variant={isApproved ? 'success' : isRejected ? 'danger' : 'warning'}
                          size="sm"
                          dot
                        >
                          {req.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Value Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider block">
                          Current Value on Record
                        </span>
                        <span className="font-medium text-slate-700 mt-0.5 block line-through decoration-slate-400">
                          {req.currentValue}
                        </span>
                      </div>
                      <div>
                        <span className="text-digix-700 uppercase text-[10px] font-semibold tracking-wider block">
                          Requested New Value
                        </span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {req.requestedValue}
                        </span>
                      </div>
                    </div>

                    {/* Justification & Attachments */}
                    <div className="text-xs space-y-2">
                      <div>
                        <span className="text-slate-400 font-medium">Justification: </span>
                        <span className="text-slate-700">{req.reason}</span>
                      </div>

                      {req.documentName && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-slate-400 font-medium">Attached Proof:</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{req.documentName}</span>
                            <span className="text-[10px] text-blue-500">({req.documentSize})</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* HR Review Decision Box */}
                    {(isApproved || isRejected) && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                          isApproved
                            ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900'
                            : 'bg-rose-50/60 border-rose-200/80 text-rose-900'
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              {isApproved ? 'Approved by People Operations' : 'Request Declined'}
                            </span>
                            <span className="text-[10px] opacity-75">
                              {req.reviewedAt}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-700">
                            {req.hrComment || (isApproved ? 'All documentation verified.' : 'Could not verify attachment.')}
                          </p>
                          <span className="text-[11px] opacity-75 mt-1 block">
                            Reviewer: {req.reviewedBy || 'Priyanka (HR Manager)'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Request Profile Change Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request Profile Information Change"
        subtitle="Submit personal data updates for HR verification and approval"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {/* Strict Protected Fields Warning */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Enterprise Access Control: </span>
              <span>
                Employee ID, Department, Designation, Joining Date, Salary, and Reporting Manager are strictly locked and managed directly by executive People Operations.
              </span>
            </div>
          </div>

          {/* Field Selection */}
          <Select
            label="Select Information to Update"
            value={selectedFieldId}
            onChange={(e) => handleFieldChange(e.target.value)}
            options={ALLOWED_FIELDS.map((f) => ({ label: f.label, value: f.id }))}
          />

          {/* Current Value Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
            <span className="text-slate-400 block text-[11px]">Current Value on File</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {currentValue || '(Not currently set)'}
            </span>
          </div>

          {/* Requested New Value */}
          <Input
            label="Requested New Value"
            value={requestedValue}
            onChange={(e) => setRequestedValue(e.target.value)}
            placeholder={currentFieldConfig.placeholder}
            required
          />

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason for Amendment <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this change is necessary (e.g. carrier relocation, address update, new certification)..."
              className="w-full rounded-lg border border-slate-300 text-sm p-3 focus:outline-none focus:border-digix-500 focus:ring-1 focus:ring-digix-500"
              required
            />
          </div>

          {/* Supporting Document Uploader */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Supporting Verification Document (Optional / Recommended)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50/60 transition-colors cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-600 font-medium">
                {attachedFileName ? (
                  <span className="text-digix-600 font-bold">{attachedFileName}</span>
                ) : (
                  'Click or drag PDF / image proof (Govt ID, Utility Bill, Certificate)'
                )}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Maximum file size: 5 MB (PDF, JPG, PNG)</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingRequest}
            >
              Submit Request to HR
            </Button>
          </div>
        </form>
      </Modal>

      {/* Avatar Preview & Upload Confirmation Modal */}
      <Modal
        isOpen={isAvatarModalOpen}
        onClose={isUploadingAvatar ? () => {} : handleCancelAvatarModal}
        title="Change Profile Photo"
        subtitle="Preview your updated profile picture before applying changes."
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelAvatarModal}
              disabled={isUploadingAvatar}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              id="btn-save-avatar"
              onClick={handleSaveAvatar}
              isLoading={isUploadingAvatar}
              leftIcon={!isUploadingAvatar && <Upload className="w-4 h-4" />}
            >
              Save & Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          {/* Avatar Preview Display */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg bg-slate-200 mb-3 flex items-center justify-center">
              {avatarPreviewUrl ? (
                <img
                  src={avatarPreviewUrl}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-slate-400" />
              )}
            </div>

            {avatarFile && (
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-800 truncate max-w-[240px]">
                  {avatarFile.name}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span>{(avatarFile.size / 1024).toFixed(0)} KB</span>
                  <span>•</span>
                  <span className="uppercase font-medium text-digix-600 bg-digix-50 px-1.5 py-0.5 rounded">
                    {avatarFile.name.split('.').pop()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Validation / Upload Error Banner */}
          {avatarUploadError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{avatarUploadError}</span>
            </div>
          )}

          {/* Enterprise Policy Guidance Note */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px] text-blue-700 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No HR Approval Required</p>
              <p className="text-blue-600/90 mt-0.5">
                Profile photos update immediately. Core employment details (Name, ID, Department, Band) remain protected and require an official change request.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
