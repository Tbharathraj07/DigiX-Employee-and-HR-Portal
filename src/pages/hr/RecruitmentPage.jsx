import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Plus, User, Star, ArrowRight, Mail, Briefcase } from 'lucide-react';

export const RecruitmentPage = () => {
  const { candidates, updateCandidateStage, addCandidate } = usePortalData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleApplied, setRoleApplied] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [experience, setExperience] = useState('5 years');
  const [currentCompany, setCurrentCompany] = useState('');

  const stages = ['Applied', 'Screening', 'Technical Interview', 'HR Round', 'Offered', 'Hired'];

  const handleAddCandidate = (e) => {
    e.preventDefault();
    if (!name || !roleApplied) return;

    addCandidate({
      name,
      email,
      roleApplied,
      department,
      experience,
      currentCompany: currentCompany || 'Confidential'
    });

    setIsModalOpen(false);
    setName('');
    setEmail('');
    setRoleApplied('');
    addToast({
      type: 'success',
      title: 'Candidate Enrolled',
      message: `${name} has been added to the ATS pipeline.`
    });
  };

  const handleAdvanceStage = (candidate, currentStage) => {
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      updateCandidateStage(candidate.id, nextStage);
      addToast({
        type: 'info',
        title: 'Candidate Advanced',
        message: `${candidate.name} moved to "${nextStage}"`
      });
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

      {/* Kanban Board */}
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
                {stageCandidates.map((cand) => (
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
                      <span className="text-[10px] font-mono text-slate-400">{cand.id}</span>
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
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Add to ATS
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
