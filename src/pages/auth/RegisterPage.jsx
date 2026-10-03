import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Users,
  Building,
  Check
} from 'lucide-react';

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'Select Department...' },
  { value: 'Technology', label: 'Technology / Engineering' },
  { value: 'Human Resources', label: 'Human Resources & People' },
  { value: 'Product Management', label: 'Product Management' },
  { value: 'Finance & Accounting', label: 'Finance & Accounting' },
  { value: 'Operations', label: 'Operations & Facilities' },
  { value: 'Marketing & Growth', label: 'Marketing & Growth' },
  { value: 'Sales & Partnerships', label: 'Sales & Partnerships' },
  { value: 'Legal & Compliance', label: 'Legal & Compliance' },
  { value: 'IT & Infrastructure', label: 'IT & Infrastructure' }
];

const LOCATION_OPTIONS = [
  { value: '', label: 'Select Location...' },
  { value: 'Hyderabad, India', label: 'Hyderabad, India (Engineering Hub)' },
  { value: 'New York, NY', label: 'New York, NY (Corporate Headquarters)' },
  { value: 'Austin, TX', label: 'Austin, TX (Cloud & SecOps)' },
  { value: 'London, UK', label: 'London, UK (European Hub)' },
  { value: 'Remote', label: 'Remote / Telework' }
];

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    location: '',
    joiningDate: new Date().toISOString().split('T')[0],
    accountType: 'employee', // 'employee' | 'hr_manager' (NEVER 'admin')
    manager: '',
    reason: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState(null);
  const [serverError, setServerError] = useState(null);

  const validate = () => {
    const newErrors = {};

    // 1. Full Name
    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      newErrors.fullName = 'Full name is required';
    } else if (trimmedName.length > 100) {
      newErrors.fullName = 'Full name must not exceed 100 characters';
    }

    // 2. Email Address: accepts any valid email address, trimmed, reasonable max length
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
    } else if (trimmedEmail.length > 254) {
      newErrors.email = 'Email address must not exceed 254 characters';
    } else {
      // Standard email regex (accepts public mailboxes like Gmail/Outlook as well as custom domains)
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // 3. Contact Phone Number
    const trimmedPhone = formData.phone.trim();
    if (!trimmedPhone) {
      newErrors.phone = 'Contact phone number is required';
    } else if (trimmedPhone.length > 30) {
      newErrors.phone = 'Phone number must not exceed 30 characters';
    }

    // 4. Department
    if (!formData.department.trim()) {
      newErrors.department = 'Department selection is required';
    }

    // 5. Designation / Role Title
    const trimmedDesignation = formData.designation.trim();
    if (!trimmedDesignation) {
      newErrors.designation = 'Designation / job title is required';
    } else if (trimmedDesignation.length > 100) {
      newErrors.designation = 'Designation must not exceed 100 characters';
    }

    // 6. Work Location
    if (!formData.location.trim()) {
      newErrors.location = 'Work location is required';
    }

    // 7. Joining Date
    if (!formData.joiningDate) {
      newErrors.joiningDate = 'Joining date is required';
    }

    // 8. Account Type
    if (!['employee', 'hr_manager'].includes(formData.accountType)) {
      newErrors.accountType = 'Please select a valid account type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      addToast({
        type: 'warning',
        title: 'Missing Required Fields',
        message: 'Please complete all required fields marked with an asterisk.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean and map payload according to public.registration_requests schema
      const normalizedEmail = formData.email.trim().toLowerCase();
      const requestedRole = formData.accountType === 'hr_manager' ? 'hr_manager' : 'employee';

      // Build remarks combining optional manager notes and access reason
      const reasonNotes = [
        formData.manager.trim() ? `Reporting Manager: ${formData.manager.trim()}` : null,
        formData.reason.trim() ? formData.reason.trim() : null
      ].filter(Boolean).join('\n\n');

      const payload = {
        full_name: formData.fullName.trim(),
        email: normalizedEmail,
        phone: formData.phone.trim(),
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        location: formData.location.trim(),
        joining_date: formData.joiningDate,
        requested_role: requestedRole, // Strictly 'employee' or 'hr_manager'
        status: 'pending',             // Strictly 'pending'
        manager_id: null,              // Safely null for anonymous public applicants
        reason: reasonNotes || null
      };

      // Perform insertion via Supabase client (governed by public RLS policies)
      const { error } = await supabase
        .from('registration_requests')
        .insert(payload);

      if (error) {
        console.warn('[RegisterPage] Registration submission error:', error);

        // Friendly duplicate handling for active pending requests
        const isDuplicate =
          error.code === '23505' ||
          error.message?.toLowerCase().includes('unique') ||
          error.message?.toLowerCase().includes('already');

        if (isDuplicate) {
          const duplicateMsg = 'An access request for this email address is already pending administrative review. Please wait for an invitation email or contact your administrator.';
          setServerError(duplicateMsg);
          addToast({
            type: 'warning',
            title: 'Request Already Pending',
            message: duplicateMsg,
            duration: 6000
          });
        } else {
          const genericMsg = 'Unable to submit your registration request. Please verify your details and try again.';
          setServerError(genericMsg);
          addToast({
            type: 'error',
            title: 'Submission Failed',
            message: genericMsg
          });
        }
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsSubmitting(false);
      setSubmittedDetails({
        fullName: formData.fullName.trim(),
        email: normalizedEmail,
        role: requestedRole === 'hr_manager' ? 'HR Manager' : 'Employee',
        department: formData.department.trim(),
        designation: formData.designation.trim(),
        location: formData.location.trim()
      });
      setSubmissionSuccess(true);

      addToast({
        type: 'success',
        title: 'Registration Request Submitted',
        message: 'Your request has been sent to the administrator for review.'
      });

    } catch (err) {
      console.error('[RegisterPage] Unexpected submission error:', err);
      setIsSubmitting(false);
      const fallbackMsg = 'A network or system error occurred. Please check your connection and try again.';
      setServerError(fallbackMsg);
      addToast({
        type: 'error',
        title: 'Submission Error',
        message: fallbackMsg
      });
    }
  };

  // ----------------------------------------------------------------------------
  // Success Confirmation Screen
  // ----------------------------------------------------------------------------
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-xl w-full mx-auto">
          {/* Header Branding */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center gap-2 mb-1.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shadow-xs flex-shrink-0">
                <img
                  src="/images/digix-logo.png"
                  alt="DigiX Technologies Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left">
                <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight leading-none block">
                  Digi<span className="text-digix-500">X</span> Technologies
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-none block mt-0.5">
                  Enterprise Employee & HR Intelligence Portal
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xl text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4 border border-emerald-100 ring-4 ring-emerald-50/60 shadow-xs">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 tracking-tight">
              Registration request submitted
            </h2>

            <p className="text-sm font-medium text-slate-700 max-w-md mx-auto mb-4 leading-relaxed">
              Your request has been sent to the administrator for review. If approved, an invitation will be sent to this email address.
            </p>

            {/* Prominent Recipient Email Callout */}
            {submittedDetails && (
              <div className="my-5 p-3.5 bg-digix-50/70 border border-digix-200/80 rounded-xl flex items-center justify-between text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-digix-500 text-white flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-digix-800 uppercase tracking-wider block">
                      Invitation Destination
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 block truncate">
                      {submittedDetails.email}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0 ml-2">
                  Awaiting Review
                </span>
              </div>
            )}

            {/* Submitted Summary Dossier */}
            {submittedDetails && (
              <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-500 font-medium">Applicant Name</span>
                  <span className="text-xs font-bold text-slate-900">{submittedDetails.fullName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-500 font-medium">Email Address</span>
                  <span className="text-xs font-mono font-medium text-slate-800">{submittedDetails.email}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-500 font-medium">Requested Role</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-digix-50 text-digix-700 border border-digix-200">
                    {submittedDetails.role}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-500 font-medium">Department</span>
                  <span className="text-xs text-slate-700">{submittedDetails.department}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-500 font-medium">Work Location</span>
                  <span className="text-xs text-slate-700">{submittedDetails.location}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500 font-medium">Approval Status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Admin Approval
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 sm:py-3 font-semibold text-sm flex items-center justify-center gap-2"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Sign In
              </Button>
            </div>
          </div>

          <div className="text-center mt-6 text-xs text-slate-400">
            Need urgent assistance? Contact the IT Service Desk at support@digix.internal
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // Registration Form Screen
  // ----------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8 w-full">
      <div className="max-w-2xl w-full mx-auto">
        {/* Top Navigation: Cleanly placed above header */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors py-1 px-1.5 -ml-1.5 rounded-lg hover:bg-slate-200/60 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:-translate-x-0.5 transition-all" />
            <span>Back to Sign In</span>
          </Link>
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Enterprise Portal
          </span>
        </div>

        {/* Compact, Centered Hero & Branding */}
        <div className="text-center mb-5 sm:mb-6">
          {/* Brand Emblem + Name */}
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shadow-xs flex-shrink-0">
              <img
                src="/images/digix-logo.png"
                alt="DigiX Technologies Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight leading-none block">
                Digi<span className="text-digix-500">X</span> Technologies
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-none block mt-0.5">
                Enterprise Employee & HR Intelligence Portal
              </span>
            </div>
          </div>

          {/* Primary Page Heading */}
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1.5 mb-1">
            Create Your DigiX Account
          </h1>
          {/* Subordinate Supporting Text */}
          <p className="text-xs text-slate-500 font-normal max-w-sm mx-auto leading-relaxed">
            Submit your details to request access to the DigiX Employee Portal.
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-8 shadow-xl">
          {/* Header Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 mb-5 pb-3 border-b border-slate-100 gap-1">
            <span className="font-medium text-slate-700">Account Registration Form</span>
            <span className="text-[11px] text-slate-400">
              Fields marked with <span className="text-rose-500 font-bold">*</span> are required
            </span>
          </div>

          {serverError && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-950">Notice</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Account Type Selection (Employee vs HR only - NO Admin) */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Account Type <span className="text-rose-500 font-bold">*</span></span>
                <span className="text-[11px] text-slate-400 font-normal">Select your organizational access tier</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => handleChange('accountType', 'employee')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-start gap-3 relative ${
                    formData.accountType === 'employee'
                      ? 'border-digix-500 bg-digix-50/50 ring-1 ring-digix-500 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    formData.accountType === 'employee' ? 'bg-digix-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Employee</span>
                      <span className="text-[9px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Standard</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Access to personal dashboard, shift attendance, leaves, and documents.
                    </p>
                  </div>
                  {formData.accountType === 'employee' && (
                    <div className="w-4 h-4 rounded-full bg-digix-500 text-white flex items-center justify-center absolute top-2 right-2">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div
                  onClick={() => handleChange('accountType', 'hr_manager')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-start gap-3 relative ${
                    formData.accountType === 'hr_manager'
                      ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    formData.accountType === 'hr_manager' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">HR Manager</span>
                      <span className="text-[9px] font-semibold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">People Ops</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Access to workforce directory, leave approvals, recruitment, and onboarding.
                    </p>
                  </div>
                  {formData.accountType === 'hr_manager' && (
                    <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center absolute top-2 right-2">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
              {errors.accountType && <p className="mt-1 text-xs text-rose-600">{errors.accountType}</p>}
            </div>

            {/* Row 1: Full Name & Email Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
              <Input
                id="reg-fullname"
                label={
                  <span className="flex items-center gap-1">
                    Full Name <span className="text-rose-500 font-bold">*</span>
                  </span>
                }
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                error={errors.fullName}
                leftIcon={<User className="w-4 h-4" />}
                helperText="Enter your official first and last name"
                required
              />

              <Input
                id="reg-email"
                label={
                  <span className="flex items-center gap-1">
                    Email Address <span className="text-rose-500 font-bold">*</span>
                  </span>
                }
                type="email"
                placeholder="employee@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={errors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="Use an email address you can access. Your account invitation will be sent here."
                required
              />
            </div>

            {/* Row 2: Phone Number & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
              <Input
                id="reg-phone"
                label={
                  <span className="flex items-center gap-1">
                    Phone Number <span className="text-rose-500 font-bold">*</span>
                  </span>
                }
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={errors.phone}
                leftIcon={<Phone className="w-4 h-4" />}
                helperText="Include country code (e.g. +1 or +91)"
                required
              />

              <Select
                id="reg-department"
                label={
                  <span className="flex items-center gap-1">
                    Department <span className="text-rose-500 font-bold">*</span>
                  </span>
                }
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                options={DEPARTMENT_OPTIONS}
                error={errors.department}
                helperText="Select your primary operational unit"
                required
              />
            </div>

            {/* Row 3: Designation & Primary Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
              <Input
                id="reg-designation"
                label={
                  <span className="flex items-center gap-1">
                    Designation / Job Title <span className="text-rose-500 font-bold">*</span>
                  </span>
                }
                type="text"
                placeholder="e.g. Senior Software Engineer"
                value={formData.designation}
                onChange={(e) => handleChange('designation', e.target.value)}
                error={errors.designation}
                leftIcon={<Briefcase className="w-4 h-4" />}
                helperText="Your formal organizational position"
                required
              />

              <Select
                id="reg-location"
                label={
                  <span className="flex items-center gap-1">
                    Primary Location <span className="text-rose-500 font-bold">*</span>
                  </span>
                }
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                options={LOCATION_OPTIONS}
                error={errors.location}
                helperText="Your designated base office or remote hub"
                required
              />
            </div>

            {/* Row 4: Joining Date & Reporting Manager */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
              <Input
                id="reg-joining-date"
                label={
                  <span className="flex items-center gap-1">
                    Joining Date <span className="text-rose-500 font-bold">*</span>
                  </span>
                }
                type="date"
                value={formData.joiningDate}
                onChange={(e) => handleChange('joiningDate', e.target.value)}
                error={errors.joiningDate}
                leftIcon={<Calendar className="w-4 h-4" />}
                helperText="Your official start date at DigiX"
                required
              />

              <Input
                id="reg-manager"
                label={
                  <span className="flex items-center justify-between w-full">
                    <span>Reporting Manager</span>
                    <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
                  </span>
                }
                type="text"
                placeholder="e.g. Elena Rostova / Priyanka"
                value={formData.manager}
                onChange={(e) => handleChange('manager', e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                helperText="Name of your manager or team lead"
              />
            </div>

            {/* Row 5: Reason for Access */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Reason for Access / Additional Remarks</span>
                <span className="text-[11px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="reg-reason"
                rows={3}
                placeholder="Specify your team, project assignment, or any relevant onboarding notes for the administrator..."
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                className="block w-full rounded-xl border border-slate-300 text-sm py-2.5 px-3.5 focus:border-digix-500 focus:ring-1 focus:ring-digix-500 placeholder-slate-400 text-slate-900 transition-colors resize-none shadow-xs"
              />
            </div>

            {/* Security Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3 text-xs text-slate-600">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="leading-relaxed">
                <span className="font-semibold text-slate-800 block mb-0.5">Administrative Verification Required</span>
                All account requests are reviewed by the DigiX System Administration team. Upon approval, an invitation email with a secure password setup link will be dispatched to your email address.
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full py-2.5 sm:py-3 font-semibold text-sm shadow-md shadow-digix-500/20"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Submit Access Request
            </Button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Already have an active account?{' '}
                <Link
                  to="/login"
                  className="font-bold text-digix-600 hover:text-digix-700 hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-slate-400">
          © 2026 DigiX Technologies Inc. All internal rights reserved.
        </div>
      </div>
    </div>
  );
};
