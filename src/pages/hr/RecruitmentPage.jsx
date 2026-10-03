import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Plus, User, Star, ArrowRight, Mail, Briefcase, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export const RecruitmentPage = () => {
  const { candidates, updateCandidateStage, addCandidate, isLoadingCandidates, candidateError, fetchCandidates } = usePortalData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleApplied, setRoleApplied] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [experience, setExperience] = useState('5 years');
  const [currentCompany, setCurrentCompany] = useState('');

  const stages = ['Applied', 'Screening', 'Technical Interview', 'HR Round', 'Offered', 'Hired'];

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !roleApplied.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      await addCandidate({
        name: name.trim(),
        email: email.trim(),
        roleApplied: roleApplied.trim(),
        department,
        experience: experience.trim() || '3 years',
        currentCompany: currentCompany.trim() || 'Confidential'
      });

      setIsModalOpen(false);
      setName('');
      setEmail('');
      setRoleApplied('');
      setCurrentCompany('');
      addToast({
        type: 'success',
        title: 'Candidate Enrolled',
        message: `${name} has been added to the ATS pipeline in Supabase.`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Enroll Candidate',
        message: err.message || 'Unable to save candidate to Supabase.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStage = async (candidate, currentStage) => {
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      try {
        await updateCandidateStage(candidate.id, nextStage);
        addToast({
          type: 'info',
          title: 'Candidate Advanced',
          message: `${candidate.name} moved to "${nextStage}"`
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: err.message || 'Could not advance candidate stage in Supabase.'
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Recruitment & ATS Pipeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Applicant tracking Kanban for engineering, product, and leadership hires.
          </p>
        </div>

        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Candidate
        </Button>
      </div>

      {/* Error state */}
      {candidateError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>Failed to sync candidates from Supabase: {candidateError}</span>
          </div>
          <button
            onClick={() => fetchCandidates()}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-300 rounded-md text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Kanban Board */}
      {isLoadingCandidates && candidates.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-digix-600 mb-2" />
          <p className="text-xs font-medium text-slate-600">Loading candidate pipeline from Supabase...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageCandidates = candidates.filter((c) => c.stage === stage);

            return (
              <div
                key={stage}
                className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200/80 min-w-[240px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-slate-800">{stage}</span>
                  <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full shadow-xs">
                    {stageCandidates.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {stageCandidates.length === 0 ? (
                    <div className="text-center py-8 px-2 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-[11px] text-slate-400">No applicants in {stage}</p>
                    </div>
                  ) : (
                    stageCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-subtle hover:shadow-card transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-bold text-slate-900">{cand.name}</h4>
                          <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {cand.rating}
                          </span>
                        </div>

                        <p className="text-[11px] text-purple-700 font-medium mt-1">
                          {cand.roleApplied}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Prev: {cand.currentCompany} ({cand.experience})
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400">
                            {cand.code || cand.candidateCode || cand.id}
                          </span>
                          {stage !== 'Hired' && (
                            <button
                              onClick={() => handleAdvanceStage(cand, stage)}
                              className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-0.5"
                              title="Advance to next interview round"
                            >
                              Advance <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Candidate Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Candidate to Pipeline"
        subtitle="Submit candidate resume info for screening"
      >
        <form onSubmit={handleAddCandidate} className="space-y-4">
          <Input
            label="Candidate Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Taylor Smith"
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="taylor.s@example.com"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Position Applied For"
              value={roleApplied}
              onChange={(e) => setRoleApplied(e.target.value)}
              placeholder="Senior Frontend Dev"
              required
            />
            <Select
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={['Engineering', 'Product Design', 'Human Resources', 'Data & AI', 'IT & Security']}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Years of Experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="e.g. 6 years"
            />
            <Input
              label="Current / Previous Employer"
              value={currentCompany}
              onChange={(e) => setCurrentCompany(e.target.value)}
              placeholder="e.g. Uber"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
            >
              Add to ATS
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

