import React, { useState } from 'react';
import { usePortalData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  GraduationCap,
  Clock,
  Award,
  CheckCircle2,
  PlayCircle,
  Download,
  AlertCircle,
  Calendar,
  BookOpen,
  ArrowRight,
  Info,
  Check
} from 'lucide-react';

export const TrainingPage = () => {
  const { trainings, joinTraining, updateTrainingProgress, isLoadingTrainings, trainingError } = usePortalData();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'my_training'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [certificateModal, setCertificateModal] = useState(null);

  const currentUserId = user?.id || 'DGX003';
  const currentUserName = user?.name || 'Tarumani Bharath Raj';
  const currentUserDept = user?.department || 'Technology';

  // Helper: check if logged-in user is enrolled in course
  const isEnrolled = (course) => {
    return course.enrolledEmployees?.some((emp) =>
      typeof emp === 'string' ? emp === currentUserId : emp.id === currentUserId
    );
  };

  // Helper: check if logged-in user is eligible/assigned to course
  const isEligible = (course) => {
    if (course.assignmentType === 'all') return true;
    if (course.assignmentType === 'department') {
      return (
        course.assignedDepartments?.includes(currentUserDept) ||
        course.assignedDepartments?.includes('all')
      );
    }
    if (course.assignmentType === 'specific') {
      return course.assignedEmployees?.includes(currentUserId);
    }
    return true;
  };

  // Helper: get current user's progress in a course
  const getMyProgress = (course) => {
    if (course.progressByEmployee && course.progressByEmployee[currentUserId] !== undefined) {
      return course.progressByEmployee[currentUserId];
    }
    const empObj = course.enrolledEmployees?.find((e) =>
      typeof e === 'string' ? e === currentUserId : e.id === currentUserId
    );
    if (empObj && typeof empObj === 'object') {
      return empObj.progress ?? 0;
    }
    return 0;
  };

  // Split courses into Available and My Training
  const availableTrainings = trainings.filter((c) => isEligible(c) && !isEnrolled(c));
  const myTrainings = trainings.filter((c) => isEnrolled(c));

  // Compute metrics
  const enrolledCount = myTrainings.length;
  const completedCount = myTrainings.filter((c) => getMyProgress(c) === 100).length;
  const inProgressCount = myTrainings.filter((c) => getMyProgress(c) < 100).length;
  const totalHoursLearned = myTrainings
    .filter((c) => getMyProgress(c) === 100)
    .reduce((acc, c) => acc + (parseFloat(c.duration) || 0), 0);

  // Actions
  const handleJoinTraining = async (course) => {
    try {
      await joinTraining(course.id, { id: currentUserId, name: currentUserName });
      addToast({
        type: 'success',
        title: 'Enrolled in Training',
        message: `Successfully enrolled in "${course.title}". Course added to My Training.`
      });
      if (isDetailsOpen) setIsDetailsOpen(false);
      setActiveTab('my_training');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Enrollment Failed',
        message: err.message || 'Unable to enroll in course. Please try again.'
      });
    }
  };

  const handleResumeLearning = async (course) => {
    try {
      const currentProg = getMyProgress(course);
      const newProg = await updateTrainingProgress(course.id, currentUserId, 25);
      if (newProg === 100) {
        addToast({
          type: 'success',
          title: 'Curriculum Completed! 🎉',
          message: `Congratulations! You have completed "${course.title}". Your verified certificate is ready.`
        });
      } else {
        addToast({
          type: 'info',
          title: 'Progress Saved',
          message: `Advanced "${course.title}" from ${currentProg}% to ${newProg}%.`
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Progress Update Failed',
        message: err.message || 'Unable to advance learning progress.'
      });
    }
  };

  const handleOpenCertificate = (course) => {
    const certId = course.certificate || `CERT-DX-${course.id.replace('TRN-', '')}-${currentUserId}`;
    setCertificateModal({
      courseTitle: course.title,
      certId,
      date: new Date().toISOString().split('T')[0],
      employeeName: currentUserName
    });
  };

  const openCourseDetails = (course) => {
    setSelectedCourse(course);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Learning & Certifications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Corporate compliance curriculums, technical upskilling, and verified DigiX professional credentials.
          </p>
        </div>
        {isLoadingTrainings && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium self-start sm:self-center">
            <div className="w-3 h-3 border-2 border-digix-500 border-t-transparent rounded-full animate-spin" />
            <span>Syncing curriculums...</span>
          </div>
        )}
      </div>

      {trainingError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Notice: {trainingError}</span>
        </div>
      )}

      {/* Top Learning Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Enrolled Courses</p>
            <BookOpen className="w-4 h-4 text-digix-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{enrolledCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active curriculums in progress</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">In Progress</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{inProgressCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ongoing learning tracks</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Completed Courses</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Certificates granted</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Hours Learned</p>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-1">{totalHoursLearned} hrs</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Completed training time</p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'available'
              ? 'border-digix-600 text-digix-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Available Training</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'available'
                ? 'bg-digix-100 text-digix-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {availableTrainings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('my_training')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'my_training'
              ? 'border-digix-600 text-digix-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>My Training</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'my_training'
                ? 'bg-digix-100 text-digix-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {myTrainings.length}
          </span>
        </button>
      </div>

      {/* TAB 1: AVAILABLE TRAINING / CATALOG */}
      {activeTab === 'available' && (
        <div>
          {availableTrainings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-subtle">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">You're All Caught Up!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No new unassigned courses waiting in your catalog. You are currently enrolled in all available programs.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setActiveTab('my_training')}
              >
                Go to My Training
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {availableTrainings.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm">
                          {course.category}
                        </Badge>
                        {course.isMandatory && (
                          <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-500" /> Mandatory
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {course.duration}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-3">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Instructor:</span>
                        <span className="font-medium text-slate-800">{course.instructor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Assignment:</span>
                        <span className="font-medium text-digix-600">
                          {course.assignmentType === 'all'
                            ? 'All Company Staff'
                            : course.assignmentType === 'department'
                            ? `Dept: ${course.assignedDepartments?.join(', ')}`
                            : 'Directly Assigned'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Deadline:</span>
                        <span className="text-slate-700">{course.endDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openCourseDetails(course)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
                      onClick={() => handleJoinTraining(course)}
                    >
                      Join Training
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY TRAINING / ENROLLED COURSES */}
      {activeTab === 'my_training' && (
        <div>
          {myTrainings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-subtle">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">No Enrolled Courses Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Explore the Available Training tab to enroll in mandatory compliance modules or professional engineering tracks.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setActiveTab('available')}
              >
                Browse Available Programs
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myTrainings.map((course) => {
                const myProg = getMyProgress(course);
                const isCompleted = myProg === 100;

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="primary" size="sm">
                            {course.category}
                          </Badge>
                          {isCompleted ? (
                            <Badge variant="success" size="sm">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="purple" size="sm">
                              In Progress
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {course.duration}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mt-3">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {course.description}
                      </p>

                      <p className="text-xs text-slate-600 mt-3">
                        <span className="text-slate-400">Instructor: </span>
                        <span className="font-medium text-slate-800">{course.instructor}</span>
                      </p>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                          <span>Your Progress</span>
                          <span className={isCompleted ? 'text-emerald-600 font-bold' : 'text-digix-600 font-bold'}>
                            {myProg}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-digix-500'
                            }`}
                            style={{ width: `${myProg}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCourseDetails(course)}
                      >
                        Details
                      </Button>

                      {isCompleted ? (
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenCertificate(course)}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          Download Certificate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
                          onClick={() => handleResumeLearning(course)}
                        >
                          Resume Learning
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COURSE DETAILS MODAL */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedCourse?.title || 'Course Details'}
        subtitle={`Curriculum ID: ${selectedCourse?.id} • Lead Instructor: ${selectedCourse?.instructor}`}
        maxWidth="max-w-xl"
      >
        {selectedCourse && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="primary" size="sm">
                {selectedCourse.category}
              </Badge>
              {selectedCourse.isMandatory && (
                <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-500" /> Mandatory Compliance
                </span>
              )}
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">Duration: <strong>{selectedCourse.duration}</strong></span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">Schedule: <strong>{selectedCourse.startDate} to {selectedCourse.endDate}</strong></span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">Syllabus Overview</h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                {selectedCourse.description}
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1">
              <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-600" /> DigiX Verified Credential
              </p>
              <p className="text-blue-700 text-[11px]">
                Upon achieving 100% curriculum completion, an encrypted digital credential will be stamped to your official DigiX employee record.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
              {!isEnrolled(selectedCourse) && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
                  onClick={() => handleJoinTraining(selectedCourse)}
                >
                  Join Training
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* CERTIFICATE MODAL */}
      <Modal
        isOpen={!!certificateModal}
        onClose={() => setCertificateModal(null)}
        title="DigiX Verified Corporate Credential"
        subtitle="Official Achievement Certificate"
        maxWidth="max-w-lg"
      >
        {certificateModal && (
          <div className="space-y-4 text-center py-2">
            <div className="p-6 bg-gradient-to-br from-digix-50 via-white to-purple-50 rounded-2xl border-2 border-digix-200 shadow-sm relative">
              <div className="w-12 h-12 rounded-2xl bg-digix-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-digix-500/20">
                <Award className="w-7 h-7 stroke-[2.2]" />
              </div>

              <span className="text-[10px] uppercase font-bold tracking-widest text-digix-600">
                DigiX Technologies Inc.
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                Certificate of Completion
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">This certifies that</p>
              <p className="text-base font-bold text-slate-900 mt-1 border-b border-slate-200 pb-2 inline-block px-4">
                {certificateModal.employeeName}
              </p>

              <p className="text-xs text-slate-600 mt-3">
                has successfully completed all requirements for:
              </p>
              <p className="text-sm font-bold text-digix-700 mt-1">
                "{certificateModal.courseTitle}"
              </p>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Credential ID: {certificateModal.certId}</span>
                <span>Date: {certificateModal.date}</span>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => {
                  addToast({
                    type: 'success',
                    title: 'Downloaded PDF',
                    message: `${certificateModal.certId}.pdf saved to your downloads.`
                  });
                  setCertificateModal(null);
                }}
              >
                Download Credential PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
